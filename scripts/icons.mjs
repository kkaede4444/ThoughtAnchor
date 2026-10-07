import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
await mkdir('src/renderer/public', { recursive: true })
const svg = await readFile('build/icon.svg')
const png = await sharp(svg).resize(256, 256).png().toBuffer()
await writeFile('build/icon.png', png)
await writeFile('src/renderer/public/icon.png', png)
await writeFile('build/icon.ico', await pngToIco(png))
