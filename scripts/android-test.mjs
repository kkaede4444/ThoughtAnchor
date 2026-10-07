import { chromium } from 'playwright-core'
import { spawn, execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { createServer as http } from 'node:http'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'

const adbPath = process.env.ADB ?? path.resolve('.local/android-sdk/platform-tools/adb.exe')
const app = 'io.github.kkaidoumitsuka.thoughtanchor.test'
const adb = (...args) => execFileSync(adbPath, args, { encoding: 'utf8', windowsHide: true }).trim()
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const directory = await mkdtemp(path.join(os.tmpdir(), 'thoughtanchor-android-'))
const checks = [],
  errors = []
const forwards = new Set()
let mockReverse = 0
let android, mobile, windows, desktop, native
async function port() {
  const socket = createServer()
  await new Promise((r) => socket.listen(0, '127.0.0.1', r))
  const port = socket.address().port
  await new Promise((r) => socket.close(r))
  return port
}
async function attach() {
  adb('shell', 'am', 'start', '-n', `${app}/io.github.kkaidoumitsuka.thoughtanchor.MainActivity`)
  for (let i = 0; i < 60; i++) {
    try {
      const pid = adb('shell', 'pidof', app),
        p = await port()
      adb('forward', `tcp:${p}`, `localabstract:webview_devtools_remote_${pid}`)
      forwards.add(p)
      android = await chromium.connectOverCDP(`http://127.0.0.1:${p}`)
      mobile = android
        .contexts()
        .flatMap((c) => c.pages())
        .find((p) => p.url().includes('/ui/index.html'))
      if (mobile) break
      await android.close()
    } catch {}
    await delay(250)
  }
  assert.ok(mobile, 'Android UI WebView not found')
  mobile.on('pageerror', (e) => errors.push(e.message))
  await mobile.waitForSelector('.mobile-header, .welcome', { timeout: 20000 })
  await mobile.evaluate(() => document.fonts.ready)
}
const snapshot = (page) => page.evaluate(() => window.desktop.snapshot())
const command = (page, c) => page.evaluate((c) => window.desktop.command(c), c)
const sync = (page, a, v) => page.evaluate(([a, v]) => window.desktop.sync(a, v), [a, v])
const project = async (page) => {
  const w = (await snapshot(page)).workspace
  return w.projects.find((p) => p.id === w.activeProjectId)
}
async function eventually(fn, timeout = 12000) {
  const end = Date.now() + timeout
  let failure
  while (Date.now() < end) {
    try {
      await fn()
      return
    } catch (e) {
      failure = e
      await delay(250)
    }
  }
  throw failure
}
async function check(name, fn) {
  await fn()
  checks.push(name)
  console.log('PASS', name)
}
function screenshot(name) {
  adb('shell', 'screencap', '-p', '/sdcard/thoughtanchor-test.png')
  adb('pull', '/sdcard/thoughtanchor-test.png', path.join(directory, name))
}
async function pen(page, points, stylus = false) {
  if (!stylus) await page.getByRole('button', { name: '画笔', exact: true }).click()
  const rect = await page.locator('.board').boundingBox()
  const coords = points.map(([x, y]) => ({ x: rect.x + x, y: rect.y + y }))
  if (stylus) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...coords[0],
      button: 'left',
      buttons: 1,
      pointerType: 'pen',
      force: 0.2
    })
    for (const [i, p] of coords.entries())
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        ...p,
        buttons: 1,
        pointerType: 'pen',
        force: 0.2 + i * 0.12
      })
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      ...coords.at(-1),
      button: 'left',
      buttons: 0,
      pointerType: 'pen'
    })
    await cdp.detach()
  } else {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [coords[0]] })
    for (const p of coords)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  }
  await delay(350)
}
async function cardGesture(page, id, { stylus = false, cancel = false, second = false } = {}) {
  const rect = await page.locator(`[data-id="${id}"] .card-ink-surface`).boundingBox(),
    board = await page.locator('.board').boundingBox()
  const points = [
    [0.15, 0.25],
    [0.25, 0.45],
    [0.4, 0.3],
    [0.65, 0.65]
  ].map(([x, y]) => ({ x: rect.x + rect.width * x, y: rect.y + rect.height * y }))
  if (stylus)
    return pen(
      page,
      points.map((p) => [p.x - board.x, p.y - board.y]),
      true
    )
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, ...points[0] }]
  })
  for (const p of points.slice(1))
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 1, ...p }]
    })
  if (second)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { id: 1, ...points.at(-1) },
        { id: 2, x: points.at(-1).x + 30, y: points.at(-1).y + 30 }
      ]
    })
  await cdp.send('Input.dispatchTouchEvent', {
    type: cancel ? 'touchCancel' : 'touchEnd',
    touchPoints: []
  })
  await cdp.detach()
  await delay(350)
}
async function directSetting(page, enabled) {
  await page.getByRole('button', { name: windowName(page), exact: true }).click()
  if (page === mobile) await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('checkbox', { name: '直接在卡片上绘制', exact: true }).setChecked(enabled)
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
}
function windowName(page) {
  return page === mobile ? '目录' : '设置'
}
async function doubleTap(page, at) {
  const cdp = await page.context().newCDPSession(page)
  for (let i = 0; i < 2; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await delay(70)
  }
  await cdp.detach()
}
let aiCalls = 0
const mock = http(async (req, res) => {
  let raw = ''
  for await (const c of req) raw += c
  const body = JSON.parse(raw),
    user = JSON.parse(body.messages[1].content)
  aiCalls++
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(
              user.blocks
                ? { orderIds: user.blocks.map((b) => b.id), connectors: [] }
                : { text: 'Android polished. ' + user.source }
            )
          }
        }
      ]
    })
  )
})
await new Promise((r) => mock.listen(0, '127.0.0.1', r))
const mockPort = mock.address().port
try {
  // Reset only the disposable test package, never the release app or its data.
  let installed = false
  try {
    installed = !!adb('shell', 'pm', 'path', app)
  } catch {}
  if (installed) adb('uninstall', app)
  adb('install', '-r', path.resolve('android/app/build/outputs/apk/debug/app-debug.apk'))
  await attach()
  await check(
    'First-run eight-language chooser previews text and persists confirmation',
    async () => {
      await mobile.waitForSelector('.welcome')
      assert.equal(await mobile.getByRole('radio').count(), 8)
      const choices = [
        ['zh-CN', '选择你的语言'],
        ['zh-TW', '選擇你的語言'],
        ['en-US', 'Choose your language'],
        ['ja-JP', '言語を選んでください'],
        ['ko-KR', '언어를 선택하세요'],
        ['fr-FR', 'Choisissez votre langue'],
        ['de-DE', 'Wähle deine Sprache'],
        ['es-ES', 'Elige tu idioma']
      ]
      for (const [locale, heading] of choices) {
        await mobile.locator(`input[value="${locale}"]`).check()
        assert.equal(await mobile.locator('#welcome-heading').textContent(), heading)
        assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      }
      await mobile.screenshot({ path: path.join(directory, 'welcome-mobile.png'), fullPage: true })
      await mobile.locator('input[value="zh-CN"]').check()
      await mobile.locator('.welcome-start').click()
      await mobile.waitForSelector('.mobile-header')
      const workspace = (await snapshot(mobile)).workspace
      assert.equal(workspace.settings.welcomeComplete, true)
      assert.equal(workspace.settings.locale, 'zh-CN')
      assert.equal(workspace.projects[0].title, '从散步开始的一篇随想')
    }
  )
  await check('Android native startup and phone auto layout', async () => {
    assert.equal((await snapshot(mobile)).workspace.settings.directCardDrawing, false)
    assert.equal(await mobile.evaluate(() => window.desktop.platform), 'android')
    assert.equal(await mobile.evaluate(() => document.documentElement.dataset.interface), 'mobile')
    assert.ok((await mobile.locator('.board').boundingBox()).width < 500)
    const board = await mobile.locator('.board').boundingBox(),
      card = await mobile.locator('.react-flow__node').first().boundingBox()
    assert.ok(
      card.x >= board.x && card.x + card.width <= board.x + board.width + 1,
      'Initial card must fit phone width'
    )
  })
  await check('Drawer button, depth effect, settings and native Back', async () => {
    await mobile.evaluate(() => {
      window.__drawerTransitionObserved = false
      const observe = (event) => {
        if (
          event.target.classList.contains('mobile-drawer') &&
          event.propertyName === 'transform'
        ) {
          window.__drawerTransitionObserved = true
          document.removeEventListener('transitionrun', observe)
        }
      }
      document.addEventListener('transitionrun', observe)
    })
    await mobile.getByRole('button', { name: '目录', exact: true }).click()
    await mobile.waitForSelector('.mobile-drawer')
    await mobile.waitForFunction(
      () =>
        window.__drawerTransitionObserved || matchMedia('(prefers-reduced-motion: reduce)').matches
    )
    const motion = await mobile.locator('.mobile-drawer').evaluate((el) => ({
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      observed: window.__drawerTransitionObserved
    }))
    if (!motion.reduced) assert.ok(motion.observed, 'Drawer must animate into view')
    await delay(350)
    assert.match(
      await mobile.locator('.mobile-stage').evaluate((el) => getComputedStyle(el).filter),
      /blur\(5px\)/
    )
    screenshot('phone-drawer.png')
    await mobile.getByRole('button', { name: '设置', exact: true }).click()
    await mobile.waitForSelector('.settings-modal')
    const providers = await mobile.getByLabel('厂商').locator('option').allTextContents()
    for (const name of ['GLM', 'Kimi', 'Qwen', 'MiMo', 'MiniMax', 'Grok', '腾讯混元'])
      assert.ok(providers.includes(name), `Missing provider: ${name}`)
    adb('shell', 'input', 'keyevent', '4')
    await mobile.waitForSelector('.settings-modal', { state: 'detached' })
  })
  await check('Real touch swipe opens drawer', async () => {
    const cdp = await mobile.context().newCDPSession(mobile)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 20, y: 150 }]
    })
    for (let x = 30; x < 225; x += 20) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: 150 }]
      })
      await delay(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
    await mobile.waitForSelector('.mobile-drawer')
    await mobile.getByRole('button', { name: '关闭目录', exact: true }).last().click()
  })
  const original = (await project(mobile)).blocks
  await check('Finger pen stroke, pressure-capable persistence and undo', async () => {
    const before = (await project(mobile)).ink?.length ?? 0
    await pen(mobile, [
      [90, 240],
      [110, 210],
      [140, 260],
      [170, 200],
      [200, 250]
    ])
    await eventually(async () => assert.equal((await project(mobile)).ink.length, before + 1))
    assert.deepEqual((await project(mobile)).blocks, original)
    screenshot('phone-ink.png')
    await mobile.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click()
    await eventually(async () => assert.equal((await project(mobile)).ink?.length ?? 0, before))
    await mobile.getByRole('button', { name: '重做 Ctrl+Y', exact: true }).click()
    await eventually(async () => assert.equal((await project(mobile)).ink.length, before + 1))
  })
  await check('Eraser removes stroke and undo restores it', async () => {
    await mobile.getByRole('button', { name: '橡皮擦', exact: true }).click()
    const r = await mobile.locator('.board').boundingBox()
    await mobile.mouse.click(r.x + 140, r.y + 260)
    await eventually(async () => assert.equal((await project(mobile)).ink.length, 0))
    await command(mobile, { type: 'undo' })
    assert.equal((await project(mobile)).ink.length, 1)
  })
  await check('Stylus automatically draws in move mode', async () => {
    await mobile.getByRole('button', { name: '移动', exact: true }).click()
    await pen(
      mobile,
      [
        [90, 330],
        [120, 340],
        [160, 360]
      ],
      true
    )
    await eventually(async () => assert.equal((await project(mobile)).ink.length, 2))
    assert.ok(new Set((await project(mobile)).ink.at(-1).points.map((p) => p.pressure)).size > 1)
  })
  await check(
    'Real double-tap swaps the previous pen, eraser and move without drawing or erasing',
    async () => {
      const before = await project(mobile),
        r = await mobile.locator('.board').boundingBox(),
        at = { x: r.x + 120, y: r.y + 340 }
      for (const [previous, current] of [
        ['画笔', '橡皮擦'],
        ['橡皮擦', '移动'],
        ['移动', '画笔']
      ]) {
        await mobile.getByRole('button', { name: previous, exact: true }).click()
        await mobile.getByRole('button', { name: current, exact: true }).click()
        await mobile.getByRole('button', { name: current, exact: true }).click()
        await doubleTap(mobile, at)
        await eventually(async () =>
          assert.match(
            await mobile.getByRole('button', { name: previous, exact: true }).getAttribute('class'),
            /active/
          )
        )
        await doubleTap(mobile, at)
        await eventually(async () =>
          assert.match(
            await mobile.getByRole('button', { name: current, exact: true }).getAttribute('class'),
            /active/
          )
        )
      }
      await delay(450)
      assert.deepEqual((await project(mobile)).ink, before.ink)
      assert.deepEqual((await project(mobile)).blocks, before.blocks)
      await mobile.getByRole('button', { name: '移动', exact: true }).click()
    }
  )
  const ink = (await project(mobile)).ink
  let cardInk, drawnCardId
  await check(
    'Direct card drawing opt-in autosaves touch strokes without moving or resizing text',
    async () => {
      await directSetting(mobile, true)
      assert.equal((await snapshot(mobile)).workspace.settings.directCardDrawing, true)
      const before = await project(mobile),
        b = before.blocks[0]
      drawnCardId = b.id
      await mobile.getByRole('button', { name: '画笔', exact: true }).click()
      await cardGesture(mobile, b.id)
      await eventually(async () => assert.equal((await project(mobile)).blocks[0].ink?.length, 1))
      const after = await project(mobile)
      assert.deepEqual(after.ink, ink)
      assert.equal(after.blocks[0].text, b.text)
      for (const key of ['x', 'y', 'width', 'height']) assert.equal(after.blocks[0][key], b[key])
      assert.equal(await mobile.locator('.card-ink-modal').count(), 0)
      const first = after.blocks[0].ink[0].points[0]
      assert.ok(Math.abs(first.x - 75) < 3 && Math.abs(first.y - 80) < 3)
      screenshot('card-direct.png')
      await mobile.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click()
      await eventually(async () =>
        assert.equal((await project(mobile)).blocks[0].ink?.length ?? 0, 0)
      )
      await mobile.getByRole('button', { name: '重做 Ctrl+Y', exact: true }).click()
      await eventually(async () => assert.equal((await project(mobile)).blocks[0].ink?.length, 1))
    }
  )
  await check(
    'Card eraser, canceled touch and second pointer preserve committed drawings',
    async () => {
      const before = (await project(mobile)).blocks[0].ink
      await mobile.getByRole('button', { name: '橡皮擦', exact: true }).click()
      await cardGesture(mobile, drawnCardId)
      await eventually(async () => assert.equal((await project(mobile)).blocks[0].ink.length, 0))
      await command(mobile, { type: 'undo' })
      await mobile.getByRole('button', { name: '画笔', exact: true }).click()
      await cardGesture(mobile, drawnCardId, { cancel: true })
      assert.deepEqual((await project(mobile)).blocks[0].ink, before)
      await cardGesture(mobile, drawnCardId, { second: true })
      assert.deepEqual((await project(mobile)).blocks[0].ink, before)
      await mobile.getByRole('button', { name: '移动', exact: true }).click()
      await cardGesture(mobile, drawnCardId, { stylus: true })
      await eventually(async () => assert.equal((await project(mobile)).blocks[0].ink.length, 2))
      assert.deepEqual((await project(mobile)).ink, ink)
      await command(mobile, { type: 'undo' })
    }
  )
  await check('Card drawing editor saves, reopens and undoes local strokes', async () => {
    await mobile.getByRole('button', { name: '查看全部片段', exact: true }).click()
    await mobile.locator('.card-draw').first().click()
    const editor = mobile.locator('.card-ink-modal')
    await editor.waitFor()
    const before = (await project(mobile)).blocks.find((b) => b.id === drawnCardId).ink.length
    assert.equal(await editor.locator('.card-ink-text').textContent(), original[0].text)
    const paperBox = await editor.locator('.card-ink-paper').boundingBox(),
      textBox = await editor.locator('.card-ink-text').boundingBox()
    assert.ok(
      paperBox.y + paperBox.height - textBox.y - textBox.height >= 180,
      'Modal must leave blank drawing space below the words'
    )
    const rect = await editor.locator('.card-ink-canvas').boundingBox(),
      cdp = await mobile.context().newCDPSession(mobile)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: rect.x + rect.width * 0.15, y: rect.y + rect.height * 0.25 }]
    })
    for (let i = 2; i < 8; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: rect.x + (rect.width * i) / 10, y: rect.y + rect.height * (i % 2 ? 0.7 : 0.3) }
        ]
      })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
    await editor.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click()
    assert.equal(await editor.locator('.card-ink-canvas g').count(), before)
    await editor.getByRole('button', { name: '重做 Ctrl+Y', exact: true }).click()
    assert.equal(await editor.locator('.card-ink-canvas g').count(), before + 1)
    screenshot('card-ink-editor.png')
    await editor.getByRole('spinbutton', { name: '卡片宽度', exact: true }).fill('90')
    assert.equal(await editor.getByRole('button', { name: '保存', exact: true }).isDisabled(), true)
    await editor.getByRole('spinbutton', { name: '卡片宽度', exact: true }).fill('300')
    await editor.getByRole('spinbutton', { name: '卡片高度', exact: true }).fill('320')
    assert.equal(
      (await project(mobile)).blocks.find((b) => b.id === drawnCardId).height,
      original[0].height
    )
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await editor.waitFor({ state: 'detached' })
    const p = await project(mobile),
      b = p.blocks.find((b) => b.ink?.length)
    assert.ok(b)
    cardInk = b.ink
    drawnCardId = b.id
    assert.equal(b.text, original.find((x) => x.id === b.id).text)
    assert.equal(b.width, 300)
    assert.equal(b.height, 320)
    await mobile.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click()
    await eventually(async () =>
      assert.equal(
        (await project(mobile)).blocks.find((x) => x.id === b.id).width,
        original[0].width
      )
    )
    assert.equal((await project(mobile)).blocks.find((x) => x.id === b.id).ink.length, before)
    await mobile.getByRole('button', { name: '重做 Ctrl+Y', exact: true }).click()
    await eventually(async () =>
      assert.equal((await project(mobile)).blocks.find((x) => x.id === b.id).width, 300)
    )
    await mobile.locator(`[data-id="${b.id}"] .card-draw`).click()
    await editor.waitFor()
    assert.ok((await editor.locator('.card-ink-canvas line').count()) > 0)
    assert.equal(
      await editor.getByRole('spinbutton', { name: '卡片宽度', exact: true }).inputValue(),
      '300'
    )
    await editor.getByRole('spinbutton', { name: '卡片高度', exact: true }).fill('400')
    await editor.getByRole('button', { name: '取消', exact: true }).click()
    assert.equal((await project(mobile)).blocks.find((x) => x.id === b.id).height, 320)
  })
  await check('Committed ink survives Android force-stop and relaunch', async () => {
    adb('shell', 'am', 'force-stop', app)
    await android.close()
    mobile = null
    await attach()
    assert.deepEqual((await project(mobile)).ink, ink)
    assert.deepEqual((await project(mobile)).blocks.find((b) => b.id === drawnCardId).ink, cardInk)
    assert.equal((await snapshot(mobile)).workspace.settings.directCardDrawing, true)
    const data = adb('shell', 'run-as', app, 'cat', 'files/data/workspace.json')
    assert.ok(JSON.parse(data).version === 3)
  })
  await check('Settings switches phone to desktop and back', async () => {
    await mobile.getByRole('button', { name: '目录', exact: true }).click()
    await mobile.getByRole('button', { name: '设置', exact: true }).click()
    await mobile.getByRole('combobox', { name: '界面模式', exact: true }).selectOption('desktop')
    await mobile.getByRole('button', { name: '保存设置', exact: true }).click()
    await mobile.waitForSelector('.topbar')
    assert.equal(await mobile.evaluate(() => document.documentElement.dataset.interface), 'desktop')
    const s = (await snapshot(mobile)).workspace.settings
    await command(mobile, { type: 'settings', settings: { ...s, interfaceMode: 'auto' } })
    await mobile.waitForSelector('.mobile-header')
  })
  await check('Tablet-size simulated layout uses PC three columns', async () => {
    const cdp = await mobile.context().newCDPSession(mobile)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1000,
      height: 700,
      deviceScaleFactor: 1,
      mobile: true
    })
    await mobile.evaluate(() => {
      window.desktop.tablet = true
    })
    const s = (await snapshot(mobile)).workspace.settings
    await command(mobile, { type: 'settings', settings: { ...s, interfaceMode: 'auto' } })
    await mobile.waitForSelector('.topbar')
    assert.equal(await mobile.locator('.inbox-panel').count(), 1)
    assert.equal(await mobile.locator('.article-panel').count(), 1)
    screenshot('tablet-simulated.png')
    await mobile.evaluate(() => {
      window.desktop.tablet = false
    })
    await command(mobile, { type: 'settings', settings: s })
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    await cdp.detach()
    await mobile.waitForSelector('.mobile-header')
  })
  const debug = await port(),
    data = path.join(directory, 'windows')
  await mkdir(data)
  native = spawn(
    path.resolve('out/native/ThoughtAnchor.exe'),
    ['--data-dir', data, '--automation-port', String(debug)],
    { windowsHide: true, stdio: 'ignore' }
  )
  await eventually(async () => {
    const r = await fetch(`http://127.0.0.1:${debug}/json/version`)
    assert.ok(r.ok)
  }, 20000)
  windows = await chromium.connectOverCDP(`http://127.0.0.1:${debug}`)
  await eventually(async () => {
    desktop = windows
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => p.url().endsWith('/index.html'))
    assert.ok(desktop)
  })
  await desktop.waitForSelector('.welcome', { timeout: 20000 })
  await desktop.locator('input[value="zh-CN"]').check()
  await desktop.locator('.welcome-start').click()
  await desktop.waitForSelector('.thought-card', { timeout: 20000 })
  await check('Actual Wi-Fi TLS pairing and bidirectional inbox sync', async () => {
    const pairing = await sync(desktop, 'pair')
    const status = await sync(mobile, 'connect', pairing.pairing)
    assert.ok(status.connected, status.error)
    await command(mobile, { type: 'capture', text: 'Phone to Windows integration' })
    await sync(mobile, 'now')
    assert.ok(
      (await snapshot(desktop)).workspace.inbox.some(
        (n) => n.text === 'Phone to Windows integration'
      )
    )
    await command(desktop, { type: 'capture', text: 'Windows to phone integration' })
    await sync(mobile, 'now')
    assert.ok(
      (await snapshot(mobile)).workspace.inbox.some(
        (n) => n.text === 'Windows to phone integration'
      )
    )
  })
  await check('Ink sync and local interface setting isolation', async () => {
    const mp = await project(mobile)
    const dp = (await snapshot(desktop)).workspace.projects.find((p) => p.id === mp.id)
    assert.deepEqual(dp.ink, mp.ink)
    assert.deepEqual(dp.blocks.find((b) => b.id === drawnCardId).ink, cardInk)
    const exported = await desktop.evaluate((id) => window.desktop.exportProject(id), mp.id)
    const file = JSON.parse(await readFile(exported, 'utf8'))
    assert.equal(file.version, 3)
    assert.deepEqual(file.project.blocks.find((b) => b.id === drawnCardId).ink, cardInk)
    const s = (await snapshot(mobile)).workspace.settings
    await command(mobile, {
      type: 'settings',
      settings: { ...s, interfaceMode: 'mobile', sound: false }
    })
    await sync(mobile, 'now')
    assert.equal((await snapshot(desktop)).workspace.settings.interfaceMode, 'auto')
    assert.equal((await snapshot(desktop)).workspace.settings.directCardDrawing, false)
  })
  await check('Windows mouse drawing saves in card and syncs back to Android', async () => {
    const p = await project(mobile)
    await command(desktop, { type: 'project', action: 'select', id: p.id })
    await desktop.locator(`[data-id="${drawnCardId}"] .card-draw`).click()
    const editor = desktop.locator('.card-ink-modal')
    await editor.waitFor()
    assert.equal(await editor.locator('.card-ink-text').textContent(), original[0].text)
    const rect = await editor.locator('.card-ink-canvas').boundingBox()
    await desktop.mouse.move(rect.x + rect.width * 0.2, rect.y + rect.height * 0.5)
    await desktop.mouse.down()
    await desktop.mouse.move(rect.x + rect.width * 0.65, rect.y + rect.height * 0.6, { steps: 8 })
    await desktop.mouse.up()
    await desktop.keyboard.press('Control+z')
    assert.equal(await editor.locator('.card-ink-canvas g').count(), cardInk.length)
    await desktop.keyboard.press('Control+y')
    assert.equal(await editor.locator('.card-ink-canvas g').count(), cardInk.length + 1)
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await editor.waitFor({ state: 'detached' })
    const drawn = (await project(desktop)).blocks.find((b) => b.id === drawnCardId).ink
    assert.equal(drawn.length, cardInk.length + 1)
    await sync(mobile, 'now')
    assert.deepEqual((await project(mobile)).blocks.find((b) => b.id === drawnCardId).ink, drawn)
  })
  await check('Windows opt-in draws directly in a zoomed card and can be turned off', async () => {
    await directSetting(desktop, true)
    await desktop.getByRole('button', { name: '画笔', exact: true }).click()
    const before = await project(desktop),
      b = before.blocks.find((b) => b.id === drawnCardId)
    const surface = desktop.locator(`[data-id="${drawnCardId}"] .card-ink-surface`)
    const rect = await surface.boundingBox()
    await desktop.mouse.move(rect.x + rect.width * 0.15, rect.y + rect.height * 0.3)
    await desktop.mouse.down()
    await desktop.mouse.move(rect.x + rect.width * 0.7, rect.y + rect.height * 0.7, { steps: 8 })
    await desktop.mouse.up()
    await eventually(async () =>
      assert.equal(
        (await project(desktop)).blocks.find((b) => b.id === drawnCardId).ink.length,
        b.ink.length + 1
      )
    )
    assert.deepEqual((await project(desktop)).ink, before.ink)
    assert.equal((await project(desktop)).blocks.find((b) => b.id === drawnCardId).text, b.text)
    await desktop.keyboard.press('Control+z')
    await eventually(async () =>
      assert.equal(
        (await project(desktop)).blocks.find((b) => b.id === drawnCardId).ink.length,
        b.ink.length
      )
    )
    await desktop.keyboard.press('Control+y')
    await eventually(async () =>
      assert.equal(
        (await project(desktop)).blocks.find((b) => b.id === drawnCardId).ink.length,
        b.ink.length + 1
      )
    )
    await desktop.screenshot({ path: path.join(directory, 'windows-card-direct.png') })
    await sync(mobile, 'now')
    assert.deepEqual(
      (await project(mobile)).blocks.find((b) => b.id === drawnCardId).ink,
      (await project(desktop)).blocks.find((b) => b.id === drawnCardId).ink
    )
    await directSetting(desktop, false)
    await desktop.getByRole('button', { name: '画笔', exact: true }).click()
    const disabled = await project(desktop),
      r = await surface.boundingBox()
    await desktop.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.4)
    await desktop.mouse.down()
    await desktop.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.6, { steps: 5 })
    await desktop.mouse.up()
    await eventually(async () =>
      assert.equal((await project(desktop)).ink.length, disabled.ink.length + 1)
    )
    assert.deepEqual(
      (await project(desktop)).blocks.find((b) => b.id === drawnCardId).ink,
      disabled.blocks.find((b) => b.id === drawnCardId).ink
    )
  })
  await check('Offline edits retain both copies and do not multiply on retry', async () => {
    await sync(mobile, 'disable')
    const p = await project(mobile),
      block = p.blocks.find((b) => b.kind === 'text')
    assert.ok(block)
    await command(mobile, {
      type: 'edit',
      projectId: p.id,
      id: block.id,
      patch: { text: 'Phone offline preserved' }
    })
    await command(desktop, {
      type: 'edit',
      projectId: p.id,
      id: block.id,
      patch: { text: 'Desktop offline preserved' }
    })
    await sync(mobile, 'enable')
    await sync(mobile, 'now')
    const projects = (await snapshot(mobile)).workspace.projects
    assert.ok(projects.some((p) => p.blocks.some((b) => b.text === 'Phone offline preserved')))
    assert.ok(projects.some((p) => p.blocks.some((b) => b.text === 'Desktop offline preserved')))
    const count = projects.length
    await sync(mobile, 'now')
    await sync(mobile, 'now')
    assert.equal((await snapshot(mobile)).workspace.projects.length, count)
  })
  await check('Conflicting common settings can explicitly select phone settings', async () => {
    await sync(mobile, 'disable')
    const ms = (await snapshot(mobile)).workspace.settings,
      ds = (await snapshot(desktop)).workspace.settings
    await command(mobile, {
      type: 'settings',
      settings: { ...ms, writing: { ...ms.writing, custom: 'Phone style' } }
    })
    await command(desktop, {
      type: 'settings',
      settings: { ...ds, writing: { ...ds.writing, custom: 'Computer style' } }
    })
    await sync(mobile, 'enable')
    await sync(mobile, 'now')
    assert.ok((await sync(mobile, 'status')).settingsConflict)
    await sync(mobile, 'resolve-local')
    assert.equal((await snapshot(desktop)).workspace.settings.writing.custom, 'Phone style')
  })
  await check('Android native AI with local mock and encrypted key', async () => {
    await sync(mobile, 'disable')
    for (let devicePort = 18080; devicePort < 18100; devicePort++) {
      try {
        adb('reverse', '--no-rebind', `tcp:${devicePort}`, `tcp:${mockPort}`)
        mockReverse = devicePort
        break
      } catch {}
    }
    assert.ok(mockReverse, 'No available device port for local AI mock')
    const p = await project(mobile),
      s = (await snapshot(mobile)).workspace.settings
    await command(mobile, {
      type: 'settings',
      settings: {
        ...s,
        provider: {
          preset: '自定义',
          protocol: 'openai',
          baseUrl: `http://127.0.0.1:${mockReverse}/v1`,
          model: 'integration-test'
        }
      }
    })
    await mobile.evaluate(() => window.desktop.key('set', 'test-secret-not-a-real-provider-key'))
    await command(mobile, {
      type: 'article',
      projectId: p.id,
      ids: p.blocks.filter((b) => b.kind === 'text').map((b) => b.id)
    })
    const result = await mobile.evaluate(async (p) => {
      const s = (await window.desktop.snapshot()).workspace.settings
      return window.desktop.ai({
        projectId: p.id,
        task: 'assemble-polish',
        options: { ...s.writing, locale: s.locale }
      })
    }, p)
    assert.equal(result.task, 'polish')
    assert.equal(aiCalls, 2)
    const secret = adb('shell', 'run-as', app, 'cat', 'files/data/secrets.json')
    assert.ok(!secret.includes('test-secret-not-a-real-provider-key'))
    assert.ok(!(await snapshot(desktop)).hasKey)
    await mobile.evaluate(() => window.desktop.key('delete'))
  })
  await check(
    'Single dot survives switching boards during the double-tap recognition window',
    async () => {
      await command(mobile, { type: 'project', action: 'create', title: 'Single dot owner' })
      const first = (await project(mobile)).id
      await mobile.getByRole('button', { name: '画笔', exact: true }).click()
      const rect = await mobile.locator('.board').boundingBox(),
        cdp = await mobile.context().newCDPSession(mobile)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: rect.x + 200, y: rect.y + 200 }]
      })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await command(mobile, { type: 'project', action: 'create', title: 'Next board' })
      await cdp.detach()
      await eventually(async () =>
        assert.equal(
          (await snapshot(mobile)).workspace.projects.find((p) => p.id === first).ink?.length,
          1
        )
      )
      assert.equal((await project(mobile)).ink, undefined)
    }
  )
  await check('Windows revocation rejects previously paired Android', async () => {
    await sync(desktop, 'disconnect')
    await sync(mobile, 'enable')
    const result = await sync(mobile, 'now')
    assert.equal(result.connected, false)
    assert.match(result.error, /rejected/)
    await sync(mobile, 'disconnect')
    await sync(desktop, 'disable')
  })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ checks, errors, directory }, null, 2))
} finally {
  await writeFile(path.join(directory, 'result.json'), JSON.stringify({ checks, errors }, null, 2))
  if (desktop)
    await desktop
      .evaluate(() =>
        window.chrome.webview.postMessage({ id: 999999, action: 'automation-exit', args: [] })
      )
      .catch(() => {})
  await delay(500)
  if (native && native.exitCode == null) native.kill()
  await android?.close().catch(() => {})
  await windows?.close().catch(() => {})
  await new Promise((r) => mock.close(r))
  try {
    if (mockReverse) adb('reverse', '--remove', `tcp:${mockReverse}`)
    for (const port of forwards) adb('forward', '--remove', `tcp:${port}`)
  } catch {}
  console.log('Evidence:', directory)
}
