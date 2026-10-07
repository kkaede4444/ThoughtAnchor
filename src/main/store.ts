import { t, tr } from '../shared/i18n'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Command, CommandSchema, Project, Workspace, initialWorkspace } from '../shared/model'
import { applyCommand, importFile, validateWorkspace } from '../shared/domain'

type Entry = { before: Workspace; after: Workspace; coalesce?: string; at: number }
export class Store {
  workspace: Workspace = initialWorkspace()
  recovery: string | null = null
  private undoStack: Entry[] = []
  private redoStack: Entry[] = []
  private queue: Promise<unknown> = Promise.resolve()
  constructor(readonly directory: string) {}
  get filename(): string {
    return path.join(this.directory, 'workspace.json')
  }
  get canUndo(): boolean {
    return this.undoStack.length > 0
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0
  }
  async load(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true })
    let invalid = false
    for (const filename of [this.filename, `${this.filename}.bak`, `${this.filename}.bak2`]) {
      let raw: { version?: number }, validated: Workspace
      try {
        raw = JSON.parse(await fs.readFile(filename, 'utf8'))
        validated = validateWorkspace(raw)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          invalid = true
          if (filename === this.filename)
            await fs.copyFile(filename, `${this.filename}.damaged-${Date.now()}`).catch(() => {})
        }
        continue
      }
      this.workspace = validated
      // A backup or migration write failure must stop loading, never reset valid data.
      if (raw.version === 1) {
        const backup = `${this.filename}.v1-backup`
        try {
          await fs.copyFile(filename, backup, fs.constants.COPYFILE_EXCL)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
          const previous = await fs.readFile(backup, 'utf8').catch(() => null)
          if (previous !== (await fs.readFile(filename, 'utf8')))
            await fs.copyFile(filename, `${backup}-${Date.now()}`, fs.constants.COPYFILE_EXCL)
        }
        await this.persist(this.workspace)
      }
      if (invalid) this.recovery = '上次的文件不完整，已从最近的备份恢复。损坏文件已保留。'
      return
    }
    if (invalid) this.recovery = '无法读取原文件和备份。原文件已保留，请打开数据目录检查。'
    await this.persist(this.workspace)
  }
  private async persist(w: Workspace): Promise<void> {
    const temp = `${this.filename}.${process.pid}.tmp`
    const handle = await fs.open(temp, 'w', 0o600)
    try {
      await handle.writeFile(JSON.stringify(w, null, 2), 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    // Only rotate a validated previous version; never replace a good backup with corruption.
    let previous: string | null = null
    try {
      previous = await fs.readFile(this.filename, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (previous !== null) {
      try {
        validateWorkspace(JSON.parse(previous))
      } catch {
        previous = null
      }
    }
    if (previous !== null) {
      await fs.copyFile(`${this.filename}.bak`, `${this.filename}.bak2`).catch((error) => {
        if (error.code !== 'ENOENT') throw error
      })
      await fs.writeFile(`${this.filename}.bak`, previous, { mode: 0o600 })
    }
    await fs.rename(temp, this.filename)
  }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work)
    this.queue = next.catch(() => {})
    return next
  }
  async flush(): Promise<void> {
    await this.queue
  }
  command(input: unknown): Promise<Workspace> {
    const c = CommandSchema.parse(input)
    return this.enqueue(async () => {
      const before = structuredClone(this.workspace)
      let next = structuredClone(before)
      let entry: Entry | undefined
      if (c.type === 'undo' || c.type === 'redo') {
        entry = (c.type === 'undo' ? this.undoStack : this.redoStack).at(-1)
        if (!entry) return this.workspace
        next = this.replay(next, entry, c.type === 'undo')
      } else applyCommand(next, c)
      validateWorkspace(next)
      if (JSON.stringify(before) === JSON.stringify(next)) return this.workspace
      await this.persist(next)
      this.workspace = next
      if (entry) {
        if (c.type === 'undo') {
          this.undoStack.pop()
          this.redoStack.push(entry)
        } else {
          this.redoStack.pop()
          this.undoStack.push(entry)
        }
      } else if (this.historical(c)) {
        const coalesce =
          c.type === 'edit'
            ? `${c.projectId}:${c.id}`
            : c.type === 'article-draft' && !c.expectedBasis
              ? `${c.projectId}:article-draft`
              : undefined
        const last = this.undoStack.at(-1)
        if (
          coalesce &&
          last?.coalesce === coalesce &&
          Date.now() - last.at < 900 &&
          (c.type === 'edit' || c.type === 'article-draft')
        ) {
          last.after.projects = last.after.projects.map((p) =>
            p.id === c.projectId
              ? structuredClone(next.projects.find((p) => p.id === c.projectId)!)
              : p
          )
          last.at = Date.now()
        } else
          this.undoStack.push({ before, after: structuredClone(next), coalesce, at: Date.now() })
        if (this.undoStack.length > 100) this.undoStack.shift()
        this.redoStack = []
      }
      return this.workspace
    })
  }
  private historical(c: Command): boolean {
    return (
      !['capture', 'draft', 'settings', 'viewport', 'undo', 'redo'].includes(c.type) &&
      !(c.type === 'project' && c.action === 'select')
    )
  }
  private replay(w: Workspace, e: Entry, undo: boolean): Workspace {
    const from = undo ? e.after : e.before
    const to = undo ? e.before : e.after
    const ids = new Set([...from.projects, ...to.projects].map((p) => p.id))
    for (const id of ids) {
      const a = from.projects.find((p) => p.id === id)
      const b = to.projects.find((p) => p.id === id)
      if (JSON.stringify(a) === JSON.stringify(b)) continue
      const current = w.projects.find((p) => p.id === id)
      w.projects = w.projects.filter((p) => p.id !== id)
      if (b) {
        const restored = structuredClone(b)
        restored.revision = (current?.revision ?? b.revision) + 1
        w.projects.push(restored)
      }
    }
    const inboxIds = new Set([...from.inbox, ...to.inbox].map((n) => n.id))
    for (const id of inboxIds) {
      const a = from.inbox.find((n) => n.id === id)
      const b = to.inbox.find((n) => n.id === id)
      if (JSON.stringify(a) === JSON.stringify(b)) continue
      w.inbox = w.inbox.filter((n) => n.id !== id)
      if (b) w.inbox.push(structuredClone(b))
    }
    if (!w.projects.some((p) => p.id === w.activeProjectId)) w.activeProjectId = w.projects[0].id
    return w
  }
  import(value: unknown): Promise<Workspace> {
    const file = importFile(value)
    return this.enqueue(async () => {
      const before = structuredClone(this.workspace)
      const next = structuredClone(before)
      const project: Project = structuredClone(file.project)
      project.id = crypto.randomUUID()
      project.title = tr`${project.title.slice(0, 190)}（导入）`
      project.revision = 0
      next.projects.push(project)
      next.activeProjectId = project.id
      validateWorkspace(next)
      await this.persist(next)
      this.workspace = next
      this.undoStack.push({ before, after: structuredClone(next), at: Date.now() })
      this.redoStack = []
      return this.workspace
    })
  }
}
