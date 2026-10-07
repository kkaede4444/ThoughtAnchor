import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
async function locate(name, from) {
  let cursor = from
  while (true) {
    const candidate = path.join(cursor, 'node_modules', name, 'package.json')
    try {
      await readFile(candidate)
      return candidate
    } catch {}
    const parent = path.dirname(cursor)
    if (parent === cursor) throw new Error(`Cannot locate license package: ${name}`)
    cursor = parent
  }
}
const pending = [
  'react',
  'react-dom',
  '@xyflow/react',
  'lucide-react',
  'zod',
  '@fontsource/noto-serif-sc'
].map((name) => ({ name, from: process.cwd() }))
const seen = new Set()
const entries = []
while (pending.length) {
  const { name, from } = pending.shift()
  const file = await locate(name, from)
  if (seen.has(file)) continue
  seen.add(file)
  const folder = path.dirname(file)
  const pkg = JSON.parse(await readFile(file, 'utf8'))
  const licenses = (await readdir(folder)).filter((name) =>
    /^(license|licence|copying|ofl)(\.|$)/i.test(name)
  )
  if (!licenses.length) throw new Error(`No license text found: ${pkg.name}`)
  const text = (
    await Promise.all(licenses.map((name) => readFile(path.join(folder, name), 'utf8')))
  ).join('\n\n')
  entries.push(`${pkg.name} ${pkg.version}\n${'='.repeat(72)}\n${text}`)
  for (const name of Object.keys(pkg.dependencies || {})) pending.push({ name, from: folder })
}
await writeFile('build/third-party-licenses.txt', entries.sort().join('\n\n\n'), 'utf8')
