import { describe, expect, it } from 'vitest'
import {
  aiBasis,
  applyCommand,
  articleText,
  blockText,
  canSubmitCapture,
  findSnap,
  getBlock,
  importFile,
  normalizeArticle,
  pairBasis,
  validateProject,
  validateWorkspace,
  worldPosition
} from '../src/shared/domain'
import { initialWorkspace, textBlock } from '../src/shared/model'

function fixture() {
  const w = initialWorkspace()
  const p = w.projects[0]
  p.relations = []
  return { w, p, a: p.blocks[0], b: p.blocks[1], c: p.blocks[2] }
}
describe('same content across board and article', () => {
  it('groups, folds, assembles and splits without rewriting the original text', () => {
    const { w, p, a, b } = fixture()
    const original = [a.text, b.text]
    applyCommand(w, { type: 'article', projectId: p.id, ids: [a.id, b.id] })
    applyCommand(w, { type: 'group', projectId: p.id, ids: [a.id, b.id], title: '同一板块' })
    const group = p.blocks.find((b) => b.kind === 'group')!
    expect(p.article).toEqual([group.id])
    expect(blockText(p, group.id)).toBe(original.join('\n\n'))
    applyCommand(w, { type: 'edit', projectId: p.id, id: group.id, patch: { collapsed: true } })
    expect(articleText(p)).toBe(original.join('\n\n'))
    applyCommand(w, { type: 'ungroup', projectId: p.id, id: group.id })
    expect(p.article).toEqual([a.id, b.id])
    expect(
      p.blocks.filter((block) => [a.id, b.id].includes(block.id)).map((block) => block.text)
    ).toEqual(original)
    validateProject(p)
  })
  it('supports nested reusable groups, with single ownership and no cycles', () => {
    const { w, p, a, b, c } = fixture()
    applyCommand(w, { type: 'group', projectId: p.id, ids: [a.id, b.id], title: '内层' })
    const inner = p.blocks.find((b) => b.kind === 'group')!
    applyCommand(w, { type: 'group', projectId: p.id, ids: [inner.id, c.id], title: '外层' })
    const outer = p.blocks.find((b) => b.title === '外层')!
    expect(blockText(p, outer.id)).toBe([a.text, b.text, c.text].join('\n\n'))
    expect(() =>
      applyCommand(w, {
        type: 'snap',
        projectId: p.id,
        source: outer.id,
        target: a.id,
        mode: 'group'
      })
    ).toThrow()
    expect(normalizeArticle(p, [a.id, outer.id, inner.id])).toEqual([outer.id])
    validateProject(p)
  })
  it('previews the real snap decision and allows loose space', () => {
    const { p, a, b } = fixture()
    expect(findSnap(p, a.id, { x: b.x + 60, y: b.y + 10 })?.mode).toBe('before')
    expect(findSnap(p, a.id, { x: b.x + 60, y: b.y + b.height - 10 })?.mode).toBe('after')
    expect(findSnap(p, a.id, { x: b.x + 80, y: b.y + 80 })?.mode).toBe('group')
    expect(findSnap(p, a.id, { x: b.x + 4, y: b.y + 80 })?.mode).toBe('relation')
    expect(findSnap(p, a.id, { x: 3000, y: 3000 })).toBeNull()
  })
  it('uses named template slots and preserves absolute position when detaching', () => {
    const { w, p, a } = fixture()
    applyCommand(w, { type: 'template', projectId: p.id, template: 'clarify' })
    const slot = p.blocks.find((b) => b.kind === 'slot')!
    applyCommand(w, { type: 'snap', projectId: p.id, source: a.id, target: slot.id, mode: 'group' })
    const before = worldPosition(p, a.id)
    applyCommand(w, { type: 'detach', projectId: p.id, id: a.id })
    expect(worldPosition(p, a.id)).toEqual(before)
    expect(getBlock(p, slot.id).children).toEqual([])
    validateProject(p)
  })
  it('keeps a new subgroup and its split children in the original template slot', () => {
    const { w, p, a, b } = fixture()
    applyCommand(w, { type: 'template', projectId: p.id, template: 'write' })
    const slot = p.blocks.find((b) => b.kind === 'slot')!
    applyCommand(w, { type: 'snap', projectId: p.id, source: a.id, target: slot.id, mode: 'group' })
    applyCommand(w, { type: 'snap', projectId: p.id, source: b.id, target: a.id, mode: 'group' })
    const group = getBlock(p, slot.children[0])
    expect(group.kind).toBe('group')
    expect(group.parentId).toBe(slot.id)
    expect(blockText(p, slot.id)).toBe([a.text, b.text].join('\n\n'))
    applyCommand(w, { type: 'ungroup', projectId: p.id, id: group.id })
    expect(slot.children).toEqual([a.id, b.id])
    expect(a.parentId).toBe(slot.id)
    validateProject(p)
  })
  it('removes stale connectors when text or order changes', () => {
    const { w, p, a, b, c } = fixture()
    p.article = [a.id, b.id, c.id]
    const basis = pairBasis(p, a.id, b.id)
    applyCommand(w, {
      type: 'connector',
      projectId: p.id,
      leftId: a.id,
      rightId: b.id,
      text: '接着看见了新的线索。',
      basis
    })
    expect(articleText(p)).toContain('接着看见了新的线索。')
    expect(a.text).not.toContain('接着看见')
    applyCommand(w, { type: 'edit', projectId: p.id, id: b.id, patch: { text: b.text + '。' } })
    expect(p.connectors).toEqual([])
    expect(() =>
      applyCommand(w, {
        type: 'connector',
        projectId: p.id,
        leftId: a.id,
        rightId: b.id,
        text: '旧建议',
        basis
      })
    ).toThrow()
  })
  it('rejects cyclic, dangling, duplicated or unsupported imports', () => {
    const { p, a, b } = fixture()
    const file = { format: 'thoughtanchor', version: 1, project: p }
    expect(importFile(file).project.blocks.length).toBe(3)
    expect(() => importFile({ ...file, version: 2 })).toThrow()
    a.kind = 'group'
    b.kind = 'group'
    a.text = ''
    b.text = ''
    a.parentId = b.id
    b.parentId = a.id
    a.children = [b.id]
    b.children = [a.id]
    expect(() => importFile(file)).toThrow(/互相包含/)
  })
  it('checks AI suggestion freshness again at command application time', () => {
    const { w, p, a, b } = fixture()
    p.article = [a.id, b.id]
    const basis = aiBasis(p)
    applyCommand(w, {
      type: 'edit',
      projectId: p.id,
      id: a.id,
      patch: { text: '等待时已经改过了' }
    })
    expect(() =>
      applyCommand(w, { type: 'article', projectId: p.id, ids: [b.id, a.id], expectedBasis: basis })
    ).toThrow(/失效/)
    expect(p.article).toEqual([a.id, b.id])
  })
  it('handles a 300-card, 500-relation project and round-trips long Unicode text', () => {
    const { w, p } = fixture()
    p.blocks = Array.from({ length: 300 }, (_, i) =>
      textBlock(
        `片段${i} 🧩\n保留全角标点：${'内容'.repeat(i === 0 ? 3000 : 4)}`,
        (i % 20) * 300,
        Math.floor(i / 20) * 210
      )
    )
    p.relations = Array.from({ length: 500 }, (_, i) => ({
      id: `edge-${i}`,
      source: p.blocks[i % 300].id,
      target: p.blocks[(i + 1) % 300].id,
      label: '相关'
    }))
    p.article = p.blocks.map((b) => b.id)
    const saved = validateWorkspace(JSON.parse(JSON.stringify(w)))
    expect(articleText(saved.projects[0])).toBe(articleText(p))
    expect(
      importFile({ format: 'thoughtanchor', version: 1, project: saved.projects[0] }).project
        .relations
    ).toHaveLength(500)
  })
  it('does not submit IME confirmation or Shift+Enter', () => {
    expect(canSubmitCapture('Enter', false, true)).toBe(false)
    expect(canSubmitCapture('Enter', true, false)).toBe(false)
    expect(canSubmitCapture('Enter', false, false)).toBe(true)
  })
})
