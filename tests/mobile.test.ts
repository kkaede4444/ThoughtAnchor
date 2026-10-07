import { describe, expect, it } from 'vitest'
import { resolveInterface } from '../src/shared/interface'
import { initialWorkspace, CommandSchema, SettingsSchema } from '../src/shared/model'
import { invoke } from '../src/native/domain'
import { sharedContent, reconcile, applyShared } from '../src/shared/sync'
import { chooseTool, previousTool, type ToolHistory } from '../src/shared/tools'
const call = (action: string, ...args: unknown[]): any => {
  const result = invoke({ action, args })
  if (result.error) throw new Error(result.error)
  return result.result
}
describe('device interfaces and ink', () => {
  it('switches between the last two selected tools and ignores repeated selection of the current tool', () => {
    for (const a of ['move', 'select', 'pen', 'erase'] as const)
      for (const b of ['move', 'select', 'pen', 'erase'] as const) {
        if (a === b) continue
        let h: ToolHistory = { current: a, previous: b }
        h = chooseTool(h, b)
        h = chooseTool(h, b)
        expect(previousTool(h).current).toBe(a)
        expect(previousTool(previousTool(h))).toEqual(h)
      }
  })
  it('saves card size and ink atomically, reflows its group, rejects stale sizes and restores both on undo', () => {
    const w = initialWorkspace(),
      b = w.projects[0].blocks[0]
    const command = (c: unknown) => {
      call('prepare-command', c)
      call('commit')
    }
    call('initialize', w)
    command({ type: 'group', projectId: w.activeProjectId, ids: [b.id], title: 'Resize group' })
    const before = call('snapshot', false, '', null).workspace.projects[0]
    const ink = [
      { id: 'resized-ink', color: '#292822', width: 3, points: [{ x: 60, y: 120, pressure: 0.5 }] }
    ]
    command({
      type: 'card-ink',
      projectId: w.activeProjectId,
      blockId: b.id,
      strokes: ink,
      size: { width: 420, height: 360 },
      expectedSize: JSON.stringify([b.width, b.height])
    })
    const after = call('snapshot', false, '', null).workspace.projects[0],
      resized = after.blocks.find((x: any) => x.id === b.id)
    expect([resized.width, resized.height]).toEqual([420, 360])
    expect(resized.text).toBe(b.text)
    expect(resized.ink).toEqual(ink)
    expect(after.blocks.find((x: any) => x.id === resized.parentId).width).toBe(460)
    expect(() =>
      command({
        type: 'card-ink',
        projectId: w.activeProjectId,
        blockId: b.id,
        strokes: [],
        size: { width: 300, height: 240 },
        expectedSize: JSON.stringify([b.width, b.height])
      })
    ).toThrow(/大小/)
    command({ type: 'undo' })
    expect(call('snapshot', false, '', null).workspace.projects[0].blocks).toEqual(before.blocks)
    command({ type: 'redo' })
    expect(
      call('export-project', w.activeProjectId).project.blocks.find((x: any) => x.id === b.id).width
    ).toBe(420)
    expect(
      call('export-project', w.activeProjectId).project.blocks.find((x: any) => x.id === b.id).ink
    ).toEqual(ink)
    expect(() =>
      CommandSchema.parse({
        type: 'card-ink',
        projectId: w.activeProjectId,
        blockId: b.id,
        strokes: [],
        size: { width: 0, height: 360 }
      })
    ).toThrow()
  })
  it('defaults direct card drawing off for new and existing settings and keeps it device-local', () => {
    const w = initialWorkspace()
    expect(w.settings.directCardDrawing).toBe(false)
    const { directCardDrawing, ...old } = w.settings
    expect(SettingsSchema.parse(old).directCardDrawing).toBe(false)
    const remote = structuredClone(w)
    remote.settings.directCardDrawing = true
    const received = applyShared(w, sharedContent(remote))
    expect(received.settings.directCardDrawing).toBe(false)
    expect(applyShared(remote, sharedContent(w)).settings.directCardDrawing).toBe(true)
  })
  it('atomically appends inline strokes, preserves text and size, and undoes each gesture', () => {
    const w = initialWorkspace(),
      b = w.projects[0].blocks[0]
    call('initialize', w)
    const stroke = {
      id: 'inline-1',
      color: '#292822',
      width: 3,
      points: [{ x: 30, y: 50, pressure: 0.3 }]
    }
    const command = (c: unknown) => {
      call('prepare-command', c)
      call('commit')
    }
    const content = () => call('snapshot', false, '', null).workspace.projects[0].blocks[0]
    command({ type: 'card-ink-add', projectId: w.activeProjectId, blockId: b.id, stroke })
    command({
      type: 'card-ink-add',
      projectId: w.activeProjectId,
      blockId: b.id,
      stroke: { ...stroke, id: 'inline-2' }
    })
    expect(content().ink.map((s: any) => s.id)).toEqual(['inline-1', 'inline-2'])
    expect(content().height).toBe(b.height)
    expect(content().text).toBe(b.text)
    command({ type: 'undo' })
    expect(content().ink).toEqual([stroke])
    command({ type: 'redo' })
    command({
      type: 'card-ink-delete',
      projectId: w.activeProjectId,
      blockId: b.id,
      ids: ['inline-1', 'inline-2']
    })
    expect(content().ink).toEqual([])
    command({ type: 'undo' })
    expect(content().ink).toHaveLength(2)
    expect(call('export-project', w.activeProjectId).project.blocks[0].ink).toEqual(content().ink)
  })
  it('defaults tablets and Windows to desktop and retains explicit overrides', () => {
    expect(resolveInterface('auto', 'android', true)).toBe('desktop')
    expect(resolveInterface('auto', 'android', false)).toBe('mobile')
    expect(resolveInterface('auto', 'windows', false)).toBe('desktop')
    expect(resolveInterface('mobile', 'android', true)).toBe('mobile')
    expect(resolveInterface('desktop', 'android', false)).toBe('desktop')
  })
  it('persists pen pressure through export/import and undoes erasure as one command', () => {
    const w = initialWorkspace()
    call('initialize', w)
    const stroke = {
      id: 'stroke-1',
      color: '#292822',
      width: 3,
      points: [
        { x: -20, y: 50, pressure: 0.2 },
        { x: 90, y: 120, pressure: 0.8 }
      ]
    }
    const command = (c: unknown) => {
      call('prepare-command', c)
      call('commit')
    }
    command({ type: 'ink-add', projectId: w.activeProjectId, stroke })
    const exported = call('export-project', w.activeProjectId)
    expect(exported.version).toBe(3)
    expect(exported.project.ink).toEqual([stroke])
    command({ type: 'ink-delete', projectId: w.activeProjectId, ids: [stroke.id] })
    command({ type: 'undo' })
    expect(call('snapshot', false, '', null).workspace.projects[0].ink).toEqual([stroke])
    call('prepare-import', exported)
    call('commit')
    expect(call('snapshot', false, '', null).workspace.projects.at(-1).ink).toEqual([stroke])
    expect(() =>
      CommandSchema.parse({
        type: 'ink-add',
        projectId: w.activeProjectId,
        stroke: { ...stroke, points: [{ x: Infinity, y: 1, pressure: 1 }] }
      })
    ).toThrow()
  })
  it('keeps drawings inside cards across grouping, export, undo and sync', () => {
    const w = initialWorkspace()
    call('initialize', w)
    const b = w.projects[0].blocks[0]
    const stroke = {
      id: 'card-pen',
      color: '#87a9ce',
      width: 6,
      points: [
        { x: 10, y: 30, pressure: 0.2 },
        { x: 250, y: 170, pressure: 0.8 }
      ]
    }
    const command = (c: unknown) => {
      call('prepare-command', c)
      call('commit')
    }
    command({ type: 'card-ink', projectId: w.activeProjectId, blockId: b.id, strokes: [stroke] })
    const drawn = call('snapshot', false, '', null).workspace
    expect(drawn.projects[0].blocks[0].ink).toEqual([stroke])
    expect(drawn.projects[0].blocks[0].text).toBe(b.text)
    expect(drawn.projects[0].ink).toBeUndefined()
    const file = call('export-project', w.activeProjectId)
    expect(file.version).toBe(3)
    command({ type: 'group', projectId: w.activeProjectId, ids: [b.id], title: 'Sketch group' })
    expect(
      call('snapshot', false, '', null).workspace.projects[0].blocks.find((x: any) => x.id === b.id)
        .ink
    ).toEqual([stroke])
    const remote = applyShared(initialWorkspace(), sharedContent(drawn))
    expect(remote.projects.find((p) => p.id === w.activeProjectId)?.blocks[0].ink).toEqual([stroke])
    expect(remote.version).toBe(3)
    command({ type: 'undo' })
    command({ type: 'undo' })
    expect(call('snapshot', false, '', null).workspace.projects[0].blocks[0].ink).toBeUndefined()
    call('prepare-import', file)
    call('commit')
    expect(call('snapshot', false, '', null).workspace.projects.at(-1).blocks[0].ink).toEqual([
      stroke
    ])
    expect(() =>
      call('prepare-command', {
        type: 'card-ink',
        projectId: w.activeProjectId,
        blockId: b.id,
        strokes: [],
        expectedInk: 'stale'
      })
    ).toThrow()
  })
})
describe('local network reconciliation', () => {
  it('preserves independent projects and both conflicting papers without retry duplicates', () => {
    const base = sharedContent(initialWorkspace()),
      ours = structuredClone(base),
      theirs = structuredClone(base)
    ours.projects[0].blocks[0].text = 'Desktop edit'
    theirs.projects[0].blocks[0].text = 'Phone edit'
    const first = reconcile(base, ours, theirs)
    expect(first.content.projects).toHaveLength(2)
    expect(first.content.projects.map((p) => p.blocks[0].text).sort()).toEqual([
      'Desktop edit',
      'Phone edit'
    ])
    expect(reconcile(base, first.content, theirs).content.projects).toHaveLength(2)
  })
  it('does not resurrect a consumed inbox item and retains edit/delete conflicts', () => {
    const w = initialWorkspace()
    w.inbox.push({ id: 'note', text: 'Captured', color: 'sage', createdAt: '2026-10-07' })
    const base = sharedContent(w),
      ours = structuredClone(base),
      theirs = structuredClone(base)
    ours.inbox = []
    ours.projects = []
    theirs.projects[0].blocks[0].text = 'Offline retained edit'
    const merged = reconcile(base, ours, theirs).content
    expect(merged.inbox).toEqual([])
    expect(merged.projects[0].blocks[0].text).toBe('Offline retained edit')
  })
  it('keeps interface, keys and viewports local while syncing ink and common settings', () => {
    const w = initialWorkspace()
    w.settings.interfaceMode = 'desktop'
    w.projects[0].viewport = { x: 500, y: 300, zoom: 2 }
    const content = sharedContent(w)
    content.settings.locale = 'ja-JP'
    content.projects[0].ink = [
      { id: 'pen', width: 3, color: '#292822', points: [{ x: 4, y: 6, pressure: 0.7 }] }
    ]
    expect(JSON.stringify(content)).not.toMatch(
      /interfaceMode|viewport|shortcut|captureDraft|welcomeComplete/
    )
    const applied = applyShared(w, content)
    expect(applied.settings.interfaceMode).toBe('desktop')
    expect(applied.settings.welcomeComplete).toBe(w.settings.welcomeComplete)
    expect(applied.projects[0].viewport).toEqual(w.projects[0].viewport)
    expect(applied.settings.locale).toBe('ja-JP')
    expect(applied.version).toBe(3)
  })
})
