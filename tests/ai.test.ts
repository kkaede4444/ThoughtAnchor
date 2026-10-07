import { describe, expect, it, vi } from 'vitest'
import {
  buildRequest,
  endpoint,
  keyScope,
  parseResult,
  requestAI,
  writingRequest,
  writingJSON
} from '../src/main/ai'
import { AIOptionsSchema, initialWorkspace, presets } from '../src/shared/model'
function fixture() {
  const p = initialWorkspace().projects[0]
  p.article = p.blocks.map((b) => b.id)
  return p
}
function response(content: unknown) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] }
}
describe('bounded AI adapters', () => {
  it.each([
    ['GLM', 'https://open.bigmodel.cn/api/paas/v4/chat/completions'],
    ['Kimi', 'https://api.moonshot.cn/v1/chat/completions'],
    ['Qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'],
    ['MiMo', 'https://api.xiaomimimo.com/v1/chat/completions'],
    ['MiniMax', 'https://api.minimax.cn/anthropic/v1/messages'],
    ['Grok', 'https://api.x.ai/v1/chat/completions'],
    ['腾讯混元', 'https://tokenhub.tencentmaas.com/v1/chat/completions']
  ])('routes %s assembly and polish with native auth and parses only answers', (name, url) => {
    const p = fixture(),
      provider = presets[name]
    const instruction = {
      projectId: p.id,
      task: 'polish' as const,
      options: AIOptionsSchema.parse({})
    }
    for (const task of ['assemble', 'polish'] as const) {
      const wire = writingRequest(provider, 'fixture-key', instruction, p, task)
      expect(wire.url.href).toBe(url)
      expect(wire.url.href).not.toContain('fixture-key')
      expect(wire.headers[provider.protocol === 'anthropic' ? 'x-api-key' : 'Authorization']).toBe(
        provider.protocol === 'anthropic' ? 'fixture-key' : 'Bearer fixture-key'
      )
      expect(wire.body).toHaveProperty('model', provider.model)
      if (['Kimi', 'MiMo', '腾讯混元'].includes(name))
        expect(wire.body).not.toHaveProperty('response_format')
      if (name === 'Kimi') expect(wire.body).toHaveProperty('thinking.type', 'disabled')
      if (name === 'Qwen') expect(wire.body).toHaveProperty('enable_thinking', false)
    }
    const payload = { text: 'A valid draft.' }
    const wire =
      provider.protocol === 'anthropic'
        ? {
            content: [
              { type: 'thinking', thinking: 'Not an answer.' },
              { type: 'text', text: JSON.stringify(payload) }
            ]
          }
        : {
            choices: [
              {
                message: { reasoning_content: 'Not an answer.', content: JSON.stringify(payload) },
                finish_reason: 'stop'
              }
            ]
          }
    expect(writingJSON(provider.protocol, wire)).toEqual(payload)
    expect(buildRequest(provider, 'fixture-key', 'order', p).url.href).toBe(url)
  })
  it('does not attach vendor parameters based on a misleading label or another model', () => {
    const p = fixture()
    for (const name of ['Kimi', 'Qwen']) {
      const body = buildRequest(
        { ...presets[name], baseUrl: 'https://example.com/v1' },
        'fixture-key',
        'order',
        p
      ).body
      expect(body).not.toHaveProperty('thinking')
      expect(body).not.toHaveProperty('enable_thinking')
    }
    expect(
      buildRequest({ ...presets.Qwen, model: 'some-other-model' }, 'fixture-key', 'order', p).body
    ).not.toHaveProperty('enable_thinking')
    expect(keyScope(presets.Grok)).not.toBe(keyScope(presets.Groq))
    expect(
      new Set(
        ['GLM', 'Kimi', 'Qwen', 'MiMo', 'MiniMax', 'Grok', '腾讯混元'].map((n) =>
          keyScope(presets[n])
        )
      ).size
    ).toBe(7)
  })
  it('uses native headers and bodies for all three protocol families', () => {
    const p = fixture()
    const openai = buildRequest(presets.DeepSeek, 'private-test-key', 'order', p)
    expect(openai.url.href).toBe('https://api.deepseek.com/chat/completions')
    expect(openai.headers.Authorization).toBe('Bearer private-test-key')
    const claude = buildRequest(presets.Claude, 'k', 'connectors', p)
    expect(claude.url.pathname).toBe('/v1/messages')
    expect(claude.headers['x-api-key']).toBe('k')
    const gemini = buildRequest(presets.Gemini, 'k', 'connectors', p)
    expect(gemini.url.pathname).toContain(':generateContent')
    expect(gemini.headers['x-goog-api-key']).toBe('k')
    expect(keyScope(presets.Claude)).not.toBe(keyScope(presets.DeepSeek))
    const compatible = buildRequest({ ...presets.DeepSeek, jsonMode: false }, 'k', 'order', p)
    expect(compatible.body).not.toHaveProperty('response_format')
  })
  it('rejects non-HTTPS remote destinations and redirect-based key leakage', async () => {
    expect(() => endpoint({ ...presets.DeepSeek, baseUrl: 'http://example.com/v1' })).toThrow()
    expect(() =>
      endpoint({ ...presets.DeepSeek, baseUrl: 'https://user:pass@example.com' })
    ).toThrow()
    expect(endpoint({ ...presets.DeepSeek, baseUrl: 'http://127.0.0.1:1234/v1' }).protocol).toBe(
      'http:'
    )
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.redirect).toBe('error')
      return new Response(JSON.stringify(response({ orderIds: fixture().article, reason: 'test' })))
    })
    const p = fixture()
    const good = vi.fn(async (_url, options) => {
      expect(options.redirect).toBe('error')
      return new Response(JSON.stringify(response({ orderIds: p.article, reason: 'test' })))
    })
    await requestAI(
      presets.DeepSeek,
      'k',
      'order',
      p,
      new AbortController().signal,
      good as typeof fetch
    )
    expect(good).toHaveBeenCalledOnce()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('accepts only exact permutations of existing IDs, preserving content', () => {
    const p = fixture()
    const before = JSON.stringify(p.blocks)
    const result = parseResult(
      'openai',
      response({ orderIds: [...p.article].reverse(), reason: '从行动开始' }),
      'order',
      p
    )
    expect(result.task).toBe('order')
    expect(JSON.stringify(p.blocks)).toBe(before)
    expect(() =>
      parseResult(
        'openai',
        response({ orderIds: [p.article[0], p.article[0], 'new'], reason: '' }),
        'order',
        p
      )
    ).toThrow()
    expect(() =>
      parseResult(
        'openai',
        response({ orderIds: p.article, reason: '', rewrittenBlocks: [] }),
        'order',
        p
      )
    ).toThrow()
  })
  it('checks adjacency, duplicate pairs, Unicode length and rejects rewrites', () => {
    const p = fixture()
    const c = { leftId: p.article[0], rightId: p.article[1], text: '由此，留住了更多观察。' }
    expect(parseResult('openai', response({ connectors: [c] }), 'connectors', p).task).toBe(
      'connectors'
    )
    for (const connectors of [
      [{ ...c, rightId: p.article[2] }],
      [c, c],
      [{ ...c, text: '字'.repeat(25) }],
      [{ ...c, rewrite: '代替原文' }]
    ])
      expect(() => parseResult('openai', response({ connectors }), 'connectors', p)).toThrow()
  })
  it('extracts native Anthropic/Gemini results and rejects truncated JSON', () => {
    const p = fixture()
    const json = JSON.stringify({ orderIds: p.article, reason: '顺序清楚' })
    expect(
      parseResult('anthropic', { content: [{ type: 'text', text: json }] }, 'order', p).task
    ).toBe('order')
    expect(
      parseResult(
        'gemini',
        {
          candidates: [
            { content: { parts: [{ text: 'thinking', thought: true }, { text: json }] } }
          ]
        },
        'order',
        p
      ).task
    ).toBe('order')
    expect(() =>
      parseResult(
        'openai',
        { choices: [{ message: { content: json }, finish_reason: 'length' }] },
        'order',
        p
      )
    ).toThrow(/截断/)
  })
})
