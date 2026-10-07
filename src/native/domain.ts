// Trusted document service, bundled into the native host's isolated WebView2 world.
// This world has no access to the renderer's JavaScript globals or native filesystem.
import { z } from 'zod'
import { CommandSchema, AIRequestSchema, initialWorkspace } from '../shared/model'
import { systemLocale } from '../shared/sample'
import type {
  Workspace,
  Command,
  Snapshot,
  Project,
  WritingResult,
  AIRequest,
  Provider
} from '../shared/model'
import {
  applyCommand,
  importFile,
  validateWorkspace,
  getProject,
  articleText,
  writingBasis,
  articleSourceBasis
} from '../shared/domain'
import {
  endpoint,
  keyScope,
  writingRequest,
  writingJSON,
  assembleResult,
  PolishSchema
} from '../main/ai'
import { setLocale, t, tr } from '../shared/i18n'
import { sharedContent, reconcile, applyShared, SyncContentSchema } from '../shared/sync'

type Entry = { before: Workspace; after: Workspace; coalesce?: string; at: number }
type State = { workspace: Workspace; undo: Entry[]; redo: Entry[] }
type Plan = {
  request: AIRequest
  project: Project
  provider: Provider
  keyScope: string
  basis: string
  assembled?: string
}
let state: State
let pending: State | undefined
const previews = new Map<string, WritingResult>()
function replay(w: Workspace, e: Entry, undo: boolean): void {
  const from = undo ? e.after : e.before,
    to = undo ? e.before : e.after
  const ids = new Set([...from.projects, ...to.projects].map((p) => p.id))
  for (const id of ids) {
    const a = from.projects.find((p) => p.id === id),
      b = to.projects.find((p) => p.id === id)
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    const current = w.projects.find((p) => p.id === id)
    w.projects = w.projects.filter((p) => p.id !== id)
    if (b)
      w.projects.push({ ...structuredClone(b), revision: (current?.revision ?? b.revision) + 1 })
  }
  for (const id of new Set([...from.inbox, ...to.inbox].map((n) => n.id))) {
    const a = from.inbox.find((n) => n.id === id),
      b = to.inbox.find((n) => n.id === id)
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    w.inbox = w.inbox.filter((n) => n.id !== id)
    if (b) w.inbox.push(structuredClone(b))
  }
  if (!w.projects.some((p) => p.id === w.activeProjectId)) w.activeProjectId = w.projects[0].id
}
function prepare(command: Command): Workspace {
  const before = structuredClone(state.workspace),
    workspace = structuredClone(before)
  const undo = [...state.undo],
    redo = [...state.redo]
  if (command.type === 'undo' || command.type === 'redo') {
    const from = command.type === 'undo' ? undo : redo,
      to = command.type === 'undo' ? redo : undo
    const entry = from.pop()
    if (entry) {
      replay(workspace, entry, command.type === 'undo')
      to.push(entry)
    }
  } else {
    if (command.type === 'settings') endpoint(command.settings.provider)
    applyCommand(workspace, command)
    const historical =
      !['capture', 'draft', 'settings', 'viewport', 'welcome'].includes(command.type) &&
      !(command.type === 'project' && command.action === 'select')
    if (historical && JSON.stringify(before) !== JSON.stringify(workspace)) {
      const coalesce =
        command.type === 'edit'
          ? `${command.projectId}:${command.id}`
          : command.type === 'article-draft' && !command.expectedBasis
            ? `${command.projectId}:article-draft`
            : undefined
      const last = undo.at(-1)
      if (
        coalesce &&
        last?.coalesce === coalesce &&
        Date.now() - last.at < 900 &&
        'projectId' in command
      ) {
        const after = structuredClone(last.after)
        after.projects = after.projects.map((p) =>
          p.id === command.projectId ? structuredClone(getProject(workspace, p.id)) : p
        )
        undo[undo.length - 1] = { ...last, after, at: Date.now() }
      } else undo.push({ before, after: structuredClone(workspace), coalesce, at: Date.now() })
      if (undo.length > 100) undo.shift()
      redo.length = 0
    }
  }
  validateWorkspace(workspace)
  pending = { workspace, undo, redo }
  return workspace
}
function execute(action: string, args: any[]): unknown {
  if (action === 'validate') return validateWorkspace(args[0])
  if (action === 'initialize') {
    state = {
      workspace: args[0] ? validateWorkspace(args[0]) : initialWorkspace(systemLocale(args[1])),
      undo: [],
      redo: []
    }
    pending = undefined
    previews.clear()
    return state.workspace
  }
  setLocale(state.workspace.settings.locale)
  if (action === 'translate') return t(args[0], args[1] ?? {})
  if (action === 'scope') return keyScope(state.workspace.settings.provider)
  if (action === 'snapshot')
    return {
      workspace: state.workspace,
      canUndo: !!state.undo.length,
      canRedo: !!state.redo.length,
      hasKey: args[0],
      storagePath: args[1],
      recovery: args[2] ? t(args[2]) : null
    } satisfies Snapshot
  if (action === 'prepare-command') return prepare(CommandSchema.parse(args[0]))
  if (action === 'sync-content') return sharedContent(state.workspace)
  if (action === 'prepare-sync') {
    const merged = reconcile(
      args[0] ? SyncContentSchema.parse(args[0]) : null,
      sharedContent(state.workspace),
      SyncContentSchema.parse(args[1])
    )
    if (args[2] === true) merged.content.settings = SyncContentSchema.parse(args[1]).settings
    const workspace = applyShared(state.workspace, merged.content)
    const changed = new Set(
      workspace.projects
        .filter(
          (p) =>
            JSON.stringify(p) !==
            JSON.stringify(state.workspace.projects.find((x) => x.id === p.id))
        )
        .map((p) => p.id)
    )
    state.workspace.projects
      .filter((p) => !workspace.projects.some((x) => x.id === p.id))
      .forEach((p) => changed.add(p.id))
    const safe = (e: Entry) =>
      ![...changed].some(
        (id) =>
          JSON.stringify(e.before.projects.find((p) => p.id === id)) !==
          JSON.stringify(e.after.projects.find((p) => p.id === id))
      )
    pending = { workspace, undo: state.undo.filter(safe), redo: state.redo.filter(safe) }
    return {
      workspace,
      content: sharedContent(workspace),
      conflicts: merged.conflicts,
      settingsConflicts: merged.settingsConflicts
    }
  }
  if (action === 'commit') {
    if (pending) state = pending
    pending = undefined
    setLocale(state.workspace.settings.locale)
    return state.workspace
  }
  if (action === 'discard') {
    pending = undefined
    return null
  }
  if (action === 'prepare-import') {
    const file = importFile(args[0]),
      before = structuredClone(state.workspace),
      workspace = structuredClone(before)
    const project = structuredClone(file.project)
    project.id = crypto.randomUUID()
    project.title = tr`${project.title.slice(0, 190)}（导入）`
    project.revision = 0
    workspace.projects.push(project)
    workspace.activeProjectId = project.id
    validateWorkspace(workspace)
    pending = {
      workspace,
      undo: [...state.undo, { before, after: structuredClone(workspace), at: Date.now() }].slice(
        -100
      ),
      redo: []
    }
    return workspace
  }
  if (action === 'export-project')
    return {
      format: 'thoughtanchor',
      version:
        getProject(state.workspace, args[0]).ink?.length ||
        getProject(state.workspace, args[0]).blocks.some((b) => b.ink?.length)
          ? 3
          : 2,
      project: getProject(state.workspace, z.string().max(100).parse(args[0]))
    }
  if (action === 'export-article')
    return articleText(
      getProject(state.workspace, z.string().max(100).parse(args[0])),
      z.enum(['md', 'txt']).parse(args[1]) === 'md',
      z.enum(['original', 'draft']).parse(args[2])
    )
  if (action === 'prepare-ai') {
    const request = AIRequestSchema.parse(args[0]),
      project = structuredClone(getProject(state.workspace, request.projectId))
    const actualOptions = {
      ...state.workspace.settings.writing,
      locale: state.workspace.settings.locale
    }
    const basis = writingBasis(project, actualOptions)
    if (basis !== writingBasis(project, request.options))
      throw new Error(t('内容或生成选项已改变，请重新生成。'))
    const preview = request.fromAssemblyPreview ? previews.get(project.id) : undefined
    if (
      request.fromAssemblyPreview &&
      (request.task !== 'polish' || !preview || preview.basis !== basis)
    )
      throw new Error(t('内容或生成选项已改变，请重新生成。'))
    return {
      request,
      project,
      provider: structuredClone(state.workspace.settings.provider),
      keyScope: keyScope(state.workspace.settings.provider),
      basis,
      assembled: preview?.draft.text
    } satisfies Plan
  }
  if (action === 'ai-wire') {
    const plan = args[0] as Plan,
      wire = writingRequest(
        plan.provider,
        args[1],
        plan.request,
        plan.project,
        args[2],
        args[3] ?? plan.assembled
      )
    return { ...wire, url: wire.url.href }
  }
  if (action === 'ai-phase') {
    const plan = args[0] as Plan,
      parsed = writingJSON(plan.provider.protocol, args[2])
    return args[1] === 'assemble'
      ? assembleResult(parsed, plan.project, plan.request.options.allowReorder)
      : PolishSchema.parse(parsed).text
  }
  if (action === 'finish-ai') {
    const plan = args[0] as Plan
    const actualOptions = {
      ...state.workspace.settings.writing,
      locale: state.workspace.settings.locale
    }
    if (writingBasis(getProject(state.workspace, plan.project.id), actualOptions) !== plan.basis)
      throw new Error(t('等待期间内容已改变，请重新生成建议。'))
    const result: WritingResult = {
      task: args[1],
      basis: plan.basis,
      draft: {
        text: args[2],
        task: args[1],
        sourceBasis: articleSourceBasis(plan.project),
        options: plan.request.options
      },
      ...(args[3] ? { warning: t(args[3]) } : {})
    }
    if (result.task === 'assemble') previews.set(plan.project.id, result)
    return result
  }
  throw new Error('Unknown domain operation')
}
export function invoke(input: { action: string; args: any[] }): {
  result?: unknown
  error?: string
} {
  try {
    return { result: execute(input.action, input.args) }
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? t('输入格式不正确，操作没有应用。')
          : t(error instanceof Error ? error.message : String(error))
    }
  }
}
