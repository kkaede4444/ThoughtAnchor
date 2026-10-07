import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'

const mode = process.argv[2] || 'check'
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
if (!token) {
  const result = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
    windowsHide: true
  })
  if (result.status === 0)
    token = result.stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith('password='))
      ?.slice(9)
}
if (!token) {
  console.log('AUTH_UNAVAILABLE: no existing GitHub CLI credential')
  process.exit(2)
}
async function api(route, options = {}) {
  const response = await fetch(`https://api.github.com${route}`, {
    ...options,
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers
    },
    signal: AbortSignal.timeout(60000)
  })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status} for ${route}`)
  return response.status === 204 ? null : response.json()
}
const user = await api('/user')
console.log(`AUTH_READY: ${user.login}`)
if (mode === 'check') process.exit(0)
if (!['publish', 'verify'].includes(mode)) throw new Error('Use check, publish or verify')
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const full = `${user.login}/ThoughtAnchor`
const tag = `v${pkg.version}`
const assets = [
  `ThoughtAnchor-${pkg.version}-x64-nsis.exe`,
  `ThoughtAnchor-${pkg.version}-x64-portable.exe`,
  `ThoughtAnchor-${pkg.version}-x64-portable.zip`,
  `ThoughtAnchor-${pkg.version}-android.apk`,
  `ThoughtAnchor-${pkg.version}-source.zip`,
  'SHA256SUMS.txt'
]
const localAssets = new Map()
for (const name of assets) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(`release/${name}`)) hash.update(chunk)
  localAssets.set(name, { size: (await stat(`release/${name}`)).size, digest: hash.digest('hex') })
}
const manifest = await readFile('release/SHA256SUMS.txt', 'utf8')
for (const name of assets.filter((name) => name !== 'SHA256SUMS.txt')) {
  if (!manifest.split(/\r?\n/).includes(`${localAssets.get(name).digest}  ${name}`))
    throw new Error(`Checksum manifest mismatch: ${name}`)
}
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true })
const commit = head.stdout.trim()
if (head.status !== 0 || !/^[a-f0-9]{40}$/.test(commit))
  throw new Error('Commit source before release')
const localTag = spawnSync('git', ['rev-parse', `${tag}^{commit}`], {
  encoding: 'utf8',
  windowsHide: true
})
if (localTag.status !== 0 || localTag.stdout.trim() !== commit)
  throw new Error('Local release tag differs from source commit')
const audit = JSON.parse(await readFile('.local/security-source.json', 'utf8'))
const packages = JSON.parse(
  (await readFile(`release/LOCAL_VERIFY-${pkg.version}.json`, 'utf8')).replace(/^\uFEFF/, '')
)
if (
  audit.commit !== commit ||
  audit.findings.length ||
  packages.commit !== commit ||
  !packages.archives.some((a) => a.archive.endsWith('-source.zip'))
)
  throw new Error('Run source and package checks against the committed release before publishing')
for (const [name, local] of localAssets) {
  if (name === 'SHA256SUMS.txt') continue
  const checked = packages.packages.find((p) => p.name === name)
  if (!checked || checked.sha256 !== local.digest || checked.bytes !== local.size)
    throw new Error(`Package changed after verification: ${name}`)
}
const clean = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', windowsHide: true })
if (clean.status !== 0 || clean.stdout.trim())
  throw new Error('Commit all pending source files before release')
const localBranch = spawnSync('git', ['branch', '--show-current'], {
  encoding: 'utf8',
  windowsHide: true
})
if (localBranch.status !== 0 || localBranch.stdout.trim() !== 'main')
  throw new Error('Publish the reviewed main branch')
async function verifyRelease(repo, release, allowDraft = false) {
  if (release.draft && !allowDraft) throw new Error('Release is still a draft')
  const branch = await api(`/repos/${full}/commits/main`)
  if (branch.sha !== commit) throw new Error('Remote main differs from local release commit')
  const tagged = await api(`/repos/${full}/commits/${tag}`)
  if (tagged.sha !== commit) throw new Error('Release tag differs from local release commit')
  for (const name of assets) {
    const asset = release.assets.find((asset) => asset.name === name)
    const local = localAssets.get(name)
    if (!asset || asset.state !== 'uploaded' || asset.size !== local.size)
      throw new Error(`Release asset missing or incomplete: ${name}`)
    if (asset.digest !== `sha256:${local.digest}`)
      throw new Error(`Server checksum mismatch or unavailable: ${name}`)
    console.log(`VERIFIED: ${name} (${asset.size} bytes)`)
  }
  if (allowDraft) return
  await writeFile(
    'release/publication.json',
    JSON.stringify({ repository: repo.html_url, release: release.html_url, commit }, null, 2)
  )
  console.log(`PUBLISHED: ${release.html_url}`)
}
if (mode === 'verify') {
  await verifyRelease(await api(`/repos/${full}`), await api(`/repos/${full}/releases/tags/${tag}`))
  process.exit(0)
}
let repo
try {
  repo = await api(`/repos/${full}`)
} catch (error) {
  if (!error.message.includes('HTTP 404')) throw error
  repo = await api('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: 'ThoughtAnchor',
      description: pkg.description,
      private: false,
      auto_init: false,
      has_issues: true
    })
  })
}
if (repo.private)
  throw new Error('Existing repository is private; not changing visibility automatically.')
if (repo.description !== pkg.description)
  repo = await api(`/repos/${full}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: pkg.description })
  })
