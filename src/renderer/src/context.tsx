import { t, tr } from '../../shared/i18n'
import { createContext, useContext } from 'react'
import { Command, Snapshot, InkStroke } from '../../shared/model'
import { type InkTool } from '../../shared/tools'
export type { InkTool } from '../../shared/tools'
export type CardInkDraft = {
  projectId: string
  blockId: string
  stroke: InkStroke | null
  erased: string[]
}
type Context = {
  snapshot: Snapshot
  run: (c: Command, message?: string) => Promise<Snapshot | undefined>
  notify: (message: string) => void
  selected: string[]
  setSelected: (ids: string[]) => void
  inkTool: InkTool
  setInkTool: (tool: InkTool) => void
  switchInkTool: () => void
  cardInkDraft: CardInkDraft | null
  setCardInkDraft: (draft: CardInkDraft | null) => void
}
export const WorkContext = createContext<Context | null>(null)
export function useWork(): Context {
  const c = useContext(WorkContext)
  if (!c) throw new Error(t('工作台尚未加载。'))
  return c
}
