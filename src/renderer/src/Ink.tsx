import { useState, useRef, useEffect } from 'react'
import { useReactFlow, ViewportPortal } from '@xyflow/react'
import { Pencil, Eraser, Hand } from 'lucide-react'
import { getProject } from '../../shared/domain'
import { type InkStroke, uid } from '../../shared/model'
import { t } from '../../shared/i18n'
import { useWork } from './context'
import { StrokeLines, strokeNear } from './CardInk'

type Gesture = {
  stroke: InkStroke
  pointer: number
  project: string
  eraser: boolean
  strokes: InkStroke[]
  removed: Set<string>
  card?: { id: string; rect: DOMRect }
  start: { x: number; y: number; at: number; type: string }
  travelled: number
}
type Tap = { x: number; y: number; at: number; type: string; project: string; owner: string }

export function Ink(): React.JSX.Element {
  const {
    snapshot,
    run,
    inkTool: tool,
    setInkTool: setTool,
    switchInkTool,
    setCardInkDraft
  } = useWork()
  const p = getProject(snapshot.workspace),
    flow = useReactFlow()
  const direct = snapshot.workspace.settings.directCardDrawing
  const [color, setColor] = useState('#292822'),
    [width, setWidth] = useState(3)
  const [preview, setPreview] = useState<InkStroke | null>(null)
  const [removed, setRemoved] = useState<string[]>([])
  const active = useRef<Gesture | null>(null)
  const cancelled = useRef(new Set<number>())
  const projectRef = useRef(p)
  projectRef.current = p
  const workspaceRef = useRef(snapshot.workspace)
  workspaceRef.current = snapshot.workspace
  const passiveTap = useRef<{ pointer: number; start: Tap; travelled: number } | null>(null)
  const pendingTap = useRef<{
    tap: Tap
    commit: (() => void) | undefined
    timer: ReturnType<typeof setTimeout>
  } | null>(null)
  const switchedAt = useRef(0)

  useEffect(() => {
    const canvas = document.querySelector<HTMLElement>('.board')
    if (!canvas) return
    canvas.classList.toggle('ink-active', tool !== 'move')
    function clear(): void {
      active.current = null
      setPreview(null)
      setRemoved([])
      setCardInkDraft(null)
    }
    function flushTap(): void {
      const pending = pendingTap.current
      pendingTap.current = null
      if (pending) {
        clearTimeout(pending.timer)
        pending.commit?.()
      }
    }
    function tap(value: Tap, commit?: () => void): boolean {
      const pending = pendingTap.current
      if (
        pending &&
        value.at - pending.tap.at <= 320 &&
        value.project === pending.tap.project &&
        value.owner === pending.tap.owner &&
        value.type === pending.tap.type &&
        Math.hypot(value.x - pending.tap.x, value.y - pending.tap.y) <= 24
      ) {
        clearTimeout(pending.timer)
        pendingTap.current = null
        clear()
        switchedAt.current = performance.now()
        switchInkTool()
        return true
      }
      flushTap()
      pendingTap.current = { tap: value, commit, timer: setTimeout(flushTap, 320) }
      return false
    }
    function commit(a: Gesture): void {
      const owner = workspaceRef.current.projects.find((project) => project.id === a.project)
      if (!owner || (a.card && !owner.blocks.some((b) => b.id === a.card!.id))) return
      if (a.eraser && a.removed.size)
        void run(
          a.card
            ? {
                type: 'card-ink-delete',
                projectId: a.project,
                blockId: a.card.id,
                ids: [...a.removed]
              }
            : { type: 'ink-delete', projectId: a.project, ids: [...a.removed] }
        )
      else if (!a.eraser)
        void run(
          a.card
            ? { type: 'card-ink-add', projectId: a.project, blockId: a.card.id, stroke: a.stroke }
            : { type: 'ink-add', projectId: a.project, stroke: a.stroke }
        )
    }
    function point(e: PointerEvent, a: Gesture) {
      const position = a.card
        ? {
            x: Math.max(
              0,
              Math.min(500, ((e.clientX - a.card.rect.left) / a.card.rect.width) * 500)
            ),
            y: Math.max(
              0,
              Math.min(320, ((e.clientY - a.card.rect.top) / a.card.rect.height) * 320)
            )
          }
        : flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      return { ...position, pressure: e.pointerType === 'pen' ? Math.max(0.05, e.pressure) : 0.5 }
    }
    function erase(at: { x: number; y: number }, a: Gesture): void {
      const radius = a.card
        ? 18 * Math.max(500 / a.card.rect.width, 320 / a.card.rect.height)
        : 18 / flow.getZoom()
      for (const stroke of a.strokes) if (strokeNear(stroke, at, radius)) a.removed.add(stroke.id)
    }
    function show(a: Gesture): void {
      if (a.card)
        setCardInkDraft({
          projectId: a.project,
          blockId: a.card.id,
          stroke: a.eraser ? null : { ...a.stroke },
          erased: [...a.removed]
        })
      else if (a.eraser) setRemoved([...a.removed])
      else setPreview({ ...a.stroke })
    }
    // React Flow also listens for legacy touch/mouse events, independently of pointer events.
    // Consume those before they can start dragging a card during an ink gesture.
    const legacy = (event: Event) => {
      if ((tool === 'move' || tool === 'select') && !active.current) return
      const target = event.target as Element
      if (
        target.closest(
          'button,input,select,textarea,.ink-tools,.react-flow__controls,.react-flow__handle,.board-mode,.floating-add'
        )
      )
        return
      if (direct && target.closest('.card-header')) return
      if (target.closest('.group-card') && !target.closest('[data-ink-card]')) return
      event.preventDefault()
      event.stopPropagation()
    }
    const doubleClick = (event: Event) => {
      const e = event as MouseEvent
      if (
        e.button !== 0 ||
        (e.target as Element).closest(
          'button,input,select,textarea,.ink-tools,.react-flow__controls,.react-flow__handle'
        )
      )
        return
      if (
        performance.now() - switchedAt.current < 500 ||
        (e.target as Element).classList.contains('react-flow__pane')
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const listener = (event: Event) => {
      const e = event as PointerEvent
      const target = e.target as Element
      if (cancelled.current.has(e.pointerId)) {
        e.preventDefault()
        e.stopPropagation()
        if (['pointerup', 'pointercancel', 'lostpointercapture'].includes(e.type))
          cancelled.current.delete(e.pointerId)
        return
      }
      if (!active.current && (tool === 'move' || tool === 'select') && e.pointerType !== 'pen') {
        if (
          e.type === 'pointerdown' &&
          e.button === 0 &&
          target.classList.contains('react-flow__pane')
        )
          passiveTap.current = {
            pointer: e.pointerId,
            travelled: 0,
            start: {
              x: e.clientX,
              y: e.clientY,
              at: performance.now(),
              type: e.pointerType,
              project: p.id,
              owner: 'board'
            }
          }
        const passive = passiveTap.current
        if (passive?.pointer === e.pointerId) {
          passive.travelled = Math.max(
            passive.travelled,
            Math.hypot(e.clientX - passive.start.x, e.clientY - passive.start.y)
          )
          if (
            e.type === 'pointerup' ||
            e.type === 'pointercancel' ||
            e.type === 'lostpointercapture'
          ) {
            passiveTap.current = null
            if (
              e.type === 'pointerup' &&
              passive.travelled <= 6 &&
              performance.now() - passive.start.at <= 350 &&
              tap({ ...passive.start, at: performance.now() })
            ) {
              e.preventDefault()
              e.stopPropagation()
            }
          } else if (passive.travelled > 6) flushTap()
        }
        return
      }
      let a = active.current
      if (e.type === 'pointerdown') {
        if (a) {
          cancelled.current.add(a.pointer)
          cancelled.current.add(e.pointerId)
          clear()
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (
          ((tool === 'move' || tool === 'select') && e.pointerType !== 'pen') ||
          (e.button !== 0 && e.pointerType !== 'pen')
        )
          return
        if (
          (e.target as Element).closest(
            'button,input,select,textarea,.ink-tools,.react-flow__controls,.react-flow__handle'
          )
        )
          return
        const card = direct && (e.target as Element).closest<HTMLElement>('[data-ink-card]')
        const surface = card && card.querySelector('.card-ink-surface'),
          rect = surface && surface.getBoundingClientRect()
        // Headers and group frames remain available for their existing interactions.
        if (
          card &&
          (!rect ||
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom)
        )
          return
        if (!card && (e.target as Element).closest('.group-card,.board-mode,.floating-add')) return
        const current = projectRef.current
        const block = card && current.blocks.find((b) => b.id === card.dataset.inkCard)
        a = {
          stroke: { id: uid(), color, width, points: [] },
          pointer: e.pointerId,
          project: p.id,
          eraser: tool === 'erase' || e.button === 5,
          strokes: block ? (block.ink ?? []) : (current.ink ?? []),
          removed: new Set(),
          start: { x: e.clientX, y: e.clientY, at: performance.now(), type: e.pointerType },
          travelled: 0,
          ...(block && rect ? { card: { id: block.id, rect } } : {})
        }
        a.stroke.points.push(point(e, a))
        active.current = a
        canvas!.setPointerCapture(e.pointerId)
        if (a.eraser) erase(a.stroke.points[0], a)
        show(a)
      } else {
        if (!a || a.pointer !== e.pointerId) return
        if (e.type === 'pointermove' || e.type === 'pointerup') {
          a.travelled = Math.max(
            a.travelled,
            Math.hypot(e.clientX - a.start.x, e.clientY - a.start.y)
          )
          if (a.travelled > 6) flushTap()
          const samples = e.getCoalescedEvents?.()
          for (const sample of samples?.length ? samples : [e]) {
            const at = point(sample, a),
              last = a.stroke.points.at(-1)!
            if (a.eraser) erase(at, a)
            else if (
              Math.hypot(at.x - last.x, at.y - last.y) >= (a.card ? 0.5 : 0.5 / flow.getZoom()) &&
              a.stroke.points.length < 20000
            )
              a.stroke.points.push(at)
          }
          show(a)
        }
        if (e.type !== 'pointermove') {
          clear()
          if (e.type === 'pointerup') {
            if (a.travelled <= 6 && performance.now() - a.start.at <= 350)
              tap(
                {
                  ...a.start,
                  at: performance.now(),
                  project: a.project,
                  owner: a.card?.id ?? 'board'
                },
                () => commit(a!)
              )
            else {
              flushTap()
              commit(a)
            }
          }
        }
      }
      e.preventDefault()
      e.stopPropagation()
    }
    const names = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']
    for (const name of names) canvas.addEventListener(name, listener, true)
    for (const name of ['touchstart', 'mousedown'])
      canvas.addEventListener(name, legacy, { capture: true, passive: false })
    canvas.addEventListener('dblclick', doubleClick, true)
    return () => {
      for (const name of names) canvas.removeEventListener(name, listener, true)
      for (const name of ['touchstart', 'mousedown']) canvas.removeEventListener(name, legacy, true)
      canvas.removeEventListener('dblclick', doubleClick, true)
      canvas.classList.remove('ink-active')
      clear()
      flushTap()
      passiveTap.current = null
      cancelled.current.clear()
    }
  }, [tool, p.id, direct, color, width, flow, run, switchInkTool, setCardInkDraft])

  return (
    <>
      <ViewportPortal>
        <svg className="ink-layer" overflow="visible" aria-hidden="true">
          <StrokeLines
            strokes={[
              ...(p.ink ?? []).filter((s) => !removed.includes(s.id)),
              ...(preview ? [preview] : [])
            ]}
          />
        </svg>
      </ViewportPortal>
      <div className="ink-tools nodrag nopan">
        <button
          aria-label={t('移动')}
          title={t('移动')}
          className={tool === 'move' ? 'active' : ''}
          onClick={() => setTool('move')}
        >
          <Hand size={17} />
        </button>
        <button
          aria-label={t('画笔')}
          title={t('画笔')}
          className={tool === 'pen' ? 'active' : ''}
          onClick={() => setTool('pen')}
        >
          <Pencil size={17} />
        </button>
        <button
          aria-label={t('橡皮擦')}
          title={t('橡皮擦')}
          className={tool === 'erase' ? 'active' : ''}
          onClick={() => setTool('erase')}
        >
          <Eraser size={17} />
        </button>
        {tool === 'pen' && (
          <>
            <input
              type="color"
              aria-label={t('画笔颜色')}
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <select
              aria-label={t('画笔粗细')}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            >
              {[1, 3, 6, 12].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </>
  )
}
