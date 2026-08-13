#!/usr/bin/env node
/**
 * Generates every app icon in public/ from one vector source.
 *
 * The icon is a pair of shorts striped in the five BART line colours, on a
 * near-black field. Run this rather than editing the PNGs by hand:
 *
 *   node tools/generate-icons.mjs
 *
 * Rendering goes through headless Chrome because it rasterises SVG far more
 * faithfully than ImageMagick's built-in renderer. ImageMagick is used only
 * to pack the multi-size .ico.
 *
 * Requires: Google Chrome, and `magick` (brew install imagemagick).
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(HERE, '..', 'public')
const TMP = resolve(HERE, '..', '.icon-build')

const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// ── Design constants ─────────────────────────────────────────────────────

const C = { red:'#ff0000', orange:'#ff9933', yellow:'#ffff33', green:'#4db848', blue:'#0099cc' }
const STRIPES = ['red', 'orange', 'yellow', 'green', 'blue']
const DARK = '#16181d'      // field, and the buckle
const WAIST = '#e8edf1'     // waistband

const G = {
  top: 32, bot: 84,         // vertical span of the shorts body
  wTop: 52, wBot: 70,       // width at waist and at hem
  gap: 10, hem: 20,         // crotch notch width at apex and at hem
  rHem: 5, rApex: 3,        // corner rounding
}

const BAND_H = (G.bot - G.top) / STRIPES.length   // 10.4

/**
 * The crotch apex MUST land exactly on a stripe boundary. Anywhere else and
 * the band it bisects bridges the crotch, which reads as a smear of colour
 * between the legs. Deriving it keeps that true if the stripe count changes.
 */
const APEX = G.top + 2 * BAND_H                    // orange/yellow seam

/**
 * Bands overlap DOWNWARD only, so antialiasing cannot leave hairlines between
 * them while every visible seam still lands on its exact boundary. Overlapping
 * in both directions shifts each seam up by this amount, because later bands
 * paint over earlier ones, and that reintroduces the crotch bridge.
 */
const OVERLAP = 0.4

// ── Geometry ─────────────────────────────────────────────────────────────

function roundPoly(pts, radii) {
  const n = pts.length
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
  const len = v => Math.hypot(v[0], v[1])
  const mul = (v, s) => [v[0] * s, v[1] * s]
  let d = ''
  for (let i = 0; i < n; i++) {
    const V = pts[i], P = pts[(i - 1 + n) % n], N = pts[(i + 1) % n]
    const dp = sub(P, V), dn = sub(N, V)
    const r = Math.min(radii[i] || 0, len(dp) / 2, len(dn) / 2)
    if (r <= 0.01) {
      d += `${i === 0 ? 'M' : 'L'}${V[0].toFixed(3)},${V[1].toFixed(3)} `
      continue
    }
    const t1 = add(V, mul(dp, r / len(dp)))
    const t2 = add(V, mul(dn, r / len(dn)))
    d += `${i === 0 ? 'M' : 'L'}${t1[0].toFixed(3)},${t1[1].toFixed(3)} `
    d += `Q${V[0].toFixed(3)},${V[1].toFixed(3)} ${t2[0].toFixed(3)},${t2[1].toFixed(3)} `
  }
  return d + 'Z'
}

function shortsPath() {
  const cx = 50
  const l = cx - G.wTop / 2, r = cx + G.wTop / 2
  const bl = cx - G.wBot / 2, br = cx + G.wBot / 2
  const pts = [
    [l, G.top], [r, G.top],
    [br, G.bot], [cx + G.hem / 2, G.bot],
    [cx + G.gap / 2, APEX], [cx - G.gap / 2, APEX],
    [cx - G.hem / 2, G.bot], [bl, G.bot],
  ]
  return roundPoly(pts, [0, 0, G.rHem, G.rHem, G.rApex, G.rApex, G.rHem, G.rHem])
}

/**
 * @param {object} opts
 * @param {number} opts.size    pixel dimensions
 * @param {number} opts.scale   art scale about its own centre. Maskable icons
 *                              need the art inside a centred circle of 80%
 *                              diameter, so they render at a reduced scale.
 */
function iconSvg({ size = 512, scale = 1 } = {}) {
  let bands = ''
  STRIPES.forEach((k, i) => {
    bands += `<rect x="0" y="${G.top + i * BAND_H}" width="100" `
           + `height="${BAND_H + OVERLAP}" fill="${C[k]}"/>`
  })

  const waistH = 11
  const waistTop = G.top - waistH
  const waist = `<rect x="${50 - G.wTop / 2 - 2}" y="${waistTop}" `
              + `width="${G.wTop + 4}" height="${waistH}" rx="2.5" fill="${WAIST}"/>`
  const buckle = `<circle cx="50" cy="${waistTop + waistH / 2}" r="3.4" fill="${DARK}"/>`

  // Art bounding box spans y from the top of the waistband to the hem.
  const cy = (waistTop + G.bot) / 2
  const xf = scale === 1 ? '' : ` transform="translate(50 50) scale(${scale}) translate(-50 ${-cy})"`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">`
       + `<rect width="100" height="100" fill="${DARK}"/>`
       + `<defs><clipPath id="s"><path d="${shortsPath()}"/></clipPath></defs>`
       + `<g${xf}><g clip-path="url(#s)">${bands}</g>${waist}${buckle}</g>`
       + `</svg>`
}

// ── Rasterise ────────────────────────────────────────────────────────────

function render(svg, size, outPath) {
  const src = join(TMP, `src-${size}-${Math.random().toString(36).slice(2, 8)}.svg`)
  writeFileSync(src, svg)
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${size},${size}`,
    `--screenshot=${outPath}`,
    `file://${src}`,
  ], { stdio: 'pipe' })
  if (!existsSync(outPath)) throw new Error(`Chrome produced nothing for ${outPath}`)
}

// ── Build ────────────────────────────────────────────────────────────────

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(PUBLIC, { recursive: true })

const OUTPUTS = [
  { file: 'apple-touch-icon.png', size: 180, scale: 1,    note: 'iOS home screen' },
  { file: 'pwa-192x192.png',      size: 192, scale: 1,    note: 'manifest any'    },
  { file: 'pwa-512x512.png',      size: 512, scale: 1,    note: 'manifest any'    },
  { file: 'pwa-maskable-512.png', size: 512, scale: 0.78, note: 'manifest maskable' },
]

for (const o of OUTPUTS) {
  const out = join(PUBLIC, o.file)
  render(iconSvg({ size: o.size, scale: o.scale }), o.size, out)
  console.log(`  ${o.file.padEnd(24)} ${String(o.size).padStart(3)}px  ${o.note}`)
}

// Scalable favicon for browsers that take one.
writeFileSync(join(PUBLIC, 'favicon.svg'), iconSvg({ size: 100 }))
console.log('  favicon.svg              vector')

// Multi-size .ico, packed from individually rendered layers so each size is
// rasterised at its true resolution rather than downsampled from one bitmap.
const icoSizes = [16, 24, 32, 48, 64]
const layers = icoSizes.map(s => {
  const p = join(TMP, `ico-${s}.png`)
  render(iconSvg({ size: s }), s, p)
  return p
})
execFileSync('magick', [...layers, join(PUBLIC, 'favicon.ico')], { stdio: 'pipe' })
console.log(`  favicon.ico              ${icoSizes.join('/')}px`)

rmSync(TMP, { recursive: true, force: true })
console.log('\nDone. Icons written to public/')