const remotes = spawnSync('git', ['remote', 'get-url', 'origin'], {
  encoding: 'utf8',
  windowsHide: true
})
if (remotes.status === 0 && remotes.stdout.trim() !== repo.clone_url)
  throw new Error('Origin differs from publication repository.')
if (remotes.status !== 0) {
  const add = spawnSync('git', ['remote', 'add', 'origin', repo.clone_url], {
    encoding: 'utf8',
    windowsHide: true
  })
  if (add.status !== 0) throw new Error('Cannot add Git remote')
}
// Use the configured credential manager. Never put a token in a remote URL or on disk.
const push = spawnSync('git', ['push', '-u', 'origin', 'main', tag], {
  encoding: 'utf8',
  timeout: 180000,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
  windowsHide: true
})
if (push.status !== 0)
  throw new Error('Git push failed; use the same account in Git Credential Manager.')
console.log(`SOURCE_PUSHED: ${repo.html_url} (${commit})`)
let release
try {
  release = await api(`/repos/${full}/releases/tags/${tag}`)
} catch (error) {
  if (!error.message.includes('HTTP 404')) throw error
  release = await api(`/repos/${full}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: commit,
      name: `ThoughtAnchor ${pkg.version}`,
      draft: true,
      prerelease: false,
      body:
        (await readFile('docs/release-notes.md', 'utf8')).split(/\n## /)[0] +
        `\n\n[Documentation in eight languages](https://github.com/${full}/blob/${tag}/docs/README.md) · [MIT license](https://github.com/${full}/blob/${tag}/LICENSE) · [Security checks](https://github.com/${full}/blob/${tag}/docs/verification.md)`
    })
  })
}
for (const name of assets) {
  const local = localAssets.get(name)
  const existing = release.assets?.find((asset) => asset.name === name)
  if (existing) {
    if (existing.size !== local.size || existing.digest !== `sha256:${local.digest}`)
      throw new Error(`Existing release asset differs: ${name}`)
    continue
  }
  const uploadURL = new URL(release.upload_url.replace(/\{.*$/, ''))
  if (uploadURL.origin !== 'https://uploads.github.com')
    throw new Error('Release upload endpoint is not the official GitHub HTTPS endpoint')
  console.log(`UPLOADING: ${name}`)
  const response = await fetch(`${uploadURL.href}?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': name.endsWith('.exe')
        ? 'application/vnd.microsoft.portable-executable'
        : name.endsWith('.zip')
          ? 'application/zip'
          : name.endsWith('.apk')
            ? 'application/vnd.android.package-archive'
            : 'text/plain',
      'Content-Length': String(local.size)
    },
    body: createReadStream(`release/${name}`),
    duplex: 'half',
    signal: AbortSignal.timeout(300000)
  })
  if (!response.ok) throw new Error(`Asset upload failed: HTTP ${response.status} (${name})`)
  console.log(`UPLOADED: ${name}`)
}
release = await api(`/repos/${full}/releases/${release.id}`)
await verifyRelease(repo, release, true)
release = await api(`/repos/${full}/releases/${release.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ draft: false })
})
await verifyRelease(repo, release)
token = ''
