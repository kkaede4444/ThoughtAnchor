import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'

const directory = await mkdtemp(path.join(os.tmpdir(), 'thoughtanchor-welcome-'))
const executable = path.resolve(
  process.env.THOUGHTANCHOR_TEST_EXE ?? 'out/native/ThoughtAnchor.exe'
)
let native, browser, page
const errors = []
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function boot(selector) {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  native = spawn(executable, ['--data-dir', directory, '--automation-port', String(port)], {
    windowsHide: true,
    stdio: 'ignore'
  })
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break
    } catch {}
    await delay(200)
  }
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  for (let i = 0; i < 80; i++) {
    page = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => p.url().endsWith('/index.html'))
    if (page) break
    await delay(100)
  }
  assert.ok(page)
  page.on('pageerror', (error) => errors.push(error.message))
  await page.waitForSelector(selector)
  await page.evaluate(() => document.fonts.ready)
}
async function stop() {
  if (page && !page.isClosed())
    await page
      .evaluate(() =>
        window.chrome.webview.postMessage({
          id: 999999,
          action: 'automation-exit',
          args: []
        })
      )
      .catch(() => {})
  await delay(600)
  if (native?.exitCode == null) native?.kill()
  await browser?.close().catch(() => {})
  page = browser = native = undefined
}
try {
  await boot('.welcome')
  assert.equal(await page.getByRole('radio').count(), 8)
  for (const [locale, heading] of [
    ['zh-CN', '选择你的语言'],
    ['zh-TW', '選擇你的語言'],
    ['en-US', 'Choose your language'],
    ['ja-JP', '言語を選んでください'],
    ['ko-KR', '언어를 선택하세요'],
    ['fr-FR', 'Choisissez votre langue'],
    ['de-DE', 'Wähle deine Sprache'],
    ['es-ES', 'Elige tu idioma']
  ]) {
    await page.locator(`input[value="${locale}"]`).check()
    assert.equal(await page.locator('#welcome-heading').textContent(), heading)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.screenshot({ path: path.join(directory, 'welcome-desktop.png') })
  await page.locator('input[value="en-US"]').check()
  await page.locator('.welcome-start').click()
  await page.waitForSelector('.thought-card')
  const { workspace } = await page.evaluate(() => window.desktop.snapshot())
  assert.equal(workspace.settings.welcomeComplete, true)
  assert.equal(workspace.settings.locale, 'en-US')
  assert.equal(workspace.projects[0].title, 'A few thoughts that began with a walk')
  assert.equal(workspace.projects[0].blocks[0].title, 'Catch it first')
  assert.equal(workspace.projects[0].relations[0].label, 'reminds me of')
  const saved = workspace.projects
  await page.evaluate((settings) => window.desktop.command({ type: 'settings', settings }), {
    ...workspace.settings,
    locale: 'ja-JP'
  })
  await stop()
  await boot('.thought-card')
  assert.equal(await page.locator('.welcome').count(), 0)
  const restarted = (await page.evaluate(() => window.desktop.snapshot())).workspace
  assert.equal(restarted.settings.locale, 'ja-JP')
  assert.equal(restarted.settings.welcomeComplete, true)
  assert.deepEqual(restarted.projects, saved)
  assert.deepEqual(errors, [])
  await writeFile(
    path.join(directory, 'welcome-result.json'),
    JSON.stringify({ passed: true, errors, directory }, null, 2)
  )
  console.log('WELCOME_PASSED', directory)
} catch (error) {
  await page?.screenshot({ path: path.join(directory, 'failure.png') }).catch(() => {})
  console.log('RESULT_DIRECTORY', directory)
  throw error
} finally {
  await stop()
}
