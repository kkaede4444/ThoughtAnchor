import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir, mkdtemp, cp, access, readdir } from 'node:fs/promises'
import { createServer as createHTTP } from 'node:http'
import { createServer } from 'node:net'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'

const directory = await mkdtemp(path.join(os.tmpdir(), 'thoughtanchor-native-'))
const fixture = JSON.parse(await readFile('docs/example.thoughtanchor', 'utf8'))
fixture.project.blocks = fixture.project.blocks.filter((b) => b.kind === 'text')
fixture.project.blocks.forEach((b) => {
  delete b.parentId
})
fixture.project.article = fixture.project.blocks.map((b) => b.id)
fixture.project.relations = []
await mkdir(path.join(directory, 'data'))
let legacyKeys = false
try {
  await access('.local/legacy-key-fixture/data/keys.json')
  await cp('.local/legacy-key-fixture/data/keys.json', path.join(directory, 'data/keys.json'))
  await cp('.local/legacy-key-fixture/Local State', path.join(directory, 'Local State'))
  legacyKeys = true
} catch {}
await writeFile(
  path.join(directory, 'data/workspace.json'),
  JSON.stringify({
    version: 1,
    activeProjectId: fixture.project.id,
    projects: [fixture.project],
    inbox: [],
    captureDraft: '',
    settings: {
      shortcut: 'Control+Alt+Shift+F24',
      sound: false,
      reducedMotion: false,
      provider: {
        preset: 'DeepSeek',
        protocol: 'openai',
        baseUrl: 'https://api.deepseek.com',
        model: 'test'
      }
    }
  })
)
let pauseAI = false,
  releaseAI,
  failPolish = false
const aiCalls = []
const mock = createHTTP(async (request, response) => {
  let input = ''
  for await (const chunk of request) input += chunk
  const body = JSON.parse(input),
    user = JSON.parse(body.messages[1].content)
  aiCalls.push(user)
  if (pauseAI)
    await new Promise((resolve) => {
      releaseAI = resolve
      request.on('close', resolve)
    })
  const value = user.blocks
    ? { orderIds: user.blocks.map((b) => b.id), connectors: [] }
    : failPolish
      ? { invalid: true }
      : { text: 'A lightly polished draft. ' + user.source }
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }))
})
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve))
const mockURL = `http://127.0.0.1:${mock.address().port}/v1`
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function port() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const value = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return value
}
let process, browser, page
const errors = [],
  checks = []
