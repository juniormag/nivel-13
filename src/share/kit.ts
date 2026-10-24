// Kit de pixel art dos cards: duas grades (arte ×6 e texto fino ×3), fontes em bitmap,
// tinta com contorno e sombra, quantização para a paleta e exportação PNG.

import silkUrl from '@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2?url'
import silkExtUrl from '@fontsource/silkscreen/files/silkscreen-latin-ext-400-normal.woff2?url'
import { PALETTE, type PaletteKey } from '../lib/palette'

export type Ink = PaletteKey

const RGB = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, [(v >> 16) & 255, (v >> 8) & 255, v & 255]]),
) as Record<PaletteKey, [number, number, number]>

export const css = (k: PaletteKey) => `#${PALETTE[k].toString(16).padStart(6, '0')}`

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
export const bayer = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)] ?? 0.5

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) throw new Error('canvas 2d indisponível')
  g.imageSmoothingEnabled = false
  return { c, g }
}

/** Libera a memória de um canvas grande (o iOS tem orçamento total de canvas). */
export function free(c: HTMLCanvasElement) {
  c.width = 0
  c.height = 0
}

// ---------------------------------------------------------------- paleta

const PAL_LIST = (Object.keys(PALETTE) as PaletteKey[]).map((k) => RGB[k])
const qCache = new Map<number, number>()

function nearest(r: number, g: number, b: number) {
  const key = (r << 16) | (g << 8) | b
  const hit = qCache.get(key)
  if (hit !== undefined) return hit
  let best = 0
  let bd = Number.POSITIVE_INFINITY
  for (let i = 0; i < PAL_LIST.length; i++) {
    const p = PAL_LIST[i]
    if (!p) continue
    // distância com peso perceptivo simples (o verde pesa mais)
    const dr = r - p[0]
    const dg = g - p[1]
    const db = b - p[2]
    const rm = (r + p[0]) / 2
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
    if (d < bd) {
      bd = d
      best = i
    }
  }
  const p = PAL_LIST[best] ?? [0, 0, 0]
  const out = (p[0] << 16) | (p[1] << 8) | p[2]
  if (qCache.size > 200000) qCache.clear()
  qCache.set(key, out)
  return out
}

/** Leva cada pixel opaco para a cor mais próxima da paleta mestra (32 cores). */
export function quantize(g: CanvasRenderingContext2D, w: number, h: number) {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if ((d[i + 3] ?? 0) < 128) {
      d[i + 3] = 0
      continue
    }
    const n = nearest(d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0)
    d[i] = (n >> 16) & 255
    d[i + 1] = (n >> 8) & 255
    d[i + 2] = n & 255
    d[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
}

/** Escurece uma faixa vertical (para dar leitura ao texto); a quantização posteriza depois. */
export function shade(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  amount: (t: number) => number,
) {
  if (w <= 0 || h <= 0) return
  const img = g.getImageData(x0, y0, w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    const k = 1 - Math.max(0, Math.min(1, amount(h <= 1 ? 0 : y / (h - 1))))
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      d[o] = (d[o] ?? 0) * k
      d[o + 1] = (d[o + 1] ?? 0) * k
      d[o + 2] = (d[o + 2] ?? 0) * k
    }
  }
  g.putImageData(img, x0, y0)
}

// ---------------------------------------------------------------- máscaras de texto

export interface Mask {
  w: number
  h: number
  /** 1 = pixel aceso */
  d: Uint8Array
  /** linha do topo das maiúsculas e da linha de base, dentro da máscara */
  cap: number
  base: number
}

const at = (m: Mask, x: number, y: number) =>
  x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : (m.d[y * m.w + x] ?? 0)

/** Silkscreen a 8 px cai exatamente na grade: cada pixel da fonte é um pixel lógico. */
// Família privada: não depende do CSS global estar carregado.
const FAMILY = 'N13 Share Silkscreen'
const SILK_BIG = `64px "${FAMILY}"`
const SILK_TOP = 4 // espaço acima das maiúsculas para acentos
const SILK_CAP = 5

