// Fallback sem WebGL: o mesmo "13" desenhado em 2D com projeção oblíqua (frente de pedra rachada,
// laterais vermelhas, topo claro) e fitas de energia como elipses em pixel, metade de trás atrás da pedra.
import { mulberry32 } from '../lib/rng'
import type { Anchors } from './monument'
import { Buf, bayer, dith, HEX, type K } from './pal'
import { CENTER_X, D, MAX_RANK, PIECES, PITCH, RINGS, YAW } from './shape13'

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
    this.w = Math.ceil(14.8 * ppu)
    this.h = Math.ceil(11.4 * ppu)
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.w
    this.canvas.height = this.h
    const g = this.canvas.getContext('2d')
    if (!g) throw new Error('canvas 2d indisponível')
    this.g = g
    this.origin = { x: Math.round(this.w / 2), y: Math.round(this.h / 2 + 3.95 * ppu * Math.cos(PITCH)) }
  }

  /** mundo (unidades do 13) → pixel, projeção oblíqua parecida com a câmera 3D */
  private P(x: number, y: number, z: number) {
    const u = this.ppu
    const cx = Math.cos(YAW)
    const sx = Math.sin(YAW)
    const xr = (x - CENTER_X) * cx + z * sx
    const zr = -(x - CENTER_X) * sx + z * cx
    return { x: this.origin.x + xr * u, y: this.origin.y - y * u * Math.cos(PITCH) - zr * u * Math.sin(PITCH) * -1 }
  }

  setFlare(k: number) {
    this.flare = k
  }

  setProgress(p: number) {
    if (p === this.progress) return
    this.progress = p
    this.bake()
  }

  private bake() {
    const b = new Buf(this.w, this.h)
    const level = this.progress * MAX_RANK + 1e-6
    const r = mulberry32(9)
    // de trás para a frente: desenha a extrusão (vermelha) e depois a frente (pedra)
    const vis = PIECES.filter((p) => p.rank === 0 || p.rank <= level)
    const steps = Math.ceil(D * this.ppu * 0.6)
    for (const pc of vis) {
      for (let s = steps; s >= 0; s--) {
        const z = -D / 2 + (D * (steps - s)) / steps
        const a = this.P(pc.x0, pc.y1, z)
        const c = this.P(pc.x1, pc.y0, z)
        const top = s === steps
        for (let y = Math.round(a.y); y < Math.round(c.y); y++)
          for (let x = Math.round(a.x); x < Math.round(c.x); x++) {
            const k: K = y === Math.round(a.y) && !top ? 'stone3' : x === Math.round(c.x) - 1 ? (r() < 0.2 ? 'redHot' : 'red') : 'crimson'
            b.set(x, y, k)
          }
      }
      const a = this.P(pc.x0, pc.y1, D / 2)
      const c = this.P(pc.x1, pc.y0, D / 2)
      const x0 = Math.round(a.x)
      const y0 = Math.round(a.y)
      const x1 = Math.round(c.x)
      const y1 = Math.round(c.y)
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const cellX = Math.floor((x + Math.floor(y / 11) * 5) / 13)
          const cellY = Math.floor(y / 11)
          const tone = ((cellX * 73 + cellY * 151) % 17) / 17
          let k: K = tone < 0.2 ? 'stone2' : tone < 0.7 ? 'stone3' : 'stoneHi'
          if ((pc.paint ?? 0) > 0.5 && tone < 0.6) k = 'red'
          if ((x + Math.floor(y / 11) * 5) % 13 === 0 || y % 11 === 0) k = 'stone0'
          if (y === y0 || x === x0) k = 'stoneHi'
          if (y === y1 - 1) k = 'stone1'
          b.set(x, y, k)
        }
    }
    this.stone = b.canvas()
  }

  private ring(g: CanvasRenderingContext2D, i: number, front: boolean) {
    const spec = RINGS[i]
    if (!spec) return
    const head = this.head[i] ?? 0
    const N = 240
    for (let k = 0; k < N; k++) {
      const tt = k / N
      const s = (((head - tt) % 1) + 1) % 1 / spec.arc
      if (s > 1) continue
      const a = tt * Math.PI * 2
      const z = Math.sin(a) * spec.R
      if (z > 0 !== front) continue
      const x = Math.cos(a) * spec.R + CENTER_X
      const y = spec.y + Math.cos(a) * spec.tz * spec.R * 0.5
      const p = this.P(x, y, z)
      const w = Math.max(1, Math.round(spec.w * (1 - s) ** 0.6))
      for (let j = 0; j < w; j++) {
        const v = Math.abs(j - (w - 1) / 2) / Math.max(1, w / 2)
        const kk: K = s < 0.5 && v < 0.3 ? 'white' : s < 0.6 && v < 0.6 ? 'redGlow' : s < 0.8 ? 'redHot' : 'red'
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
    void dith
  }

  anchors(): Anchors {
    const level = this.progress * MAX_RANK + 1e-6
    let top = -1
    for (let i = 1; i <= 3; i++) {
      const pc = PIECES[i]
      if (pc && (pc.rank === 0 || pc.rank <= level) && pc.y1 > top) top = pc.y1
    }
    const flag = top > 0 ? this.P(1.75, top, 0) : null
    const crown = this.P(7.1, 9.55, 0)
    const heads = RINGS.map((spec, i) => {
      const a = (this.head[i] ?? 0) * Math.PI * 2
      const p = this.P(Math.cos(a) * spec.R + CENTER_X, spec.y, Math.sin(a) * spec.R)
      return { x: p.x, y: p.y, front: Math.sin(a) > 0, dx: -Math.sin(a), dy: 0 }
    })
    const edges = PIECES.filter((p) => p.rank === 0 || p.rank <= level).map((p) => this.P(p.x1, p.y1, D / 2))
    return { flag, crown, heads, edges }
  }

  dispose() {
    this.stone = null
  }
}