async function boot() {
  const debug = await port()
  process = spawn(
    path.resolve(globalThis.process.env.THOUGHTANCHOR_TEST_EXE ?? 'out/native/ThoughtAnchor.exe'),
    ['--data-dir', directory, '--automation-port', String(debug)],
    { windowsHide: true, stdio: 'ignore' }
  )
  for (let i = 0; i < 100; i++) {
    try {
      const result = await fetch(`http://127.0.0.1:${debug}/json/version`)
      if (result.ok) break
    } catch {}
    if (process.exitCode != null) throw new Error('Native process exited during startup')
    await delay(200)
  }
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${debug}`)
  for (let i = 0; i < 50; i++) {
    page = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => p.url().endsWith('/index.html'))
    if (page) break
    await delay(100)
  }
  assert.ok(page, 'Missing native WebView2 page')
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /BOARD_RENDER_ERROR|Minified React|Maximum update|Uncaught/.test(message.text())
    )
      errors.push(message.text())
  })
  await page.waitForSelector('.thought-card', { timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
}
async function stop() {
  if (page && !page.isClosed())
    await page
      .evaluate(() =>
        window.chrome.webview.postMessage({ id: 999999, action: 'automation-exit', args: [] })
      )
      .catch(() => {})
  await delay(500)
  if (process && process.exitCode == null) process.kill()
  if (browser) await browser.close().catch(() => {})
}
const snapshot = () => page.evaluate(() => window.desktop.snapshot())
const command = async (input) => {
  const result = await page.evaluate((input) => window.desktop.command(input), input)
  await delay(80)
  return result
}
const project = async () => {
  const s = await snapshot()
  return s.workspace.projects.find((p) => p.id === s.workspace.activeProjectId)
}
const node = (id, selector = '') => page.locator(`[data-id="${id}"].react-flow__node ${selector}`)
async function empty() {
  const rect = await page.locator('.react-flow__pane').boundingBox()
  return { x: rect.x + rect.width - 40, y: rect.y + rect.height - 85 }
}
async function drag(from, to) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 14 })
  await page.mouse.up()
  await delay(150)
}
async function healthy() {
  assert.equal(await page.locator('.board').count(), 1)
  assert.equal(await page.locator('.board-error').count(), 0)
  assert.deepEqual(errors, [])
}
async function check(name, action) {
  await action()
  await healthy()
  checks.push(name)
  console.log('PASS', name)
}
try {
  await boot()
  let p = await project(),
    pid = p.id
  const [a, b, c] = p.blocks.map((b) => b.id)
  await check('native host loads and migrates v1 without changing original text', async () => {
    assert.equal((await snapshot()).workspace.version, 2)
    assert.equal(await page.locator('.thought-card').count(), 3)
    assert.ok(
      (await readFile(path.join(directory, 'data/workspace.json.v1-backup'), 'utf8')).includes(
        '"version":1'
      )
    )
    assert.deepEqual(
      (await project()).blocks.map((b) => b.text),
      fixture.project.blocks.map((b) => b.text)
    )
    if (legacyKeys) {
      assert.equal(
        (await snapshot()).hasKey,
        true,
        'Electron ciphertext must migrate through Windows DPAPI/AES-GCM'
      )
      await access(path.join(directory, 'data/keys-native.json'))
      assert.equal(
        await readFile(path.join(directory, 'data/keys.json'), 'utf8'),
        await readFile('.local/legacy-key-fixture/data/keys.json', 'utf8')
      )
    }
  })
  await page.locator('.view-buttons button').first().click()
  await page.locator('.view-buttons button').last().click()
  await check('left undo/redo and card x delete only its card and remain recoverable', async () => {
    const toolbar = page.locator('.work-toolbar > button')
    assert.equal(await toolbar.nth(0).getAttribute('title'), '撤销 Ctrl+Z')
    assert.equal(await toolbar.nth(1).getAttribute('title'), '重做 Ctrl+Y')
    assert.equal(await page.locator('.card-delete').count(), 0)
    await node(a, '.card-title-display').click()
    await node(b, '.card-title-display').click({ modifiers: ['Shift'] })
    assert.equal(await page.locator('.card-delete').count(), 2)
    await page.screenshot({ path: path.join(directory, 'selected-card.png') })
    await node(a, '.card-delete').click()
    assert.deepEqual((await project()).blocks.map((b) => b.id).sort(), [b, c].sort())
    await page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click()
    await node(a, '.card-title-display').waitFor()
    await page.getByRole('button', { name: '重做 Ctrl+Y', exact: true }).click()
    assert.equal((await project()).blocks.length, 2)
    await command({ type: 'undo' })
  })
  await check('double-click background toggles tools and hover exposes a tooltip', async () => {
    const before = (await project()).blocks.length
    const at = await empty()
    await page.mouse.dblclick(at.x, at.y)
    assert.equal(
      await page
        .getByRole('button', { name: '框选工具', exact: true })
        .getAttribute('aria-pressed'),
      'true'
    )
    await page.mouse.dblclick(at.x, at.y)
    assert.equal(
      await page
        .getByRole('button', { name: '移动画布', exact: true })
        .getAttribute('aria-pressed'),
      'true'
    )
    assert.equal((await project()).blocks.length, before)
    await page.getByRole('button', { name: '移动画布', exact: true }).hover()
    await page.locator('#pan-tooltip').waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(directory, 'tool-tooltip.png') })
    await page.mouse.move(at.x, at.y)
    await page.locator('#pan-tooltip').waitFor({ state: 'hidden' })
  })
  await check(
    'Double-click returns to the previous pen, eraser or move tool without stray ink',
    async () => {
      const before = await project(),
        at = await empty()
      const pairs = [
        ['画笔', '橡皮擦'],
        ['橡皮擦', '移动'],
        ['移动', '画笔']
      ]
      for (const [previous, current] of pairs) {
        await page.getByRole('button', { name: previous, exact: true }).click()
        await page.getByRole('button', { name: current, exact: true }).click()
        await page.getByRole('button', { name: current, exact: true }).click()
        await page.mouse.dblclick(at.x, at.y)
        assert.match(
          await page.getByRole('button', { name: previous, exact: true }).getAttribute('class'),
          /active/
        )
        await page.mouse.dblclick(at.x, at.y)
        assert.match(
          await page.getByRole('button', { name: current, exact: true }).getAttribute('class'),
          /active/
        )
      }
      await delay(450)
      assert.deepEqual((await project()).ink, before.ink)
      assert.deepEqual((await project()).blocks, before.blocks)
      await page.getByRole('button', { name: '移动', exact: true }).click()
    }
  )
  await check(
    'all frameworks appear inside the panned and zoomed viewport and delete without a crash',
    async () => {
      for (let index = 0; index < 3; index++) {
        const at = await empty()
        await drag(at, { x: at.x - 650, y: at.y - 250 })
        await page.mouse.wheel(0, -300)
        await delay(350)
        const pane = await page.locator('.react-flow__pane').boundingBox(),
          previous = (await project()).viewport
        const original = (await project()).blocks.map((b) => b.id)
        await page.getByRole('button', { name: '借一个框架' }).click()
        await page.locator('.template-menu button').nth(index).click()
        await delay(350)
        const frame = (await project()).blocks.find((b) => !original.includes(b.id) && !b.parentId)
        assert.ok(frame)
        const beforeX = frame.x * previous.zoom + previous.x,
          beforeY = frame.y * previous.zoom + previous.y
        assert.ok(beforeX >= 0 && beforeX <= pane.width && beforeY >= 0 && beforeY <= pane.height)
        const r = await node(frame.id).boundingBox()
        assert.ok(
          r.x >= pane.x &&
            r.y >= pane.y &&
            r.x + r.width <= pane.x + pane.width + 1 &&
            r.y + r.height <= pane.y + pane.height + 1,
          JSON.stringify({ r, pane })
        )
        if (index === 0)
          await page.screenshot({ path: path.join(directory, 'framework-visible.png') })
        await node(frame.id, '.card-delete').click()
        assert.equal((await project()).blocks.length, original.length)
        await command({ type: 'undo' })
        assert.equal(await page.locator('.thought-card').count(), original.length + 5)
        await command({ type: 'redo' })
        assert.equal(await page.locator('.thought-card').count(), original.length)
      }
      await page.getByRole('button', { name: '查看全部片段', exact: true }).click()
      await delay(250)
    }
  )
  await check(
    'text editing, card dragging and box selection keep their original behavior',
    async () => {
      await node(a, '.card-text-display').dblclick()
      await node(a, 'textarea').fill('编辑校验🙂\n第二行')
      await page.mouse.click(...Object.values(await empty()))
      assert.equal((await project()).blocks.find((x) => x.id === a).text, '编辑校验🙂\n第二行')
      const r = await node(a, '.card-text-display').boundingBox(),
        before = (await project()).blocks.find((x) => x.id === a)
      await drag(
        { x: r.x + r.width / 2, y: r.y + r.height / 2 },
        { x: r.x + r.width / 2 - 50, y: r.y + r.height / 2 + 40 }
      )
      assert.notEqual((await project()).blocks.find((x) => x.id === a).x, before.x)
      await page.getByRole('button', { name: '框选工具', exact: true }).click()
      const card = await node(a).boundingBox()
      await drag(
        { x: card.x - 10, y: card.y - 10 },
        { x: card.x + card.width + 10, y: card.y + card.height + 10 }
      )
      assert.ok((await page.locator('.thought-card.selected').count()) >= 1)
      await page.getByRole('button', { name: '移动画布', exact: true }).click()
    }
  )
  await check('nested templates survive split, collapse, deletion, undo and redo', async () => {
    for (let i = 0; i < 8; i++) {
      await command({ type: 'template', projectId: pid, template: 'write', x: 60, y: 60 })
      let frame = (await project()).blocks.find((b) => b.kind === 'group'),
        slot = (await project()).blocks.find((b) => b.parentId === frame.id)
      await command({ type: 'snap', projectId: pid, source: a, target: slot.id, mode: 'group' })
      await command({ type: 'group', projectId: pid, ids: [frame.id, b], title: 'outer' })
      const outer = (await project()).blocks.find((b) => b.title === 'outer')
      await command({ type: 'edit', projectId: pid, id: outer.id, patch: { collapsed: true } })
      await command({ type: 'delete', projectId: pid, ids: [outer.id] })
      await command({ type: 'undo' })
      await command({ type: 'redo' })
      await command({ type: 'undo' })
      await command({ type: 'edit', projectId: pid, id: outer.id, patch: { collapsed: false } })
      await command({ type: 'ungroup', projectId: pid, id: outer.id })
      await command({ type: 'ungroup', projectId: pid, id: frame.id })
      await command({ type: 'ungroup', projectId: pid, id: slot.id })
      await command({
        type: 'delete',
        projectId: pid,
        ids: (await project()).blocks.filter((b) => b.kind === 'slot').map((b) => b.id)
      })
      assert.equal(await page.locator('.thought-card').count(), 3)
    }
  })
  await check(
    'deleting a connection start or a card during a drag cannot revive stale nodes',
    async () => {
      await page.getByRole('button', { name: '查看全部片段', exact: true }).click()
      await delay(250)
      await node(a, '[data-handleid="right"]').click()
      await command({ type: 'delete', projectId: pid, ids: [a] })
      assert.equal(await page.locator('.react-flow__handle.clickconnecting').count(), 0)
      await node(b, '[data-handleid="left"]').click()
      await page.keyboard.press('Escape')
      assert.equal((await project()).relations.length, 0)
      await command({ type: 'undo' })
      const r = await node(a, '.card-text-display').boundingBox()
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
      await page.mouse.down()
      await page.mouse.move(r.x + r.width / 2 + 35, r.y + r.height / 2 + 25, { steps: 6 })
      await command({ type: 'delete', projectId: pid, ids: [a] })
      await page.mouse.up()
      await delay(150)
      assert.equal(await node(a).count(), 0)
      await command({ type: 'undo' })
      assert.equal(await page.locator('.thought-card').count(), 3)
    }
  )
  await check(
    'keyboard card movement persists through subsequent snapshots and is undoable',
    async () => {
      await node(c).focus()
      await page.keyboard.press('Enter')
      const before = (await project()).blocks.find((b) => b.id === c)
      await page.keyboard.press('ArrowRight')
      await delay(150)
      const after = (await project()).blocks.find((b) => b.id === c)
      assert.equal(after.x, before.x + 5)
      await command({ type: 'draft', text: 'unrelated capture draft' })
      assert.equal((await project()).blocks.find((b) => b.id === c).x, after.x)
      await command({ type: 'undo' })
      assert.equal((await project()).blocks.find((b) => b.id === c).x, before.x)
      await page.keyboard.press('Escape')
    }
  )
  await check(
    'project switching while editing clears stale nodes, selection and connections',
    async () => {
      await page.getByRole('button', { name: '查看全部片段', exact: true }).click()
      await delay(250)
      await node(a, '.card-text-display').dblclick()
      await command({ type: 'project', action: 'create', title: 'switch-check' })
      assert.equal(await page.locator('.thought-card').count(), 0)
      await command({ type: 'project', action: 'select', id: pid })
      assert.equal(await page.locator('.thought-card').count(), 3)
      assert.equal(await page.locator('.card-delete').count(), 0)
      await command({
        type: 'project',
        action: 'delete',
        id: (await snapshot()).workspace.projects.find((p) => p.title === 'switch-check').id
      })
    }
  )
  await check('isolated native domain is inaccessible to renderer scripts', async () => {
    assert.equal(await page.evaluate(() => typeof window.Anchor), 'undefined')
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
  })
  await check(
    'native AI preserves source cards and supports partial failure, cancellation and stale-result rejection',
    async () => {
      let settings = (await snapshot()).workspace.settings
      await command({
        type: 'settings',
        settings: { ...settings, provider: { ...settings.provider, baseUrl: mockURL } }
      })
      await page.evaluate(() => window.desktop.key('set', 'isolated-mock-key'))
      await command({ type: 'article', projectId: pid, ids: [a, b, c] })
      const before = JSON.stringify((await project()).blocks),
        options = { ...settings.writing, locale: settings.locale }
      const input = { projectId: pid, task: 'assemble-polish', options }
      const result = await page.evaluate((input) => window.desktop.ai(input), input)
      assert.equal(result.task, 'polish')
      assert.equal(aiCalls.length, 2)
      await command({
        type: 'article-draft',
        projectId: pid,
        draft: result.draft,
        expectedBasis: result.basis
      })
      assert.equal(JSON.stringify((await project()).blocks), before)
      failPolish = true
      const partial = await page.evaluate((input) => window.desktop.ai(input), input)
      assert.equal(partial.task, 'assemble')
      assert.ok(partial.warning)
      failPolish = false
      const retry = await page.evaluate(
        (input) => window.desktop.ai({ ...input, task: 'polish', fromAssemblyPreview: true }),
        input
      )
      assert.equal(retry.task, 'polish')
      assert.equal(aiCalls.at(-1).source, partial.draft.text)
      pauseAI = true
      let pending = page.evaluate(async (input) => {
        try {
          await window.desktop.ai(input)
          return ''
        } catch (e) {
          return e.message
        }
      }, input)
      await delay(300)
      await command({
        type: 'edit',
        projectId: pid,
        id: a,
        patch: { title: 'changed while waiting' }
      })
      releaseAI()
      pauseAI = false
      assert.match(await pending, /等待期间内容已改变/)
      pauseAI = true
      pending = page.evaluate(async (input) => {
        try {
          await window.desktop.ai({ ...input, task: 'polish' })
          return ''
        } catch (e) {
          return e.message
        }
      }, input)
      await delay(300)
      await page.evaluate(() => window.desktop.cancelAI())
      assert.match(await pending, /请求已取消/)
      if (releaseAI) releaseAI()
      pauseAI = false
    }
  )
  await check(
    'native exports and imports retain v2 content and create a separate project',
    async () => {
      for (const source of ['original', 'draft'])
        for (const format of ['md', 'txt']) {
          const filename = await page.evaluate(
            ([pid, format, source]) => window.desktop.exportArticle(pid, format, source),
            [pid, format, source]
          )
          const text = await readFile(filename, 'utf8')
          assert.ok(text.includes(source === 'draft' ? 'A lightly polished draft.' : '编辑校验'))
        }
      const exported = await page.evaluate((pid) => window.desktop.exportProject(pid), pid)
      const text = await readFile(exported, 'utf8')
      assert.equal(JSON.parse(text).version, 2)
      await writeFile(path.join(directory, 'import.thoughtanchor'), text)
      const imported = await page.evaluate(() => window.desktop.importProject())
      assert.notEqual(imported.workspace.activeProjectId, pid)
      assert.equal(imported.workspace.projects.length, 2)
      await command({ type: 'project', action: 'select', id: pid })
      await command({ type: 'project', action: 'delete', id: imported.workspace.activeProjectId })
    }
  )
  await check('capture window shares the durable queue with the main window', async () => {
    await page.evaluate(() => window.desktop.captureWindow())
    const capture = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => p.url().endsWith('#capture'))
    assert.ok(capture)
    await capture.getByRole('textbox', { name: '快速捕捉内容' }).fill('原生捕捉校验🙂')
    await capture.getByRole('textbox', { name: '快速捕捉内容' }).press('Enter')
    await delay(150)
    assert.ok((await snapshot()).workspace.inbox.some((n) => n.text === '原生捕捉校验🙂'))
    await capture.evaluate(() => window.desktop.hideCapture())
  })
  await check(
    'eight locales render without horizontal overflow and preserve source text',
    async () => {
      const before = JSON.stringify((await project()).blocks)
      for (const locale of [
        'zh-CN',
        'zh-TW',
        'en-US',
        'ja-JP',
        'ko-KR',
        'fr-FR',
        'de-DE',
        'es-ES'
      ]) {
        const settings = (await snapshot()).workspace.settings
        await command({ type: 'settings', settings: { ...settings, locale } })
        assert.equal(await page.evaluate(() => document.documentElement.lang), locale)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        await page.screenshot({ path: path.join(directory, `locale-${locale}.png`) })
      }
      assert.equal(JSON.stringify((await project()).blocks), before)
    }
  )
  const beforeRestart = (await project()).draft.text
  await stop()
  await boot()
  await check(
    'separate native process restart restores draft, settings, inbox and encrypted key',
    async () => {
      const current = await snapshot()
      assert.equal(current.workspace.settings.locale, 'es-ES')
      assert.equal(current.hasKey, true)
      assert.equal((await project()).draft.text, beforeRestart)
      assert.ok(current.workspace.inbox.some((n) => n.text === '原生捕捉校验🙂'))
    }
  )
  await check('a damaged key file does not prevent the whiteboard from opening', async () => {
    await stop()
    const filename = path.join(directory, 'data/keys-native.json'),
      original = await readFile(filename, 'utf8')
    await writeFile(filename, '{invalid')
    await boot()
    const current = await snapshot()
    assert.equal(current.hasKey, false)
    assert.ok(current.recovery)
    assert.equal((await project()).draft.text, beforeRestart)
    assert.equal(await readFile(filename, 'utf8'), '{invalid')
    await stop()
    await writeFile(filename, original)
    await boot()
  })
  await check(
    'damaged workspace recovery preserves the original and restores a validated backup',
    async () => {
      await stop()
      const filename = path.join(directory, 'data/workspace.json')
      const backup = JSON.parse(await readFile(filename + '.bak', 'utf8'))
      await writeFile(filename, '{invalid')
      await boot()
      assert.deepEqual((await snapshot()).workspace.projects[0].blocks, backup.projects[0].blocks)
      assert.ok((await snapshot()).recovery)
      const damaged = (await readdir(path.join(directory, 'data'))).find((name) =>
        name.startsWith('workspace.json.damaged-')
      )
      assert.ok(damaged)
      assert.equal(await readFile(path.join(directory, 'data', damaged), 'utf8'), '{invalid')
    }
  )
  await check(
    'an actual WebView2 renderer crash reopens the board with saved content',
    async () => {
      const before = (await snapshot()).workspace
      const old = page,
        session = await old.context().newCDPSession(old)
      const crashed = old.waitForEvent('crash', { timeout: 20000 })
      void session.send('Page.crash').catch((error) => {
        if (!/Target closed|Session closed|Target crashed/.test(error.message))
          console.log('CRASH_COMMAND', error.message)
      })
      await crashed
      for (let i = 0; i < 300; i++) {
        const replacement = browser
          .contexts()
          .flatMap((context) => context.pages())
          .find((candidate) => candidate !== old && candidate.url().endsWith('/index.html'))
        if (replacement) {
          page = replacement
          break
        }
        await delay(100)
      }
      assert.notEqual(page, old, 'The native host should replace the crashed WebView2')
      page.on('pageerror', (error) => errors.push(error.message))
      await page.waitForSelector('.thought-card', { timeout: 20000 })
      assert.deepEqual((await snapshot()).workspace, before)
      await page.screenshot({ path: path.join(directory, 'renderer-recovered.png') })
    }
  )
  await check(
    'an external file change rejects saving and leaves the pending command uncommitted',
    async () => {
      const filename = path.join(directory, 'data/workspace.json')
      const original = await readFile(filename, 'utf8'),
        before = (await snapshot()).workspace
      const external = JSON.stringify({ ...before, captureDraft: 'written by another program' })
      await writeFile(filename, external)
      try {
        await assert.rejects(
          command({ type: 'draft', text: 'must not overwrite the external change' })
        )
        assert.deepEqual((await snapshot()).workspace, before)
        assert.equal(await readFile(filename, 'utf8'), external)
      } finally {
        await writeFile(filename, original)
      }
      await command({ type: 'draft', text: 'saving works after the conflict is removed' })
      assert.equal(
        (await snapshot()).workspace.captureDraft,
        'saving works after the conflict is removed'
      )
      await command({ type: 'draft', text: before.captureDraft })
    }
  )
  const load = {}
  await check(
    'a board with 300 cards and 500 connections supports moving, bulk deletion and undo',
    async () => {
      const paper = structuredClone(await project())
      paper.title = 'Native load audit'
      paper.blocks = Array.from({ length: 300 }, (_, i) => ({
        ...fixture.project.blocks[0],
        id: `load-${i}`,
        title: `Card ${i + 1}`,
        text: `A preserved source fragment ${i + 1}.`,
        x: (i % 20) * 300,
        y: Math.floor(i / 20) * 220,
        parentId: undefined,
        children: [],
        collapsed: false
      }))
      paper.relations = Array.from({ length: 500 }, (_, i) => ({
        id: `load-line-${i}`,
        source: `load-${i % 300}`,
        target: `load-${((i % 300) + (i < 300 ? 1 : 3)) % 300}`,
        label: '',
        routing: 'manual',
        sourceHandle: 'right',
        targetHandle: 'left'
      }))
      paper.article = []
      paper.connectors = []
      paper.draft = null
      paper.viewport = { x: 40, y: 40, zoom: 1 }
      await writeFile(
        path.join(directory, 'import.thoughtanchor'),
        JSON.stringify({ format: 'thoughtanchor', version: 2, project: paper })
      )
      const started = performance.now()
      const imported = await page.evaluate(() => window.desktop.importProject())
      await page.waitForFunction(() => document.querySelectorAll('.thought-card').length === 300)
      load.importAndRenderMs = Math.round(performance.now() - started)
      const loadId = imported.workspace.activeProjectId
      assert.equal((await project()).relations.length, 500)
      const first = await node('load-0', '.card-title-display').boundingBox()
      await drag({ x: first.x + 55, y: first.y + 20 }, { x: first.x + 75, y: first.y + 36 })
      assert.ok((await project()).blocks.find((b) => b.id === 'load-0').x !== 0)
      await command({
        type: 'delete',
        projectId: loadId,
        ids: paper.blocks.slice(0, 100).map((b) => b.id)
      })
      assert.equal((await project()).blocks.length, 200)
      assert.ok((await project()).relations.length < 500)
      await command({ type: 'undo' })
      assert.equal((await project()).blocks.length, 300)
      assert.equal((await project()).relations.length, 500)
      await command({ type: 'project', action: 'select', id: pid })
      await command({ type: 'project', action: 'delete', id: loadId })
    }
  )
  await writeFile(
    path.join(directory, 'native-result.json'),
    JSON.stringify({ checks, errors, load, ai: 'local mock only', directory }, null, 2)
  )
  console.log('RESULT', JSON.stringify({ directory, passed: checks.length, errors }))
} catch (error) {
  console.error(error)
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(directory, 'failure.png') }).catch(() => {})
    console.log(
      'DEBUG_UI',
      await page
        .evaluate(() => ({
          text: document.body.innerText.slice(0, 800),
          width: innerWidth,
          cards: document.querySelectorAll('.thought-card').length
        }))
        .catch(() => ({}))
    )
  }
  console.log('RESULT_DIRECTORY', directory)
  process?.kill()
  globalThis.process.exitCode = 1
} finally {
  await stop()
  mock.closeAllConnections()
  mock.close()
}