const silkCache = new Map<string, Mask>()

let fontsP: Promise<void> | null = null
export function loadFonts() {
  fontsP ??= (async () => {
    try {
      const faces = [
        new FontFace(FAMILY, `url(${silkUrl}) format('woff2')`, {
          unicodeRange:
            'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122',
        }),
        new FontFace(FAMILY, `url(${silkExtUrl}) format('woff2')`, {
          unicodeRange:
            'U+0100-02AF, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF',
        }),
      ]
      for (const f of faces) document.fonts.add(f)
      await Promise.all(faces.map((f) => f.load()))
      silkCache.clear()
    } catch {
      // sem a fonte, o texto cai no monospace do sistema e continua binário
    }
  })()
  return fontsP
}

export function silk(text: string): Mask {
  const s = text.toLocaleUpperCase('pt-BR')
  const hit = silkCache.get(s)
  if (hit) return hit
  // Desenha a 8× e amostra o centro de cada célula: imune ao antialias de cada navegador.
  const S = 8
  const { c, g } = canvas(8, 8)
  g.font = SILK_BIG
  const tw = Math.ceil(g.measureText(s).width / S) + 3
  const H = SILK_TOP + SILK_CAP + 4
  c.width = tw * S
  c.height = H * S
  g.font = SILK_BIG
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#fff'
  g.fillText(s, S, (SILK_TOP + SILK_CAP) * S)
  const img = g.getImageData(0, 0, c.width, c.height).data
  const on = (x: number, y: number) => (img[((y * S + S / 2) * c.width + x * S + S / 2) * 4 + 3] ?? 0) >= 128
  let minX = tw
  let maxX = -1
  for (let y = 0; y < H; y++)
    for (let x = 0; x < tw; x++)
      if (on(x, y)) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
  if (maxX < 0) {
    minX = 0
    maxX = 0
  }
  const w = maxX - minX + 1
  const d = new Uint8Array(w * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) d[y * w + x] = on(x + minX, y) ? 1 : 0
  free(c)
  const m = { w, h: H, d, cap: SILK_TOP, base: SILK_TOP + SILK_CAP }
  silkCache.set(s, m)
  return m
}

