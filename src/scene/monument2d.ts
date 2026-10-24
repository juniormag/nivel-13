// Fallback sem WebGL: o mesmo "13" (lajes poligonais, dígitos em três quartos) desenhado em 2D com
// projeção ortográfica girada: extrusão vermelha atrás, frente de pedra com rede de rachaduras,
// fitas de energia como elipses em pixel, metade de trás atrás da pedra.
import { mulberry32 } from '../lib/rng'
import type { Anchors } from './monument'
import { Buf, bayer, HEX, type K } from './pal'
import {
  CANVAS_U,
  CROWN_AT,
  D,
  digitToGroup,
  FLAG_AT,
  FLAG_PIECE,
  inside,
  MAX_RANK,
  PIECES,
  type Pt,
  RINGS,
  TARGET_Y,
  YAW,
} from './shape13'

/** quanto o fundo das lajes desce na tela (câmera baixa vendo a face de baixo) */
const UNDER = 0.1

export class Monument2D {
  readonly canvas: HTMLCanvasElement
  readonly w: number
  readonly h: number
  origin = { x: 0, y: 0 }
  onLand?: (x: number, y: number) => void
  private g: CanvasRenderingContext2D
  private ppu: number
  private stone: HTMLCanvasElement | null = null
  private progress = -1
  private flare = 0
  private head: number[] = RINGS.map((r) => r.ph)

  constructor(ppu: number) {
    this.ppu = ppu
    this.w = Math.ceil(CANVAS_U.w * ppu)
    this.h = Math.ceil(CANVAS_U.h * ppu)
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.w
    this.canvas.height = this.h
    const g = this.canvas.getContext('2d')
    if (!g) throw new Error('canvas 2d indisponível')
    this.g = g
    this.origin = { x: Math.round(this.w / 2), y: Math.round(this.h / 2 + TARGET_Y * ppu) }
  }

  /** ponto do grupo (já fora do dígito) → pixel e profundidade (maior = mais perto) */
  private G(x: number, y: number, z: number) {
    const u = this.ppu
    const c = Math.cos(YAW)
    const s = Math.sin(YAW)
    const xr = x * c + z * s
    const zr = -x * s + z * c
    return { x: this.origin.x + xr * u, y: this.origin.y - y * u - zr * u * UNDER, z: zr }
  }

  private P(dig: number, x: number, y: number, z: number) {
    const [gx, gy, gz] = digitToGroup(dig, x, y, z)
    return this.G(gx, gy, gz)
  }

  setFlare(k: number) {
    this.flare = k
  }

  setProgress(p: number) {
    if (p === this.progress) return
    this.progress = p
    this.bake()
  }

