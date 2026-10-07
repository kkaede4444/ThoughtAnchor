import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Inbox,
  Layers2,
  Plus,
  Redo2,
  Settings2,
  Trash2,
  Undo2,
  Upload,
  X
} from 'lucide-react'
import { Command, Snapshot } from '../../shared/model'
import { canSubmitCapture, getBlock, getProject } from '../../shared/domain'
import { ArtDefs, Loader, Mark, Paint } from './Art'
import { Board } from './Board'
import { Article } from './Article'
import { Settings } from './Settings'
import { WorkContext, useWork } from './context'

function paperSound(): void {
  try {
    const context = new AudioContext()
    const buffer = context.createBuffer(1, context.sampleRate * 0.055, context.sampleRate)
    const a = buffer.getChannelData(0)
    for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * 0.025 * (1 - i / a.length)
    const node = context.createBufferSource()
    node.buffer = buffer
    node.connect(context.destination)
    node.start()
    node.onended = () => {
      void context.close()
    }
  } catch {
    /* Audio is optional. */
  }
}
export function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(0)
  const [selected, updateSelected] = useState<string[]>([])
  const [joins, setJoins] = useState(0)
  const setSelected = useCallback(
    (ids: string[]) =>
      updateSelected((previous) =>
        previous.length === ids.length && previous.every((id, i) => id === ids[i]) ? previous : ids
      ),
    []
  )
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const notify = useCallback((text: string) => {
    setMessage(text.replace(/^Error invoking remote method '[^']+': Error: /, ''))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), 4400)
  }, [])
  useEffect(() => {
    let live = true
    void window.desktop
      .snapshot()
      .then((s) => {
        if (live) setSnapshot(s)
      })
      .catch((e) => setError(e.message))
    const off = window.desktop.subscribe((s) => {
      if (live) setSnapshot(s)
    })
    return () => {
      live = false
      off()
    }
  }, [])
  const run = useCallback(
    async (c: Command, message?: string): Promise<Snapshot | undefined> => {
      setPending((n) => n + 1)
      try {
        const next = await window.desktop.command(c)
        setSnapshot(next)
        if (message) {
          notify(message)
          if (['snap', 'group', 'article', 'connector'].includes(c.type)) {
            setJoins((n) => n + 1)
            if (next.workspace.settings.sound) paperSound()
          }
        }
        return next
      } catch (e) {
        notify((e as Error).message)
        return undefined
      } finally {
        setPending((n) => n - 1)
      }
    },
    [notify]
  )
  if (!snapshot)
    return (
      <div className="startup">
        <ArtDefs />
        <Mark />
        <h1>ThoughtAnchor</h1>
        {error ? <p role="alert">{error}</p> : <Loader label="铺开一张思路纸…" />}
      </div>
    )
  return (
    <WorkContext.Provider value={{ snapshot, run, notify, selected, setSelected }}>
      <div className={`app ${snapshot.workspace.settings.reducedMotion ? 'reduce-motion' : ''}`}>
        <ArtDefs />
        <div className="paper-texture" aria-hidden="true" />
        {location.hash === '#capture' ? <Capture /> : <Workbench pending={pending} joins={joins} />}
        {message && (
          <div className="toast" role="status">
            <span className="toast-mark">✓</span>
            {message}
          </div>
        )}
      </div>
    </WorkContext.Provider>
  )
}
function Capture(): React.JSX.Element {
  const { snapshot, run } = useWork()
  const [value, setValue] = useState(snapshot.workspace.captureDraft)
  const ref = useRef(value)
  const input = useRef<HTMLTextAreaElement>(null)
  const composing = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  ref.current = value
  useEffect(() => {
    const focus = (): void => {
      input.current?.focus()
    }
    window.addEventListener('focus', focus)
    focus()
    return () => window.removeEventListener('focus', focus)
  }, [])
  async function submit(): Promise<void> {
    if (saving || !value.trim()) return
    setSaving(true)
    const captured = value
    const result = await run({ type: 'capture', text: captured })
    if (result) {
      const current = ref.current
      const remainder =
        current === captured
          ? ''
          : current.startsWith(captured)
            ? current.slice(captured.length)
            : current
      setValue(remainder)
      ref.current = remainder
      await run({ type: 'draft', text: remainder })
      setSaved(true)
      setTimeout(() => setSaved(false), 1200)
    }
    setSaving(false)
    input.current?.focus()
  }
  return (
    <main className="capture">
      <header>
        <Mark />
        <div>
          <span className="eyebrow">CATCH A THOUGHT</span>
          <h1>先留住这一片</h1>
        </div>
        <span className="capture-saved" role="status">
          {saving ? '正在保存…' : saved ? '✓ 已留住' : '留在全局收件盒'}
        </span>
      </header>
      <div className="capture-paper">
        <Paint color="sage" />
        <textarea
          ref={input}
          aria-label="快速捕捉内容"
          placeholder="不必想完整，先写下来。"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            ref.current = e.target.value
            void run({ type: 'draft', text: e.target.value })
          }}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={() => {
            composing.current = false
          }}
          onKeyDown={(e) => {
            if (
              canSubmitCapture(
                e.key,
                e.shiftKey,
                composing.current || e.nativeEvent.isComposing || e.keyCode === 229
              )
            ) {
              e.preventDefault()
              void submit()
            }
            if (e.key === 'Escape' && !composing.current) {
              void window.desktop.hideCapture()
            }
          }}
        />
      </div>
      <footer>
        <p>Enter 留住并继续 · Shift+Enter 换行 · Esc 收起</p>
        <button
          className="primary"
          disabled={saving || !value.trim()}
          onClick={() => {
            void submit()
          }}
        >
          <Check size={15} />
          留住
        </button>
      </footer>
    </main>
  )
}
function InboxPanel(): React.JSX.Element {
  const { snapshot, run } = useWork()
  const [text, setText] = useState('')
  const composing = useRef(false)
  const [busy, setBusy] = useState(false)
  const p = getProject(snapshot.workspace)
  const notes = snapshot.workspace.inbox
  async function submit(): Promise<void> {
    if (busy || !text.trim()) return
    setBusy(true)
    const sent = text
    const result = await run({ type: 'capture', text: sent }, '这片想法已留住')
    if (result) setText((current) => (current === sent ? '' : current))
    setBusy(false)
  }
  return (
    <aside className="inbox-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">FRAGMENTS</span>
          <h2>闪念收件盒</h2>
        </div>
        <span className="count-pill">{notes.length}</span>
      </div>
      <p className="panel-intro">还没想好放哪，也可以先留下。</p>
      <div className="quick-input">
        <textarea
          aria-label="收件盒快速输入"
          placeholder="一个词、一句话、几段文字…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={() => {
            composing.current = false
          }}
          onKeyDown={(e) => {
            if (
              canSubmitCapture(
                e.key,
                e.shiftKey,
                composing.current || e.nativeEvent.isComposing || e.keyCode === 229
              )
            ) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <button
          title="留到收件盒"
          disabled={busy || !text.trim()}
          onClick={() => {
            void submit()
          }}
        >
          <Plus size={18} />
        </button>
      </div>
      <p className="fine-print">Enter 留住，Shift+Enter 换行</p>
      <div className="inbox-list">
        {notes.length === 0 ? (
          <div className="inbox-empty">
            <span>✳</span>
            <p>想到一点，就留一点。</p>
            <p className="fine-print">全局快捷键也能捕捉。</p>
          </div>
        ) : (
          [...notes].reverse().map((n) => (
            <div className="inbox-note" key={n.id}>
              <Paint color={n.color} />
              <p>{n.text}</p>
              <footer>
                <button
                  onClick={() => {
                    void run(
                      {
                        type: 'inbox',
                        projectId: p.id,
                        ids: [n.id],
                        action: 'place',
                        x: 100 - p.viewport.x / p.viewport.zoom,
                        y: 100 - p.viewport.y / p.viewport.zoom
                      },
                      '这片想法落到了纸上'
                    )
                  }}
                >
                  放到纸上 <span>↗</span>
                </button>
                <button
                  className="icon-button"
                  title="删除收件盒片段"
                  onClick={() => {
                    void run(
                      { type: 'inbox', projectId: p.id, ids: [n.id], action: 'delete' },
                      '片段已移除，可撤销'
                    )
                  }}
                >
                  <X size={13} />
                </button>
              </footer>
            </div>
          ))
        )}
      </div>
      {notes.length > 0 && (
        <button
          className="inbox-all"
          onClick={() => {
            void run(
              {
                type: 'inbox',
                projectId: p.id,
                ids: notes.map((n) => n.id),
                action: 'place',
                x: 80,
                y: 80
              },
              '把所有闪念摊开了'
            )
          }}
        >
          全部摊到这张纸上
        </button>
      )}
      <button
        className="capture-launch"
        onClick={() => {
          void window.desktop.captureWindow()
        }}
      >
        <Inbox size={14} />
        <span>随时捕捉</span>
        <kbd>
          {snapshot.workspace.settings.shortcut
            .replace('CommandOrControl', 'Ctrl')
            .replace('Control', 'Ctrl')
            .replace('Shift', '⇧')
            .replaceAll('+', ' ')}
        </kbd>
      </button>
    </aside>
  )
}
function Workbench({ pending, joins }: { pending: number; joins: number }): React.JSX.Element {
  const { snapshot, run, notify, selected, setSelected } = useWork()
  const w = snapshot.workspace
  const p = getProject(w)
  const [article, setArticle] = useState(true)
  const [inbox, setInbox] = useState(true)
  const [settings, setSettings] = useState(false)
  const [templates, setTemplates] = useState(false)
  const [projects, setProjects] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(p.title)
  useEffect(() => setName(p.title), [p.title])
  useEffect(() => {
    setSelected([])
  }, [p.id, setSelected])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      const input =
        e.target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)
      if (e.key === 'Escape') {
        setSettings(false)
        setTemplates(false)
        setProjects(false)
        return
      }
      if (input) return
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        void run({ type: e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        void run({ type: 'redo' })
        return
      }
      if (e.key === 'Delete' && selected.length) {
        e.preventDefault()
        void run({ type: 'delete', projectId: p.id, ids: selected }, '片段已移除，可撤销')
        setSelected([])
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [p.id, run, selected, setSelected])
  const one = selected.length === 1 ? p.blocks.find((b) => b.id === selected[0]) : undefined
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Mark />
          <span>ThoughtAnchor</span>
        </div>
        <div className="project-switch">
          {renaming ? (
            <input
              className="project-name-input"
              autoFocus
              aria-label="思路纸名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setRenaming(false)
                if (name.trim())
                  void run({ type: 'project', action: 'rename', id: p.id, title: name.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          ) : (
            <button className="project-title" onClick={() => setProjects(!projects)}>
              {p.title}
              <ChevronDown size={14} />
            </button>
          )}
          {projects && (
            <div className="popover project-menu">
              {w.projects.map((project) => (
                <button
                  className={project.id === p.id ? 'current' : ''}
                  key={project.id}
                  onClick={() => {
                    void run({ type: 'project', action: 'select', id: project.id })
                    setProjects(false)
                  }}
                >
                  {project.id === p.id && <Check size={13} />}
                  <span>{project.title}</span>
                </button>
              ))}
              <div className="menu-rule" />
              <button
                onClick={() => {
                  void run({ type: 'project', action: 'create', title: '一张新的思路纸' })
                  setProjects(false)
                }}
              >
                <Plus size={14} />
                新建思路纸
              </button>
              <button
                onClick={() => {
                  setRenaming(true)
                  setProjects(false)
                }}
              >
                重命名当前纸
              </button>
              <button
                disabled={w.projects.length < 2}
                onClick={() => {
                  void run({ type: 'project', action: 'delete', id: p.id }, '思路纸已移除，可撤销')
                  setProjects(false)
                }}
              >
                删除当前纸
              </button>
            </div>
          )}
        </div>
        <span className={`save-status ${pending ? 'saving' : ''}`} role="status">
          <span />
          {pending ? '落笔中…' : '已留在本机'}
        </span>
        <div className="topbar-actions">
          <button
            title="导入思路纸"
            onClick={() => {
              void window.desktop.importProject().catch((e) => notify(e.message))
            }}
          >
            <Upload size={16} />
          </button>
          <button
            title="导出思路纸"
            onClick={() => {
              void window.desktop
                .exportProject(p.id)
                .then((file) => {
                  if (file) notify('思路纸已导出')
                })
                .catch((e) => notify(e.message))
            }}
          >
            <Download size={16} />
          </button>
          <button title="设置" onClick={() => setSettings(true)}>
            <Settings2 size={17} />
          </button>
        </div>
      </header>
      {snapshot.recovery && (
        <div className="recovery-banner" role="alert">
          {snapshot.recovery}
        </div>
      )}
      <div className="work-toolbar">
        <div className="view-buttons">
          <button className={inbox ? 'active' : ''} onClick={() => setInbox(!inbox)}>
            <Inbox size={15} />
            闪念
          </button>
          <button className={article ? 'active' : ''} onClick={() => setArticle(!article)}>
            <BookOpen size={15} />
            成文
          </button>
        </div>
        <div className="toolbar-divider" />
        <button
          disabled={!selected.length}
          onClick={() => {
            void run(
              { type: 'group', projectId: p.id, ids: selected, title: '一组相关的想法' },
              '几片想法成了一个板块'
            )
            setSelected([])
          }}
        >
          <Layers2 size={15} />
          归组
        </button>
        <button
          disabled={!one || one.kind === 'text'}
          onClick={() => {
            if (one)
              void run({ type: 'ungroup', projectId: p.id, id: one.id }, '板块拆开了，原文都在')
            setSelected([])
          }}
        >
          拆开
        </button>
        <button
          disabled={!one || one.kind !== 'text'}
          title="按空行拆成片段"
          onClick={() => {
            if (one)
              void run(
                { type: 'split', projectId: p.id, id: one.id, separator: 'paragraph' },
                '每一段有了自己的位置'
              )
          }}
        >
          按段拆分
        </button>
        <button
          disabled={!selected.length}
          title="删除选中片段（可撤销）"
          onClick={() => {
            void run({ type: 'delete', projectId: p.id, ids: selected }, '片段已移除，可撤销')
            setSelected([])
          }}
        >
          <Trash2 size={14} />
        </button>
        <div className="template-control">
          <button onClick={() => setTemplates(!templates)}>
            借一个框架
            <ChevronDown size={13} />
          </button>
          {templates && (
            <div className="popover template-menu">
              <p>框架只提供空位，你决定放什么。</p>
              {(
                [
                  ['clarify', '把困惑摊开', '卡点 → 线索 → 解释 → 下一步'],
                  ['write', '一篇文章的骨架', '观点 → 理由 → 例子 → 收束'],
                  ['plan', '从想法走向行动', '目标 → 路径 → 约束 → 行动']
                ] as const
              ).map(([id, title, detail]) => (
                <button
                  key={id}
                  onClick={() => {
                    void run(
                      { type: 'template', projectId: p.id, template: id },
                      '框架铺好了，慢慢往里放'
                    )
                    setTemplates(false)
                  }}
                >
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="toolbar-spacer" />
        {joins > 0 && (
          <span className="join-count" key={joins}>
            ✳ 接上了 {joins} 小步
          </span>
        )}
        <button
          disabled={!snapshot.canUndo}
          title="撤销 Ctrl+Z"
          onClick={() => {
            void run({ type: 'undo' }, '回到上一步')
          }}
        >
          <Undo2 size={16} />
        </button>
        <button
          disabled={!snapshot.canRedo}
          title="重做 Ctrl+Y"
          onClick={() => {
            void run({ type: 'redo' }, '重新接上这一步')
          }}
        >
          <Redo2 size={16} />
        </button>
      </div>
      <div className="workspace">
        {inbox && <InboxPanel />}
        <Board />
        {article && <Article key={p.id} />}
      </div>
      <footer className="app-footer">
        <span>
          {p.blocks.filter((b) => b.kind === 'text').length} 片想法 ·{' '}
          {p.blocks.filter((b) => b.kind === 'group').length} 个板块 · {p.relations.length} 条联系
        </span>
        <span>先让想法有地方待着。</span>
      </footer>
      {settings && <Settings close={() => setSettings(false)} />}
    </>
  )
}
