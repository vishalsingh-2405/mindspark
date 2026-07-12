import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

/**
 * "Split Mind" mark (identity decision 2026-07-12): left hemisphere as radiating
 * waves (cyan), right as circuit traces (magenta) — thought becoming signal.
 * Drawn in a 96×96 space; tiles scale it into the 512 box.
 */
function mark({ cyan, magenta }) {
  return `
    <g fill="none" stroke="${cyan}" stroke-width="7" stroke-linecap="round">
      <path d="M42 22 A26 26 0 0 0 42 74"/>
      <path d="M42 36 A13 13 0 0 0 42 62"/>
    </g>
    <circle cx="42" cy="48" r="4.5" fill="${cyan}"/>
    <g stroke="${magenta}" stroke-width="7" stroke-linecap="round">
      <path d="M54 26 H70"/>
      <path d="M54 48 H76"/>
      <path d="M54 70 H64"/>
    </g>
    <g fill="${magenta}">
      <circle cx="76" cy="26" r="4.5"/>
      <circle cx="82" cy="48" r="4.5"/>
      <circle cx="70" cy="70" r="4.5"/>
    </g>`
}

const NEON = { cyan: '#00F0FF', magenta: '#FF2E97' }

/** Dark app tile for installed icons. maskable=true keeps content inside the 80% safe zone. */
function tileSvg({ maskable }) {
  const s = (512 / 96) * (maskable ? 0.72 : 0.88)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="#070B14"/>
  <g transform="translate(256 256) scale(${s}) translate(-49 -48)" filter="url(#glow)">${mark(NEON)}</g>
</svg>`
}

/** Transparent favicon that re-inks itself with the browser theme (deepened tones on light UI). */
function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <style>
    :root { --c: #00F0FF; --m: #FF2E97; }
    @media (prefers-color-scheme: light) { :root { --c: #0090AD; --m: #D81677; } }
  </style>
  ${mark({ cyan: 'var(--c)', magenta: 'var(--m)' })}
</svg>`
}

const std = Buffer.from(tileSvg({ maskable: false }))
const mask = Buffer.from(tileSvg({ maskable: true }))

await sharp(std).resize(192, 192).png().toFile(join(OUT, 'icon-192.png'))
await sharp(std).resize(512, 512).png().toFile(join(OUT, 'icon-512.png'))
await sharp(mask).resize(512, 512).png().toFile(join(OUT, 'maskable-512.png'))
await sharp(std).resize(180, 180).png().toFile(join(OUT, 'apple-touch-icon.png'))
writeFileSync(join(OUT, 'favicon.svg'), faviconSvg())
console.log('icons written to', OUT)