// Fonte própria para o link (minúsculas de verdade: o id da corrente diferencia caixa).
// 5 linhas acima da base + 2 de descendente.
const LINK_GLYPHS: Record<string, string[]> = {
  a: ['....', '.XXX', 'X..X', 'X..X', '.XXX'],
  b: ['X...', 'XXX.', 'X..X', 'X..X', 'XXX.'],
  c: ['...', '.XX', 'X..', 'X..', '.XX'],
  d: ['...X', '.XXX', 'X..X', 'X..X', '.XXX'],
  e: ['....', '.XX.', 'XXXX', 'X...', '.XXX'],
  f: ['..XX', '.X..', 'XXX.', '.X..', '.X..'],
  g: ['....', '.XXX', 'X..X', 'X..X', '.XXX', '...X', '.XX.'],
  h: ['X...', 'XXX.', 'X..X', 'X..X', 'X..X'],
  i: ['X', '.', 'X', 'X', 'X'],
  j: ['.X', '..', '.X', '.X', '.X', '.X', 'X.'],
  k: ['X..', 'X.X', 'XX.', 'XX.', 'X.X'],
  l: ['X.', 'X.', 'X.', 'X.', '.X'],
  m: ['.....', 'XXXX.', 'X.X.X', 'X.X.X', 'X.X.X'],
  n: ['....', 'XXX.', 'X..X', 'X..X', 'X..X'],
  o: ['....', '.XX.', 'X..X', 'X..X', '.XX.'],
  p: ['....', 'XXX.', 'X..X', 'X..X', 'XXX.', 'X...', 'X...'],
  q: ['....', '.XXX', 'X..X', 'X..X', '.XXX', '...X', '...X'],
  r: ['...', 'X.X', 'XX.', 'X..', 'X..'],
  s: ['...', '.XX', 'XX.', '..X', 'XX.'],
  t: ['.X.', 'XXX', '.X.', '.X.', '..X'],
  u: ['....', 'X..X', 'X..X', 'X..X', '.XXX'],
  v: ['...', 'X.X', 'X.X', 'X.X', '.X.'],
  w: ['.....', 'X...X', 'X.X.X', 'X.X.X', '.X.X.'],
  x: ['...', 'X.X', '.X.', '.X.', 'X.X'],
  y: ['....', 'X..X', 'X..X', 'X..X', '.XXX', '...X', '.XX.'],
  z: ['...', 'XXX', '..X', '.X.', 'XXX'],
  '0': ['.XX.', 'X..X', 'X..X', 'X..X', '.XX.'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XXX.', '...X', '.XX.', 'X...', 'XXXX'],
  '3': ['XXX.', '...X', '.XX.', '...X', 'XXX.'],
  '4': ['X..X', 'X..X', 'XXXX', '...X', '...X'],
  '5': ['XXXX', 'X...', 'XXX.', '...X', 'XXX.'],
  '6': ['.XX.', 'X...', 'XXX.', 'X..X', '.XX.'],
  '7': ['XXXX', '...X', '..X.', '.X..', '.X..'],
  '8': ['.XX.', 'X..X', '.XX.', 'X..X', '.XX.'],
  '9': ['.XX.', 'X..X', '.XXX', '...X', '.XX.'],
  '.': ['.', '.', '.', '.', 'X'],
  ':': ['.', 'X', '.', 'X', '.'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'],
  '=': ['...', 'XXX', '...', 'XXX', '...'],
  '-': ['...', '...', 'XXX', '...', '...'],
  _: ['...', '...', '...', '...', 'XXX'],
  '&': ['.X..', 'X.X.', '.X.X', 'X.X.', '.X.X'],
  ' ': ['..', '..', '..', '..', '..'],
}

export function linkMask(text: string): Mask {
  const chars = [...text.toLowerCase()].map((ch) => LINK_GLYPHS[ch] ?? LINK_GLYPHS['-'] ?? [])
  const H = 7
  const w = chars.reduce((a, gl) => a + (gl[0]?.length ?? 0) + 1, 0) - 1
  const d = new Uint8Array(Math.max(1, w) * H)
  let ox = 0
  for (const gl of chars) {
    const gw = gl[0]?.length ?? 0
    gl.forEach((row, y) => {
      for (let x = 0; x < gw; x++) if (row[x] === 'X') d[y * w + ox + x] = 1
    })
    ox += gw + 1
  }
  return { w: Math.max(1, w), h: H, d, cap: 0, base: 5 }
}

/** Máscara a partir de linhas de texto ('X' aceso). */
export function rowsMask(rows: string[]): Mask {
  const w = Math.max(...rows.map((r) => r.length))
  const d = new Uint8Array(w * rows.length)
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] !== '.' && r[x] !== ' ') d[y * w + x] = 1
  })
  return { w, h: rows.length, d, cap: 0, base: rows.length }
}

export function scaleMask(m: Mask, k: number): Mask {
  if (k === 1) return m
  const w = m.w * k
  const h = m.h * k
  const d = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) d[y * w + x] = at(m, Math.floor(x / k), Math.floor(y / k))
  return { w, h, d, cap: m.cap * k, base: m.base * k }
}

export interface Paint {
  /** cores de cima para baixo, distribuídas entre o topo das maiúsculas e a base */
  fill: Ink | Ink[]
  outline?: Ink
  /** sombra projetada para baixo (em px da grade) */
  shadow?: Ink
  shadowDy?: number
  /** contorno em 8 direções (mais pesado) */
  thick?: boolean
}

