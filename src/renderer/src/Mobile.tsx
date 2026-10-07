import { useEffect, useRef, useState } from 'react'
import {
  Menu,
  MoreHorizontal,
  Plus,
  Settings2,
  Search,
  Check,
  X,
  Undo2,
  Redo2,
  Layers2,
  Trash2,
  Pencil,
  BookOpen,
  Inbox
} from 'lucide-react'
import { getProject } from '../../shared/domain'
import { t } from '../../shared/i18n'
import { useWork } from './context'
import { Board, type BoardHandle } from './Board'
import { Article } from './Article'
import { InboxPanel } from './App'
import { Settings } from './Settings'
import { Mark, Paint } from './Art'
import { CardInkEditor } from './CardInk'

export function MobileWorkbench({ pending }: { pending: number }): React.JSX.Element {
  const { snapshot, run, selected, setSelected, notify } = useWork()
  const p = getProject(snapshot.workspace)
  const [page, setPage] = useState<'board' | 'inbox' | 'article'>('board')
  const [drawer, setDrawer] = useState(false),
    [settings, setSettings] = useState(false),
    [more, setMore] = useState(false)
  const [query, setQuery] = useState(''),
    [editor, setEditor] = useState<string | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [title, setTitle] = useState(''),
    [text, setText] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const gesture = useRef<{ x: number; y: number; open: boolean } | null>(null)
  const board = useRef<BoardHandle>(null)
  const one = selected.length === 1 ? p.blocks.find((b) => b.id === selected[0]) : undefined
  useEffect(() => {
    const back = (event: Event) => {
      if (settings || drawer || more || editor || page !== 'board') {
        event.preventDefault()
        if (settings) setSettings(false)
        else if (drawer) setDrawer(false)
        else if (more) setMore(false)
        else if (editor) setEditor(null)
        else setPage('board')
      }
    }
    window.addEventListener('anchor-back', back)
    return () => window.removeEventListener('anchor-back', back)
  }, [settings, drawer, more, editor, page])
  function start(e: React.PointerEvent, open: boolean): void {
    if (e.pointerType === 'mouse') return
    if ((e.target as HTMLElement).closest('button,input,textarea,select')) return
    gesture.current = { x: e.clientX, y: e.clientY, open }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent): void {
    const g = gesture.current
    if (!g || Math.abs(e.clientY - g.y) > 50) return
    setProgress(
      Math.min(
        1,
        Math.max(0, (g.open ? 1 : 0) + (e.clientX - g.x) / Math.min(innerWidth * 0.84, 360))
      )
    )
  }
  function finish(): void {
    if (progress !== null) setDrawer(progress > 0.35)
    gesture.current = null
    setProgress(null)
  }
  const opened = progress ?? (drawer ? 1 : 0)
  const choose = (value: typeof page) => {
    setPage(value)
    setDrawer(false)
    setMore(false)
  }
  async function saveEdit(): Promise<void> {
    if (!editor) return
    const result = await run({
      type: 'edit',
      projectId: p.id,
      id: editor,
      patch: { title, ...(one?.kind === 'text' ? { text } : {}) }
    })
    if (result) setEditor(null)
  }
  return (
    <>
      <div
        className="mobile-stage"
        style={{ '--drawer-progress': opened } as React.CSSProperties}
        inert={opened > 0 || settings || editor !== null}
      >
        <header
          className="mobile-header"
          onPointerDown={(e) => start(e, false)}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        >
          <button aria-label={t('目录')} onClick={() => setDrawer(true)}>
            <Menu size={22} />
          </button>
          <div>
            <strong>{p.title}</strong>
            <span className="fine-print">{pending ? t('正在保存…') : t('已留在本机')}</span>
          </div>
          <button aria-label={t('更多操作')} onClick={() => setMore(!more)}>
            <MoreHorizontal size={23} />
          </button>
        </header>
        <nav className="mobile-tabs">
          {(
            [
              ['board', '白板'],
              ['inbox', '闪念'],
              ['article', '成文']
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => choose(id)}>
              {t(label)}
            </button>
          ))}
          <span />
          <button
            aria-label={t('撤销 Ctrl+Z')}
            disabled={!snapshot.canUndo}
            onClick={() => void run({ type: 'undo' })}
          >
            <Undo2 size={18} />
          </button>
          <button
            aria-label={t('重做 Ctrl+Y')}
            disabled={!snapshot.canRedo}
            onClick={() => void run({ type: 'redo' })}
          >
            <Redo2 size={18} />
          </button>
        </nav>
        {snapshot.recovery && (
          <p className="recovery-banner" role="alert">
            {snapshot.recovery}
          </p>
        )}
        <main className="mobile-content">
          <div className="mobile-board-page" hidden={page !== 'board'}>
            <Board key={p.id} ref={board} />
          </div>
          {page === 'inbox' && <InboxPanel />}
          {page === 'article' && <Article key={p.id} />}
        </main>
        {selected.length > 0 && page === 'board' && (
          <div className="mobile-selection">
            <button
              aria-label={t('编辑')}
              disabled={!one}
              onClick={() => {
                if (one) {
                  setTitle(one.title)
                  setText(one.text)
                  setEditor(one.id)
                }
              }}
            >
              <Pencil size={18} />
            </button>
            <button
              aria-label={t('卡片绘图')}
              disabled={one?.kind !== 'text'}
              onClick={() => setDrawing(true)}
            >
              <Pencil size={18} />
              {t('画笔')}
            </button>
            <button
              onClick={() =>
                void run({
                  type: 'group',
                  projectId: p.id,
                  ids: selected,
                  title: t('一组相关的想法')
                })
              }
            >
              <Layers2 size={16} />
              {t('归组')}
            </button>
            <button
              disabled={!one || one.kind === 'text'}
              onClick={() => one && void run({ type: 'ungroup', projectId: p.id, id: one.id })}
            >
              {t('拆开')}
            </button>
            <button
              onClick={() =>
                void run({ type: 'article', projectId: p.id, ids: [...p.article, ...selected] })
              }
            >
              <BookOpen size={16} />
              {t('加入选中')}
            </button>
            <button
              aria-label={t('删除卡片')}
              onClick={() => {
                void run({ type: 'delete', projectId: p.id, ids: selected })
                setSelected([])
              }}
            >
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>
      {!drawer && !settings && (
        <div
          className="drawer-edge"
          onPointerDown={(e) => start(e, false)}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      )}
      {
        <>
          <button
            className={`drawer-scrim ${opened > 0 ? 'is-open' : ''}`}
            aria-hidden={opened <= 0}
            aria-label={t('关闭目录')}
            style={{ opacity: opened }}
            onClick={() => setDrawer(false)}
          />
          <aside
            className={`mobile-drawer ${opened > 0 ? 'is-open' : ''}`}
            aria-hidden={opened <= 0}
            inert={opened <= 0}
            role="dialog"
            aria-modal="true"
            aria-label={t('目录')}
            style={{
              transform: `translateX(${(opened - 1) * 100}%)`,
              transition: progress !== null ? 'none' : undefined
            }}
            onPointerDown={(e) => start(e, true)}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
          >
            <div className="drawer-brand">
              <Mark />
              <strong>ThoughtAnchor</strong>
              <button aria-label={t('关闭目录')} onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="drawer-search">
              <Search size={18} />
              <input
                aria-label={t('搜索思路纸')}
                placeholder={t('搜索思路纸')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="drawer-inbox" onClick={() => choose('inbox')}>
              <Inbox size={19} />
              {t('闪念收件盒')}
              <span>{snapshot.workspace.inbox.length}</span>
            </button>
            <p className="eyebrow">{t('思路纸')}</p>
            <div className="drawer-papers">
              {snapshot.workspace.projects
                .filter((x) => x.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
                .map((x) => (
                  <button
                    key={x.id}
                    className={x.id === p.id ? 'current' : ''}
                    onClick={() => {
                      void run({ type: 'project', action: 'select', id: x.id })
                      choose('board')
                    }}
                  >
                    <span>{x.title}</span>
                    {x.id === p.id && <Check size={16} />}
                  </button>
                ))}
            </div>
            <footer>
              <button
                className="primary"
                onClick={() => {
                  void run({ type: 'project', action: 'create', title: t('一张新的思路纸') })
                  choose('board')
                }}
              >
                <Plus size={18} />
                {t('新建思路纸')}
              </button>
              <button
                className="drawer-settings"
                aria-label={t('设置')}
                onClick={() => {
                  setDrawer(false)
                  setSettings(true)
                }}
              >
                <Settings2 size={22} />
              </button>
            </footer>
          </aside>
        </>
      }
      {more && (
        <div className="mobile-menu">
          <button
            onClick={() => {
              void window.desktop.importProject().catch((e) => notify(e.message))
              setMore(false)
            }}
          >
            {t('导入思路纸')}
          </button>
          <button
            onClick={() => {
              void window.desktop.exportProject(p.id).catch((e) => notify(e.message))
              setMore(false)
            }}
          >
            {t('导出思路纸')}
          </button>
          <button
            onClick={() => {
              const name = prompt(t('思路纸名称'), p.title)
              if (name?.trim())
                void run({ type: 'project', action: 'rename', id: p.id, title: name.trim() })
              setMore(false)
            }}
          >
            {t('重命名当前纸')}
          </button>
          {(['clarify', 'write', 'plan'] as const).map((id, i) => (
            <button
              key={id}
              onClick={() => {
                void board.current?.addTemplate(id)
                choose('board')
              }}
            >
              {t(['把困惑摊开', '一篇文章的骨架', '从想法走向行动'][i])}
            </button>
          ))}
          <button
            disabled={!one || one.kind !== 'text'}
            onClick={() => {
              if (one)
                void run({ type: 'split', projectId: p.id, id: one.id, separator: 'paragraph' })
              setMore(false)
            }}
          >
            {t('按段拆分')}
          </button>
          <button
            disabled={snapshot.workspace.projects.length < 2}
            onClick={() => {
              void run({ type: 'project', action: 'delete', id: p.id })
              setMore(false)
            }}
          >
            {t('删除当前纸')}
          </button>
        </div>
      )}
      {editor && (
        <section className="mobile-editor" role="dialog" aria-modal="true">
          <header>
            <button aria-label={t('取消')} onClick={() => setEditor(null)}>
              <X />
            </button>
            <strong>{t('编辑')}</strong>
            <button className="primary" onClick={() => void saveEdit()}>
              <Check size={18} />
              {t('保存')}
            </button>
          </header>
          <input
            aria-label={t('片段标题')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {one?.kind === 'text' && (
            <textarea
              autoFocus
              aria-label={t('片段内容')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
          <Paint color={one?.color ?? 'sage'} />
        </section>
      )}
      {settings && <Settings close={() => setSettings(false)} />}
      {drawing && one && (
        <CardInkEditor block={one} projectId={p.id} close={() => setDrawing(false)} />
      )}
    </>
  )
}
