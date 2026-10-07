import { createContext, useContext } from 'react'
import { Command, Snapshot } from '../../shared/model'
type Context = {
  snapshot: Snapshot
  run: (c: Command, message?: string) => Promise<Snapshot | undefined>
  notify: (message: string) => void
  selected: string[]
  setSelected: (ids: string[]) => void
}
export const WorkContext = createContext<Context | null>(null)
export function useWork(): Context {
  const c = useContext(WorkContext)
  if (!c) throw new Error('工作台尚未加载。')
  return c
}
