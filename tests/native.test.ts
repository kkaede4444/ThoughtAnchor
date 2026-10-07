import { beforeEach, describe, expect, it } from 'vitest'
import { invoke } from '../src/native/domain'
import { AIOptionsSchema, initialWorkspace, presets } from '../src/shared/model'
import { keyScope } from '../src/main/ai'

function call(action: string, ...args: unknown[]): any {
  const response = invoke({ action, args })
  if (response.error) throw new Error(response.error)
  return response.result
}
beforeEach(() => call('initialize', initialWorkspace()))
describe('native document transactions', () => {
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
