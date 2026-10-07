export type InkTool = 'move' | 'select' | 'pen' | 'erase'
export type ToolHistory = { current: InkTool; previous: InkTool }
export function chooseTool(history: ToolHistory, tool: InkTool): ToolHistory {
  return tool === history.current ? history : { current: tool, previous: history.current }
}
export function previousTool(history: ToolHistory): ToolHistory {
  return { current: history.previous, previous: history.current }
}