/** Pinta uma máscara na grade de `g`. (x, y) é o canto do topo das maiúsculas. */
export function paint(g: CanvasRenderingContext2D, m0: Mask, x: number, y: number, p: Paint, k = 1) {
  const m = scaleMask(m0, k)
  const ox = Math.round(x)
  const oy = Math.round(y - m.cap)
  const px = (xx: number, yy: number, col: Ink) => {
    g.fillStyle = css(col)
    g.fillRect(ox + xx, oy + yy, 1, 1)
  }
  const near = (xx: number, yy: number) =>
    at(m, xx - 1, yy) ||
    at(m, xx + 1, yy) ||
    at(m, xx, yy - 1) ||
    at(m, xx, yy + 1) ||
    (p.thick &&
      (at(m, xx - 1, yy - 1) || at(m, xx + 1, yy - 1) || at(m, xx - 1, yy + 1) || at(m, xx + 1, yy + 1)))
  const pad = 1 + (p.shadowDy ?? 1)
  if (p.shadow) {
    const sd = p.shadowDy ?? 1
    for (let yy = -pad; yy < m.h + pad; yy++)
      for (let xx = -pad; xx < m.w + pad; xx++) {
        if (at(m, xx, yy)) continue
        const outl = p.outline && near(xx, yy)
        if (outl) continue
        let hit = false
        for (let s = 1; s <= sd && !hit; s++) hit = !!(at(m, xx, yy - s) || (p.outline && near(xx, yy - s)))
        if (hit) px(xx, yy, p.shadow)
      }
  }
  if (p.outline) {
    for (let yy = -1; yy <= m.h; yy++)
      for (let xx = -1; xx <= m.w; xx++) if (!at(m, xx, yy) && near(xx, yy)) px(xx, yy, p.outline)
  }
  const bands = Array.isArray(p.fill) ? p.fill : [p.fill]
  const span = Math.max(1, m.base - m.cap)
  for (let yy = 0; yy < m.h; yy++) {
    const t = (yy - m.cap) / span
    const bi = Math.max(0, Math.min(bands.length - 1, Math.floor(t * bands.length)))
    const col = bands[bi] ?? 'white'
    for (let xx = 0; xx < m.w; xx++) if (at(m, xx, yy)) px(xx, yy, col)
  }
  return m
}

export type Align = 'left' | 'center' | 'right'

export function alignX(x: number, w: number, align: Align) {
  return align === 'center' ? Math.round(x - w / 2) : align === 'right' ? x - w : x
}

/** Texto Silkscreen numa grade, com alinhamento. Retorna a largura ocupada. */
export function text(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  p: Paint,
  opts: { k?: number; align?: Align } = {},
) {
  const k = opts.k ?? 1
  const m = silk(s)
  const w = m.w * k
  paint(g, m, alignX(x, w, opts.align ?? 'left'), y, p, k)
  return w
}

export const silkWidth = (s: string, k = 1) => silk(s).w * k
/** altura das maiúsculas na grade */
export const CAP = SILK_CAP

/** Quebra um texto em linhas que caibam em `maxW` pixels da grade. */
export function wrap(s: string, maxW: number, k = 1) {
  const words = s.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (line && silkWidth(t, k) > maxW) {
      lines.push(line)
      line = w
    } else line = t
  }
  if (line) lines.push(line)
  return lines
}

// ---------------------------------------------------------------- sprites desenhados em código

/** Desenha linhas de caracteres com um mapa caractere → cor da paleta. */
export function drawRows(
  g: CanvasRenderingContext2D,
  rows: string[],
  map: Record<string, Ink>,
  x: number,
  y: number,
) {
  rows.forEach((r, yy) => {
    for (let xx = 0; xx < r.length; xx++) {
      const col = map[r[xx] ?? '.']
      if (!col) continue
      g.fillStyle = css(col)
      g.fillRect(Math.round(x) + xx, Math.round(y) + yy, 1, 1)
    }
  })
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: Ink) {
  g.fillStyle = css(col)
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

/** Moldura fina de HUD: linha de 1 px com cantos recortados. */
export function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: Ink) {
  rect(g, x + 1, y, w - 2, 1, col)
  rect(g, x + 1, y + h - 1, w - 2, 1, col)
  rect(g, x, y + 1, 1, h - 2, col)
  rect(g, x + w - 1, y + 1, 1, h - 2, col)
}

