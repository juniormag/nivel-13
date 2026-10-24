// Ferramentas de pixel da cena: paleta em vários formatos, buffer de pixels em Uint32,
// pontilhado Bayer e ruído determinístico. Tudo que é arte passa por aqui, então nenhum
// pixel sai da paleta de 32 cores (docs/research/visual.md §2, regra 5).
import { PALETTE, type PaletteKey } from '../lib/palette'
import { mulberry32 } from '../lib/rng'

export type K = PaletteKey
export const KEYS = Object.keys(PALETTE) as K[]

export const HEX = {} as Record<K, string>
export const RGB = {} as Record<K, [number, number, number]>
/** cor como Uint32 little-endian (ABGR), pronta para ImageData */
export const U32 = {} as Record<K, number>
for (const k of KEYS) {
  const n = PALETTE[k]
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  HEX[k] = `#${n.toString(16).padStart(6, '0')}`
  RGB[k] = [r, g, b]
  U32[k] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0
}

/** Bayer 4×4 normalizado (0..1). */
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
export const bayer = (x: number, y: number) => B4[((y & 3) << 2) | (x & 3)] as number
/** verdadeiro quando a densidade `t` (0..1) acende este pixel no pontilhado ordenado */
export const dith = (x: number, y: number, t: number) => t > bayer(x, y)

export class Buf {
  readonly w: number
  readonly h: number
  readonly img: ImageData
  readonly d: Uint32Array
  constructor(w: number, h: number) {
    // nunca 0, fracionário ou NaN (aba escondida, resize no meio da transição)
    this.w = Number.isFinite(w) ? Math.max(1, Math.min(8192, Math.ceil(w))) : 1
    this.h = Number.isFinite(h) ? Math.max(1, Math.min(8192, Math.ceil(h))) : 1
    this.img = new ImageData(this.w, this.h)
    this.d = new Uint32Array(this.img.data.buffer)
  }
  set(x: number, y: number, k: K) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.d[y * this.w + x] = U32[k]
  }
  /** pinta só onde já existe pixel (para sombrear dentro de uma forma) */
  over(x: number, y: number, k: K) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = y * this.w + x
    if (this.d[i]) this.d[i] = U32[k]
  }
  /** pinta só onde está vazio */
  under(x: number, y: number, k: K) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = y * this.w + x
    if (!this.d[i]) this.d[i] = U32[k]
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    return this.d[(y | 0) * this.w + (x | 0)] ?? 0
  }
  is(x: number, y: number, k: K) {
    return this.get(x, y) === U32[k]
  }
  rect(x: number, y: number, w: number, h: number, k: K) {
    const x0 = Math.max(0, x | 0)
    const y0 = Math.max(0, y | 0)
    const x1 = Math.min(this.w, (x + w) | 0)
    const y1 = Math.min(this.h, (y + h) | 0)
    const c = U32[k]
    for (let yy = y0; yy < y1; yy++) this.d.fill(c, yy * this.w + x0, yy * this.w + x1)
  }
  fill(k: K) {
    this.d.fill(U32[k])
  }
  /** linha de Bresenham de 1 px */
  line(x0: number, y0: number, x1: number, y1: number, k: K, step = 1) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let i = 0
    for (;;) {
      if (i++ % step === 0) this.set(x0, y0, k)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }
  canvas() {
    const c = document.createElement('canvas')
    c.width = this.w
    c.height = this.h
    const g = c.getContext('2d')
    if (g) g.putImageData(this.img, 0, 0)
    return c
  }
  /** copia outro buffer por cima (pixels transparentes não sobrescrevem) */
  blit(src: Buf, ox: number, oy: number) {
    for (let y = 0; y < src.h; y++) {
      const ty = y + oy
      if (ty < 0 || ty >= this.h) continue
      for (let x = 0; x < src.w; x++) {
        const tx = x + ox
        if (tx < 0 || tx >= this.w) continue
        const v = src.d[y * src.w + x]
        if (v) this.d[ty * this.w + tx] = v
      }
    }
  }
}

