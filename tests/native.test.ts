import { beforeEach, describe, expect, it } from 'vitest'
import { invoke } from '../src/native/domain'
import { AIOptionsSchema, initialWorkspace, presets } from '../src/shared/model'
import { keyScope } from '../src/main/ai'
import { systemLocale } from '../src/shared/sample'

function call(action: string, ...args: unknown[]): any {
  const response = invoke({ action, args })
  if (response.error) throw new Error(response.error)
  return response.result
}
beforeEach(() => call('initialize', initialWorkspace()))
describe('native document transactions', () => {
  it.each([
    ['zh-CN', '从散步开始的一篇随想', '让我想到'],
    ['zh-TW', '從散步開始的一篇隨想', '讓我想到'],
    ['en-US', 'A few thoughts that began with a walk', 'reminds me of'],
    ['ja-JP', '散歩から始まった小さな随想', 'ここから思い出した'],
    ['ko-KR', '산책에서 시작된 짧은 생각', '떠오르게 한 생각'],
    ['fr-FR', 'Quelques pensées nées d’une promenade', 'me fait penser à'],
    ['de-DE', 'Ein paar Gedanken, die beim Spazieren kamen', 'erinnert mich an'],
    ['es-ES', 'Unas ideas que empezaron con un paseo', 'me recuerda a']
  ])('creates a complete first-run sample for %s', (locale, title, relation) => {
    const workspace = call('initialize', null, locale)
    expect(workspace.settings.locale).toBe(locale)
    const project = workspace.projects[0]
    expect(project.title).toBe(title)
    expect(project.blocks).toHaveLength(3)
    for (const block of project.blocks) {
      expect(block.title.length).toBeGreaterThan(0)
      expect(block.text.length).toBeGreaterThan(15)
      if (locale !== 'zh-CN') expect(block.title).not.toBe('先留住')
    }
    expect(project.relations[0]).toMatchObject({
      source: project.blocks[0].id,
      target: project.blocks[1].id,
      label: relation
    })
    expect(call('validate', workspace)).toEqual(workspace)
    call('initialize', null, 'zh-CN')
    call('prepare-command', { type: 'welcome', locale })
    expect(call('snapshot', false, '', null).workspace.settings.welcomeComplete).toBe(false)
    call('discard')
    expect(call('snapshot', false, '', null).workspace.projects[0].title).toBe(
      '从散步开始的一篇随想'
    )
    call('prepare-command', { type: 'welcome', locale })
    call('commit')
    const chosen = call('snapshot', false, '', null)
    expect(chosen.workspace.settings).toMatchObject({ locale, welcomeComplete: true })
    expect(chosen.workspace.projects[0].title).toBe(title)
    expect(chosen.workspace.projects[0].relations[0].label).toBe(relation)
    expect(chosen.canUndo).toBe(false)
    call('prepare-command', { type: 'welcome', locale: 'ja-JP' })
    call('commit')
    expect(call('snapshot', false, '', null).workspace).toEqual(chosen.workspace)
  })
  it('does not show the first-run page for existing documents without a welcome flag', () => {
    const saved: any = initialWorkspace()
    delete saved.settings.welcomeComplete
    const loaded = call('initialize', saved, 'en-US')
    expect(loaded.settings.welcomeComplete).toBe(true)
    expect(loaded.projects[0].title).toBe('从散步开始的一篇随想')
  })
  it('finishes language selection without overwriting edited sample cards', () => {
    const saved = initialWorkspace()
    saved.projects[0].blocks[0].text = '我已经在这里写过自己的想法。'
    call('initialize', saved)
    call('prepare-command', { type: 'welcome', locale: 'en-US' })
    call('commit')
    const workspace = call('snapshot', false, '', null).workspace
    expect(workspace.settings).toMatchObject({ locale: 'en-US', welcomeComplete: true })
    expect(workspace.projects).toEqual(saved.projects)
  })
  it('maps regional system languages and uses an English fallback for unsupported languages', () => {
    for (const language of ['zh-Hant', 'zh-Hant-HK', 'zh-HK', 'zh_MO'])
      expect(systemLocale(language)).toBe('zh-TW')
    for (const language of ['zh-Hans', 'zh-SG']) expect(systemLocale(language)).toBe('zh-CN')
    expect(systemLocale('en-GB')).toBe('en-US')
    expect(systemLocale('fr-CA')).toBe('fr-FR')
    expect(systemLocale('pt-BR')).toBe('en-US')
    expect(systemLocale()).toBe('zh-CN')
  })
  it('preserves authored notes when loading on another system or switching interface language', () => {
    const saved = initialWorkspace()
    saved.projects[0].blocks[0].text = '我自己的散步笔记，不能随界面语言被改写。'
    const expected = structuredClone(saved.projects)
    const loaded = call('initialize', saved, 'ja-JP')
    expect(loaded.settings.locale).toBe('zh-CN')
    expect(loaded.projects).toEqual(expected)
    call('prepare-command', { type: 'settings', settings: { ...saved.settings, locale: 'es-ES' } })
    call('commit')
    expect(call('snapshot', false, '', null).workspace.projects).toEqual(expected)
  })
  it('binds the endpoint and key scope to one immutable request snapshot', () => {
    const initial = call('snapshot', false, '', null).workspace
    call('prepare-command', {
      type: 'article',
      projectId: initial.activeProjectId,
      ids: initial.projects[0].blocks.map((b: any) => b.id)
    })
    call('commit')
    const plan = call('prepare-ai', {
      projectId: initial.activeProjectId,
      task: 'polish',
      options: AIOptionsSchema.parse({})
    })
    const change = { ...initial.settings, provider: presets.Kimi }
    call('prepare-command', { type: 'settings', settings: change })
    call('commit')
    expect(call('scope')).toBe(keyScope(presets.Kimi))
    expect(plan.keyScope).toBe(keyScope(initial.settings.provider))
    const wire = call('ai-wire', plan, 'original-endpoint-fixture-key', 'polish')
    expect(wire.url).toBe('https://api.deepseek.com/chat/completions')
    expect(wire.headers.Authorization).toBe('Bearer original-endpoint-fixture-key')
    expect(plan.provider).toEqual(initial.settings.provider)
  })
  it('does not acknowledge or mutate a prepared operation until persistence commits', () => {
    call('prepare-command', { type: 'capture', text: 'durable' })
    expect(call('snapshot', false, '', null).workspace.inbox).toHaveLength(0)
    call('discard')
    expect(call('snapshot', false, '', null).workspace.inbox).toHaveLength(0)
    call('prepare-command', { type: 'capture', text: 'durable' })
    call('commit')
    expect(call('snapshot', false, '', null).workspace.inbox[0].text).toBe('durable')
  })
  it('undoes a nested frame deletion atomically without erasing later captures', () => {
    const p = call('snapshot', false, '', null).workspace.projects[0]
    const command = (command: any) => {
      call('prepare-command', command)
      return call('commit')
    }
    command({ type: 'template', projectId: p.id, template: 'write', x: -1400, y: 2200 })
    const next = call('snapshot', false, '', null).workspace.projects[0]
    const frame = next.blocks.find((b: any) => b.kind === 'group')
    expect(frame).toMatchObject({ x: -1400, y: 2200 })
    command({
      type: 'snap',
      projectId: p.id,
      source: p.blocks[0].id,
      target: frame.children[0],
      mode: 'group'
    })
    const before = call('snapshot', false, '', null).workspace.projects[0].blocks
    command({ type: 'delete', projectId: p.id, ids: [frame.id] })
    command({ type: 'capture', text: 'captured after deletion' })
    command({ type: 'undo' })
    expect(call('snapshot', false, '', null).workspace.projects[0].blocks).toEqual(before)
    expect(call('snapshot', false, '', null).workspace.inbox[0].text).toBe(
      'captured after deletion'
    )
    command({ type: 'redo' })
    expect(call('snapshot', false, '', null).workspace.projects[0].blocks).toHaveLength(2)
  })
  it('rejects a malformed command without changing state or history', () => {
    const before = call('snapshot', false, '', null)
    expect(() =>
      call('prepare-command', {
        type: 'template',
        projectId: before.workspace.activeProjectId,
        template: 'write',
        x: Infinity
      })
    ).toThrow()
    expect(call('snapshot', false, '', null)).toEqual(before)
  })
})