/** Brilho de 4 pontas: núcleo branco, braços dourados, pontas em ouro. */
export function sparkle(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hot: Ink = 'goldHi',
) {
  const s = Math.max(0, Math.round(size))
  const cx = Math.round(x)
  const cy = Math.round(y)
  for (let i = 1; i <= s; i++) {
    const col: Ink = i === s && s > 1 ? 'gold' : hot
    rect(g, cx - i, cy, 1, 1, col)
    rect(g, cx + i, cy, 1, 1, col)
    rect(g, cx, cy - i, 1, 1, col)
    rect(g, cx, cy + i, 1, 1, col)
  }
  if (s >= 3) {
    rect(g, cx - 1, cy - 1, 1, 1, 'gold1')
    rect(g, cx + 1, cy - 1, 1, 1, 'gold1')
    rect(g, cx - 1, cy + 1, 1, 1, 'gold1')
    rect(g, cx + 1, cy + 1, 1, 1, 'gold1')
  }
  rect(g, cx, cy, 1, 1, 'white')
}

/** Estrela facetada (5 pontas) com luz vindo do alto à esquerda. */
export function star(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, lit = true) {
  const r = R * 0.48
  const pts: [number, number][] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? R : r
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr])
  }
  const inside = (x: number, y: number) => {
    let c = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i]
      const b = pts[j]
      if (!a || !b) continue
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c
    }
    return c
  }
  const S = Math.ceil(R) + 2
  const mask = new Map<string, boolean>()
  for (let y = -S; y <= S; y++)
    for (let x = -S; x <= S; x++) if (inside(x + 0.5, y + 0.5 + R * 0.06)) mask.set(`${x},${y}`, true)
  const has = (x: number, y: number) => mask.has(`${x},${y}`)
  // contorno
  for (let y = -S - 1; y <= S + 1; y++)
    for (let x = -S - 1; x <= S + 1; x++) {
      if (has(x, y)) continue
      if (has(x + 1, y) || has(x - 1, y) || has(x, y + 1) || has(x, y - 1))
        rect(g, cx + x, cy + y, 1, 1, lit ? 'gold0' : 'void')
    }
  for (const k of mask.keys()) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    if (!lit) {
      rect(g, cx + x, cy + y, 1, 1, (x + y) % 2 === 0 ? 'stone1' : 'stone0')
      continue
    }
    // faceta: qual lado do raio até a ponta mais próxima
    const ang = Math.atan2(y + 0.5, x + 0.5)
    const sector = ((ang + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 5)
    const half = Math.floor(sector) % 2
    const tipA = -Math.PI / 2 + Math.round(sector / 2) * ((2 * Math.PI) / 5)
    const facing = Math.cos(tipA + (half ? 0.6 : -0.6) - (-Math.PI * 3) / 4)
    const d = Math.hypot(x + 0.5, y + 0.5) / R
    let col: Ink = facing > 0.45 ? 'goldHi' : facing > -0.2 ? 'gold' : 'gold1'
    if (d < 0.18) col = 'sparkle'
    rect(g, cx + x, cy + y, 1, 1, col)
  }
}

// ---------------------------------------------------------------- exportação

/** Amplia a arte lógica ×k e a camada fina ×k/2, sem suavização. */
export function compose(art: HTMLCanvasElement, fine: HTMLCanvasElement | null, k: number) {
  const { c, g } = canvas(art.width * k, art.height * k)
  g.imageSmoothingEnabled = false
  g.drawImage(art, 0, 0, c.width, c.height)
  if (fine) g.drawImage(fine, 0, 0, c.width, c.height)
  return c
}

export function toBlob(c: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falhou'))), type))
}
