import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopAPI, Snapshot } from '../shared/model'

const api: DesktopAPI = {
  snapshot: () => ipcRenderer.invoke('snapshot'),
  command: (command) => ipcRenderer.invoke('command', command),
  subscribe: (listener) => {
    const handler = (_event: unknown, snapshot: Snapshot): void => listener(snapshot)
    ipcRenderer.on('changed', handler)
    return () => ipcRenderer.removeListener('changed', handler)
  },
  captureWindow: () => ipcRenderer.invoke('capture-window'),
  hideCapture: () => ipcRenderer.invoke('hide-capture'),
  exportProject: (id) => ipcRenderer.invoke('export-project', id),
  importProject: () => ipcRenderer.invoke('import-project'),
  exportArticle: (id, format) => ipcRenderer.invoke('export-article', id, format),
  ai: (task, id) => ipcRenderer.invoke('ai', task, id),
  cancelAI: () => ipcRenderer.invoke('cancel-ai'),
  key: (action, value) => ipcRenderer.invoke('key', action, value),
  openStorage: () => ipcRenderer.invoke('open-storage')
}
contextBridge.exposeInMainWorld('desktop', api)
