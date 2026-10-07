import { z } from 'zod'

const id = z.string().min(1).max(100)
export const ColorSchema = z.enum(['sage', 'blue', 'lavender', 'rose', 'clay'])
export type Color = z.infer<typeof ColorSchema>
export const BlockSchema = z
  .object({
    id,
    kind: z.enum(['text', 'group', 'slot']),
    title: z.string().max(200),
    text: z.string().max(200000),
    color: ColorSchema,
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().min(180).max(8000),
    height: z.number().min(100).max(20000),
    parentId: id.optional(),
    children: z.array(id).max(10000),
    collapsed: z.boolean()
  })
  .strict()
export type Block = z.infer<typeof BlockSchema>
export const ConnectorSchema = z
  .object({ leftId: id, rightId: id, text: z.string().max(500), basis: z.string().max(100) })
  .strict()
export type Connector = z.infer<typeof ConnectorSchema>
export const ProjectSchema = z
  .object({
    id,
    title: z.string().min(1).max(200),
    revision: z.number().int().nonnegative(),
    blocks: z.array(BlockSchema).max(10000),
    relations: z
      .array(z.object({ id, source: id, target: id, label: z.string().max(200) }).strict())
      .max(20000),
    article: z.array(id).max(10000),
    connectors: z.array(ConnectorSchema).max(10000),
    viewport: z
      .object({ x: z.number().finite(), y: z.number().finite(), zoom: z.number().min(0.1).max(4) })
      .strict()
  })
  .strict()
export type Project = z.infer<typeof ProjectSchema>
export const ProviderSchema = z
  .object({
    preset: z.string().max(80),
    protocol: z.enum(['openai', 'anthropic', 'gemini']),
    baseUrl: z.string().url().max(1000),
    model: z.string().min(1).max(200),
    jsonMode: z.boolean().optional()
  })
  .strict()
export type Provider = z.infer<typeof ProviderSchema>
export const SettingsSchema = z
  .object({
    shortcut: z.string().min(1).max(100),
    sound: z.boolean(),
    reducedMotion: z.boolean(),
    provider: ProviderSchema
  })
  .strict()
export type Settings = z.infer<typeof SettingsSchema>
export const WorkspaceSchema = z
  .object({
    version: z.literal(1),
    activeProjectId: id,
    projects: z.array(ProjectSchema).min(1).max(100),
    inbox: z
      .array(
        z
          .object({
            id,
            text: z.string().min(1).max(200000),
            createdAt: z.string().max(40),
            color: ColorSchema
          })
          .strict()
      )
      .max(10000),
    captureDraft: z.string().max(200000),
    settings: SettingsSchema
  })
  .strict()
export type Workspace = z.infer<typeof WorkspaceSchema>
export const FileSchema = z
  .object({ format: z.literal('thoughtanchor'), version: z.literal(1), project: ProjectSchema })
  .strict()
