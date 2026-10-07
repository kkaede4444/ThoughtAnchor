import { z } from 'zod'
import { walkSamples } from './sample'

const id = z.string().min(1).max(100)
export const LocaleSchema = z.enum([
  'zh-CN',
  'zh-TW',
  'en-US',
  'ja-JP',
  'ko-KR',
  'fr-FR',
  'de-DE',
  'es-ES'
])
export type Locale = z.infer<typeof LocaleSchema>
export const PortSchema = z.enum(['left', 'right', 'top', 'bottom'])
export type Port = z.infer<typeof PortSchema>
export const AIOptionsSchema = z
  .object({
    locale: LocaleSchema.default('zh-CN'),
    allowReorder: z.boolean().default(false),
    tradition: z
      .enum(['auto', 'zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES'])
      .default('auto'),
    expression: z.enum(['natural', 'restrained', 'narrative', 'poetic']).default('natural'),
    custom: z.string().max(2000).default('')
  })
  .strict()
export type AIOptions = z.infer<typeof AIOptionsSchema>
export const AIRequestSchema = z
  .object({
    projectId: id,
    task: z.enum(['assemble', 'polish', 'assemble-polish']),
    fromAssemblyPreview: z.boolean().optional(),
    options: AIOptionsSchema
  })
  .strict()
export type AIRequest = z.infer<typeof AIRequestSchema>
export const ArticleDraftSchema = z
  .object({
    text: z.string().max(300000),
    sourceBasis: z.string().max(100),
    task: z.enum(['assemble', 'polish']),
    options: AIOptionsSchema
  })
  .strict()
export const ColorSchema = z.enum(['sage', 'blue', 'lavender', 'rose', 'clay'])
export type Color = z.infer<typeof ColorSchema>
export const InkStrokeSchema = z
  .object({
    id,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    width: z.number().min(1).max(24),
    points: z
      .array(
        z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
            pressure: z.number().min(0).max(1)
          })
          .strict()
      )
      .min(1)
      .max(20000)
  })
  .strict()
export type InkStroke = z.infer<typeof InkStrokeSchema>
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
    collapsed: z.boolean(),
    ink: z.array(InkStrokeSchema).max(10000).optional()
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
    ink: z.array(InkStrokeSchema).max(10000).optional(),
    blocks: z.array(BlockSchema).max(10000),
    relations: z
      .array(
        z
          .object({
            id,
            source: id,
            target: id,
            label: z.string().max(200),
            sourceHandle: PortSchema.optional(),
            targetHandle: PortSchema.optional(),
            routing: z.enum(['auto', 'manual']).optional()
          })
          .strict()
      )
      .max(20000),
    article: z.array(id).max(10000),
    connectors: z.array(ConnectorSchema).max(10000),
    draft: ArticleDraftSchema.nullable().default(null),
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
    interfaceMode: z.enum(['auto', 'mobile', 'desktop']).default('auto'),
    directCardDrawing: z.boolean().default(false),
    welcomeComplete: z.boolean().default(true),
    shortcut: z.string().min(1).max(100),
    sound: z.boolean(),
    reducedMotion: z.boolean(),
    locale: LocaleSchema.default('zh-CN'),
    writing: AIOptionsSchema.omit({ locale: true }).default({}),
    provider: ProviderSchema
  })
  .strict()