/** Gradiente vertical pontilhado entre cores vizinhas da paleta (só 2 cores por faixa). */
export function vgrad(b: Buf, x0: number, y0: number, w: number, h: number, stops: [number, K][]) {
  for (let y = 0; y < h; y++) {
    const t = h <= 1 ? 0 : y / (h - 1)
    let i = 0
    while (i < stops.length - 2 && t > (stops[i + 1]?.[0] ?? 1)) i++
    const a = stops[i] ?? stops[0]
    const c = stops[i + 1] ?? a
    if (!a || !c) continue
    const local = Math.min(1, Math.max(0, (t - a[0]) / (c[0] - a[0] || 1)))
    const yy = y0 + y
    for (let x = 0; x < w; x++) {
      const xx = x0 + x
      // escalonamento das linhas de transição (regra 17): desloca o Bayer a cada 4 linhas
      b.set(xx, yy, dith(xx + ((yy >> 2) & 1) * 2, yy, local) ? c[1] : a[1])
    }
  }
}

// ---------- ruído determinístico ----------
export function makeNoise(seed: number, period = 256) {
  const r = mulberry32(seed)
  const N = 256
  const perm = new Uint8Array(N * 2)
  const vals = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    perm[i] = i
    vals[i] = r()
  }
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    const t = perm[i] as number
    perm[i] = perm[j] as number
    perm[j] = t
  }
  for (let i = 0; i < N; i++) perm[i + N] = perm[i] as number
  const h = (x: number, y: number, P: number) => {
    const xi = ((x % P) + P) % P & 255
    return vals[perm[(perm[xi] as number) + (y & 255)] as number] as number
  }
  const sm = (t: number) => t * t * (3 - 2 * t)
  /** ruído de valor 2D em [0,1], periódico em x com período `period` */
  const n2 = (x: number, y: number, p = period) => {
    const P = Math.max(1, Math.round(p))
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = sm(x - xi)
    const fy = sm(y - yi)
    const a = h(xi, yi, P)
    const b = h(xi + 1, yi, P)
    const c = h(xi, yi + 1, P)
    const d = h(xi + 1, yi + 1, P)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
  }
  /** fbm periódico: com `p`, o período em x (em unidades de lattice) dobra a cada oitava */
  const fbm = (x: number, y: number, oct = 4, p = period) => {
    let s = 0
    let a = 0.5
    let f = 1
    let n = 0
    for (let i = 0; i < oct; i++) {
      s += n2(x * f, y * f, p * f) * a
      n += a
      a *= 0.5
      f *= 2
    }
    return s / n
  }
  return { n2, fbm }
}

export const hash2 = (x: number, y: number) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** sombra (1 degrau mais escuro, com hue shift) de cada cor: usado no contorno seletivo */
export const DARKER: Record<K, K> = {
  void: 'void',
  night: 'void',
  dusk: 'night',
  hazeDark: 'dusk',
  haze: 'hazeDark',
  blood0: 'void',
  blood1: 'blood0',
  crimsonDeep: 'blood1',
  crimson: 'crimsonDeep',
  red: 'crimson',
  redHot: 'red',
  redGlow: 'redHot',
  emberDark: 'blood1',
  ember: 'emberDark',
  emberBright: 'ember',
  gold0: 'blood0',
  gold1: 'gold0',
  gold: 'gold1',
  goldHi: 'gold',
  sparkle: 'goldHi',
  white: 'sparkle',
  stone0: 'night',
  stone1: 'stone0',
  stone2: 'stone1',
  stone3: 'stone2',
  stoneHi: 'stone3',
  vine0: 'void',
  vine1: 'vine0',
  green: 'vine1',
  leafHi: 'green',
  blue0: 'night',
  blue1: 'blue0',
}

/** rampa de fogo por idade (regra 27) */
export const EMBER_AGE: K[] = ['white', 'goldHi', 'emberBright', 'ember', 'red', 'crimson', 'blood1']
export const GOLD_AGE: K[] = ['white', 'sparkle', 'goldHi', 'gold', 'gold1', 'gold0']