export type ProjectFile = z.infer<typeof FileSchema>
export const presets: Record<string, Provider> = {
  DeepSeek: {
    preset: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash'
  },
  OpenAI: {
    preset: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini'
  },
  Claude: {
    preset: 'Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-6'
  },
  Gemini: {
    preset: 'Gemini',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-3.8-flash'
  },
  硅基流动: {
    preset: '硅基流动',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V4-Flash'
  },
  Groq: {
    preset: 'Groq',
    protocol: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'qwen/qwen3.8-27b'
  },
  OpenRouter: {
    preset: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: '~openai/gpt-latest'
  },
  自定义: {
    preset: '自定义',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash'
  }
}
export function uid(): string {
  return crypto.randomUUID()
}
export function textBlock(text = '', x = 100, y = 100, color: Color = 'sage'): Block {
  return {
    id: uid(),
    kind: 'text',
    title: '',
    text,
    color,
    x,
    y,
    width: 264,
    height: 180,
    children: [],
    collapsed: false
  }
}
export function newProject(title = '一张新的思路纸'): Project {
  return {
    id: uid(),
    title,
    revision: 0,
    blocks: [],
    relations: [],
    article: [],
    connectors: [],
    viewport: { x: 40, y: 40, zoom: 1 }
  }
}
export function initialWorkspace(): Workspace {
  const p = newProject('从散步开始的一篇随想')
  const a = textBlock('有时候，离开屏幕走一走，想法反而会浮上来。', 80, 90, 'sage')
  const b = textBlock('街角的树影、听到的一句话，都可以先留成一片。', 430, 100, 'blue')
  const c = textBlock('先把相关的片段靠在一起，再决定它们的顺序。', 310, 370, 'lavender')
  a.title = '先留住'
  b.title = '观察'
  c.title = '慢慢拼起来'
  p.blocks = [a, b, c]
  p.relations = [{ id: uid(), source: a.id, target: b.id, label: '让我想到' }]
  return {
    version: 1,
    activeProjectId: p.id,
    projects: [p],
    inbox: [],
    captureDraft: '',
    settings: {
      shortcut: 'CommandOrControl+Shift+Space',
      sound: false,
      reducedMotion: false,
      provider: presets.DeepSeek
    }
  }
}
export const CommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('capture'), text: z.string().min(1).max(200000) }),
  z.object({ type: z.literal('draft'), text: z.string().max(200000) }),
  z.object({
    type: z.literal('add'),
    projectId: id,
    text: z.string().max(200000),
    x: z.number().finite(),
    y: z.number().finite()
  }),
  z.object({
    type: z.literal('edit'),
    projectId: id,
    id,
    patch: z
      .object({
        title: z.string().max(200),
        text: z.string().max(200000),
        color: ColorSchema,
        collapsed: z.boolean()
      })
      .partial()
      .strict()
  }),
  z.object({
    type: z.literal('move'),
    projectId: id,
    moves: z
      .array(z.object({ id, x: z.number().finite(), y: z.number().finite() }).strict())
      .max(10000)
  }),
  z.object({
    type: z.literal('snap'),
    projectId: id,
    source: id,
    target: id,
    mode: z.enum(['group', 'before', 'after', 'relation']),
    label: z.string().max(200).optional()
  }),
  z.object({
    type: z.literal('group'),
    projectId: id,
    ids: z.array(id).min(1),
    title: z.string().max(200)
  }),
  z.object({ type: z.literal('detach'), projectId: id, id }),
  z.object({ type: z.literal('ungroup'), projectId: id, id }),
  z.object({ type: z.literal('delete'), projectId: id, ids: z.array(id).min(1) }),
  z.object({
    type: z.literal('split'),
    projectId: id,
    id,
    separator: z.enum(['paragraph', 'line'])
  }),
  z.object({
    type: z.literal('inbox'),
    projectId: id,
    ids: z.array(id).min(1),
    action: z.enum(['place', 'delete']),
    x: z.number().finite().optional(),
    y: z.number().finite().optional()
  }),
  z.object({
    type: z.literal('article'),
    projectId: id,
    ids: z.array(id),
    expectedBasis: z.string().max(100).optional()
  }),
  z.object({
    type: z.literal('connector'),
    projectId: id,
    leftId: id,
    rightId: id,
    text: z.string().max(500),
    basis: z.string().max(100),
    expectedBasis: z.string().max(100).optional()
  }),
  z.object({
    type: z.literal('relation'),
    projectId: id,
    id,
    label: z.string().max(200).nullable()
  }),
  z.object({
    type: z.literal('template'),
    projectId: id,
    template: z.enum(['clarify', 'write', 'plan'])
  }),
  z.object({
    type: z.literal('project'),
    action: z.enum(['create', 'select', 'rename', 'delete']),
    id: id.optional(),
    title: z.string().min(1).max(200).optional()
  }),
  z.object({ type: z.literal('settings'), settings: SettingsSchema }),
  z.object({ type: z.literal('viewport'), projectId: id, viewport: ProjectSchema.shape.viewport }),
  z.object({ type: z.literal('undo') }),
  z.object({ type: z.literal('redo') })
])
export type Command = z.infer<typeof CommandSchema>
export type Snapshot = {
  workspace: Workspace
  canUndo: boolean
  canRedo: boolean
  hasKey: boolean
  storagePath: string
  recovery: string | null
}
export type AIResult =
  | {
      task: 'connectors'
      basis: string
      connectors: { leftId: string; rightId: string; text: string }[]
    }
  | { task: 'order'; basis: string; orderIds: string[]; reason: string }
export interface DesktopAPI {
  snapshot(): Promise<Snapshot>
  command(command: Command): Promise<Snapshot>
  subscribe(listener: (snapshot: Snapshot) => void): () => void
  captureWindow(): Promise<void>
  hideCapture(): Promise<void>
  exportProject(projectId: string): Promise<string | null>
  importProject(): Promise<Snapshot | null>
  exportArticle(projectId: string, format: 'md' | 'txt'): Promise<string | null>
  ai(task: 'connectors' | 'order', projectId: string): Promise<AIResult>
  cancelAI(): Promise<void>
  key(action: 'set' | 'delete', value?: string): Promise<Snapshot>
  openStorage(): Promise<void>
}
