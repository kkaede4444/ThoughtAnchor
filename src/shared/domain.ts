import {
  Block,
  Command,
  FileSchema,
  Project,
  ProjectFile,
  Workspace,
  WorkspaceSchema,
  newProject,
  textBlock,
  uid
} from './model'

export function getProject(w: Workspace, id = w.activeProjectId): Project {
  const p = w.projects.find((p) => p.id === id)
  if (!p) throw new Error('这张思路纸已经不存在。')
  return p
}
export function getBlock(p: Project, id: string): Block {
  const b = p.blocks.find((b) => b.id === id)
  if (!b) throw new Error('这个片段已经不存在。')
  return b
}
export function ancestors(p: Project, id: string): string[] {
  const result: string[] = []
  let b = getBlock(p, id)
  while (b.parentId) {
    result.push(b.parentId)
    b = getBlock(p, b.parentId)
  }
  return result
}
export function descendants(p: Project, id: string): string[] {
  return getBlock(p, id).children.flatMap((child) => [child, ...descendants(p, child)])
}
export function worldPosition(p: Project, id: string): { x: number; y: number } {
  const b = getBlock(p, id)
  if (!b.parentId) return { x: b.x, y: b.y }
  const parent = worldPosition(p, b.parentId)
  return { x: b.x + parent.x, y: b.y + parent.y }
}
export function blockText(p: Project, id: string): string {
  const b = getBlock(p, id)
  return b.kind === 'text' ? b.text : b.children.map((child) => blockText(p, child)).join('\n\n')
}
export function hash(value: string): string {
  let a = 2166136261
  let b = 2246822519
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619)
    b = Math.imul(b ^ value.charCodeAt(i), 3266489917)
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0')
}
export function pairBasis(p: Project, left: string, right: string): string {
  return hash(JSON.stringify([left, blockText(p, left), right, blockText(p, right)]))
}
export function aiBasis(p: Project): string {
  return hash(JSON.stringify(p.article.map((id) => [id, getBlock(p, id).title, blockText(p, id)])))
}
export function normalizeArticle(p: Project, ids: string[]): string[] {
  const known = new Set(p.blocks.map((b) => b.id))
  const unique = [...new Set(ids)]
  if (unique.some((id) => !known.has(id))) throw new Error('成文中包含已移除的片段。')
  const chosen = new Set(unique)
  return unique.filter((id) => !ancestors(p, id).some((parent) => chosen.has(parent)))
}
export function cleanConnectors(p: Project): void {
  p.connectors = p.connectors.filter((c) => {
    const i = p.article.indexOf(c.leftId)
    return i >= 0 && p.article[i + 1] === c.rightId && c.basis === pairBasis(p, c.leftId, c.rightId)
  })
}
export function articleText(p: Project, markdown = false): string {
  const parts: string[] = []
  if (markdown) parts.push(`# ${p.title}`)
  p.article.forEach((id, i) => {
    const b = getBlock(p, id)
    if (markdown && b.title) parts.push(`## ${b.title}`)
    parts.push(blockText(p, id))
    const next = p.article[i + 1]
    const c = p.connectors.find(
      (c) => c.leftId === id && c.rightId === next && c.basis === pairBasis(p, id, next)
    )
    if (c) parts.push(c.text)
  })
  return parts.join('\n\n')
}
export function validateProject(p: Project): Project {
  const ids = new Set(p.blocks.map((b) => b.id))
  if (ids.size !== p.blocks.length) throw new Error('文件中有重复的片段编号。')
  for (const b of p.blocks) {
    if (b.kind === 'text' && b.children.length) throw new Error('文字片段不能拥有子片段。')
    if (b.kind !== 'text' && b.text !== '') throw new Error('组合的文字应保存在子片段中。')
    if (new Set(b.children).size !== b.children.length) throw new Error('组合中有重复片段。')
    if (b.parentId && (!ids.has(b.parentId) || !getBlock(p, b.parentId).children.includes(b.id)))
      throw new Error('片段的组合归属无效。')
    for (const child of b.children)
      if (!ids.has(child) || getBlock(p, child).parentId !== b.id)
        throw new Error('组合中的片段归属无效。')
    let cursor: Block | undefined = b
    const seen = new Set<string>()
    while (cursor) {
      if (seen.has(cursor.id)) throw new Error('组合不能互相包含。')
      seen.add(cursor.id)
      cursor = cursor.parentId ? getBlock(p, cursor.parentId) : undefined
    }
  }
  if (new Set(p.relations.map((r) => r.id)).size !== p.relations.length)
    throw new Error('文件中有重复的关系编号。')
  if (p.relations.some((r) => !ids.has(r.source) || !ids.has(r.target) || r.source === r.target))
    throw new Error('关系的两端无效。')
  if (JSON.stringify(p.article) !== JSON.stringify(normalizeArticle(p, p.article)))
    throw new Error('成文中的片段被重复包含。')
  if (new Set(p.connectors.map((c) => `${c.leftId}:${c.rightId}`)).size !== p.connectors.length)
    throw new Error('过渡句重复。')
  cleanConnectors(p)
  return p
}
export function validateWorkspace(value: unknown): Workspace {
  const w = WorkspaceSchema.parse(value)
  if (
    new Set(w.projects.map((p) => p.id)).size !== w.projects.length ||
    !w.projects.some((p) => p.id === w.activeProjectId)
  )
    throw new Error('思路纸编号无效。')
  if (new Set(w.inbox.map((n) => n.id)).size !== w.inbox.length) throw new Error('收件盒编号重复。')
  w.projects.forEach(validateProject)
  return w
}
export function importFile(value: unknown): ProjectFile {
  const file = FileSchema.parse(value)
  validateProject(file.project)
  return file
}
function layout(p: Project, id: string): void {
  const b = getBlock(p, id)
  if (b.kind === 'text') return
  let y = 68
  let width = 304
  for (const childId of b.children) {
    const child = getBlock(p, childId)
    layout(p, childId)
    child.x = 20
    child.y = y
    y += (child.collapsed ? 62 : child.height) + 20
    width = Math.max(width, child.width + 40)
  }
  b.width = width
  b.height = Math.max(150, y)
}
function reflow(p: Project): void {
  p.blocks.filter((b) => !b.parentId && b.kind !== 'text').forEach((b) => layout(p, b.id))
}
function detach(p: Project, id: string): void {
  const b = getBlock(p, id)
  const point = worldPosition(p, id)
  if (b.parentId) {
    const parent = getBlock(p, b.parentId)
    parent.children = parent.children.filter((child) => child !== id)
  }
  delete b.parentId
  b.x = point.x
  b.y = point.y
}
function roots(p: Project, ids: string[]): string[] {
  const selected = new Set(ids)
  return [...selected].filter((id) => !ancestors(p, id).some((a) => selected.has(a)))
}
function wrap(p: Project, ids: string[], title: string): Block {
  const selected = roots(p, ids)
  if (!selected.length) throw new Error('先选中要组合的片段。')
  const points = selected.map((id) => worldPosition(p, id))
  const group: Block = {
    ...textBlock(
      '',
      Math.min(...points.map((p) => p.x)) - 20,
      Math.min(...points.map((p) => p.y)) - 60
    ),
    kind: 'group',
    title,
    children: selected
  }
  selected.forEach((id) => {
    detach(p, id)
    getBlock(p, id).parentId = group.id
  })
  p.blocks.push(group)
  if (selected.every((id) => p.article.includes(id))) {
    const at = Math.min(...selected.map((id) => p.article.indexOf(id)))
    p.article = p.article.filter((id) => !selected.includes(id))
    p.article.splice(at, 0, group.id)
  }
  reflow(p)
  return group
}
export function applyCommand(w: Workspace, c: Exclude<Command, { type: 'undo' | 'redo' }>): void {
  if (c.type === 'capture') {
    if (!c.text.trim()) throw new Error('写下一点内容再放入收件盒。')
    w.inbox.push({ id: uid(), text: c.text, createdAt: new Date().toISOString(), color: 'sage' })
    return
  }
  if (c.type === 'draft') {
    w.captureDraft = c.text
    return
  }
  if (c.type === 'settings') {
    w.settings = c.settings
    return
  }
  if (c.type === 'project') {
    if (c.action === 'create') {
      const p = newProject(c.title)
      w.projects.push(p)
      w.activeProjectId = p.id
    } else if (c.action === 'select') {
      w.activeProjectId = getProject(w, c.id).id
    } else if (c.action === 'rename') getProject(w, c.id).title = c.title || '未命名思路纸'
    else {
      if (w.projects.length === 1) throw new Error('至少保留一张思路纸。')
      const p = getProject(w, c.id)
      w.projects = w.projects.filter((x) => x.id !== p.id)
      if (w.activeProjectId === p.id) w.activeProjectId = w.projects[0].id
    }
    return
  }
  const p = getProject(w, c.projectId)
  switch (c.type) {
    case 'add':
      p.blocks.push(textBlock(c.text, c.x, c.y))
      break
    case 'edit':
      Object.assign(getBlock(p, c.id), c.patch)
      break
    case 'move':
      c.moves.forEach((move) => {
        const b = getBlock(p, move.id)
        if (!b.parentId) {
          b.x = move.x
          b.y = move.y
        }
      })
      break
    case 'group':
      wrap(p, c.ids, c.title)
      break
    case 'detach':
      detach(p, c.id)
      break
    case 'snap': {
      const source = getBlock(p, c.source)
      const target = getBlock(p, c.target)
      if (
        source.id === target.id ||
        ancestors(p, source.id).includes(target.id) ||
        ancestors(p, target.id).includes(source.id)
      )
        throw new Error('不能把组合拼进它自己。')
      if (c.mode === 'relation') {
        if (!p.relations.some((r) => r.source === source.id && r.target === target.id))
          p.relations.push({
            id: uid(),
            source: source.id,
            target: target.id,
            label: c.label || '相关'
          })
        break
      }
      if (c.mode === 'group' && target.kind !== 'text') {
        detach(p, source.id)
        source.parentId = target.id
        target.children.push(source.id)
        target.collapsed = false
      } else if ((c.mode === 'before' || c.mode === 'after') && target.parentId) {
        const parent = getBlock(p, target.parentId)
        detach(p, source.id)
        source.parentId = parent.id
        const at = parent.children.indexOf(target.id)
        parent.children.splice(at + (c.mode === 'after' ? 1 : 0), 0, source.id)
      } else {
        const parent = target.parentId ? getBlock(p, target.parentId) : undefined
        const at = parent?.children.filter((id) => id !== source.id).indexOf(target.id) ?? 0
        const group = wrap(
          p,
          c.mode === 'before' ? [source.id, target.id] : [target.id, source.id],
          c.mode === 'group' ? '一组相关的想法' : '一条思路'
        )
        if (parent) {
          group.parentId = parent.id
          parent.children.splice(at, 0, group.id)
        }
      }
      p.article = normalizeArticle(p, p.article)
      break
    }
    case 'ungroup': {
      const b = getBlock(p, c.id)
      if (b.kind === 'text') throw new Error('这是一个文字片段。')
      const children = [...b.children]
      const pos = worldPosition(p, b.id)
      const parent = b.parentId ? getBlock(p, b.parentId) : undefined
      const atInParent = parent?.children.indexOf(b.id) ?? -1
      children.forEach((id, i) => {
        detach(p, id)
        const child = getBlock(p, id)
        child.x = pos.x + i * 310
        child.y = pos.y + 30
      })
      if (parent) {
        parent.children.splice(atInParent, 1, ...children)
        children.forEach((id) => {
          getBlock(p, id).parentId = parent.id
        })
      }
      const at = p.article.indexOf(b.id)
      if (at >= 0) p.article.splice(at, 1, ...children)
      p.blocks = p.blocks.filter((x) => x.id !== b.id)
      p.relations = p.relations.filter((r) => r.source !== b.id && r.target !== b.id)
      p.article = normalizeArticle(p, p.article)
      break
    }
    case 'delete': {
      const removed = new Set(c.ids.flatMap((id) => [id, ...descendants(p, id)]))
      p.blocks = p.blocks.filter((b) => !removed.has(b.id))
      p.blocks.forEach((b) => {
        b.children = b.children.filter((id) => !removed.has(id))
      })
      p.relations = p.relations.filter((r) => !removed.has(r.source) && !removed.has(r.target))
      p.article = p.article.filter((id) => !removed.has(id))
      break
    }
    case 'split': {
      const b = getBlock(p, c.id)
      if (b.kind !== 'text') throw new Error('请先拆开组合。')
      const pieces = b.text
        .split(c.separator === 'paragraph' ? /\n\s*\n/ : /\n/)
        .filter((x) => x.trim())
      if (pieces.length < 2) throw new Error('需要至少两段内容才能拆分。')
      const children = pieces.map((text, i) => textBlock(text, 20, 68 + i * 200, b.color))
      b.kind = 'group'
      b.title = b.title || '拆出的片段'
      b.text = ''
      b.children = children.map((x) => x.id)
      children.forEach((child) => {
        child.parentId = b.id
      })
      p.blocks.push(...children)
      break
    }
    case 'inbox': {
      const notes = w.inbox.filter((n) => c.ids.includes(n.id))
      if (c.action === 'place')
        notes.forEach((n, i) =>
          p.blocks.push(
            textBlock(
              n.text,
              (c.x ?? 100) + (i % 3) * 300,
              (c.y ?? 100) + Math.floor(i / 3) * 210,
              n.color
            )
          )
        )
      w.inbox = w.inbox.filter((n) => !c.ids.includes(n.id))
      break
    }
    case 'article': {
      if (c.expectedBasis && c.expectedBasis !== aiBasis(p))
        throw new Error('内容已改变，这次排序建议已失效。')
      p.article = normalizeArticle(p, c.ids)
      break
    }
    case 'connector': {
      if (c.expectedBasis && c.expectedBasis !== aiBasis(p))
        throw new Error('内容已改变，这次过渡建议已失效。')
      const at = p.article.indexOf(c.leftId)
      if (
        at < 0 ||
        p.article[at + 1] !== c.rightId ||
        pairBasis(p, c.leftId, c.rightId) !== c.basis
      )
        throw new Error('这两个片段已经改变，请重新生成过渡句。')
      p.connectors = p.connectors.filter((x) => x.leftId !== c.leftId || x.rightId !== c.rightId)
      if (c.text.trim())
        p.connectors.push({ leftId: c.leftId, rightId: c.rightId, text: c.text, basis: c.basis })
      break
    }
    case 'relation': {
      const r = p.relations.find((r) => r.id === c.id)
      if (!r) throw new Error('关系已被移除。')
      if (c.label === null) p.relations = p.relations.filter((r) => r.id !== c.id)
      else r.label = c.label
      break
    }
    case 'template': {
      const sets = {
        clarify: ['我卡在哪里', '已经有的线索', '可能的解释', '下一小步'],
        write: ['想说的观点', '理由', '例子', '收束'],
        plan: ['想达到什么', '可选的路径', '现实约束', '先做哪一步']
      }
      const root: Block = {
        ...textBlock('', 60, 60, 'blue'),
        kind: 'group',
        title: { clarify: '把困惑摊开', write: '一篇文章的骨架', plan: '从想法走向行动' }[
          c.template
        ],
        children: []
      }
      for (const title of sets[c.template]) {
        const slot: Block = {
          ...textBlock('', 20, 60, 'lavender'),
          kind: 'slot',
          title,
          parentId: root.id
        }
        root.children.push(slot.id)
        p.blocks.push(slot)
      }
      p.blocks.push(root)
      break
    }
    case 'viewport':
      p.viewport = c.viewport
      return
  }
  reflow(p)
  cleanConnectors(p)
  p.revision++
}

