import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Eraser, Undo2, Redo2, X, Check } from 'lucide-react'
import { type Block, type InkStroke, uid } from '../../shared/model'
import { inkBasis } from '../../shared/domain'
import { t } from '../../shared/i18n'
import { Paint } from './Art'

export function StrokeLines({ strokes }: { strokes: InkStroke[] }): React.JSX.Element {
  return (
    <>
      {strokes.map((s) => (
        <g key={s.id} stroke={s.color} strokeLinecap="round" strokeLinejoin="round" fill={s.color}>
          {s.points.length === 1 ? (
            <circle cx={s.points[0].x} cy={s.points[0].y} r={s.width / 2} />
          ) : (
            s.points
              .slice(1)
              .map((v, i) => (
                <line
                  key={i}
                  x1={s.points[i].x}
                  y1={s.points[i].y}
                  x2={v.x}
                  y2={v.y}
                  strokeWidth={s.width * (0.45 + (v.pressure + s.points[i].pressure) * 0.55)}
                />
              ))
          )}
        </g>
      ))}
    </>
  )
}
export function strokeNear(
  stroke: InkStroke,
  at: { x: number; y: number },
  radius: number
): boolean {
  return stroke.points.some((v, i) => {
    const next = stroke.points[i + 1] ?? v,
      dx = next.x - v.x,
      dy = next.y - v.y
    const ratio = Math.max(
      0,
      Math.min(1, ((at.x - v.x) * dx + (at.y - v.y) * dy) / (dx * dx + dy * dy || 1))
    )
    return Math.hypot(at.x - v.x - ratio * dx, at.y - v.y - ratio * dy) <= radius + stroke.width
  })
}
export function CardInkEditor({
  block,
  projectId,
  close
}: {
  block: Block
  projectId: string
  close: () => void
}): React.JSX.Element {
  const [strokes, setStrokes] = useState<InkStroke[]>(() => structuredClone(block.ink ?? []))
  const [preview, setPreview] = useState<InkStroke | null>(null)
  const [tool, setTool] = useState<'pen' | 'erase'>('pen'),
    [color, setColor] = useState('#292822'),
    [width, setWidth] = useState(3)
  const [undo, setUndo] = useState<InkStroke[][]>([]),
    [redo, setRedo] = useState<InkStroke[][]>([]),
    [saving, setSaving] = useState(false)
  const basis = useRef(inkBasis(block.ink ?? []))
  const originalSize = useRef([block.width, block.height])
  const [cardWidth, setCardWidth] = useState(String(block.width))
  const [cardHeight, setCardHeight] = useState(String(block.height))
  const sizeValid =
    !!cardWidth.trim() &&
    !!cardHeight.trim() &&
    Number.isFinite(Number(cardWidth)) &&
    Number.isFinite(Number(cardHeight)) &&
    Number(cardWidth) >= 180 &&
    Number(cardWidth) <= 8000 &&
    Number(cardHeight) >= 100 &&
    Number(cardHeight) <= 20000
  const [failure, setFailure] = useState('')
  const active = useRef<{
    pointer: number
    stroke: InkStroke
    erase: boolean
    removed: Set<string>
  } | null>(null)
  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app'),
      was = app?.inert
    if (app) app.inert = true
    const back = (e: Event) => {
      e.preventDefault()
      close()
    }
    window.addEventListener('anchor-back', back)
    return () => {
      if (app) app.inert = was ?? false
      window.removeEventListener('anchor-back', back)
    }
  }, [close])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (
        e.target instanceof HTMLElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)
      )
        return
      const name = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (name === 'z' || name === 'y')) {
        e.preventDefault()
        if (name === 'y' || e.shiftKey) {
          if (redo.length) {
            setUndo((v) => [...v, strokes])
            setStrokes(redo.at(-1)!)
            setRedo((v) => v.slice(0, -1))
          }
        } else if (undo.length) {
          setRedo((v) => [...v, strokes])
          setStrokes(undo.at(-1)!)
          setUndo((v) => v.slice(0, -1))
        }
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [close, undo, redo, strokes])
  function update(next: InkStroke[]): void {
    setUndo((v) => [...v, strokes].slice(-100))
    setRedo([])
    setStrokes(next)
  }
  function point(
    e: { clientX: number; clientY: number; pressure: number; pointerType: string },
    svg: SVGSVGElement
  ) {
    const r = svg.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(500, ((e.clientX - r.left) / r.width) * 500)),
      y: Math.max(0, Math.min(320, ((e.clientY - r.top) / r.height) * 320)),
      pressure: e.pointerType === 'pen' ? Math.max(0.05, e.pressure) : 0.5
    }
  }
  function down(e: React.PointerEvent<SVGSVGElement>): void {
    if (active.current) {
      active.current = null
      setPreview(null)
      return
    }
    if (e.button !== 0 && e.pointerType !== 'pen') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const stroke = { id: uid(), color, width, points: [point(e, e.currentTarget)] }
    active.current = {
      pointer: e.pointerId,
      stroke,
      erase: tool === 'erase' || e.button === 5,
      removed: new Set()
    }
    if (active.current.erase) erase(stroke.points[0])
    else setPreview(stroke)
  }
  function erase(at: { x: number; y: number }): void {
    for (const s of strokes) if (strokeNear(s, at, 15)) active.current?.removed.add(s.id)
  }
  function move(e: React.PointerEvent<SVGSVGElement>): void {
    const a = active.current
    if (!a || a.pointer !== e.pointerId) return
    e.preventDefault()
    const samples = e.nativeEvent.getCoalescedEvents?.()
    for (const sample of samples?.length ? samples : [e.nativeEvent]) {
      const v = point(sample, e.currentTarget),
        last = a.stroke.points.at(-1)!
      if (a.erase) erase(v)
      else if (Math.hypot(v.x - last.x, v.y - last.y) >= 0.5 && a.stroke.points.length < 20000)
        a.stroke.points.push(v)
    }
    if (!a.erase) setPreview({ ...a.stroke })
  }
  function finish(e: React.PointerEvent<SVGSVGElement>, cancel = false): void {
    const a = active.current
    if (!a || a.pointer !== e.pointerId) return
    active.current = null
    setPreview(null)
    if (cancel) return
    if (a.erase) {
      if (a.removed.size) update(strokes.filter((s) => !a.removed.has(s.id)))
    } else update([...strokes, a.stroke])
  }
  async function save(): Promise<void> {
    if (active.current || !sizeValid) return
    setSaving(true)
    try {
      await window.desktop.command({
        type: 'card-ink',
        projectId,
        blockId: block.id,
        strokes,
        expectedInk: basis.current,
        ...(Number(cardWidth) !== originalSize.current[0] ||
        Number(cardHeight) !== originalSize.current[1]
          ? {
              size: { width: Number(cardWidth), height: Number(cardHeight) },
              expectedSize: JSON.stringify(originalSize.current)
            }
          : {})
      })
      close()
    } catch (e) {
      setFailure((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return createPortal(
    <div className="modal-backdrop card-ink-backdrop">
      <section
        className="card-ink-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('卡片绘图')}
      >
        <header>
          <button aria-label={t('取消')} onClick={close}>
            <X size={20} />
          </button>
          <div>
            <h2>{t('卡片绘图')}</h2>
            <p>{block.title || t('无题片段')}</p>
          </div>
          <button
            className="primary"
            disabled={saving || !!preview || !sizeValid}
            onClick={() => void save()}
          >
            <Check size={18} />
            {t('保存')}
          </button>
        </header>
        <div className="card-ink-toolbar">
          <button
            aria-label={t('画笔')}
            className={tool === 'pen' ? 'active' : ''}
            onClick={() => setTool('pen')}
          >
            <Pencil size={20} />
          </button>
          <button
            aria-label={t('橡皮擦')}
            className={tool === 'erase' ? 'active' : ''}
            onClick={() => setTool('erase')}
          >
            <Eraser size={20} />
          </button>
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
          <span />
          <button
            aria-label={t('撤销 Ctrl+Z')}
            disabled={!undo.length}
            onClick={() => {
              setRedo((v) => [...v, strokes])
              setStrokes(undo.at(-1)!)
              setUndo((v) => v.slice(0, -1))
            }}
          >
            <Undo2 size={20} />
          </button>
          <button
            aria-label={t('重做 Ctrl+Y')}
            disabled={!redo.length}
            onClick={() => {
              setUndo((v) => [...v, strokes])
              setStrokes(redo.at(-1)!)
              setRedo((v) => v.slice(0, -1))
            }}
          >
            <Redo2 size={20} />
          </button>
        </div>
        <fieldset className="card-size-fields">
          <legend>{t('卡片大小')}</legend>
          <label>
            {t('宽度')}
            <input
              type="number"
              aria-label={t('卡片宽度')}
              min={180}
              max={8000}
              value={cardWidth}
              onChange={(e) => setCardWidth(e.target.value)}
            />
          </label>
          <span>×</span>
          <label>
            {t('高度')}
            <input
              type="number"
              aria-label={t('卡片高度')}
              min={100}
              max={20000}
              value={cardHeight}
              onChange={(e) => setCardHeight(e.target.value)}
            />
          </label>
        </fieldset>
        <div className="card-ink-paper">
          <Paint color={block.color} />
          <div className="card-ink-text">{block.text || t('先留下一点什么…')}</div>
          <svg
            className="card-ink-canvas"
            viewBox="0 0 500 320"
            preserveAspectRatio="none"
            aria-label={t('绘图区域')}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={(e) => finish(e)}
            onPointerCancel={(e) => finish(e, true)}
          >
            <StrokeLines strokes={[...strokes, ...(preview ? [preview] : [])]} />
          </svg>
        </div>
        {failure && <p role="alert">{failure}</p>}
        <p className="fine-print">{t('保存后绘图留在这张卡片中，随卡片移动、导出和同步。')}</p>
      </section>
    </div>,
    document.body
  )
}
