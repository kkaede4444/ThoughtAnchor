import { build } from 'esbuild'
import { cp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import path from 'node:path'

const root = process.cwd()
const run = (file, args, options = {}) => {
  const result = spawnSync(file, args, { stdio: 'inherit', windowsHide: true, ...options })
  if (result.status !== 0) throw new Error(`${file} exited with ${result.status}`)
}
const { version } = JSON.parse(await readFile('package.json', 'utf8'))
run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'])
run(process.execPath, ['scripts/icons.mjs'])
run(process.execPath, ['scripts/licenses.mjs'])
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--logLevel', 'error'])
const assets = path.resolve('android/app/src/main/assets')
await mkdir(assets, { recursive: true })
await rm(path.join(assets, 'ui'), { recursive: true, force: true })
await cp('out/renderer', path.join(assets, 'ui'), { recursive: true })
await cp('LICENSE', path.join(assets, 'LICENSE.txt'))
await cp('build/third-party-licenses.txt', path.join(assets, 'third-party-licenses.txt'))
await cp('docs/font-OFL.txt', path.join(assets, 'font-OFL.txt'))
await cp('android/NOTICE.txt', path.join(assets, 'android-NOTICE.txt'))
await cp('android/LICENSE-APACHE.txt', path.join(assets, 'LICENSE-APACHE.txt'))
await build({
  entryPoints: ['src/native/domain.ts'],
  outfile: path.join(assets, 'domain.js'),
  bundle: true,
  format: 'iife',
  globalName: 'Anchor',
  target: 'es2022',
  minify: true
})
await writeFile(
  path.join(assets, 'domain.html'),
  '<!doctype html><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';script-src \'self\';connect-src \'none\'"><script src="domain.js"></script>'
)
await mkdir('android/app/src/main/res/drawable', { recursive: true })
await cp('src/renderer/public/icon.png', 'android/app/src/main/res/drawable/icon.png')
const sdk = path.resolve(
  process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '.local/android-sdk'
)
await access(path.join(sdk, 'platforms/android-36/android.jar'))
await writeFile(
  'android/local.properties',
  `sdk.dir=${sdk.replaceAll('\\', '/').replace(':', '\\:')}\n`
)
const signing = path.resolve('.local/android-signing')
await mkdir(signing, { recursive: true })
let password
try {
  password = (await readFile(path.join(signing, 'password'), 'utf8')).trim()
} catch {
  password = randomBytes(32).toString('hex')
  await writeFile(path.join(signing, 'password'), password, { mode: 0o600 })
}
const keystore = path.join(signing, 'release.jks')
const env = {
  ...process.env,
  THOUGHTANCHOR_SIGNING_PASSWORD: password,
  THOUGHTANCHOR_KEYSTORE: keystore
}
try {
  await access(keystore)
} catch {
  run(
    path.join(process.env.JAVA_HOME, 'bin/keytool.exe'),
    [
      '-genkeypair',
      '-keystore',
      keystore,
      '-storepass:env',
      'THOUGHTANCHOR_SIGNING_PASSWORD',
      '-keypass:env',
      'THOUGHTANCHOR_SIGNING_PASSWORD',
      '-alias',
      'thoughtanchor',
      '-keyalg',
      'RSA',
      '-keysize',
      '3072',
      '-validity',
      '10000',
      '-dname',
      'CN=ThoughtAnchor, OU=Local release, O=ThoughtAnchor'
    ],
    { env }
  )
}
run('cmd.exe', ['/d', '/c', 'gradlew.bat', '--no-daemon', 'assembleRelease', 'assembleDebug'], {
  cwd: path.join(root, 'android'),
  env
})
await mkdir('release', { recursive: true })
const file = `ThoughtAnchor-${version}-android.apk`
await cp('android/app/build/outputs/apk/release/app-release.apk', path.join('release', file))
const bytes = await readFile(path.join('release', file))
await writeFile(
  `release/SHA256SUMS-${version}-android.txt`,
  `${createHash('sha256').update(bytes).digest('hex')}  ${file}\n`
)
console.log(`Built signed APK: release/${file}`)
