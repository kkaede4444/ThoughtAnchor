import { readFile, writeFile, mkdir, cp, access, readdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { build } from 'esbuild'
import { createHash } from 'node:crypto'

const root = process.cwd()
const cache = path.join(root, '.local', 'native-packages')
const output = path.join(root, 'out', 'native')
await mkdir(cache, { recursive: true })
await mkdir(output, { recursive: true })
const packages = JSON.parse(await readFile('native/packages.json', 'utf8'))
const checksums = JSON.parse(await readFile('native/package-checksums.json', 'utf8'))
for (const [name, version] of Object.entries(packages)) {
  const directory = path.join(cache, `${name}.${version}`)
  const zip = `${directory}.zip`
  const verify = (bytes) => {
    if (createHash('sha256').update(bytes).digest('hex') !== checksums[`${name}.${version}`])
      throw new Error(`NuGet checksum mismatch: ${name} ${version}`)
  }
  try {
    await access(directory)
    verify(await readFile(zip))
    continue
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const url = `https://api.nuget.org/v3-flatcontainer/${name}/${version}/${name}.${version}.nupkg`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`NuGet ${name}: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  verify(bytes)
  await writeFile(zip, bytes)
  const quote = (s) => "'" + s.replaceAll("'", "''") + "'"
  const expand = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `[System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem') | Out-Null; [System.IO.Compression.ZipFile]::ExtractToDirectory(${quote(zip)}, ${quote(directory)})`
    ],
    { encoding: 'utf8', windowsHide: true }
  )
  if (expand.status !== 0) throw new Error(expand.stderr || expand.stdout)
}
const webview = path.join(cache, `microsoft.web.webview2.${packages['microsoft.web.webview2']}`)
const json = path.join(cache, `newtonsoft.json.${packages['newtonsoft.json']}`)
const references = [
  path.join(webview, 'lib/net462/Microsoft.Web.WebView2.Core.dll'),
  path.join(webview, 'lib/net462/Microsoft.Web.WebView2.WinForms.dll'),
  path.join(json, 'lib/net45/Newtonsoft.Json.dll')
]
for (const reference of references) await cp(reference, path.join(output, path.basename(reference)))
await cp(
  path.join(webview, 'runtimes/win-x64/native/WebView2Loader.dll'),
  path.join(output, 'WebView2Loader.dll')
)
const ui = path.resolve(output, 'ui')
if (path.relative(root, ui) !== path.join('out', 'native', 'ui'))
  throw new Error('Unsafe build directory')
await rm(ui, { recursive: true, force: true })
await cp('out/renderer', ui, { recursive: true })
await build({
  entryPoints: ['src/native/domain.ts'],
  outfile: path.join(output, 'domain.js'),
  bundle: true,
  format: 'iife',
  globalName: 'Anchor',
  target: 'es2022',
  minify: true
})
await cp('build/icon.ico', path.join(output, 'icon.ico'))
await cp('LICENSE', path.join(output, 'LICENSE.txt'))
await cp('build/third-party-licenses.txt', path.join(output, 'third-party-licenses.txt'))
for (const [name, version] of Object.entries(packages)) {
  const directory = path.join(cache, `${name}.${version}`)
  const license = (await readdir(directory)).find((file) => /^(license|licence)(\.|$)/i.test(file))
  if (license) await cp(path.join(directory, license), path.join(output, `${name}-LICENSE.txt`))
}
const csc = path.join(
  cache,
  `microsoft.net.compilers.toolset.${packages['microsoft.net.compilers.toolset']}`,
  'tasks/net472/csc.exe'
)
const files = (await readdir('native'))
  .filter((file) => file.endsWith('.cs'))
  .map((file) => path.join('native', file))
const args = [
  '/nologo',
  '/target:winexe',
  '/platform:x64',
  '/optimize+',
  '/win32icon:build/icon.ico',
  `/out:${path.join(output, 'ThoughtAnchor.exe')}`,
  '/r:System.dll',
  '/r:System.Core.dll',
  '/r:System.Drawing.dll',
  '/r:System.Windows.Forms.dll',
  '/r:System.Net.Http.dll',
  '/r:System.Security.dll',
  ...references.map((r) => `/r:${r}`),
  ...files
]
const compiled = spawnSync(csc, args, { encoding: 'utf8', windowsHide: true })
if (compiled.status !== 0) throw new Error(compiled.stdout + compiled.stderr)
await cp('native/ThoughtAnchor.exe.config', path.join(output, 'ThoughtAnchor.exe.config'))
console.log('Built native Windows + WebView2 app: out/native/ThoughtAnchor.exe')
