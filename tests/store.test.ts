import { afterEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Store } from '../src/main/store'
import { aiBasis, getProject, writingBasis } from '../src/shared/domain'
const directories: string[] = []
async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'thoughtanchor-test-'))
  directories.push(dir)
  const store = new Store(dir)
  await store.load()
  return store
}
afterEach(async () => {
  vi.restoreAllMocks()
  for (const dir of directories.splice(0)) {
    const resolved = path.resolve(dir)
    if (
      !resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
      !path.basename(resolved).startsWith('thoughtanchor-test-')
    )
      throw new Error('Unsafe test cleanup')
    await fs.rm(resolved, { recursive: true, force: true })
  }
})
describe('durable command queue', () => {
  it('does not reset or overwrite valid v1 data if its migration backup cannot be saved', async () => {
    const s = await fixture(),
      raw = JSON.parse(await fs.readFile(s.filename, 'utf8'))
    raw.version = 1
    const original = JSON.stringify(raw)
    await fs.writeFile(s.filename, original)
    vi.spyOn(fs, 'copyFile').mockRejectedValue(
      Object.assign(new Error('backup blocked'), { code: 'EACCES' })
    )
    const reopened = new Store(s.directory)
    await expect(reopened.load()).rejects.toThrow('backup blocked')
    expect(await fs.readFile(s.filename, 'utf8')).toBe(original)
    expect(await fs.readdir(s.directory)).not.toContain('workspace.json.v1-backup')
  })
  it('backs up v1 before migration and persists v2 on reopen', async () => {
    const s = await fixture(),
      raw = JSON.parse(await fs.readFile(s.filename, 'utf8'))
    raw.version = 1
    delete raw.settings.locale
    delete raw.settings.writing
    raw.projects.forEach((p: any) => {
      delete p.draft
    })
    const original = JSON.stringify(raw)
    await fs.writeFile(s.filename, original)
    const migrated = new Store(s.directory)
    await migrated.load()
    expect(migrated.workspace.version).toBe(2)
    expect(await fs.readFile(s.filename + '.v1-backup', 'utf8')).toBe(original)
    expect(JSON.parse(await fs.readFile(s.filename, 'utf8')).version).toBe(2)
    const reopened = new Store(s.directory)
    await reopened.load()
    expect(reopened.workspace).toEqual(migrated.workspace)
  })
  it('persists an editable article draft and undoes adoption without modifying cards', async () => {
    const s = await fixture(),
      p = getProject(s.workspace),
      original = JSON.stringify(p.blocks)
    await s.command({ type: 'article', projectId: p.id, ids: p.blocks.map((b) => b.id) })
    const current = getProject(s.workspace),
      options = { ...s.workspace.settings.writing, locale: s.workspace.settings.locale }
    await s.command({
      type: 'article-draft',
      projectId: p.id,
      expectedBasis: writingBasis(current, options),
      draft: { text: '独立稿件🙂', sourceBasis: aiBasis(current), task: 'assemble', options }
    })
    await s.command({ type: 'undo' })
    expect(getProject(s.workspace).draft).toBeNull()
    await s.command({ type: 'redo' })
    const reopened = new Store(s.directory)
    await reopened.load()
    expect(getProject(reopened.workspace).draft?.text).toBe('独立稿件🙂')
    expect(JSON.stringify(getProject(reopened.workspace).blocks)).toBe(original)
  })
  it('undoes a child drag-out as one command', async () => {
    const s = await fixture(),
      p = getProject(s.workspace),
      id = p.blocks[0].id
    await s.command({
      type: 'group',
      projectId: p.id,
      ids: p.blocks.slice(0, 2).map((b) => b.id),
      title: 'group'
    })
    const parent = getProject(s.workspace).blocks.find((b) => b.id === id)!.parentId
    await s.command({ type: 'drop', projectId: p.id, id, x: 1300, y: 900 })
    expect(getProject(s.workspace).blocks.find((b) => b.id === id)!.parentId).toBeUndefined()
    await s.command({ type: 'undo' })
    expect(getProject(s.workspace).blocks.find((b) => b.id === id)!.parentId).toBe(parent)
  })
  it('saves 20 simultaneous captures exactly once and restores after reopening', async () => {
    const store = await fixture()
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => store.command({ type: 'capture', text: `闪念 ${i} 🧩` }))
    )
    const reopened = new Store(store.directory)
    await reopened.load()
    expect(new Set(reopened.workspace.inbox.map((n) => n.text)).size).toBe(20)
    expect(reopened.workspace.inbox).toHaveLength(20)
  })
  it('undoes a whole join but never erases later captures or drafts', async () => {
    const s = await fixture()
    const p = getProject(s.workspace)
    const ids = p.blocks.map((b) => b.id)
    await s.command({ type: 'group', projectId: p.id, ids: ids.slice(0, 2), title: '组合' })
    await s.command({ type: 'capture', text: '新的闪念' })
    await s.command({ type: 'draft', text: '仍在输入的文字' })
    await s.command({ type: 'undo' })
    expect(getProject(s.workspace).blocks).toHaveLength(3)
    expect(s.workspace.inbox[0].text).toBe('新的闪念')
    expect(s.workspace.captureDraft).toBe('仍在输入的文字')
    await s.command({ type: 'redo' })
    expect(getProject(s.workspace).blocks).toHaveLength(4)
    expect(s.workspace.inbox).toHaveLength(1)
  })
  it('restores consumed inbox notes with undo while preserving unrelated new ones', async () => {
    const s = await fixture()
    await s.command({ type: 'capture', text: '第一片' })
    const n = s.workspace.inbox[0]
    await s.command({
      type: 'inbox',
      projectId: s.workspace.activeProjectId,
      ids: [n.id],
      action: 'place'
    })
    await s.command({ type: 'capture', text: '后来的一片' })
    await s.command({ type: 'undo' })
    expect(s.workspace.inbox.map((n) => n.text).sort()).toEqual(['后来的一片', '第一片'].sort())
    await s.command({ type: 'redo' })
    expect(s.workspace.inbox.map((n) => n.text)).toEqual(['后来的一片'])
  })
  it('coalesces typing without capturing unrelated inbox additions in history', async () => {
    const s = await fixture()
    const p = getProject(s.workspace)
    const id = p.blocks[0].id
    const original = p.blocks[0].text
    await s.command({ type: 'edit', projectId: p.id, id, patch: { text: '写到一半' } })
    await s.command({ type: 'capture', text: '另一个闪念' })
    await s.command({ type: 'edit', projectId: p.id, id, patch: { text: '终于写完整了' } })
    await s.command({ type: 'undo' })
    expect(getProject(s.workspace).blocks[0].text).toBe(original)
    expect(s.workspace.inbox[0].text).toBe('另一个闪念')
  })
  it('recovers from a truncated primary and retains the damaged evidence', async () => {
    const s = await fixture()
    await s.command({ type: 'capture', text: '已保存的片段' })
    await s.command({ type: 'draft', text: '草稿' })
    await fs.writeFile(s.filename, '{truncated', 'utf8')
    const reopened = new Store(s.directory)
    await reopened.load()
    expect(reopened.recovery).toContain('备份恢复')
    expect(reopened.workspace.inbox[0].text).toBe('已保存的片段')
    expect((await fs.readdir(s.directory)).some((name) => name.includes('damaged'))).toBe(true)
    await reopened.command({ type: 'capture', text: '恢复后的片段' })
    expect(reopened.workspace.inbox).toHaveLength(2)
  })
  it('rejects an invalid mutation without changing the saved file', async () => {
    const s = await fixture()
    const before = await fs.readFile(s.filename, 'utf8')
    await expect(
      s.command({ type: 'delete', projectId: s.workspace.activeProjectId, ids: ['missing-id'] })
    ).rejects.toThrow()
    expect(await fs.readFile(s.filename, 'utf8')).toBe(before)
  })
  it('does not acknowledge a failed disk write and can save again afterward', async () => {
    const s = await fixture()
    const before = await fs.readFile(s.filename, 'utf8')
    const temp = `${s.filename}.${process.pid}.tmp`
    await fs.mkdir(temp)
    await expect(s.command({ type: 'capture', text: '尚未保存' })).rejects.toThrow()
    expect(s.workspace.inbox).toHaveLength(0)
    expect(await fs.readFile(s.filename, 'utf8')).toBe(before)
    await fs.rmdir(temp)
    await s.command({ type: 'capture', text: '这次已保存' })
    expect(s.workspace.inbox[0].text).toBe('这次已保存')
  })
})
