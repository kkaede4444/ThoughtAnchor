import { describe, expect, it, vi } from 'vitest'
import {
  assembleResult,
  requestWriting,
  traditions,
  writingJSON,
  writingRequest
} from '../src/main/ai'
import { AIOptionsSchema, initialWorkspace, presets } from '../src/shared/model'
import { aiBasis, applyCommand, articleText, getProject, writingBasis } from '../src/shared/domain'
const fixture = () => {
  const w = initialWorkspace(),
    p = getProject(w)
  p.article = p.blocks.map((b) => b.id)
  p.blocks[0].text = ' 原文\r\n第二行🙂\n\n不删标点！ '
  return { w, p, options: AIOptionsSchema.parse({}) }
}
const response = (value: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }))
describe('writing with protected originals', () => {
  it('keeps existing child-card layout untouched when adopting or editing a draft', () => {
    const { w, p, options } = fixture()
    applyCommand(w, {
      type: 'group',
      projectId: p.id,
      ids: p.blocks.slice(0, 2).map((b) => b.id),
      title: 'group'
    })
    p.blocks[0].x = 73
    p.blocks[0].y = 145
    const before = JSON.stringify(p.blocks)
    const draft = {
      text: 'separate draft',
      sourceBasis: aiBasis(p),
      task: 'polish' as const,
      options
    }
    applyCommand(w, {
      type: 'article-draft',
      projectId: p.id,
      draft,
      expectedBasis: writingBasis(p, options)
    })
    applyCommand(w, {
      type: 'article-draft',
      projectId: p.id,
      draft: { ...draft, text: 'edited draft' }
    })
    expect(JSON.stringify(p.blocks)).toBe(before)
  })
  it('gives each stage its own sixty-second timeout and shares cancellation', async () => {
    const { p, options } = fixture(),
      controller = new AbortController(),
      timers: AbortController[] = []
    const spy = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      const timer = new AbortController()
      timers.push(timer)
      return timer.signal
    })
    const signals: AbortSignal[] = []
    const fetcher = vi.fn(async (_url, init) => {
      signals.push(init!.signal as AbortSignal)
      return response(
        signals.length === 1 ? { orderIds: p.article, connectors: [] } : { text: 'polished' }
      )
    })
    try {
      const result = await requestWriting(
        presets.DeepSeek,
        'fake',
        { projectId: p.id, task: 'assemble-polish', options },
        p,
        controller.signal,
        fetcher
      )
      expect(result.task).toBe('polish')
      expect(spy.mock.calls).toEqual([[60000], [60000]])
      expect(signals[0]).not.toBe(signals[1])
      controller.abort()
      expect(signals.every((signal) => signal.aborted)).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })
  it('uses native protocols for the new pipeline and excludes Gemini thinking text', async () => {
    const { p, options } = fixture(),
      request = { projectId: p.id, task: 'assemble' as const, options }
    const payload = { orderIds: p.article, connectors: [] }
    for (const protocol of ['openai', 'anthropic', 'gemini'] as const) {
      const provider = { ...presets.DeepSeek, protocol }
      const wire = writingRequest(provider, 'fake', request, p, 'assemble')
      if (protocol === 'anthropic') expect(wire.headers['x-api-key']).toBe('fake')
      if (protocol === 'gemini') expect(wire.headers['x-goog-api-key']).toBe('fake')
      const json = JSON.stringify(payload)
      const data =
        protocol === 'openai'
          ? { choices: [{ message: { content: json } }] }
          : protocol === 'anthropic'
            ? { content: [{ type: 'text', text: json }] }
            : {
                candidates: [
                  {
                    content: {
                      parts: [{ thought: true, text: 'do not expose reasoning' }, { text: json }]
                    }
                  }
                ]
              }
      expect(writingJSON(protocol, data)).toEqual(payload)
    }
  })
  it('constructs the draft from exact original strings, including Unicode and whitespace', () => {
    const { p } = fixture(),
      original = JSON.stringify(p)
    const c = {
      leftId: p.article[0],
      rightId: p.article[1],
      text: 'a transition exceeding the former twenty-four-character limit'
    }
    const text = assembleResult({ orderIds: p.article, connectors: [c] }, p, false)
    expect(text).toContain(p.blocks[0].text)
    expect(text).toContain(c.text)
    expect(JSON.stringify(p)).toBe(original)
    expect(() =>
      assembleResult({ orderIds: p.article, connectors: [], text: 'rewrite' }, p, false)
    ).toThrow()
  })
  it('allows only exact permutations when reordering is enabled', () => {
    const { p } = fixture(),
      orderIds = [...p.article].reverse()
    expect(() => assembleResult({ orderIds, connectors: [] }, p, false)).toThrow()
    expect(assembleResult({ orderIds, connectors: [] }, p, true)).toBe(
      [...p.blocks]
        .reverse()
        .map((b) => b.text)
        .join('\n\n')
    )
    for (const ids of [
      [p.article[0], p.article[0], p.article[2]],
      p.article.slice(1),
      [...p.article, 'unknown']
    ])
      expect(() => assembleResult({ orderIds: ids, connectors: [] }, p, true)).toThrow()
  })
  it('rejects nonadjacent, repeated and rewritten transitions', () => {
    const { p } = fixture(),
      c = { leftId: p.article[0], rightId: p.article[1], text: '桥' }
    for (const connectors of [
      [c, c],
      [{ ...c, rightId: p.article[2] }],
      [{ ...c, rewrite: 'wrong' }]
    ])
      expect(() => assembleResult({ orderIds: p.article, connectors }, p, false)).toThrow()
  })
  it('polishes the adopted edited draft and uses the selected locale and tradition', () => {
    const { p, options } = fixture()
    p.draft = { text: '用户手动修改的稿件', options, sourceBasis: aiBasis(p), task: 'assemble' }
    for (const locale of Object.keys(traditions) as (keyof typeof traditions)[]) {
      const request = { task: 'polish' as const, projectId: p.id, options: { ...options, locale } }
      const wire = writingRequest(presets.DeepSeek, 'fake', request, p, 'polish')
      const body = wire.body as any
      expect(body.messages[1].content).toContain(p.draft.text)
      expect(body.messages[0].content).toContain(locale)
      expect(body.messages[0].content).toContain(traditions[locale])
      const fixed = writingRequest(
        presets.DeepSeek,
        'fake',
        { ...request, options: { ...request.options, tradition: 'ja-JP' } },
        p,
        'polish'
      )
      expect((fixed.body as any).messages[0].content).toContain(traditions['ja-JP'])
    }
  })
  it('runs the two phases in order without changing the project', async () => {
    const { p, options } = fixture(),
      before = JSON.stringify(p)
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ orderIds: p.article, connectors: [] }))
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse(init.body)
        expect(JSON.parse(body.messages[1].content).source).toBe(
          p.blocks.map((b) => b.text).join('\n\n')
        )
        return response({ text: '完成的文章' })
      })
    const result = await requestWriting(
      presets.DeepSeek,
      'fake',
      { projectId: p.id, task: 'assemble-polish', options },
      p,
      new AbortController().signal,
      fetcher
    )
    expect(result.task).toBe('polish')
    expect(result.draft.text).toBe('完成的文章')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(p)).toBe(before)
  })
  it('retains assembly when polishing fails and makes no second request after cancellation', async () => {
    const { p, options } = fixture(),
      controller = new AbortController()
    const check = controller.signal.throwIfAborted.bind(controller.signal)
    let stages = 0
    vi.spyOn(controller.signal, 'throwIfAborted').mockImplementation(() => {
      if (++stages === 2) controller.abort()
      check()
    })
    const fetcher = vi.fn(async () => response({ orderIds: p.article, connectors: [] }))
    const result = await requestWriting(
      presets.DeepSeek,
      'fake',
      { projectId: p.id, task: 'assemble-polish', options },
      p,
      controller.signal,
      fetcher
    )
    expect(result.task).toBe('assemble')
    expect(result.warning).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(1)
    const broken = vi
      .fn()
      .mockResolvedValueOnce(response({ orderIds: p.article, connectors: [] }))
      .mockResolvedValueOnce(response({ wrong: 'x' }))
    expect(
      (
        await requestWriting(
          presets.DeepSeek,
          'fake',
          { projectId: p.id, task: 'assemble-polish', options },
          p,
          new AbortController().signal,
          broken
        )
      ).task
    ).toBe('assemble')
  })
  it('uses a cancellable signal and refuses truncated results in all protocols', async () => {
    const { p, options } = fixture(),
      controller = new AbortController()
    controller.abort()
    const fetcher = vi.fn()
    await expect(
      requestWriting(
        presets.DeepSeek,
        'fake',
        { projectId: p.id, task: 'assemble', options },
        p,
        controller.signal,
        fetcher
      )
    ).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
    for (const [protocol, wire] of [
      ['openai', { choices: [{ finish_reason: 'length', message: { content: '{}' } }] }],
      ['anthropic', { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{}' }] }],
      [
        'gemini',
        { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }
      ]
    ] as const)
      expect(() => writingJSON(protocol, wire)).toThrow()
  })
  it('guards adoption against edits, language changes, option changes and draft edits', () => {
    const same = fixture()
    expect(writingBasis(same.p, same.options)).toBe(
      writingBasis(same.p, { ...same.w.settings.writing, locale: same.w.settings.locale })
    )
    for (const edit of ['source', 'language', 'options', 'draft'] as const) {
      const { w, p, options } = fixture(),
        basis = writingBasis(p, options)
      const draft = { text: '新稿', sourceBasis: aiBasis(p), task: 'assemble' as const, options }
      if (edit === 'source') p.blocks[0].text += '改'
      if (edit === 'language') w.settings.locale = 'en-US'
      if (edit === 'options') w.settings.writing.allowReorder = true
      if (edit === 'draft') p.draft = draft
      expect(() =>
        applyCommand(w, { type: 'article-draft', projectId: p.id, draft, expectedBasis: basis })
      ).toThrow()
    }
  })
  it('adopts and edits a separate draft, preserving cards and exporting both sources', () => {
    const { w, p, options } = fixture(),
      before = JSON.stringify(p.blocks)
    const original = articleText(p),
      draft = { text: '另存的稿件🙂', sourceBasis: aiBasis(p), task: 'polish' as const, options }
    applyCommand(w, {
      type: 'article-draft',
      projectId: p.id,
      draft,
      expectedBasis: writingBasis(p, options)
    })
    expect(JSON.stringify(p.blocks)).toBe(before)
    expect(articleText(p)).toBe(original)
    expect(articleText(p, false, 'draft')).toBe(draft.text)
    expect(articleText(p, true, 'draft')).toBe('# ' + p.title + '\n\n' + draft.text)
  })
})
