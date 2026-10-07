import { spawn } from 'node:child_process'
import path from 'node:path'
const app = spawn(path.resolve('out/native/ThoughtAnchor.exe'), process.argv.slice(2), {
  stdio: 'inherit',
  windowsHide: true
})
app.on('exit', (code) => {
  process.exitCode = code ?? 1
})
app.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
