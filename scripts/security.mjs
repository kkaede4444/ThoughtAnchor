import { spawnSync } from 'node:child_process'
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

function git(args, encoding = 'utf8') {
  const result = spawnSync('git', args, {
    encoding,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  })
  if (result.status !== 0) throw new Error(`Git check failed: ${args[0]}`)
  return result.stdout
}
const names = [
  ...new Set(
    git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
      .split('\0')
      .filter(Boolean)
  )
]
const findings = []
const privateName =
  /(^|\/)(?:\.env(?:\..*)?|.*\.(?:jks|keystore|p12|pfx|key|pem)|keystore\.properties|workspace[^/]*\.json|keys(?:-native)?\.json[^/]*|secrets\.json[^/]*|sync-(?:native|commit)\.json[^/]*)$/i
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['service-key', /\bsk-(?:proj-|ant-|live-)?[A-Za-z0-9_-]{24,}\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['bearer-token', /Bearer\s+[A-Za-z0-9._-]{35,}/g]
]
function scan(name, bytes, revision) {
  if (privateName.test(name)) findings.push({ name, revision, rule: 'private-file' })
  if (bytes.includes(0)) return
  const text = bytes.toString('utf8')
  for (const [rule, regex] of rules) {
    regex.lastIndex = 0
    for (const match of text.matchAll(regex))
      findings.push({ name, revision, rule, line: text.slice(0, match.index).split('\n').length })
  }
}
let currentFiles = 0
for (const name of names) {
  let info
  try {
    info = await stat(name)
  } catch (e) {
    if (e.code === 'ENOENT') continue
    throw e
  }
  if (!info.isFile()) continue
  scan(name, await readFile(name), 'working-tree')
  currentFiles++
}
let historicalFiles = 0
// Never print potentially secret match values.
for (const line of git(['rev-list', '--objects', '--all']).split('\n')) {
  const space = line.indexOf(' ')
  if (space < 0) continue
  const id = line.slice(0, space),
    name = line.slice(space + 1)
  if (git(['cat-file', '-t', id]).trim() !== 'blob') continue
  scan(name, git(['cat-file', 'blob', id], null), id)
  historicalFiles++
}
const exclusions = [
  '.local/android-signing/release.jks',
  '.local/android-signing/password',
  '.env',
  'keys.json',
  'secrets.json',
  'workspace.json',
  'android/local.properties',
  'release/private.txt'
]
for (const name of exclusions) {
  const result = spawnSync('git', ['check-ignore', '--no-index', '-q', name], { windowsHide: true })
  if (result.status !== 0) findings.push({ name, rule: 'missing-exclusion' })
}
let links = 0
for (const name of names.filter((name) => name.endsWith('.md'))) {
  let content
  try {
    content = await readFile(name, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') continue
    throw e
  }
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0]
    if (!target || /^[a-z]+:|^\//i.test(target)) continue
    try {
      await stat(path.resolve(path.dirname(name), decodeURI(target)))
      links++
    } catch {
      findings.push({ name, rule: 'broken-document-link', target })
    }
  }
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'))
const native = await readFile('native/Program.cs', 'utf8')
const android = await readFile('android/app/build.gradle.kts', 'utf8')
if (
  lock.version !== pkg.version ||
  lock.packages[''].version !== pkg.version ||
  !native.includes(`AssemblyVersion("${pkg.version}.0")`) ||
  !native.includes(`AssemblyFileVersion("${pkg.version}.0")`) ||
  !android.includes(`versionName = "${pkg.version}"`)
)
  findings.push({ rule: 'version-mismatch' })
const report = {
  version: pkg.version,
  commit: git(['rev-parse', 'HEAD']).trim(),
  checkedAt: new Date().toISOString(),
  currentFiles,
  historicalFiles,
  links,
  findings
}
await mkdir('.local', { recursive: true })
await writeFile('.local/security-source.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (findings.length) process.exitCode = 1
