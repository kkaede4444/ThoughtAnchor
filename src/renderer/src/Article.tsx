import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Download, Plus, Sparkles, X } from 'lucide-react'
import { WritingResult, AIRequest } from '../../shared/model'
import {
  articleSourceBasis,
  blockText,
  getBlock,
  getProject,
  writingBasis
} from '../../shared/domain'
import { t } from '../../shared/i18n'
import { Loader } from './Art'
import { useWork } from './context'
import { WritingOptions } from './WritingOptions'

export function Article(): React.JSX.Element {
  const { snapshot, run, notify, selected } = useWork()
  const p = getProject(snapshot.workspace),
    settings = snapshot.workspace.settings
  const options = { ...settings.writing, locale: settings.locale }
  const [result, setResult] = useState<WritingResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [draftText, setDraftText] = useState(p.draft?.text || '')
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!editing) setDraftText(p.draft?.text || '')
  }, [p.draft?.text, editing])
  const valid =
    result && result.basis === writingBasis(p, options) && (!p.draft || draftText === p.draft.text)
  async function generate(task: AIRequest['task'], fromAssemblyPreview = false): Promise<void> {
    setBusy(true)
    if (!fromAssemblyPreview) setResult(null)
    try {
      setResult(await window.desktop.ai({ task, projectId: p.id, options, fromAssemblyPreview }))
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const reorder = (index: number, offset: number): void => {
    const ids = [...p.article],
      to = index + offset
    if (to < 0 || to >= ids.length) return
    ;[ids[index], ids[to]] = [ids[to], ids[index]]
    void run({ type: 'article', projectId: p.id, ids })
  }
  const exportText = async (format: 'md' | 'txt', source: 'original' | 'draft'): Promise<void> => {
    try {
      if (await window.desktop.exportArticle(p.id, format, source)) notify(t('文章已导出'))
    } catch (e) {
      notify((e as Error).message)
    }
  }
  return (
    <aside className="article-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t('成文')}</span>
          <h2>{t('慢慢成文')}</h2>
        </div>
        <span className="count-pill">{p.article.length}</span>
      </div>
      <p className="panel-intro">{t('原片段保留，生成稿独立保存。')}</p>
      <div className="article-actions">
        <button
          disabled={!selected.length}
          onClick={() => {
            void run({ type: 'article', projectId: p.id, ids: [...p.article, ...selected] })
          }}
        >
          <Plus size={14} />
          {t('加入选中')}
        </button>
        <button
          onClick={() => {
            void run({
              type: 'article',
              projectId: p.id,
              ids: p.blocks.filter((b) => !b.parentId).map((b) => b.id)
            })
          }}
        >
          {t('加入全部板块')}
        </button>
      </div>
      <div className="article-list">
        {!p.article.length && (
          <p className="article-empty">{t('选中片段或组合，再点「加入选中」。')}</p>
        )}
        {p.article.map((id, index) => {
          const b = getBlock(p, id)
          return (
            <div
              key={id}
              className="article-entry"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const source = e.dataTransfer.getData('text/plain')
                if (!p.article.includes(source) || source === id) return
                const ids = p.article.filter((x) => x !== source)
                ids.splice(ids.indexOf(id), 0, source)
                void run({ type: 'article', projectId: p.id, ids })
              }}
            >
              <div className="article-entry-heading">
                <span className="entry-index">{index + 1}</span>
                <h3>{b.title || t('一片想法')}</h3>
                <button title={t('上移')} disabled={index === 0} onClick={() => reorder(index, -1)}>
                  <ArrowUp size={13} />
                </button>
                <button
                  title={t('下移')}
                  disabled={index === p.article.length - 1}
                  onClick={() => reorder(index, 1)}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  title={t('移出成文')}
                  onClick={() => {
                    void run({
                      type: 'article',
                      projectId: p.id,
                      ids: p.article.filter((x) => x !== id)
                    })
                  }}
                >
                  <X size={13} />
                </button>
              </div>
              <p className="article-original">{blockText(p, id) || t('（这个板块还空着）')}</p>
            </div>
          )
        })}
      </div>
      <div className="ai-area">
        <div className="ai-label">
          <Sparkles size={14} />
          <span>{t('AI 成文')}</span>
          <span className="provider-name">{settings.provider.preset}</span>
        </div>
        <WritingOptions
          value={settings}
          change={(next) => {
            void run({ type: 'settings', settings: next })
          }}
        />
        <div className="article-actions">
          <button
            disabled={busy || !p.article.length}
            onClick={() => {
              void generate('assemble')
            }}
          >
            {t('拼接')}
          </button>
          <button
            disabled={busy || (!p.article.length && !p.draft)}
            onClick={() => {
              void generate('polish')
            }}
          >
            {t('美化')}
          </button>
          <button
            disabled={busy || !p.article.length}
            onClick={() => {
              void generate('assemble-polish')
            }}
          >
            {t('拼接＋美化')}
          </button>
        </div>
        <p className="fine-print">
          {t('仅发送成文区内容；美化使用当前稿件，输出语言跟随界面设置。')}
        </p>
        {busy && (
          <>
            <Loader />
            <button
              className="text-button"
              onClick={() => {
                void window.desktop.cancelAI()
              }}
            >
              {t('取消等待')}
            </button>
          </>
        )}
        {result && !valid && <p className="notice">{t('内容或生成选项已改变，请重新生成。')}</p>}
        {valid && result && (
          <div className="ai-suggestion">
            <h3>{t('生成稿预览')}</h3>
            {result.warning && <p className="notice">{t(result.warning)}</p>}
            {result.warning && (
              <button
                disabled={busy}
                onClick={() => {
                  void generate('polish', true)
                }}
              >
                {t('重试美化')}
              </button>
            )}
            <div className="draft-preview">{result.draft.text}</div>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await run(
                    {
                      type: 'article-draft',
                      projectId: p.id,
                      draft: result.draft,
                      expectedBasis: result.basis
                    },
                    t('成文稿已保存')
                  )
                )
                  setResult(null)
              }}
            >
              <Check size={14} />
              {t('采用稿件')}
            </button>
            <button className="text-button" onClick={() => setResult(null)}>
              {t('放下这个建议')}
            </button>
          </div>
        )}
      </div>
      {p.draft && (
        <section className="draft-section">
          <h3>{t('当前成文稿')}</h3>
          {p.draft.sourceBasis !== articleSourceBasis(p) && (
            <p className="notice">{t('原片段已变化，当前稿件仍保留。')}</p>
          )}
          <textarea
            className="draft-editor"
            aria-label={t('编辑成文稿')}
            value={draftText}
            maxLength={300000}
            onFocus={() => setEditing(true)}
            onChange={(e) => {
              setDraftText(e.target.value)
              void run({
                type: 'article-draft',
                projectId: p.id,
                draft: { ...p.draft!, text: e.target.value }
              })
            }}
            onBlur={() => {
              setEditing(false)
            }}
          />
        </section>
      )}
      <div className="article-export">
        {(['md', 'txt'] as const).map((format) => (
          <button
            key={format}
            disabled={!p.article.length}
            onClick={() => {
              void exportText(format, 'original')
            }}
          >
            <Download size={14} />
            {t('原文')} {format.toUpperCase()}
          </button>
        ))}
        {(['md', 'txt'] as const).map((format) => (
          <button
            key={format}
            disabled={!p.draft}
            onClick={() => {
              void exportText(format, 'draft')
            }}
          >
            <Download size={14} />
            {t('稿件')} {format.toUpperCase()}
          </button>
        ))}
      </div>
    </aside>
  )
}
