import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyNodeChanges,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react'
import type { EdgeProps, Node, NodeProps, NodeChange } from '@xyflow/react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Layers2,
  Plus,
  Unlink,
  X
} from 'lucide-react'
import { Block, Color, Project } from '../../shared/model'
import { ancestors, findSnap, getBlock, getProject, Snap } from '../../shared/domain'
import { Paint } from './Art'
import { useWork } from './context'

type ThoughtNode = Node<{ block: Block; snap?: Snap }, 'thought'>
const colorNames: Record<Color, string> = {
  sage: '鼠尾草',
  blue: '雾蓝',
  lavender: '淡紫',
  rose: '灰玫瑰',
  clay: '陶土'
}
export function Card({ data, selected }: NodeProps<ThoughtNode>): React.JSX.Element {
  const { snapshot, run } = useWork()
  const b = data.block
  const pid = snapshot.workspace.activeProjectId
  const [text, setText] = useState(b.text)
  const [title, setTitle] = useState(b.title)
  const focus = useRef(false)
  useEffect(() => {
    if (!focus.current) {
      setText(b.text)
      setTitle(b.title)
    }
  }, [b.text, b.title])
  const edit = (patch: {
    text?: string
    title?: string
    color?: Color
    collapsed?: boolean
  }): void => {
    void run({ type: 'edit', projectId: pid, id: b.id, patch })
  }
  const grouped = b.kind !== 'text'
  const siblings = b.parentId ? getBlock(getProject(snapshot.workspace), b.parentId).children : []
  const siblingIndex = siblings.indexOf(b.id)
  return (
    <div
      className={`thought-card ${grouped ? 'group-card' : ''} ${b.kind === 'slot' ? 'slot-card' : ''} ${b.collapsed ? 'collapsed' : ''} ${selected ? 'selected' : ''} ${data.snap ? `snap-${data.snap.mode}` : ''}`}
    >
      <Paint color={b.color} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="card-header drag-handle">
        <span className="card-grip" aria-hidden="true">
          ⠿
        </span>
        {grouped && (
          <button
            className="icon-button nodrag"
            title={b.collapsed ? '展开组合' : '折叠组合'}
            onClick={() => edit({ collapsed: !b.collapsed })}
          >
            {b.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        <input
          className="card-title nodrag"
          aria-label={grouped ? '组合名称' : '片段标题'}
          placeholder={grouped ? '给这组想法起个名字' : '无题片段'}
          value={title}
          onFocus={() => {
            focus.current = true
          }}
          onBlur={() => {
            focus.current = false
          }}
          onChange={(e) => {
            setTitle(e.target.value)
            edit({ title: e.target.value })
          }}
        />
        {grouped && <span className="child-count">{b.children.length} 片</span>}
      </div>
      {!grouped && (
        <textarea
          aria-label="片段内容"
          className="card-text nodrag nowheel"
          value={text}
          placeholder="先留下一点什么…"
          onFocus={() => {
            focus.current = true
          }}
          onBlur={() => {
            focus.current = false
          }}
          onChange={(e) => {
            setText(e.target.value)
            edit({ text: e.target.value })
          }}
        />
      )}
      {grouped && !b.collapsed && b.children.length === 0 && (
        <p className="slot-hint">把片段拖到这里，接上这一小步</p>
      )}
      {b.collapsed && <p className="collapsed-hint">一整个板块，随时展开</p>}
      {selected && !b.collapsed && (
        <div className="card-tools nodrag">
          {(Object.keys(colorNames) as Color[]).map((color) => (
            <button
              key={color}
              title={colorNames[color]}
              aria-label={`${colorNames[color]}颜色`}
              className={`color-dot ${color} ${b.color === color ? 'active' : ''}`}
              onClick={() => edit({ color })}
            />
          ))}
          {b.parentId && (
            <button
              className="icon-button"
              title="移出组合"
              onClick={() => {
                void run({ type: 'detach', projectId: pid, id: b.id }, '这一片可以单独继续')
              }}
            >
              <Unlink size={14} />
            </button>
          )}
          {b.parentId && (
            <>
              <button
                className="icon-button"
                title="在组合中上移"
                disabled={siblingIndex === 0}
                onClick={() => {
                  void run(
                    {
                      type: 'snap',
                      projectId: pid,
                      source: b.id,
                      target: siblings[siblingIndex - 1],
                      mode: 'before'
                    },
                    '往前接了一步'
                  )
                }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                className="icon-button"
                title="在组合中下移"
                disabled={siblingIndex === siblings.length - 1}
                onClick={() => {
                  void run(
                    {
                      type: 'snap',
                      projectId: pid,
                      source: b.id,
                      target: siblings[siblingIndex + 1],
                      mode: 'after'
                    },
                    '往后接了一步'
                  )
                }}
              >
                <ArrowDown size={13} />
              </button>
            </>
          )}
        </div>
      )}
      {data.snap && (
        <div className="snap-label">
          {data.snap.label}
          <span>松手即拼接</span>
        </div>
      )}
    </div>
  )
}
function PaintedEdge(props: EdgeProps): React.JSX.Element {
  const [edgePath, x, y] = getBezierPath(props)
  const { snapshot, run } = useWork()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(String(props.label || '相关'))
  useEffect(() => setLabel(String(props.label || '相关')), [props.label])
  return (
    <>
      <BaseEdge
        path={edgePath}
        id={props.id}
        markerEnd={props.markerEnd}
        style={{
          stroke: props.selected ? '#BF765B' : '#898D7B',
          strokeWidth: props.selected ? 2.2 : 1.6,
          filter: 'url(#pencil)'
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`relation-label nodrag nopan ${props.selected ? 'selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${x}px,${y}px)` }}
        >
          {editing ? (
            <input
              autoFocus
              aria-label="关系名称"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => {
                setEditing(false)
                void run({
                  type: 'relation',
                  projectId: snapshot.workspace.activeProjectId,
                  id: props.id,
                  label
                })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          ) : (
            <button onClick={() => setEditing(true)} title="编辑关系名称">
              {label}
            </button>
          )}
          {props.selected && (
            <button
              title="移除关系"
              onClick={() => {
                void run(
                  {
                    type: 'relation',
                    projectId: snapshot.workspace.activeProjectId,
                    id: props.id,
                    label: null
                  },
                  '关系已移除'
                )
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
const nodeTypes = { thought: Card }
const edgeTypes = { painted: PaintedEdge }
function boardNodes(p: Project, selected: string[], snap: Snap | null): ThoughtNode[] {
  const result: ThoughtNode[] = []
  function visit(b: Block): void {
    const hidden = ancestors(p, b.id).some((id) => getBlock(p, id).collapsed)
    result.push({
      id: b.id,
      type: 'thought',
      position: { x: b.x, y: b.y },
      parentId: b.parentId,
      hidden,
      selected: selected.includes(b.id),
      draggable: !b.parentId,
      dragHandle: '.drag-handle',
      style: { width: b.width, height: b.collapsed ? 62 : b.height },
      data: { block: b, snap: snap?.target === b.id ? snap : undefined }
    })
    b.children.forEach((id) => visit(getBlock(p, id)))
  }
  p.blocks.filter((b) => !b.parentId).forEach(visit)
  return result
}
function Canvas(): React.JSX.Element {
  const { snapshot, run, selected, setSelected } = useWork()
  const p = getProject(snapshot.workspace)
  const flow = useReactFlow<ThoughtNode>()
  const [nodes, setNodes] = useState<ThoughtNode[]>([])
  const [snap, setSnap] = useState<Snap | null>(null)
  const drag = useRef(false)
  const pane = useRef<HTMLDivElement>(null)
  const lastProject = useRef(p.id)
  useEffect(() => {
    if (!drag.current) setNodes(boardNodes(p, selected, snap))
  }, [p, selected, snap])
  useEffect(() => {
    if (lastProject.current !== p.id) {
      lastProject.current = p.id
      setSelected([])
      void flow.setViewport(p.viewport, { duration: 0 })
    }
  }, [p.id, flow, setSelected, p.viewport])
  const onChanges = useCallback((changes: NodeChange<ThoughtNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])
  const edges = useMemo(
    () =>
      p.relations
        .map((r) => {
          const visible = (id: string): string =>
            ancestors(p, id)
              .filter((id) => getBlock(p, id).collapsed)
              .at(-1) || id
          return {
            ...r,
            source: visible(r.source),
            target: visible(r.target),
            type: 'painted',
            label: r.label
          }
        })
        .filter((r) => r.source !== r.target),
    [p]
  )
  const add = async (): Promise<void> => {
    const rect = pane.current!.getBoundingClientRect()
    const at = flow.screenToFlowPosition({ x: rect.left + rect.width / 2 - 132, y: rect.top + 150 })
    const ids = new Set(p.blocks.map((b) => b.id))
    const next = await run({ type: 'add', projectId: p.id, text: '', ...at }, '留下一片新的空间')
    if (next)
      setSelected(
        getProject(next.workspace, p.id)
          .blocks.filter((b) => !ids.has(b.id))
          .map((b) => b.id)
      )
  }
  return (
    <div className="board" ref={pane}>
      <ReactFlow<ThoughtNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={p.viewport}
        minZoom={0.15}
        maxZoom={2.5}
        onNodesChange={onChanges}
        onSelectionChange={({ nodes }) => setSelected(nodes.map((n) => n.id))}
        onNodeDragStart={() => {
          drag.current = true
        }}
        onNodeDrag={(event, node) => {
          if ('clientX' in event) {
            const found = findSnap(
              p,
              node.id,
              flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
            )
            setSnap(found)
            setNodes((current) =>
              current.map((n) => ({
                ...n,
                data: { ...n.data, snap: found?.target === n.id ? found : undefined }
              }))
            )
          }
        }}
        onNodeDragStop={async (event, node, dragged) => {
          drag.current = false
          const found =
            'clientX' in event
              ? findSnap(
                  p,
                  node.id,
                  flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
                )
              : null
          setSnap(null)
          const next =
            found && dragged.length <= 1
              ? await run(
                  {
                    type: 'snap',
                    projectId: p.id,
                    source: node.id,
                    target: found.target,
                    mode: found.mode
                  },
                  '拼上了一小步'
                )
              : await run({
                  type: 'move',
                  projectId: p.id,
                  moves: dragged.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))
                })
          setNodes(boardNodes(getProject((next || snapshot).workspace, p.id), selected, null))
        }}
        onMoveEnd={(_event, viewport) => {
          void run({ type: 'viewport', projectId: p.id, viewport })
        }}
        onConnect={(connection) => {
          if (connection.source && connection.target)
            void run(
              {
                type: 'snap',
                projectId: p.id,
                source: connection.source,
                target: connection.target,
                mode: 'relation'
              },
              '两个想法有了联系'
            )
        }}
        onPaneClick={() => setSelected([])}
        onPaneContextMenu={(event) => event.preventDefault()}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).classList.contains('react-flow__pane')) {
            const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
            void run({ type: 'add', projectId: p.id, text: '', ...point }, '留住新的片段')
          }
        }}
        selectionOnDrag
        panOnDrag={[1, 2]}
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        zoomOnDoubleClick={false}
        onlyRenderVisibleElements={false}
        ariaLabelConfig={{
          'controls.zoomIn.ariaLabel': '放大',
          'controls.zoomOut.ariaLabel': '缩小',
          'controls.fitView.ariaLabel': '查看全部片段',
          'controls.interactive.ariaLabel': '切换画布交互'
        }}
      >
        <Background color="#dad8cc" gap={28} size={0.8} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="board-note">
        <span className="tiny-line" />
        散着也没关系，先留住，再靠近。
      </div>
      {p.blocks.length === 0 && (
        <div className="empty-board">
          <Layers2 size={34} />
          <h2>一张纸，等你的第一片想法</h2>
          <p>双击空白处，或从收件盒放入。</p>
          <button className="primary" onClick={add}>
            <Plus size={16} />
            留下一个片段
          </button>
        </div>
      )}
      <button className="floating-add" onClick={add}>
        <Plus size={18} /> 留下片段
      </button>
      <div className="board-hint">
        拖动片段顶栏 · 中间归组 / 上下排序 / 两侧连线 · Shift 多选 · 右键拖动画布
      </div>
    </div>
  )
}
export function Board(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
