import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

/** Neon spark bolt on the app background. maskable=true keeps content inside the 80% safe zone. */
function svg({ maskable }) {
  const bolt = 'M300 64 L164 292 h84 l-44 156 L352 216 h-88 L300 64 Z'
  const scale = maskable ? 0.72 : 0.88
  const t = (512 - 512 * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="#070B14"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <path d="${bolt}" fill="#00F0FF" filter="url(#glow)"/>
  </g>
</svg>`
}

const std = Buffer.from(svg({ maskable: false }))
const mask = Buffer.from(svg({ maskable: true }))

await sharp(std).resize(192, 192).png().toFile(join(OUT, 'icon-192.png'))
await sharp(std).resize(512, 512).png().toFile(join(OUT, 'icon-512.png'))
await sharp(mask).resize(512, 512).png().toFile(join(OUT, 'maskable-512.png'))
await sharp(std).resize(180, 180).png().toFile(join(OUT, 'apple-touch-icon.png'))
writeFileSync(join(OUT, 'favicon.svg'), svg({ maskable: false }))
console.log('icons written to', OUT)
