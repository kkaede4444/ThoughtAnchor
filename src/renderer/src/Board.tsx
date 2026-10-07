import { t, tr } from '../../shared/i18n'
import {
  Component,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import type { Ref } from 'react'
import {
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStoreApi,
  ConnectionMode,
  SelectionMode
} from '@xyflow/react'
import type { Edge, EdgeProps, Node, NodeProps, NodeChange, EdgeChange } from '@xyflow/react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Layers2,
  Plus,
  Unlink,
  X,
  Hand,
  Scan,
  Pencil
} from 'lucide-react'
import { Block, Color, Command, Project, Port } from '../../shared/model'
import {
  ancestors,
  findSnap,
  getBlock,
  getProject,
  Snap,
  relationPorts,
  nearestPorts,
  worldPosition
} from '../../shared/domain'
import { Paint } from './Art'
import { useWork } from './context'
import { Ink } from './Ink'
import { CardInkEditor, StrokeLines } from './CardInk'
export function pointerPosition(
  event: MouseEvent | TouchEvent
): { clientX: number; clientY: number } | null {
  return 'clientX' in event ? event : (event.changedTouches?.[0] ?? event.touches?.[0] ?? null)
}

type ThoughtNode = Node<{ block: Block; snap?: Snap; linked?: boolean }, 'thought'>
export type BoardHandle = {
  addTemplate: (template: Extract<Command, { type: 'template' }>['template']) => Promise<void>
}
const colorNames: Record<Color, string> = {
  sage: '鼠尾草',
  blue: '雾蓝',
  lavender: '淡紫',
  rose: '灰玫瑰',
  clay: '陶土'
}
export function Card({ id, data, selected }: NodeProps<ThoughtNode>): React.JSX.Element {
  const { snapshot, run, selected: selection, setSelected, cardInkDraft } = useWork()
  const p = getProject(snapshot.workspace)
  const current = p.blocks.find((block) => block.id === id)
  const b = current ?? data.block
  const pid = snapshot.workspace.activeProjectId
  const [text, setText] = useState(b.text)
  const [title, setTitle] = useState(b.title)
  const [editing, setEditing] = useState<'title' | 'text' | null>(null)
  const [drawing, setDrawing] = useState(false)
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
  // React Flow can still render a removed node while processing its controlled-node update.
  if (!current) return <></>
  const grouped = b.kind !== 'text'
  const siblings = b.parentId
    ? (p.blocks.find((block) => block.id === b.parentId)?.children ?? [])
    : []
  const siblingIndex = siblings.indexOf(b.id)
  const draft =
    cardInkDraft?.projectId === pid && cardInkDraft.blockId === b.id ? cardInkDraft : null
  return (
    <div
      data-ink-card={!grouped ? b.id : undefined}
      className={`thought-card ${b.ink?.length ? 'has-ink' : ''} ${grouped ? 'group-card' : ''} ${b.kind === 'slot' ? 'slot-card' : ''} ${b.collapsed ? 'collapsed' : ''} ${selected ? 'selected' : ''} ${data.linked ? 'relation-active' : ''} ${data.snap ? `snap-${data.snap.mode}` : ''}`}
    >
      <Paint color={b.color} />
      {(['left', 'right', 'top', 'bottom'] as const).map((port) => (
        <Handle
          key={port}
          id={port}
          type="source"
          position={
            Position[
              port === 'left'
                ? 'Left'
                : port === 'right'
                  ? 'Right'
                  : port === 'top'
                    ? 'Top'
                    : 'Bottom'
            ]
          }
          aria-label={t('连接圆点')}
        />
      ))}
      {data.linked && (
        <svg className="relation-outline" width="100%" height="100%" aria-hidden="true">
          <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="9" />
        </svg>
      )}
      <div className="card-header drag-handle">
        <span className="card-grip" aria-hidden="true">
          ⠿
        </span>
        {grouped && (
          <button
            className="icon-button nodrag"
            title={b.collapsed ? t('展开组合') : t('折叠组合')}
            onClick={() => edit({ collapsed: !b.collapsed })}
          >
            {b.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {editing === 'title' ? (
          <input
            autoFocus
            className="card-title nodrag"
            aria-label={grouped ? t('组合名称') : t('片段标题')}
            placeholder={grouped ? t('给这组想法起个名字') : t('无题片段')}
            value={title}
            onFocus={() => {
              focus.current = true
            }}
            onBlur={() => {
              focus.current = false
              setEditing(null)
            }}
            onChange={(e) => {
              setTitle(e.target.value)
              edit({ title: e.target.value })
            }}
          />
        ) : (
          <div
            className="card-title card-title-display"
            role="button"
            tabIndex={0}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing('title')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'F2') setEditing('title')
            }}
          >
            {title || (grouped ? t('给这组想法起个名字') : t('无题片段'))}
          </div>
        )}
        {grouped && (
          <span className="child-count">
            {b.children.length}
            {t('片')}
          </span>
        )}
        {!grouped && (
          <button
            className="card-draw icon-button nodrag nopan"
            aria-label={t('卡片绘图')}
            title={t('卡片绘图')}
            onClick={(e) => {
              e.stopPropagation()
              setDrawing(true)
            }}
          >
            <Pencil size={15} />
          </button>
        )}
        {selected && (
          <button
            className="card-delete icon-button nodrag nopan"
            aria-label={t('删除卡片')}
            title={t('删除卡片（可撤销）')}
            onDoubleClick={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              void run({ type: 'delete', projectId: pid, ids: [b.id] }, t('片段已移除，可撤销'))
              setSelected(selection.filter((id) => id !== b.id))
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {!grouped &&
        (editing === 'text' ? (
          <textarea
            autoFocus
            aria-label={t('片段内容')}
            className="card-text nodrag nowheel"
            value={text}
            placeholder={t('先留下一点什么…')}
            onFocus={() => {
              focus.current = true
            }}
            onBlur={() => {
              focus.current = false
              setEditing(null)
            }}
            onChange={(e) => {
              setText(e.target.value)
              edit({ text: e.target.value })
            }}
          />
        ) : (
          <div
            className="card-text card-text-display nowheel"
            role="button"
            tabIndex={0}
            aria-label={t('片段内容')}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing('text')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'F2') setEditing('text')
            }}
          >
            {text || t('先留下一点什么…')}
          </div>
        ))}
      {!grouped && (
        <svg
          className="card-ink-surface"
          viewBox="0 0 500 320"
          preserveAspectRatio="none"
          role="img"
          aria-label={t('卡片绘图')}
        >
          <StrokeLines
            strokes={[
              ...(b.ink ?? []).filter((s) => !draft?.erased.includes(s.id)),
              ...(draft?.stroke ? [draft.stroke] : [])
            ]}
          />
        </svg>
      )}
      {drawing && <CardInkEditor block={b} projectId={pid} close={() => setDrawing(false)} />}
      {grouped && !b.collapsed && b.children.length === 0 && (
        <p className="slot-hint">{t('把片段拖到这里，接上这一小步')}</p>
      )}
      {b.collapsed && <p className="collapsed-hint">{t('一整个板块，随时展开')}</p>}
      {selected && !b.collapsed && (
        <div className="card-tools nodrag">
          {(Object.keys(colorNames) as Color[]).map((color) => (
            <button
              key={color}
              title={t(colorNames[color])}
              aria-label={tr`${t(colorNames[color])}颜色`}
              className={`color-dot ${color} ${b.color === color ? 'active' : ''}`}
              onClick={() => edit({ color })}
            />
          ))}
          {b.parentId && (
            <button
              className="icon-button"
              title={t('移出组合')}
              onClick={() => {
                void run({ type: 'detach', projectId: pid, id: b.id }, t('这一片可以单独继续'))
              }}
            >
              <Unlink size={14} />
            </button>
          )}
          {b.parentId && (
            <>
              <button
                className="icon-button"
                title={t('在组合中上移')}
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
                    t('往前接了一步')
                  )
                }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                className="icon-button"
                title={t('在组合中下移')}
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
                    t('往后接了一步')
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
          <span>{t('松手即拼接')}</span>
        </div>
      )}
    </div>
  )
}
function PaintedEdge(props: EdgeProps): React.JSX.Element {
  const [edgePath, x, y] = getBezierPath(props)
  const { snapshot, run } = useWork()
  const store = useStoreApi()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(String(props.label || t('相关')))
  useEffect(() => setLabel(String(props.label || t('相关'))), [props.label])
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
              aria-label={t('关系名称')}
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
            <button
              onClick={() => store.getState().addSelectedEdges([props.id])}
              onDoubleClick={() => setEditing(true)}
              title={t('双击编辑关系名称')}
            >
              {label}
            </button>
          )}
          {props.selected && (
            <button
              title={t('移除关系')}
              onClick={() => {
                void run(
                  {
                    type: 'relation',
                    projectId: snapshot.workspace.activeProjectId,
                    id: props.id,
                    label: null
                  },
                  t('关系已移除')
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
function boardNodes(
  p: Project,
  selected: string[],
  snap: Snap | null,
  linked: Set<string> = new Set()
): ThoughtNode[] {
  const result: ThoughtNode[] = []
  function visit(b: Block): void {
    const hidden = ancestors(p, b.id).some((id) => getBlock(p, id).collapsed)
    result.push({
      id: b.id,
      type: 'thought',
      ariaLabel: b.title || t('片段内容'),
      domAttributes: { 'aria-roledescription': t('片段') },
      position: { x: b.x, y: b.y },
      parentId: b.parentId,
      hidden,
      selected: selected.includes(b.id),
      draggable: true,
      // Dimensions are fixed by the document, so new and restored nodes need not wait for measurement.
      initialWidth: b.width,
      initialHeight: b.collapsed ? 62 : b.height,
      style: { width: b.width, height: b.collapsed ? 62 : b.height },
      data: { block: b, snap: snap?.target === b.id ? snap : undefined, linked: linked.has(b.id) }
    })
    b.children.forEach((id) => visit(getBlock(p, id)))
  }
  p.blocks.filter((b) => !b.parentId).forEach(visit)
  return result
}
function preserveMeasurements(next: ThoughtNode[], previous: ThoughtNode[]): ThoughtNode[] {
  const known = new Map(previous.map((node) => [node.id, node]))
  return next.map((node) => {
    const prior = known.get(node.id)
    return {
      ...node,
      measured:
        prior &&
        prior.initialWidth === node.initialWidth &&
        prior.initialHeight === node.initialHeight
          ? prior.measured
          : undefined
    }
  })
}
function Canvas({ boardRef }: { boardRef: Ref<BoardHandle> }): React.JSX.Element {
  const { snapshot, run, selected, setSelected, inkTool, setInkTool } = useWork()
  const p = getProject(snapshot.workspace)
  const flow = useReactFlow<ThoughtNode>()
  const store = useStoreApi()
  const [edgeIds, setEdgeIds] = useState<string[]>([])
  const selectMode = inkTool === 'select'
  const [snap, setSnap] = useState<Snap | null>(null)
  const drag = useRef<{ id: string; revision: number } | null>(null)
  const pane = useRef<HTMLDivElement>(null)
  const live = useRef(true)
  const projectRef = useRef(p)
  projectRef.current = p
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  const visible = useCallback(
    (id: string): string =>
      ancestors(p, id)
        .filter((id) => getBlock(p, id).collapsed)
        .at(-1) || id,
    [p]
  )
  const linked = useMemo(
    () =>
      new Set(
        p.relations
          .filter((r) => edgeIds.includes(r.id))
          .flatMap((r) => [visible(r.source), visible(r.target)])
      ),
    [p, edgeIds, visible]
  )
  const cancelConnection = useCallback(
    () => store.setState({ connectionClickStartHandle: null }),
    [store]
  )
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        cancelConnection()
        setEdgeIds([])
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [cancelConnection])
  const [graph, setGraph] = useState(() => ({
    project: p,
    selected,
    snap,
    linked,
    nodes: boardNodes(p, selected, snap, linked)
  }))
  // Reconcile the document before rendering children, including during undo, deletion and project changes.
  // During an ordinary drag only the transient positions stay local.
  if (drag.current && (graph.project.id !== p.id || drag.current.revision !== p.revision))
    drag.current = null
  let nodes = graph.nodes
  if (
    graph.project !== p ||
    graph.selected !== selected ||
    graph.snap !== snap ||
    graph.linked !== linked
  ) {
    nodes = preserveMeasurements(boardNodes(p, selected, snap, linked), graph.nodes)
    if (drag.current) {
      const positions = new Map(graph.nodes.map((node) => [node.id, node.position]))
      nodes = nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position }))
    }
    setGraph({ project: p, selected, snap, linked, nodes })
  }
  const setNodes = useCallback(
    (update: ThoughtNode[] | ((nodes: ThoughtNode[]) => ThoughtNode[])) => {
      setGraph((current) => ({
        ...current,
        nodes: typeof update === 'function' ? update(current.nodes) : update
      }))
    },
    []
  )
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  useEffect(() => {
    const start = store.getState().connectionClickStartHandle
    if (start && !p.blocks.some((b) => b.id === start.nodeId)) cancelConnection()
  }, [p, store, cancelConnection])
  const onChanges = useCallback(
    (changes: NodeChange<ThoughtNode>[]) => {
      const next = applyNodeChanges(changes, nodesRef.current)
      nodesRef.current = next
      setNodes(next)
      if (changes.some((c) => c.type === 'select'))
        setSelected(
          next
            .filter((n) => n.selected)
            .map((n) => n.id)
            .sort()
        )
      const moves = changes.flatMap((change) => {
        if (change.type !== 'position' || !change.position || change.dragging || drag.current)
          return []
        const block = projectRef.current.blocks.find((b) => b.id === change.id)
        return block && !block.parentId ? [{ id: change.id, ...change.position }] : []
      })
      if (moves.length) void run({ type: 'move', projectId: projectRef.current.id, moves })
    },
    [setSelected, setNodes, run]
  )
  const edges = useMemo(
    () =>
      p.relations
        .map((r) => {
          const source = visible(r.source),
            target = visible(r.target)
          const ports =
            source === r.source && target === r.target
              ? relationPorts(p, r)
              : nearestPorts(p, source, target)
          return {
            ...r,
            ...ports,
            source,
            target,
            ariaLabel: t('关系名称') + ': ' + r.label,
            domAttributes: { 'aria-roledescription': t('连线') },
            selected: edgeIds.includes(r.id),
            type: 'painted',
            label: r.label
          }
        })
        .filter((r) => r.source !== r.target),
    [p, edgeIds, visible]
  )
  const edgesRef = useRef<Edge[]>(edges)
  edgesRef.current = edges
  const onEdgeChanges = useCallback((changes: EdgeChange[]) => {
    const next = applyEdgeChanges(changes, edgesRef.current)
    edgesRef.current = next
    const ids = next
      .filter((e) => e.selected)
      .map((e) => e.id)
      .sort()
    setEdgeIds((previous) =>
      previous.length === ids.length && previous.every((id, i) => id === ids[i]) ? previous : ids
    )
  }, [])
  const previewProject = (node: ThoughtNode): Project => {
    const next = structuredClone(p),
      b = getBlock(next, node.id)
    b.x = node.position.x
    b.y = node.position.y
    return next
  }
  const add = async (): Promise<void> => {
    const rect = pane.current!.getBoundingClientRect()
    const at = flow.screenToFlowPosition({ x: rect.left + rect.width / 2 - 132, y: rect.top + 150 })
    const ids = new Set(p.blocks.map((b) => b.id))
    const next = await run({ type: 'add', projectId: p.id, text: '', ...at }, t('留下一片新的空间'))
    if (next && live.current && projectRef.current.id === p.id)
      setSelected(
        getProject(next.workspace, p.id)
          .blocks.filter((b) => !ids.has(b.id))
          .map((b) => b.id)
      )
  }
  useImperativeHandle(boardRef, () => ({
    async addTemplate(template) {
      if (!pane.current) return
      const rect = pane.current.getBoundingClientRect()
      const at = flow.screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })
      const ids = new Set(p.blocks.map((b) => b.id))
      const next = await run(
        { type: 'template', projectId: p.id, template, ...at },
        t('框架铺好了，慢慢往里放')
      )
      if (!next || !live.current || projectRef.current.id !== p.id) return
      const frame = getProject(next.workspace, p.id).blocks.find(
        (b) => !b.parentId && !ids.has(b.id)
      )
      if (!frame) return
      setSelected([frame.id])
      await flow.fitBounds(
        { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
        {
          padding: 0.2,
          duration: snapshot.workspace.settings.reducedMotion ? 0 : 220
        }
      )
    }
  }))
  return (
    <div
      className="board"
      ref={pane}
      onPointerDownCapture={(e) => {
        if (e.button === 0 && (e.target as HTMLElement).classList.contains('react-flow__pane'))
          cancelConnection()
      }}
    >
      <ReactFlow<ThoughtNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={p.viewport}
        onInit={(instance) => {
          const first = p.blocks.find((b) => !b.parentId),
            width = pane.current?.clientWidth ?? 0
          if (
            window.desktop.platform !== 'android' ||
            document.documentElement.dataset.interface !== 'mobile' ||
            p.revision !== 0 ||
            p.viewport.x !== 40 ||
            p.viewport.y !== 40 ||
            p.viewport.zoom !== 1 ||
            !first ||
            width < 100
          )
            return
          const zoom = Math.min(1, (width - 48) / first.width)
          void instance.setViewport({
            x: (width - first.width * zoom) / 2 - first.x * zoom,
            y: 100 - first.y * zoom,
            zoom
          })
        }}
        minZoom={0.15}
        maxZoom={2.5}
        onNodesChange={onChanges}
        onEdgesChange={onEdgeChanges}
        onNodeContextMenu={(event, node) => {
          event.preventDefault()
          setSelected(
            selected.includes(node.id)
              ? selected.filter((id) => id !== node.id)
              : [...selected, node.id].sort()
          )
        }}
        onNodeDragStart={(_event, node) => {
          drag.current = { id: node.id, revision: p.revision }
        }}
        onNodeDrag={(event, node) => {
          if (!drag.current || !projectRef.current.blocks.some((b) => b.id === node.id)) return
          const pointer = pointerPosition(event)
          if (pointer) {
            const found = findSnap(
              previewProject(node),
              node.id,
              flow.screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY })
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
          if (
            !drag.current ||
            drag.current.revision !== projectRef.current.revision ||
            !projectRef.current.blocks.some((b) => b.id === node.id)
          )
            return
          const preview = previewProject(node)
          const at = worldPosition(preview, node.id)
          const pointer = pointerPosition(event)
          const found = pointer
            ? findSnap(
                preview,
                node.id,
                flow.screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY })
              )
            : null
          setSnap(null)
          dragged.length <= 1
            ? await run(
                {
                  type: 'drop',
                  projectId: p.id,
                  id: node.id,
                  ...at,
                  target: found?.target,
                  mode: found?.mode
                },
                found ? t('拼上了一小步') : undefined
              )
            : await run({
                type: 'move',
                projectId: p.id,
                moves: dragged.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))
              })
          if (!live.current || projectRef.current.id !== p.id) return
          drag.current = null
          const currentProject = projectRef.current
          setNodes((current) =>
            preserveMeasurements(boardNodes(currentProject, selected, null, linked), current)
          )
        }}
        onMoveEnd={(_event, viewport) => {
          void run({ type: 'viewport', projectId: p.id, viewport })
        }}
        onConnect={(connection) => {
          if (
            p.blocks.some((b) => b.id === connection.source) &&
            p.blocks.some((b) => b.id === connection.target)
          )
            void run(
              {
                type: 'snap',
                projectId: p.id,
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle as Port,
                targetHandle: connection.targetHandle as Port,
                mode: 'relation'
              },
              t('两个想法有了联系')
            )
        }}
        connectionMode={ConnectionMode.Loose}
        connectOnClick
        isValidConnection={(c) =>
          p.blocks.some((b) => b.id === c.source) &&
          p.blocks.some((b) => b.id === c.target) &&
          c.source !== c.target &&
          !ancestors(p, c.source).includes(c.target) &&
          !ancestors(p, c.target).includes(c.source)
        }
        onPaneClick={() => {
          cancelConnection()
          setSelected([])
          setEdgeIds([])
        }}
        onPaneContextMenu={(event) => event.preventDefault()}
        selectionOnDrag={selectMode}
        selectionMode={SelectionMode.Partial}
        panOnDrag={selectMode ? [1] : [0, 1]}
        nodeDragThreshold={5}
        paneClickDistance={5}
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        zoomOnDoubleClick={false}
        onlyRenderVisibleElements={false}
        ariaLabelConfig={{
          'node.a11yDescription.default': t('按 Enter 选中，方向键移动，Delete 删除，Esc 取消。'),
          'node.a11yDescription.keyboardDisabled': t('按 Enter 选中，Delete 删除，Esc 取消。'),
          'node.a11yDescription.ariaLiveMessage': ({ x, y }) =>
            tr`片段位置：${Math.round(x)}，${Math.round(y)}`,
          'edge.a11yDescription.default': t('按 Enter 选中连线，然后使用删除关系按钮。'),
          'controls.ariaLabel': t('画布控制'),
          'minimap.ariaLabel': t('画布概览'),
          'handle.ariaLabel': t('连接圆点'),
          'controls.zoomIn.ariaLabel': t('放大'),
          'controls.zoomOut.ariaLabel': t('缩小'),
          'controls.fitView.ariaLabel': t('查看全部片段'),
          'controls.interactive.ariaLabel': t('切换画布交互')
        }}
      >
        <Ink />
        <Background color="#dad8cc" gap={28} size={0.8} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="board-mode">
        <button
          className={inkTool === 'move' ? 'active' : ''}
          aria-label={t('移动画布')}
          aria-pressed={inkTool === 'move'}
          aria-describedby="pan-tooltip"
          onClick={() => setInkTool('move')}
        >
          <Hand size={16} />
          {t('移动画布')}
          <span id="pan-tooltip" role="tooltip" className="mode-tooltip">
            {t('左键拖动空白处移动画布；双击切回上一个工具。')}
          </span>
        </button>
        <button
          className={selectMode ? 'active' : ''}
          aria-label={t('框选工具')}
          aria-pressed={selectMode}
          aria-describedby="select-tooltip"
          onClick={() => setInkTool('select')}
        >
          <Scan size={16} />
          {t('框选工具')}
          <span id="select-tooltip" role="tooltip" className="mode-tooltip">
            {t('左键拖动空白处框选卡片；双击切回上一个工具。')}
          </span>
        </button>
      </div>
      <div className="board-note">
        <span className="tiny-line" />
        {t('散着也没关系，先留住，再靠近。')}
      </div>
      {p.blocks.length === 0 && (
        <div className="empty-board">
          <Layers2 size={34} />
          <h2>{t('一张纸，等你的第一片想法')}</h2>
          <p>{t('点击留下片段，或从收件盒放入。')}</p>
          <button className="primary" onClick={add}>
            <Plus size={16} />
            {t('留下一个片段')}
          </button>
        </div>
      )}
      <button className="floating-add" onClick={add}>
        <Plus size={18} />
        {t('留下片段')}
      </button>
      <div className="board-hint">
        {t('双击文字编辑 · 双击空白切换工具 · 拖动卡片移动 · 点击圆点连线 · 右键增减选中')}
      </div>
    </div>
  )
}
export function Board({ ref }: { ref: Ref<BoardHandle> }): React.JSX.Element {
  return (
    <BoardBoundary>
      <ReactFlowProvider>
        <Canvas boardRef={ref} />
      </ReactFlowProvider>
    </BoardBoundary>
  )
}
class BoardBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean; epoch: number }
> {
  state = { failed: false, epoch: 0 }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  componentDidCatch(error: Error): void {
    console.error('BOARD_RENDER_ERROR', error)
  }
  render(): React.ReactNode {
    if (this.state.failed)
      return (
        <div className="board-error" role="alert">
          <p>{t('白板显示遇到问题，已保存的内容仍保留。')}</p>
          <button onClick={() => this.setState((s) => ({ failed: false, epoch: s.epoch + 1 }))}>
            {t('重新打开白板')}
          </button>
        </div>
      )
    return <Fragment key={this.state.epoch}>{this.props.children}</Fragment>
  }
}
