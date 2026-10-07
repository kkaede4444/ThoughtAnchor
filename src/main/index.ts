import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  net,
  protocol,
  safeStorage,
  shell,
  Tray
} from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { Store } from './store'
import { endpoint, keyScope, requestAI } from './ai'
import { aiBasis, articleText, getProject } from '../shared/domain'
import { CommandSchema, Snapshot } from '../shared/model'

protocol.registerSchemesAsPrivileged([
  { scheme: 'thoughtanchor', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])
let main: BrowserWindow | null = null
let capture: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let store: Store
let keys: Record<string, string> = {}
let controller: AbortController | null = null
const rendererRoot = path.resolve(__dirname, '../renderer')
const devURL = process.env.ELECTRON_RENDERER_URL
const isSmoke = process.argv.includes('--smoke-test')
if (process.env.THOUGHTANCHOR_DATA_DIR)
  app.setPath('userData', path.resolve(process.env.THOUGHTANCHOR_DATA_DIR))
else if (isSmoke)
  app.setPath('userData', path.join(app.getPath('temp'), `thoughtanchor-smoke-${process.pid}`))
function snapshot(): Snapshot {
  return {
    workspace: store.workspace,
    canUndo: store.canUndo,
    canRedo: store.canRedo,
    hasKey: Boolean(keys[keyScope(store.workspace.settings.provider)]),
    storagePath: store.directory,
    recovery: store.recovery
  }
}
function broadcast(): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('changed', snapshot())
}
function validSender(event: IpcMainInvokeEvent): void {
  const sender = event.senderFrame?.url || ''
  const allowed = devURL
    ? new URL(sender).origin === new URL(devURL).origin
    : sender.startsWith('thoughtanchor://app/')
  if (!allowed || ![main?.webContents.id, capture?.webContents.id].includes(event.sender.id))
    throw new Error('不允许的请求来源。')
}
function handle(name: string, fn: (event: IpcMainInvokeEvent, ...args: any[]) => unknown): void {
  ipcMain.handle(name, async (event, ...args) => {
    validSender(event)
    try {
      return await fn(event, ...args)
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? '输入格式不正确，操作没有应用。'
          : error instanceof Error
            ? error.message
            : '操作失败。'
      throw new Error(message)
    }
  })
}
function secureWindow(options: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  const win = new BrowserWindow({
    backgroundColor: '#FAF9F5',
    show: false,
    autoHideMenuBar: true,
    ...options,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      webSecurity: true
    }
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = devURL
      ? new URL(url).origin === new URL(devURL).origin
      : url.startsWith('thoughtanchor://app/')
    if (!allowed) event.preventDefault()
  })
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false)
  )
  return win
}
async function loadWindow(win: BrowserWindow, fragment = ''): Promise<void> {
  await win.loadURL(devURL ? `${devURL}${fragment}` : `thoughtanchor://app/index.html${fragment}`)
}
function showMain(): void {
  if (!main) return
  if (main.isMinimized()) main.restore()
  main.show()
  main.focus()
}
async function showCapture(): Promise<void> {
  if (!capture) {
    capture = secureWindow({
      width: 540,
      height: 360,
      minWidth: 420,
      minHeight: 300,
      resizable: true,
      alwaysOnTop: true,
      title: 'ThoughtAnchor · 留住闪念',
      frame: true
    })
    capture.on('close', (event) => {
      if (!quitting) {
        event.preventDefault()
        capture?.hide()
      }
    })
    await loadWindow(capture, '#capture')
  }
  if (!isSmoke) {
    capture.show()
    capture.focus()
  }
  capture.webContents.send('capture-focus')
}
function registerShortcut(accelerator: string): void {
  const previous = store.workspace.settings.shortcut
  if (accelerator === previous && globalShortcut.isRegistered(previous)) return
  if (
    !globalShortcut.register(accelerator, () => {
      void showCapture()
    })
  )
    throw new Error('快捷键不可用或已被其他程序占用，请换一个组合。')
  if (accelerator !== previous) globalShortcut.unregister(previous)
}
async function saveKeys(next: Record<string, string>): Promise<void> {
  const filename = path.join(store.directory, 'keys.json')
  const temp = `${filename}.tmp`
  await fs.writeFile(temp, JSON.stringify(next), { mode: 0o600 })
  await fs.rename(temp, filename)
  keys = next
}
function setupIPC(): void {
  handle('snapshot', () => snapshot())
  handle('command', async (_event, input) => {
    const c = CommandSchema.parse(input)
    if (c?.type === 'settings') {
      endpoint(c.settings.provider)
      const previous = store.workspace.settings.shortcut
      registerShortcut(c.settings.shortcut)
      try {
        await store.command(c)
        if (store.recovery?.startsWith('捕捉快捷键')) store.recovery = null
      } catch (error) {
        if (previous !== c.settings.shortcut) {
          globalShortcut.unregister(c.settings.shortcut)
          globalShortcut.register(previous, () => {
            void showCapture()
          })
        }
        throw error
      }
    } else await store.command(c)
    broadcast()
    return snapshot()
  })
  handle('capture-window', showCapture)
  handle('hide-capture', () => capture?.hide())
  handle('open-storage', () => shell.openPath(store.directory))
  handle('export-project', async (_event, id) => {
    z.string().max(100).parse(id)
    await store.flush()
    const p = getProject(store.workspace, id)
    const result = await dialog.showSaveDialog(main!, {
      title: '导出思路纸',
      defaultPath: `${safeName(p.title)}.thoughtanchor`,
      filters: [{ name: 'ThoughtAnchor 思路纸', extensions: ['thoughtanchor'] }]
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(
      result.filePath,
      JSON.stringify({ format: 'thoughtanchor', version: 1, project: p }, null, 2),
      'utf8'
    )
    return result.filePath
  })
  handle('import-project', async () => {
    const result = await dialog.showOpenDialog(main!, {
      title: '导入思路纸',
      properties: ['openFile'],
      filters: [{ name: 'ThoughtAnchor 思路纸', extensions: ['thoughtanchor', 'json'] }]
    })
    if (result.canceled) return null
    const file = result.filePaths[0]
    const stats = await fs.stat(file)
    if (stats.size > 30 * 1024 * 1024) throw new Error('导入文件不能超过 30 MB。')
    await store.import(JSON.parse(await fs.readFile(file, 'utf8')))
    broadcast()
    return snapshot()
  })
  handle('export-article', async (_event, id, format) => {
    z.string().max(100).parse(id)
    z.enum(['md', 'txt']).parse(format)
    await store.flush()
    const p = getProject(store.workspace, id)
    const result = await dialog.showSaveDialog(main!, {
      title: '导出成文',
      defaultPath: `${safeName(p.title)}.${format}`,
      filters: [{ name: format === 'md' ? 'Markdown' : '纯文本', extensions: [format] }]
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, articleText(p, format === 'md'), 'utf8')
    return result.filePath
  })
  handle('key', async (_event, action, value) => {
    z.enum(['set', 'delete']).parse(action)
    const scope = keyScope(store.workspace.settings.provider)
    const next = { ...keys }
    if (action === 'delete') delete next[scope]
    else {
      z.string().min(1).max(4000).parse(value)
      if (!safeStorage.isEncryptionAvailable())
        throw new Error('系统密钥加密暂不可用，未保存密钥。')
      next[scope] = safeStorage.encryptString(value.trim()).toString('base64')
    }
    await saveKeys(next)
    broadcast()
    return snapshot()
  })
  handle('ai', async (_event, task, id) => {
    z.enum(['connectors', 'order']).parse(task)
    z.string().max(100).parse(id)
    if (controller) throw new Error('已有请求进行中。')
    await store.flush()
    const p = structuredClone(getProject(store.workspace, id))
    const provider = { ...store.workspace.settings.provider }
    const encrypted = keys[keyScope(provider)]
    if (!encrypted) throw new Error('先到设置里保存这个接口的 API 密钥。')
    if (!safeStorage.isEncryptionAvailable()) throw new Error('系统密钥加密暂不可用。')
    let key: string
    try {
      key = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      throw new Error('无法解密密钥，请重新保存。')
    }
    const current = new AbortController()
    controller = current
    const timer = setTimeout(() => current.abort(), 60000)
    try {
      const result = await requestAI(provider, key, task, p, current.signal)
      await store.flush()
      if (aiBasis(getProject(store.workspace, id)) !== result.basis)
        throw new Error('等待期间内容已改变，请重新生成建议。')
      return result
    } catch (error) {
      if (current.signal.aborted) throw new Error('请求已取消或超过 60 秒，内容未改变。')
      throw error
    } finally {
      clearTimeout(timer)
      controller = null
      key = ''
    }
  })
  handle('cancel-ai', () => controller?.abort())
}
function safeName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'ThoughtAnchor'
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', showMain)
  app
    .whenReady()
    .then(async () => {
      protocol.handle('thoughtanchor', (request) => {
        const url = new URL(request.url)
        let relative: string
        try {
          relative = decodeURIComponent(url.pathname)
        } catch {
          return new Response('', { status: 400 })
        }
        const file = path.resolve(rendererRoot, `.${relative}`)
        if (url.hostname !== 'app' || !file.startsWith(`${rendererRoot}${path.sep}`))
          return new Response('', { status: 403 })
        return net.fetch(pathToFileURL(file).href)
      })
      store = new Store(path.join(app.getPath('userData'), 'data'))
      await store.load()
      try {
        keys = z
          .record(z.string().max(12000))
          .parse(JSON.parse(await fs.readFile(path.join(store.directory, 'keys.json'), 'utf8')))
      } catch {
        keys = {}
      }
      setupIPC()
      Menu.setApplicationMenu(null)
      main = secureWindow({
        width: 1420,
        height: 940,
        minWidth: 1050,
        minHeight: 700,
        title: 'ThoughtAnchor · 思维拼图'
      })
      main.on('close', (event) => {
        if (!quitting && !isSmoke) {
          event.preventDefault()
          main?.hide()
        }
      })
      await loadWindow(main)
      if (!isSmoke) main.show()
      const trayImage = nativeImage.createFromPath(path.join(rendererRoot, 'icon.png'))
      tray = new Tray(trayImage)
      tray.setToolTip('ThoughtAnchor · 留住闪念')
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: '打开思路纸', click: showMain },
          {
            label: '留住闪念',
            click: () => {
              void showCapture()
            }
          },
          { type: 'separator' },
          { label: '退出', click: () => app.quit() }
        ])
      )
      tray.on('double-click', showMain)
      try {
        registerShortcut(store.workspace.settings.shortcut)
      } catch {
        store.recovery = '捕捉快捷键被占用，请在设置中修改。'
        broadcast()
      }
      if (isSmoke) {
        setTimeout(async () => {
          try {
            const result = await main!.webContents.executeJavaScript(
              '({title:document.title,cards:document.querySelectorAll(".thought-card").length,bridge:!!window.desktop,body:document.body.innerText.slice(0,300)})'
            )
            if (!result.bridge || !result.body.includes('闪念收件盒'))
              throw new Error('Renderer did not initialize.')
            result.shortcutRegistered = globalShortcut.isRegistered(
              store.workspace.settings.shortcut
            )
            result.trayIcon = !trayImage.isEmpty()
            await fs.writeFile(
              path.join(store.directory, 'smoke-result.json'),
              JSON.stringify(result, null, 2)
            )
            await fs.writeFile(
              path.join(store.directory, 'smoke-workbench.png'),
              (await main!.webContents.capturePage()).toPNG()
            )
            const captureTest = await main!.webContents.executeJavaScript(`(async () => {
              const before = await window.desktop.snapshot();
              await window.desktop.command({type:'draft', text:'先留住一片新的观察。'});
              await window.desktop.command({type:'capture', text:'桌面捕捉检查：这片文字已经保存。'});
              const after = await window.desktop.snapshot();
              return {durableCapture: after.workspace.inbox.length === before.workspace.inbox.length + 1, draft:after.workspace.captureDraft};
            })()`)
            if (!captureTest.durableCapture) throw new Error('Capture was not saved.')
            await showCapture()
            await capture!.webContents.executeJavaScript('document.fonts.ready')
            result.capture = {
              ...captureTest,
              title: await capture!.webContents.executeJavaScript('document.title')
            }
            await fs.writeFile(
              path.join(store.directory, 'smoke-capture.png'),
              (await capture!.webContents.capturePage()).toPNG()
            )
            await fs.writeFile(
              path.join(store.directory, 'smoke-result.json'),
              JSON.stringify(result, null, 2)
            )
            console.log('SMOKE_RESULT', JSON.stringify(result))
            quitting = true
            app.quit()
          } catch (error) {
            await fs.writeFile(
              path.join(store.directory, 'smoke-result.json'),
              JSON.stringify({ error: String(error) })
            )
            console.error('SMOKE_FAILED', String(error))
            quitting = true
            app.exit(1)
          }
        }, 2500)
      }
    })
    .catch((error) => {
      dialog.showErrorBox(
        'ThoughtAnchor 无法启动',
        error instanceof Error ? error.message : String(error)
      )
      app.exit(1)
    })
  app.on('before-quit', (event) => {
    if (!quitting) {
      event.preventDefault()
      quitting = true
      controller?.abort()
      void store?.flush().finally(() => app.quit())
    }
  })
  app.on('will-quit', () => globalShortcut.unregisterAll())
}
