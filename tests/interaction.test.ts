import { describe, expect, it } from 'vitest'
import { initialWorkspace, textBlock } from '../src/shared/model'
import {
  applyCommand,
  getBlock,
  getProject,
  importFile,
  nearestPorts,
  relationPorts,
  validateWorkspace,
  worldPosition
} from '../src/shared/domain'
const fixture = () => {
  const w = initialWorkspace(),
    p = getProject(w)
  p.relations = []
  return { w, p, a: p.blocks[0], b: p.blocks[1], c: p.blocks[2] }
}
describe('board relationships and atomic drops', () => {
  it('uses the dropped world position before deduplicating automatic relation ports', () => {
    const { w, p, a, b } = fixture()
    a.x = 0
    a.y = 0
    b.x = 500
    b.y = 0
    applyCommand(w, {
      type: 'snap',
      projectId: p.id,
      source: a.id,
      target: b.id,
      mode: 'relation',
      sourceHandle: 'right',
      targetHandle: 'left'
    })
    applyCommand(w, {
      type: 'drop',
      projectId: p.id,
      id: a.id,
      x: 500,
      y: -250,
      target: b.id,
      mode: 'relation'
    })
    expect(p.relations).toHaveLength(2)
    expect(p.relations[1]).toMatchObject({
      routing: 'auto',
      sourceHandle: 'bottom',
      targetHandle: 'top'
    })
    expect(p.relations[0]).toMatchObject({
      routing: 'manual',
      sourceHandle: 'right',
      targetHandle: 'left'
    })
  })
  it('deduplicates reciprocal endpoints while allowing distinct endpoint pairs', () => {
    const { w, p, a, b } = fixture()
    const connect = (
      source: string,
      target: string,
      sourceHandle: 'right' | 'top',
      targetHandle: 'left' | 'bottom'
    ) =>
      applyCommand(w, {
        type: 'snap',
        projectId: p.id,
        mode: 'relation',
        source,
        target,
        sourceHandle,
        targetHandle
      })
    connect(a.id, b.id, 'right', 'left')
    connect(a.id, b.id, 'right', 'left')
    applyCommand(w, {
      type: 'snap',
      projectId: p.id,
      mode: 'relation',
      source: b.id,
      target: a.id,
      sourceHandle: 'left',
      targetHandle: 'right'
    })
    expect(p.relations).toHaveLength(1)
    connect(a.id, b.id, 'top', 'bottom')
    expect(p.relations).toHaveLength(2)
    applyCommand(w, { type: 'relation', projectId: p.id, id: p.relations[0].id, label: null })
    expect(p.relations).toHaveLength(1)
  })
  it('allows one point to connect many cards', () => {
    const { w, p, a } = fixture()
    for (let i = 0; i < 40; i++) {
      const target = textBlock('target', i * 300, 500)
      p.blocks.push(target)
      applyCommand(w, {
        type: 'snap',
        projectId: p.id,
        mode: 'relation',
        source: a.id,
        target: target.id,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
    }
    expect(p.relations).toHaveLength(40)
  })
  it('uses geometry for automatic ports and preserves manually chosen ports after movement', () => {
    const { w, p, a, b } = fixture()
    a.x = 0
    a.y = 0
    b.x = 500
    b.y = 0
    expect(nearestPorts(p, a.id, b.id)).toEqual({ sourceHandle: 'right', targetHandle: 'left' })
    applyCommand(w, { type: 'snap', projectId: p.id, mode: 'relation', source: a.id, target: b.id })
    applyCommand(w, { type: 'move', projectId: p.id, moves: [{ id: b.id, x: 0, y: 500 }] })
    expect(relationPorts(p, p.relations[0])).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top'
    })
    applyCommand(w, {
      type: 'snap',
      projectId: p.id,
      mode: 'relation',
      source: a.id,
      target: b.id,
      sourceHandle: 'left',
      targetHandle: 'right'
    })
    applyCommand(w, { type: 'move', projectId: p.id, moves: [{ id: b.id, x: 500, y: 0 }] })
    expect(relationPorts(p, p.relations[1])).toEqual({
      sourceHandle: 'left',
      targetHandle: 'right'
    })
  })
  it('reorders within the same group, then detaches at the actual world drop position', () => {
    const { w, p, a, b } = fixture()
    applyCommand(w, { type: 'group', projectId: p.id, ids: [a.id, b.id], title: 'group' })
    const parent = getBlock(p, a.parentId!),
      pos = worldPosition(p, b.id)
    applyCommand(w, { type: 'drop', projectId: p.id, id: a.id, x: pos.x, y: pos.y + 30 })
    expect(parent.children).toEqual([b.id, a.id])
    applyCommand(w, { type: 'drop', projectId: p.id, id: a.id, x: 1400, y: 900 })
    expect(a.parentId).toBeUndefined()
    expect(worldPosition(p, a.id)).toEqual({ x: 1400, y: 900 })
    expect(parent.children).toEqual([b.id])
  })
  it('transfers children to another group without cycles or loss of original text', () => {
    const { w, p, a, b, c } = fixture(),
      original = a.text
    applyCommand(w, { type: 'group', projectId: p.id, ids: [a.id, b.id], title: 'first' })
    const first = a.parentId!
    applyCommand(w, { type: 'group', projectId: p.id, ids: [c.id], title: 'second' })
    const second = c.parentId!
    applyCommand(w, {
      type: 'drop',
      projectId: p.id,
      id: a.id,
      x: 400,
      y: 400,
      target: second,
      mode: 'group'
    })
    expect(getBlock(p, first).children).not.toContain(a.id)
    expect(getBlock(p, second).children).toContain(a.id)
    expect(a.text).toBe(original)
    expect(() =>
      applyCommand(w, {
        type: 'drop',
        projectId: p.id,
        id: second,
        x: 0,
        y: 0,
        target: a.id,
        mode: 'group'
      })
    ).toThrow()
  })
  it('migrates v1 workspace and files reversibly, and round-trips all v2 additions', () => {
    const { w, p, a, b } = fixture()
    applyCommand(w, { type: 'snap', projectId: p.id, mode: 'relation', source: a.id, target: b.id })
    const old = JSON.parse(JSON.stringify(w))
    old.version = 1
    delete old.settings.locale
    delete old.settings.writing
    for (const project of old.projects) {
      delete project.draft
      for (const r of project.relations) {
        delete r.routing
        delete r.sourceHandle
        delete r.targetHandle
      }
    }
    const before = JSON.stringify(old),
      migrated = validateWorkspace(old)
    expect(migrated.version).toBe(2)
    expect(migrated.settings.locale).toBe('zh-CN')
    expect(migrated.projects[0].relations[0].routing).toBe('auto')
    expect(migrated.projects[0].relations[0].sourceHandle).toBeDefined()
    expect(migrated.projects[0].relations[0].targetHandle).toBeDefined()
    expect(JSON.stringify(old)).toBe(before)
    const file = importFile({ format: 'thoughtanchor', version: 1, project: old.projects[0] })
    expect(file.version).toBe(2)
    expect(validateWorkspace(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated)
    expect(
      importFile(JSON.parse(JSON.stringify({ format: 'thoughtanchor', version: 2, project: p })))
        .project
    ).toEqual(p)
  })
})