export type Snap = {
  target: string
  mode: 'group' | 'before' | 'after' | 'relation'
  label: string
}
export function findSnap(
  p: Project,
  sourceId: string,
  point: { x: number; y: number }
): Snap | null {
  const blocked = new Set([sourceId, ...ancestors(p, sourceId), ...descendants(p, sourceId)])
  const candidates = p.blocks
    .filter((b) => !blocked.has(b.id) && !ancestors(p, b.id).some((a) => getBlock(p, a).collapsed))
    .map((b) => ({ b, pos: worldPosition(p, b.id), height: b.collapsed ? 62 : b.height }))
    .filter(
      ({ b, pos, height }) =>
        point.x >= pos.x - 28 &&
        point.x <= pos.x + b.width + 28 &&
        point.y >= pos.y - 24 &&
        point.y <= pos.y + height + 24
    )
    .sort((a, b) => a.b.width * a.height - b.b.width * b.height)
  const c = candidates[0]
  if (!c) return null
  if (point.x < c.pos.x + 28 || point.x > c.pos.x + c.b.width - 28)
    return { target: c.b.id, mode: 'relation', label: '连一条「相关」关系' }
  if (point.y < c.pos.y + 40) return { target: c.b.id, mode: 'before', label: '拼在它前面' }
  if (point.y > c.pos.y + c.height - 40)
    return { target: c.b.id, mode: 'after', label: '拼在它后面' }
  return {
    target: c.b.id,
    mode: 'group',
    label: c.b.kind === 'text' ? '合成一组想法' : `放进「${c.b.title || '这个组合'}」`
  }
}

export function canSubmitCapture(key: string, shift: boolean, composing: boolean): boolean {
  return key === 'Enter' && !shift && !composing
}
