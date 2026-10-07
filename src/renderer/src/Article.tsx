import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Download, Plus, Sparkles, X } from 'lucide-react'
import { AIResult } from '../../shared/model'
import { aiBasis, blockText, getBlock, getProject, pairBasis } from '../../shared/domain'
import { Loader, Paint } from './Art'
import { useWork } from './context'

export function Article(): React.JSX.Element {
  const { snapshot, run, notify, selected } = useWork()
  const p = getProject(snapshot.workspace)
  const [result, setResult] = useState<AIResult | null>(null)
  const [busy, setBusy] = useState(false)
  const valid = result && result.basis === aiBasis(p)
  async function generate(task: 'connectors' | 'order'): Promise<void> {
    setBusy(true)
    setResult(null)
    try {
      setResult(await window.desktop.ai(task, p.id))
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const reorder = (index: number, offset: number): void => {
    const next = [...p.article]
    const to = index + offset
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    void run({ type: 'article', projectId: p.id, ids: next }, '换一个顺序看看')
  }
  return (
    <aside className="article-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ASSEMBLE</span>
          <h2>慢慢成文</h2>
        </div>
        <span className="count-pill">{p.article.length} 板块</span>
      </div>
      <p className="panel-intro">已经拼好的板块，直接接着用。原文始终留在自己的片段里。</p>
      <div className="article-actions">
        <button
          disabled={!selected.length}
          onClick={() => {
            void run(
              { type: 'article', projectId: p.id, ids: [...p.article, ...selected] },
              '板块接进了文章'
            )
          }}
        >
          <Plus size={14} />
          加入选中
        </button>
        <button
          onClick={() => {
            void run(
              {
                type: 'article',
                projectId: p.id,
                ids: p.blocks.filter((b) => !b.parentId).map((b) => b.id)
              },
              '整张纸有了一个顺序'
            )
          }}
        >
          加入全部板块
        </button>
      </div>
      <div className="article-list">
        {!p.article.length && (
          <div className="article-empty">
            <Paint color="lavender" />
            <h3>从一个板块开始</h3>
            <p>选中白板上的片段或整个组合，再点「加入选中」。</p>
          </div>
        )}
        {p.article.map((id, index) => {
          const b = getBlock(p, id)
          const next = p.article[index + 1]
          const connector = p.connectors.find((c) => c.leftId === id && c.rightId === next)
          return (
            <div
              key={id}
              className="article-entry"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const source = e.dataTransfer.getData('text/plain')
                if (!p.article.includes(source) || source === id) return
                const order = p.article.filter((x) => x !== source)
                order.splice(order.indexOf(id), 0, source)
                void run({ type: 'article', projectId: p.id, ids: order }, '板块换到了这里')
              }}
            >
              <div className="article-entry-heading">
                <span className="entry-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{b.title || (b.kind === 'text' ? '一片想法' : '一个板块')}</h3>
                <button title="上移" disabled={index === 0} onClick={() => reorder(index, -1)}>
                  <ArrowUp size={13} />
                </button>
                <button
                  title="下移"
                  disabled={index === p.article.length - 1}
                  onClick={() => reorder(index, 1)}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  title="移出成文"
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
              <p className="article-original">{blockText(p, id) || '（这个板块还空着）'}</p>
              {connector && (
                <div className="connector">
                  <span>过渡句</span>
                  <textarea
                    aria-label="编辑过渡句"
                    defaultValue={connector.text}
                    key={connector.text}
                    onBlur={(e) => {
                      if (e.target.value !== connector.text)
                        void run({
                          type: 'connector',
                          projectId: p.id,
                          ...connector,
                          text: e.target.value
                        })
                    }}
                  />
                  <button
                    title="删除过渡句"
                    onClick={() => {
                      void run({ type: 'connector', projectId: p.id, ...connector, text: '' })
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="ai-area">
        <div className="ai-label">
          <Sparkles size={14} />
          <span>轻一点的协助</span>
          <span className="provider-name">{snapshot.workspace.settings.provider.preset}</span>
        </div>
        <div className="article-actions">
          <button
            disabled={busy || p.article.length < 2}
            onClick={() => {
              void generate('connectors')
            }}
          >
            只补过渡句
          </button>
          <button
            disabled={busy || p.article.length < 2}
            onClick={() => {
              void generate('order')
            }}
          >
            建议一个顺序
          </button>
        </div>
        <p className="fine-print">点击后，仅将成文区的板块发送给已选接口。</p>
        {busy && (
          <>
            <Loader />
            <button
              className="text-button"
              onClick={() => {
                void window.desktop.cancelAI()
              }}
            >
              取消等待
            </button>
          </>
        )}
        {result && !valid && <p className="notice">内容已改变，这次建议已失效。重新生成即可。</p>}
        {valid && result.task === 'order' && (
          <div className="ai-suggestion">
            <p>{result.reason}</p>
            <ol>
              {result.orderIds.map((id) => (
                <li key={id}>{getBlock(p, id).title || blockText(p, id).slice(0, 25)}</li>
              ))}
            </ol>
            <button
              className="primary"
              onClick={() => {
                if (aiBasis(p) !== result.basis) return
                void run(
                  {
                    type: 'article',
                    projectId: p.id,
                    ids: result.orderIds,
                    expectedBasis: result.basis
                  },
                  '采用了这个顺序'
                )
                setResult(null)
              }}
            >
              <Check size={14} />
              采用顺序
            </button>
            <button className="text-button" onClick={() => setResult(null)}>
              放下这个建议
            </button>
          </div>
        )}
        {valid && result.task === 'connectors' && (
          <div className="ai-suggestions">
            {!result.connectors.length && (
              <p className="notice">这些板块直接相接就很好，没有新增过渡句。</p>
            )}
            {result.connectors.map((c) => (
              <div className="ai-suggestion" key={`${c.leftId}:${c.rightId}`}>
                <span className="fine-print">
                  {p.article.indexOf(c.leftId) + 1} → {p.article.indexOf(c.rightId) + 1}
                </span>
                <p>{c.text}</p>
                <button
                  onClick={() => {
                    void run(
                      {
                        type: 'connector',
                        projectId: p.id,
                        ...c,
                        basis: pairBasis(p, c.leftId, c.rightId),
                        expectedBasis: result.basis
                      },
                      '接上了一句过渡'
                    )
                    setResult({ ...result, connectors: result.connectors.filter((x) => x !== c) })
                  }}
                >
                  <Check size={13} />
                  接上
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    setResult({ ...result, connectors: result.connectors.filter((x) => x !== c) })
                  }
                >
                  略过
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="article-export">
        <button
          disabled={!p.article.length}
          onClick={() => {
            void window.desktop
              .exportArticle(p.id, 'md')
              .then((file) => {
                if (file) notify('Markdown 已导出')
              })
              .catch((e) => notify(e.message))
          }}
        >
          <Download size={14} />
          Markdown
        </button>
        <button
          disabled={!p.article.length}
          onClick={() => {
            void window.desktop
              .exportArticle(p.id, 'txt')
              .then((file) => {
                if (file) notify('纯文本已导出')
              })
              .catch((e) => notify(e.message))
          }}
        >
          纯文本
        </button>
      </div>
    </aside>
  )
}