export type Settings = z.infer<typeof SettingsSchema>
export const WorkspaceSchema = z
  .object({
    version: z.union([z.literal(2), z.literal(3)]),
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
  .object({
    format: z.literal('thoughtanchor'),
    version: z.union([z.literal(2), z.literal(3)]),
    project: ProjectSchema
  })
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
  GLM: {
    preset: 'GLM',
    protocol: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-5.3-flash'
  },
  Kimi: {
    preset: 'Kimi',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.6',
    jsonMode: false
  },
  Qwen: {
    preset: 'Qwen',
    protocol: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus'
  },
  MiMo: {
    preset: 'MiMo',
    protocol: 'openai',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5-pro',
    jsonMode: false
  },
  MiniMax: {
    preset: 'MiniMax',
    protocol: 'anthropic',
    baseUrl: 'https://api.minimax.cn/anthropic',
    model: 'MiniMax-M3'
  },
  Grok: {
    preset: 'Grok',
    protocol: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-4.7'
  },
  腾讯混元: {
    preset: '腾讯混元',
    protocol: 'openai',
    baseUrl: 'https://tokenhub.tencentmaas.com/v1',
    model: 'hy3',
    jsonMode: false
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
    draft: null,
    viewport: { x: 40, y: 40, zoom: 1 }
  }
}
export function initialWorkspace(locale: Locale = 'zh-CN'): Workspace {
  const sample = walkSamples[locale]
  const p = newProject(sample.title)
  const a = textBlock(sample.cards[0][1], 80, 90, 'sage')
  const b = textBlock(sample.cards[1][1], 430, 100, 'blue')
  const c = textBlock(sample.cards[2][1], 310, 370, 'lavender')
  a.title = sample.cards[0][0]
  b.title = sample.cards[1][0]
  c.title = sample.cards[2][0]
  p.blocks = [a, b, c]
  p.relations = [
    {
      id: uid(),
      source: a.id,
      target: b.id,
      label: sample.relation,
      sourceHandle: 'right',
      targetHandle: 'left',
      routing: 'auto'
    }
  ]
  return {
    version: 2,
    activeProjectId: p.id,
    projects: [p],
    inbox: [],
    captureDraft: '',
    settings: {
      interfaceMode: 'auto',
      directCardDrawing: false,
      welcomeComplete: false,
      shortcut: 'CommandOrControl+Shift+Space',
      sound: false,
      reducedMotion: false,
      locale,
      writing: AIOptionsSchema.omit({ locale: true }).parse({}),
      provider: presets.DeepSeek
    }
  }
}
export const CommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('welcome'), locale: LocaleSchema }).strict(),
  z
    .object({
      type: z.literal('card-ink-add'),
      projectId: id,
      blockId: id,
      stroke: InkStrokeSchema
    })
    .strict(),
  z
    .object({
      type: z.literal('card-ink-delete'),
      projectId: id,
      blockId: id,
      ids: z.array(id).min(1).max(10000)
    })
    .strict(),
  z
    .object({
      type: z.literal('card-ink'),
      projectId: id,
      blockId: id,
      strokes: z.array(InkStrokeSchema).max(10000),
      expectedInk: z.string().optional(),
      size: z
        .object({ width: BlockSchema.shape.width, height: BlockSchema.shape.height })
        .strict()
        .optional(),
      expectedSize: z.string().optional()
    })
    .strict(),
  z.object({ type: z.literal('ink-add'), projectId: id, stroke: InkStrokeSchema }).strict(),
  z
    .object({ type: z.literal('ink-delete'), projectId: id, ids: z.array(id).min(1).max(10000) })
    .strict(),
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
    label: z.string().max(200).optional(),
    sourceHandle: PortSchema.optional(),
    targetHandle: PortSchema.optional()
  }),
  z
    .object({
      type: z.literal('drop'),
      projectId: id,
      id,
      x: z.number().finite(),
      y: z.number().finite(),
      target: id.optional(),
      mode: z.enum(['group', 'before', 'after', 'relation']).optional()
    })
    .strict(),
  z
    .object({
      type: z.literal('article-draft'),
      projectId: id,
      draft: ArticleDraftSchema,
      expectedBasis: z.string().max(100).optional()
    })
    .strict(),
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
    template: z.enum(['clarify', 'write', 'plan']),
    x: z.number().finite().optional(),
    y: z.number().finite().optional()
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
export type WritingResult = {
  task: 'assemble' | 'polish'
  basis: string
  draft: z.infer<typeof ArticleDraftSchema>
  warning?: string
}
export interface DesktopAPI {
  readonly platform: 'windows' | 'android'
  readonly tablet: boolean
  sync(
    action:
      | 'status'
      | 'enable'
      | 'disable'
      | 'pair'
      | 'connect'
      | 'disconnect'
      | 'now'
      | 'resolve-local'
      | 'resolve-remote',
    value?: string
  ): Promise<SyncStatus>
  snapshot(): Promise<Snapshot>
  command(command: Command): Promise<Snapshot>
  subscribe(listener: (snapshot: Snapshot) => void): () => void
  captureWindow(): Promise<void>
  hideCapture(): Promise<void>
  exportProject(projectId: string): Promise<string | null>
  importProject(): Promise<Snapshot | null>
  exportArticle(
    projectId: string,
    format: 'md' | 'txt',
    source?: 'original' | 'draft'
  ): Promise<string | null>
  ai(request: AIRequest): Promise<WritingResult>
  cancelAI(): Promise<void>
  key(action: 'set' | 'delete', value?: string): Promise<Snapshot>
  openStorage(): Promise<void>
}
export type SyncStatus = {
  enabled: boolean
  connected: boolean
  paired: boolean
  address?: string
  pairing?: string
  error?: string
  lastSync?: string
  conflicts?: number
  settingsConflict?: { local: unknown; remote: unknown } | null
}