  private fillPoly(pts: { x: number; y: number }[], paint: (x: number, y: number) => void) {
    const poly: Pt[] = pts.map((p) => [p.x, p.y])
    const xs = poly.map((p) => p[0])
    const ys = poly.map((p) => p[1])
    const x0 = Math.floor(Math.min(...xs))
    const x1 = Math.ceil(Math.max(...xs))
    const y0 = Math.floor(Math.min(...ys))
    const y1 = Math.ceil(Math.max(...ys))
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) if (inside(poly, x + 0.5, y + 0.5)) paint(x, y)
  }

  private bake() {
    const b = new Buf(this.w, this.h)
    const level = this.progress * MAX_RANK + 1e-6
    const r = mulberry32(9)
    // pontos de Voronoi para as placas da frente (~1,3 unidade)
    const cell = Math.max(6, Math.round(this.ppu * 1.3))
    const gw = Math.ceil(this.w / cell) + 2
    const gh = Math.ceil(this.h / cell) + 2
    const pts: [number, number, number][] = []
    for (let j = 0; j < gh; j++)
      for (let i = 0; i < gw; i++)
        pts.push([(i - 1 + 0.15 + r() * 0.7) * cell, (j - 1 + 0.15 + r() * 0.7) * cell, r()])
    const plate = (x: number, y: number) => {
      const ci = Math.floor(x / cell) + 1
      const cj = Math.floor(y / cell) + 1
      let best = 1e9
      let bi = 0
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const k = (cj + dj) * gw + ci + di
          const p = pts[k]
          if (!p) continue
          const dd = (x - p[0]) ** 2 + ((y - p[1]) * 1.2) ** 2
          if (dd < best) {
            best = dd
            bi = k
          }
        }
      return bi
    }
    // de trás para a frente (o 1 fica atrás do 3)
    const vis = PIECES.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.rank === 0 || p.rank <= level)
      .sort(
        (a, c) =>
          this.P(a.p.digit, (a.p.x0 + a.p.x1) / 2, 0, 0).z - this.P(c.p.digit, (c.p.x0 + c.p.x1) / 2, 0, 0).z,
      )
    const steps = Math.ceil(D * this.ppu * 0.7)
    for (const { p: pc } of vis) {
      for (let s = 0; s <= steps; s++) {
        const z = -D / 2 + (D * s) / steps
        const last = s === steps
        const poly = pc.pts.map(([x, y]) => this.P(pc.digit, x, y, z))
        if (!last) {
          const shade = s / steps
          this.fillPoly(poly, (x, y) => {
            const k: K =
              shade < 0.25
                ? 'blood1'
                : bayer(x, y) < 0.06
                  ? 'redGlow'
                  : shade < 0.6
                    ? 'crimsonDeep'
                    : 'crimson'
            b.set(x, y, k)
          })
          continue
        }
        const paint = pc.paint ?? 0
        this.fillPoly(poly, (x, y) => {
          const id = plate(x, y)
          const tone = pts[id]?.[2] ?? 0.5
          let k: K = tone < 0.18 ? 'stone2' : tone < 0.8 ? 'stone3' : 'stoneHi'
          if (paint > 0 && tone < paint * 0.6 && y > this.origin.y - 2.5 * this.ppu)
            k = tone < 0.1 ? 'crimson' : 'red'
          if (plate(x + 1, y) !== id || plate(x, y + 1) !== id) k = 'stone0'
          else if (plate(x, y - 1) !== id) k = 'stoneHi'
          b.set(x, y, k)
        })
        // bordas da laje: lábio claro em cima, escuro embaixo
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i] as { x: number; y: number }
          const c = poly[(i + 1) % poly.length] as { x: number; y: number }
          const top = c.x < a.x
          b.line(
            Math.round(a.x),
            Math.round(a.y),
            Math.round(c.x),
            Math.round(c.y),
            top ? 'stoneHi' : 'stone1',
          )
        }
      }
    }
    // rim red-hot do lado direito da silhueta
    const src = b.d.slice()
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w - 1; x++)
        if (src[y * b.w + x] && !src[y * b.w + x + 1]) b.set(x, y, r() < 0.3 ? 'redGlow' : 'redHot')
    this.stone = b.canvas()
  }

  private ring(g: CanvasRenderingContext2D, i: number, front: boolean) {
    const spec = RINGS[i]
    if (!spec) return
    const head = this.head[i] ?? 0
    const N = Math.ceil(Math.PI * 2 * spec.R * this.ppu * 1.6)
    for (let k = 0; k < N; k++) {
      const tt = k / N
      const s = ((((head - tt) % 1) + 1) % 1) / spec.arc
      if (s > 1) continue
      const a = tt * Math.PI * 2
      const z = Math.sin(a) * spec.R
      if (z > 0 !== front) continue
      const x = Math.cos(a) * spec.R + spec.x
      const y = spec.y + Math.cos(a) * spec.tz * spec.R - Math.sin(a) * spec.tx * spec.R * 0.5
      const p = this.G(x, y, z)
      const w = Math.max(1, Math.round(spec.w * (1 - s) ** 0.6))
      for (let j = 0; j < w; j++) {
        const v = Math.abs(j - (w - 1) / 2) / Math.max(1, w / 2)
        const kk: K =
          s < 0.5 && v < 0.3 ? 'white' : s < 0.6 && v < 0.6 ? 'redGlow' : s < 0.8 ? 'redHot' : 'red'
        if (s > 0.8 && bayer(Math.round(p.x), Math.round(p.y) + j) < (s - 0.8) * 5) continue
        g.fillStyle = HEX[kk]
        g.fillRect(Math.round(p.x), Math.round(p.y - (w - 1) / 2 + j), 1, 1)
      }
    }
  }

  render(t: number) {
    const g = this.g
    if (!this.stone) this.bake()
    this.head = RINGS.map((r) => r.ph + t * r.speed * (1 + this.flare * 0.8))
    g.clearRect(0, 0, this.w, this.h)
    for (let i = 0; i < RINGS.length; i++) this.ring(g, i, false)
    if (this.stone) g.drawImage(this.stone, 0, 0)
    for (let i = 0; i < RINGS.length; i++) this.ring(g, i, true)
  }

  anchors(): Anchors {
    const level = this.progress * MAX_RANK + 1e-6
    const fp = PIECES[FLAG_PIECE]
    const flag = fp && (fp.rank === 0 || fp.rank <= level) ? this.P(0, FLAG_AT.x, FLAG_AT.y, FLAG_AT.z) : null
    const crown = this.P(1, CROWN_AT.x, CROWN_AT.y, CROWN_AT.z)
    const heads = RINGS.map((spec, i) => {
      const a = (this.head[i] ?? 0) * Math.PI * 2
      const p = this.G(Math.cos(a) * spec.R + spec.x, spec.y, Math.sin(a) * spec.R)
      return { x: p.x, y: p.y, front: Math.sin(a) > 0, dx: -Math.sin(a), dy: 0 }
    })
    const edges = PIECES.filter((p) => p.rank === 0 || p.rank <= level).map((p) =>
      this.P(p.digit, p.x1, p.y1, D / 2),
    )
    return { flag, crown, heads, edges }
  }

  dispose() {
    this.stone = null
  }
}
