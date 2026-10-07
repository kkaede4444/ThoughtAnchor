import { z } from 'zod'
import {
  ProjectSchema,
  SettingsSchema,
  WorkspaceSchema,
  newProject,
  type Workspace,
  type Project
} from './model'
import { hash, validateWorkspace } from './domain'

const SharedProject = ProjectSchema.omit({ revision: true, viewport: true })
export const SyncContentSchema = z
  .object({
    version: z.literal(1),
    projects: z.array(SharedProject).max(100),
    inbox: WorkspaceSchema.shape.inbox,
    settings: SettingsSchema.pick({ locale: true, writing: true, provider: true })
  })
  .strict()
export type SyncContent = z.infer<typeof SyncContentSchema>
export function sharedContent(workspace: Workspace): SyncContent {
  return SyncContentSchema.parse({
    version: 1,
    projects: workspace.projects.map(({ revision, viewport, ...p }) => p),
    inbox: workspace.inbox,
    settings: {
      locale: workspace.settings.locale,
      writing: workspace.settings.writing,
      provider: workspace.settings.provider
    }
  })
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    )
  return JSON.stringify(value) ?? 'undefined'
}
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)

// Three-way reconciliation at project boundaries. Deletions are represented by
// absence relative to the durable common baseline, rather than by timestamps.
export function reconcile(
  base: SyncContent | null,
  local: SyncContent,
  remote: SyncContent
): { content: SyncContent; conflicts: number; settingsConflicts: string[] } {
  local = SyncContentSchema.parse(local)
  remote = SyncContentSchema.parse(remote)
  if (base) base = SyncContentSchema.parse(base)
  let conflicts = 0
  const settingsConflicts: string[] = []
  function collection<T extends { id: string }>(
    before: T[],
    ours: T[],
    theirs: T[],
    project: boolean
  ): T[] {
    const b = new Map(before.map((x) => [x.id, x])),
      l = new Map(ours.map((x) => [x.id, x])),
      r = new Map(theirs.map((x) => [x.id, x]))
    const result = new Map<string, T>()
    for (const id of [...new Set([...l.keys(), ...r.keys(), ...b.keys()])].sort()) {
      const a = b.get(id),
        x = l.get(id),
        y = r.get(id)
      let chosen: T | undefined
      if (equal(x, y)) chosen = x
      else if (equal(x, a)) chosen = y
      else if (equal(y, a)) chosen = x
      else {
        conflicts++
        chosen = x ?? y
        if (project && x && y) {
          const conflictId = `conflict-${hash(id + canonical(y))}-${hash(canonical(y) + id)}`
          // A retry or a different peer seeing the same conflict cannot create
          // another copy. Existing copies are allowed to contain later edits.
          if (!l.has(conflictId) && !r.has(conflictId)) {
            result.set(conflictId, {
              ...structuredClone(y),
              id: conflictId,
              title:
                (y as unknown as Project).title.slice(0, 165) +
                ' · ' +
                'Conflict ' +
                conflictId.slice(-8)
            } as T)
          }
        }
      }
      if (chosen) result.set(id, structuredClone(chosen))
    }
    return [...result.values()]
  }
  const settings = structuredClone(local.settings)
  for (const key of ['locale', 'writing', 'provider'] as const) {
    if (base && equal(local.settings[key], base.settings[key]))
      Object.assign(settings, { [key]: remote.settings[key] })
    else if (
      base &&
      !equal(remote.settings[key], base.settings[key]) &&
      !equal(local.settings[key], remote.settings[key])
    )
      settingsConflicts.push(key)
  }
  return {
    content: SyncContentSchema.parse({
      version: 1,
      projects: collection(base?.projects ?? [], local.projects, remote.projects, true),
      inbox: collection(base?.inbox ?? [], local.inbox, remote.inbox, false),
      settings
    }),
    conflicts,
    settingsConflicts
  }
}

export function applyShared(workspace: Workspace, content: SyncContent): Workspace {
  content = SyncContentSchema.parse(content)
  const result = structuredClone(workspace)
  result.projects = content.projects.map((p) => {
    const old = workspace.projects.find((x) => x.id === p.id)
    return {
      ...p,
      revision: old
        ? old.revision +
          (equal(sharedContent({ ...workspace, projects: [old] }).projects[0], p) ? 0 : 1)
        : 0,
      viewport: old?.viewport ?? { x: 30, y: 30, zoom: 0.8 }
    }
  })
  if (!result.projects.length) result.projects.push(newProject())
  if (result.projects.some((p) => p.ink?.length || p.blocks.some((b) => b.ink?.length)))
    result.version = 3
  if (!result.projects.some((p) => p.id === result.activeProjectId))
    result.activeProjectId = result.projects[0].id
  result.inbox = structuredClone(content.inbox)
  Object.assign(result.settings, structuredClone(content.settings))
  return validateWorkspace(result)
}
