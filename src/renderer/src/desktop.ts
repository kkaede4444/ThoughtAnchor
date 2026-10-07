import type { DesktopAPI, Snapshot } from '../../shared/model'

type WebView = {
  postMessage(message: unknown): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
}
const webview = (window as unknown as { chrome?: { webview?: WebView } }).chrome?.webview
const android = (window as unknown as { anchorHost?: { postMessage(message: string): void; onmessage: (event: { data: string }) => void } }).anchorHost
const environment = (window as unknown as { anchorEnvironment?: { tablet: boolean } }).anchorEnvironment
if (!webview && !android) throw new Error('ThoughtAnchor requires a native host.')
let serial = 0
const pending = new Map<
  number,
  { resolve: (result: any) => void; reject: (error: Error) => void }
>()
const listeners = new Set<(snapshot: Snapshot) => void>()
function receive(message: any): void {
  if (message.kind === 'changed') {
    for (const listener of listeners) listener(message.snapshot)
    return
  }
  if (message.kind === 'focus-capture') {
    document.querySelector<HTMLTextAreaElement>('.capture-paper textarea')?.focus()
    return
  }
  const call = pending.get(message.id)
  if (!call) return
  pending.delete(message.id)
  if (message.error) call.reject(new Error(message.error))
  else call.resolve(message.result)
}
webview?.addEventListener('message', (event) => receive(event.data))
if (android) android.onmessage = (event) => receive(JSON.parse(event.data))
;(window as any).AnchorReceive = receive
function invoke<T>(action: string, args: unknown[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++serial
    pending.set(id, { resolve, reject })
    if (android) android.postMessage(JSON.stringify({ id, action, args }))
    else webview!.postMessage({ id, action, args })
  })
}
const api: DesktopAPI = {
  platform: android ? 'android' : 'windows',
  tablet: environment?.tablet ?? false,
  sync: (action, value) => invoke('sync', [action, value]),
  snapshot: () => invoke('snapshot'),
  command: (command) => invoke('command', [command]),
  subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  captureWindow: () => invoke('capture-window'),
  hideCapture: () => invoke('hide-capture'),
  exportProject: (id) => invoke('export-project', [id]),
  importProject: () => invoke('import-project'),
  exportArticle: (id, format, source = 'original') =>
    invoke('export-article', [id, format, source]),
  ai: (request) => invoke('ai', [request]),
  cancelAI: () => invoke('cancel-ai'),
  key: (action, value) => invoke('key', [action, value]),
  openStorage: () => invoke('open-storage')
}
window.desktop = api
