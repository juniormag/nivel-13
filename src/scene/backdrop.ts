// Cenário do título, procedural e só com a paleta de 32 cores:
// céu noturno, lua em eclipse com coroa, duas camadas de nuvens vermelhas em sentidos opostos,
// Pão de Açúcar + Urca com bondinho, Corcovado com o Cristo iluminado e a estrada em zigue-zague,
// baía com reflexos e cidade, morro de pedra e mato onde o 13 se ergue, e primeiro plano.
// Cada camada é assada uma vez em canvas e desenhada com deslocamento inteiro (parallax).
import { mulberry32 } from '../lib/rng'
import { DEPTH, type Layout, layoutFor, PAD } from './layout'
import { Buf, bayer, clamp01, dith, HEX, type K, makeNoise, vgrad } from './pal'
import { christ, drawBird } from './props'

/** margem vertical das camadas (respiração da câmera) */
export const PY = 6

export interface Cam {
  x: number
  y: number
}

interface Lamp {
  x: number
  y: number
  k: K
  ph: number
  d: number
  sp: number
}
interface Streak {
  x: number
  y: number
  len: number
  ph: number
  k: K
}
interface Bird {
  x: number
  y: number
  v: number
  ph: number
}

const CLOUD_RAMP: K[] = ['emberBright', 'redGlow', 'redHot', 'red', 'crimson', 'crimsonDeep', 'blood1', 'blood0']

export interface Puff {
  x: number
  y: number
  r: number
  flat: number
}

export function bank(rnd: () => number, x0: number, x1: number, yb: number, hb: number, n: number): Puff[] {
  const out: Puff[] = []
  for (let i = 0; i < n; i++) {
    const f = (i + rnd() * 0.6) / n
    const env = Math.sin(Math.PI * Math.min(1, Math.max(0, f))) ** 0.7
    const r = hb * (0.22 + 0.38 * env * (0.6 + rnd() * 0.5))
    out.push({
      x: Math.round(x0 + f * (x1 - x0)),
      y: Math.round(yb - r * 0.35 - env * hb * 0.45 * rnd()),
      r,
      flat: 0.3 + rnd() * 0.25,
    })
  }
  return out
}

/** Nuvem cúmulo: cada sopro tem sua borda iluminada sobre o corpo do sopro de trás. */
export function cloudLayer(w: number, h: number, puffs: Puff[], lit: 'top' | 'bottom', dim: number, seed: number, stretch = 1.35) {
  const b = new Buf(w, h)
  const nz = makeNoise(seed)
  const order = puffs.slice().sort((a, c) => (lit === 'top' ? a.y - c.y : c.y - a.y))
  for (const p of order) {
    const rx = p.r * stretch
    const ry = p.r
    const ex = Math.ceil(rx * 1.2)
    const ey = Math.ceil(ry * 1.2)
    for (let oy = -ey; oy <= ey; oy++)
      for (let ox = -ex; ox <= ex; ox++) {
        const u = ox / rx
        const v = oy / ry
        if (lit === 'top' ? v > p.flat : v < -p.flat) continue
        const y = p.y + oy
        if (y < 0 || y >= h) continue
        const xx = (((p.x + ox) % w) + w) % w
        const e = 0.8 + nz.fbm(xx / 8, y / 6, 3, w / 8) * 0.4
        const d = Math.hypot(u, v)
        if (d > e) continue
        if (d > e - 0.12 && !dith(xx, y, 0.5)) continue
        let s = lit === 'top' ? v * 0.5 + 0.5 : 0.5 - v * 0.5
        s += u * 0.12 + (nz.n2(xx / 3, y / 3, w / 3) - 0.5) * 0.2
        const edge = (e - d) * ry
        const toLight = lit === 'top' ? v < 0.05 : v > -0.05
        let idx = dim + 2 + clamp01(s) * 5.5
        if (toLight && edge < 1.4 && Math.abs(u) < 0.9) idx = dim
        else if (toLight && edge < 2.6) idx = Math.min(idx, dim + 2)
        const i0 = Math.floor(idx)
        const k = CLOUD_RAMP[Math.min(CLOUD_RAMP.length - 1, dith(xx, y, idx - i0) ? i0 + 1 : i0)] ?? 'blood0'
        b.set(xx, y, k)
      }
  }
  return b
}

export function moonBuf(r: number, grow: number) {
  const cor = Math.ceil(r * 1.05 * grow) + 3
  const S = (r + cor) * 2
  const b = new Buf(S, S)
  const c = S / 2
  const k = r * 0.24
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c
      const dy = y + 0.5 - c
      const d = Math.hypot(dx, dy)
      const w = Math.cos(Math.atan2(dy, dx) - 0.35) // 1 = lado aceso (direita, um pouco abaixo)
      if (d < r) {
        const d2 = Math.hypot(dx + k, dy + k * 0.3)
        if (d2 >= r * 0.985 && w > -0.1) {
          // crescente incandescente
          const thick = clamp01((d2 - r * 0.985) / k)
          let col: K
          if (w > 0.9 && thick > 0.45) col = 'white'
          else if (w > 0.75 && thick > 0.3) col = 'sparkle'
          else if (w > 0.55) col = 'emberBright'
          else if (w > 0.3) col = 'redGlow'
          else if (w > 0.1) col = 'redHot'
          else col = 'red'
          if (r - d < 1 && w < 0.75) col = col === 'white' ? 'sparkle' : 'redHot'
          b.set(x, y, col)
        } else {
          // disco escuro com limbo AA de 1 tom
          b.set(x, y, r - d < 1 ? 'blood0' : 'void')
        }
        continue
      }
      const e = d - r
      const wt = 0.5 + 0.5 * Math.max(-0.2, w)
      if (e < 1) {
        b.set(x, y, w > -0.3 ? 'redHot' : 'crimson')
        continue
      }
      if (e < 2.6) {
        b.set(x, y, w > 0 ? 'red' : 'crimson')
        continue
      }
      const span = r * 1.05 * grow * (0.55 + 0.45 * wt)
      const t = 1 - (e - 2.6) / span
      if (t <= 0) continue
      const dens = t ** 1.4
      if (!dith(x, y, dens * 1.05)) continue
      b.set(x, y, dens > 0.62 ? 'crimson' : dens > 0.32 ? 'crimsonDeep' : 'blood1')
    }
  return b
}
const moonCanvas = (r: number, grow: number) => moonBuf(r, grow).canvas()

export class Backdrop {
  L!: Layout
  private sky!: HTMLCanvasElement
  private moonA!: HTMLCanvasElement
  private moonB!: HTMLCanvasElement
  private cloudsFar!: HTMLCanvasElement
  private cloudsNear!: HTMLCanvasElement
  private skyline!: HTMLCanvasElement
  private bay!: HTMLCanvasElement
  private hill!: HTMLCanvasElement
  private lip!: HTMLCanvasElement
  private front!: HTMLCanvasElement
  private stars: { x: number; y: number; k: K; ph: number; sp: number }[] = []
  private lamps: Lamp[] = []
  private streaks: Streak[] = []
  private birds: Bird[] = []
  private christ!: { c: HTMLCanvasElement; x: number; y: number }
  private cable = { x0: 0, y0: 0, x1: 0, y1: 0 }
  /** brilhos possíveis nas luzes da cidade (âncoras para o FX) */
  cityAnchors: { x: number; y: number }[] = []

  constructor(W: number, H: number) {
    this.build(W, H)
  }

  build(W: number, H: number) {
    const L = layoutFor(W, H)
    this.L = L
    const LW = W + PAD * 2
    const LH = H + PY * 2
    const X = (x: number) => x + PAD
    const Y = (y: number) => y + PY
    const hz = Y(L.horizon)
    const rnd = mulberry32(1313)
    const nz = makeNoise(7)
    this.lamps = []
    this.streaks = []
    this.cityAnchors = []

    // ---------- céu (0.0) ----------
    {
      const b = new Buf(LW, LH)
      b.fill('void')
      vgrad(b, 0, 0, LW, hz + 4, [
        [0, 'void'],
        [0.34, 'void'],
        [0.6, 'night'],
        [0.8, 'dusk'],
        [0.92, 'blood0'],
        [1, 'blood1'],
      ])
      const m = L.moon
      const nStars = Math.round((LW * hz) / 150)
      for (let i = 0; i < nStars; i++) {
        const x = Math.floor(rnd() * LW)
        const y = Math.floor(rnd() ** 1.5 * hz * 0.8)
        if (Math.hypot(x - X(m.x), y - Y(m.y)) < m.r * 2.3) continue
        b.set(x, y, rnd() < 0.7 ? 'stone0' : 'stone1')
      }
      this.sky = b.canvas()
      this.stars = []
      for (let i = 0; i < Math.round(W / 9); i++) {
        const x = Math.floor(rnd() * W)
        const y = Math.floor(rnd() ** 1.4 * L.horizon * 0.7)
        if (Math.hypot(x - m.x, y - m.y) < m.r * 2.4) continue
        const v = rnd()
        this.stars.push({
          x,
          y,
          k: v > 0.85 ? 'sparkle' : v > 0.5 ? 'stone3' : 'stone2',
          ph: rnd() * 6.28,
          sp: 0.6 + rnd() * 1.8,
        })
      }
    }

    // ---------- lua (0.02) ----------
    this.moonA = moonCanvas(L.moon.r, 1)
    this.moonB = moonCanvas(L.moon.r, 1.08)

    // ---------- nuvens: distante (0.06, à esquerda, acesas por baixo) e próxima (0.10, à direita, acesas por cima) ----------
    {
      const CW = Math.ceil((W * 1.6) / 24) * 24
      const r2 = mulberry32(51)
      const far: Puff[] = []
      const base = L.portrait ? hz - L.ppu * 1.7 : hz - H * 0.075
      for (let i = 0; i < 4; i++) {
        const x0 = (i / 4) * CW + r2() * CW * 0.08
        far.push(...bank(r2, x0, x0 + CW * (0.18 + r2() * 0.1), base - r2() * H * 0.04, H * 0.05, 7))
      }
      this.cloudsFar = cloudLayer(CW, LH, far.map((f) => ({ ...f, flat: 0.75 })), 'bottom', 2.6, 11, 3.2).canvas()

      const near: Puff[] = []
      if (L.portrait) {
        const yb = Y(L.moon.y + L.moon.r * 2.6)
        near.push(...bank(r2, -CW * 0.02, W * 0.42, yb + H * 0.02, H * 0.085, 14))
        near.push(...bank(r2, W * 0.62, W * 1.02, yb + H * 0.05, H * 0.07, 11))
        near.push(...bank(r2, W * 1.15, W * 1.5, yb, H * 0.08, 12))
      } else {
        near.push(...bank(r2, -W * 0.02, W * 0.4, Y(H * 0.5), H * 0.17, 20))
        near.push(...bank(r2, W * 0.22, W * 0.5, Y(H * 0.36), H * 0.06, 9))
        near.push(...bank(r2, W * 0.66, W * 0.98, Y(H * 0.47), H * 0.08, 12))
        near.push(...bank(r2, W * 1.1, W * 1.5, Y(H * 0.42), H * 0.11, 14))
      }
      this.cloudsNear = cloudLayer(CW, LH, near, 'top', 0, 23).canvas()
    }

    // ---------- skyline (0.18): serra, Pão de Açúcar, Urca, Corcovado ----------
    {
      const b = new Buf(LW, LH)
      // serra distante, com névoa
      const peaks = L.portrait
        ? [
            [0.32, 0.05],
            [0.58, 0.04],
            [0.72, 0.06],
          ]
        : [
            [0.04, 0.11],
            [0.09, 0.07],
            [0.33, 0.06],
            [0.42, 0.045],
            [0.6, 0.05],
          ]
      const farTop = (x: number) => {
        const fx = (x - PAD) / W
        let hgt = H * 0.018 + nz.fbm(x / 26, 0.5, 3) * H * 0.05
        for (const [px, ph] of peaks) hgt = Math.max(hgt, (ph ?? 0) * H * Math.max(0, 1 - Math.abs(fx - (px ?? 0)) / 0.07) ** 1.25)
        return Math.round(hz - hgt)
      }
      for (let x = 0; x < LW; x++) {
        const top = farTop(x)
        const rising = farTop(x + 1) < top
        for (let y = top; y <= hz; y++) {
          const dy = y - top
          const fog = clamp01((y - (hz - H * 0.05)) / (H * 0.05))
          let k: K = dy === 0 ? 'haze' : rising && dy < 3 ? 'haze' : 'hazeDark'
          if (k === 'hazeDark' && dith(x, y, fog * 0.6)) k = 'haze'
          b.set(x, y, k)
        }
      }
      // Pão de Açúcar + Urca + Babilônia
      const sx = X(L.sugar.x)
      const sh = L.sugar.h
      const sw = sh * 0.52
      const sugarTop = (x: number) => {
        let hgt = 0
        const u = (x - sx) / sw
        if (u > -1 && u < 1)
          hgt = u < 0 ? sh * Math.max(0, 1 - (-u) ** 1.9) ** 0.6 : sh * Math.max(0, 1 - u ** 2.4) ** 0.5
        const ux = (x - (sx + sw * 1.75)) / (sw * 0.95)
        if (ux > -1 && ux < 1) hgt = Math.max(hgt, sh * 0.42 * Math.max(0, 1 - ux * ux) ** 0.7)
        const ub = (x - (sx - sw * 1.9)) / (sw * 1.3)
        if (ub > -1 && ub < 1) hgt = Math.max(hgt, sh * 0.28 * Math.max(0, 1 - ub * ub) ** 0.9 * (0.8 + nz.n2(x / 5, 3) * 0.4))
        return hgt > 0.5 ? Math.round(hz - hgt) : hz + 1
      }
      for (let x = 0; x < LW; x++) {
        const top = sugarTop(x)
        if (top > hz) continue
        const l = sugarTop(x - 1)
        const r = sugarTop(x + 1)
        for (let y = top; y <= hz + 1; y++) {
          const dy = y - top
          let k: K = 'night'
          if (nz.n2(x / 1.6, y / 12) > 0.64) k = 'dusk'
          const leftLit = l > y || (r < top && dy < 3)
          if (leftLit) k = dy < 1 ? 'haze' : 'hazeDark'
          else if (dy === 0) k = r > y ? 'blood1' : 'hazeDark'
          if (y > hz - sh * 0.22 && dith(x, y, ((y - (hz - sh * 0.22)) / (sh * 0.22)) * 0.55)) k = 'hazeDark'
          b.set(x, y, k)
        }
      }
      this.cable = { x0: sx + sw * 1.75, y0: sugarTop(Math.round(sx + sw * 1.75)), x1: sx + 1, y1: sugarTop(Math.round(sx)) }
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        const x = this.cable.x0 + (this.cable.x1 - this.cable.x0) * t
        const y = this.cable.y0 + (this.cable.y1 - this.cable.y0) * t + Math.sin(t * Math.PI) * 2
        if (i % 2 === 0) b.set(x, y, 'stone0')
      }

      // Corcovado
      const cx = X(L.corc.x)
      const peak = Y(L.corc.peak)
      const half = L.corc.half
      const humps: [number, number, number][] = [
        [0, 1, half * 0.55],
        [-half * 0.75, 0.62, half * 0.6],
        [-half * 1.35, 0.3, half * 0.55],
        [half * 0.7, 0.72, half * 0.55],
        [half * 1.4, 0.5, half * 0.7],
      ]
      const cTop = (x: number) => {
        const H0 = hz + 2 - peak
        let hgt = 0
        for (const [dx, hh, w] of humps) {
          const u = (x - cx - dx) / w
          if (u > -1.6 && u < 1.6) hgt = Math.max(hgt, H0 * hh * Math.max(0, 1 - (u / 1.6) ** 2) ** 0.85)
        }
        if (hgt <= 0) return hz + 2
        hgt += (nz.fbm(x / 8, 9, 3) - 0.5) * 5 * Math.min(1, Math.abs(x - cx) / half)
        return Math.round(hz + 2 - hgt)
      }
      const mh = hz - peak
      for (let x = Math.max(0, Math.floor(cx - half * 2.4)); x < LW; x++) {
        const top = cTop(x)
        if (top > hz) continue
        const left = x < cx
        for (let y = top; y <= hz + 2; y++) {
          const dy = y - top
          const n = nz.fbm(x / 9, y / 9, 3)
          const gully = nz.n2((x + y * 0.55) / 2.5, y / 10) > 0.68
          const litF = clamp01((cx - x) / (half * 0.6) + 0.35)
          let v = 0.22 + litF * 0.3 + (n - 0.5) * 0.6 - (dy / mh) * 0.4
          if (gully) v -= 0.25
          let k: K = v > 0.62 ? (dith(x, y, 0.5) ? 'emberDark' : 'blood1') : v > 0.4 ? 'blood1' : v > 0.18 ? 'blood0' : 'night'
          if (dy === 0) k = left ? 'crimsonDeep' : 'blood1'
          // mata no pé e no topo
          const veg = y > peak + mh * 0.5 && nz.n2(x / 4, y / 4) > 0.7
          if (veg && dy > 1 && dith(x, y, 0.5)) k = 'vine0'
          // holofotes no cume
          const sd = Math.hypot(x - cx, (y - peak) * 1.3)
          if (sd < 5 && dith(x, y, (1 - sd / 5) * 0.6)) k = sd < 2.5 ? 'gold1' : 'gold0'
          b.set(x, y, k)
        }
      }
      // favela e bairros acesos na encosta baixa
      for (let i = 0; i < W * 0.7; i++) {
        const x = Math.round(cx - half * 1.6 + rnd() * half * 3)
        const y = Math.round(hz - rnd() * mh * 0.28)
        if (x < 0 || x >= LW || y < cTop(x) + 3) continue
        if (nz.n2(x / 5, y / 5) < 0.5) continue
        const v = rnd()
        b.set(x, y, v > 0.85 ? 'goldHi' : v > 0.55 ? 'gold' : v > 0.25 ? 'ember' : 'emberDark')
      }
      // estrada em zigue-zague, iluminada: desce pela face esquerda abrindo as curvas
      {
        const y0 = peak + 5
        const y1 = hz - 2
        const n = Math.round((y1 - y0) * 9)
        let lastX = -1
        let lastY = -1
        let dist = 0
        for (let i = 0; i <= n; i++) {
          const v = i / n
          const tri = 1 - 2 * Math.abs(((v * 5.5 + 0.25) % 1) * 2 - 1)
          const amp = 2 + v * half * 0.32
          const px = Math.round(cx - 1 - v * half * 0.9 + tri * amp)
          let py = Math.round(y0 + v * (y1 - y0))
          const lim = cTop(px) + 2
          if (py < lim) py = lim
          if (px === lastX && py === lastY) continue
          dist += 1
          lastX = px
          lastY = py
          b.set(px, py, 'gold0')
          if (dist % 2 === 0) {
            const r0 = rnd()
            this.lamps.push({
              x: px - PAD,
              y: py - PY,
              k: r0 > 0.7 ? 'goldHi' : r0 > 0.3 ? 'gold' : 'emberBright',
              ph: rnd() * 6.28,
              d: DEPTH.skyline,
              sp: 1 + rnd() * 2,
            })
          }
        }
      }
      const ch = Math.max(11, Math.round(L.ppu * 0.95))
      const cr = christ(ch)
      this.christ = { c: cr.c, x: cx - PAD - cr.ax, y: peak - PY - cr.ay + 1 }
      this.skyline = b.canvas()
    }

    // ---------- baía e cidade (0.30) ----------
    {
      const b = new Buf(LW, LH)
      const wb = Y(L.waterBottom)
      const cx = X(L.corc.x)
      const waterRight = (y: number) => cx - L.corc.half * (L.portrait ? 1.3 : 1.45) - (y - hz) * 0.9
      for (let y = hz + 1; y < wb; y++) {
        const t = (y - hz) / (wb - hz)
        const xr = waterRight(y)
        for (let x = 0; x < LW; x++) {
          if (x > xr) continue
          const s = nz.n2(x / 13, y * 0.85)
          let k: K = t < 0.4 ? (dith(x, y, 0.35 - t) ? 'dusk' : 'night') : 'void'
          if (t < 0.09) k = s > 0.55 ? 'ember' : s > 0.38 ? 'emberDark' : 'blood1'
          else if (t < 0.28) k = s > 0.72 ? 'emberDark' : s > 0.55 ? 'blood1' : k
          else if (t < 0.62) k = s > 0.78 ? 'crimsonDeep' : s > 0.66 ? 'blood1' : k
          else if (s > 0.8) k = 'blue0'
          b.set(x, y, k)
        }
      }
      // luzes da orla do outro lado (faixa na linha do horizonte)
      for (let x = 0; x < LW; x++) {
        if (rnd() < 0.5) {
          const v = rnd()
          const k: K = v > 0.9 ? 'sparkle' : v > 0.7 ? 'goldHi' : v > 0.4 ? 'gold' : v > 0.15 ? 'ember' : 'emberDark'
          const y = hz - Math.floor(rnd() * 3)
          b.set(x, y, k)
          if (v > 0.55 && x % 5 === 0 && x < waterRight(hz + 2)) {
            this.streaks.push({ x: x - PAD, y: hz + 1 - PY, len: 5 + Math.floor(rnd() * 14), ph: rnd() * 6.28, k })
          }
          if (v > 0.82 && rnd() < 0.35)
            this.lamps.push({ x: x - PAD, y: y - PY, k, ph: rnd() * 6.28, d: DEPTH.bay, sp: 1.5 + rnd() * 2 })
        }
      }
      // reflexo vermelho da lua na água
      const mx = X(L.moon.x)
      if (mx < waterRight(hz + 4)) this.streaks.push({ x: mx - PAD, y: hz + 3 - PY, len: Math.round((wb - hz) * 0.7), ph: 0, k: 'crimson' })
      // praia curva + calçadão aceso
      const shore = (x: number) => Math.round(wb - 1 - (L.portrait ? 0.03 : 0.06) * H * (1 - Math.min(1, x / (waterRight(wb) + 1))) ** 1.6)
      for (let x = 0; x < LW; x++) {
        if (x > waterRight(wb)) break
        const sy = shore(x)
        b.rect(x, sy, 1, LH - sy, 'void')
        b.set(x, sy, 'emberDark')
        b.set(x, sy + 1, 'blood1')
        if (x % 3 === 0) {
          const k: K = x % 9 === 0 ? 'sparkle' : x % 6 === 0 ? 'goldHi' : 'gold'
          b.set(x, sy + 2, k)
          this.cityAnchors.push({ x: x - PAD, y: sy + 2 - PY })
        }
      }
      // prédios: cidade baixa à esquerda (paisagem) e bairros sob o Corcovado
      const city = (x0: number, x1: number, yBase: (x: number) => number, hMin: number, hMax: number, back: boolean) => {
        let x = x0
        while (x < x1) {
          const w = 3 + Math.floor(rnd() * 6)
          const hh = Math.round(hMin + rnd() ** 1.6 * (hMax - hMin))
          const yb = yBase(x)
          const top = yb - hh
          for (let xx = x; xx < Math.min(x1, x + w); xx++)
            for (let y = top; y < yb; y++) {
              let k: K = back ? 'dusk' : 'night'
              if (y === top) k = back ? 'hazeDark' : 'dusk'
              else if (xx === x) k = back ? 'hazeDark' : 'dusk'
              b.set(xx, y, k)
            }
          for (let wy = top + 2; wy < yb - 1; wy += 2)
            for (let wx = x + 1; wx < Math.min(x1, x + w) - 1; wx += 2) {
              if (rnd() < (back ? 0.3 : 0.38)) {
                const v = rnd()
                b.set(wx, wy, v > 0.92 ? 'sparkle' : v > 0.7 ? 'goldHi' : v > 0.4 ? 'gold' : v > 0.15 ? 'ember' : 'emberDark')
                if (v > 0.9) this.cityAnchors.push({ x: wx - PAD, y: wy - PY })
              } else b.set(wx, wy, back ? 'night' : 'void')
            }
          x += w + (rnd() < 0.3 ? 1 : 0)
        }
      }
      const right0 = Math.floor(waterRight(hz + 2))
      city(right0 - 6, LW, (x) => hz + 3 + Math.round((x - right0) * 0.08), 3, H * 0.05, true)
      city(Math.floor(waterRight(wb)) - 4, LW, (x) => wb + Math.round((x - waterRight(wb)) * 0.12), H * 0.04, H * 0.11, false)
      if (!L.portrait) {
        city(0, Math.round(W * 0.3), () => LH, H * 0.06, H * 0.2, false)
      } else {
        city(0, Math.round(W * 0.22), () => LH, H * 0.03, H * 0.09, false)
      }
      this.bay = b.canvas()
    }

    // ---------- morro, pedras e mato (1.0) + borda da frente (lip) + primeiro plano (1.25) ----------
    {
      const hill = new Buf(LW, LH)
      const lip = new Buf(LW, LH)
      const front = new Buf(LW, LH)
      const bx = X(L.base.x)
      const by = Y(L.base.y)
      const u = L.ppu
      const plateau = u * (L.portrait ? 5.0 : 5.4)
      const slope = L.portrait ? 0.42 : 0.62
      const top = (x: number) => {
        const d = Math.abs(x - bx)
        return Math.round(by - u * 0.3 + Math.max(0, d - plateau) * slope + (nz.fbm(x / 7, 40, 3) - 0.5) * u * 0.5)
      }
      const glow = { x: bx, y: by - u * 1.6, r: u * 7 }
      for (let x = 0; x < LW; x++) {
        const t0 = top(x)
        for (let y = Math.max(0, t0); y < LH; y++) {
          const n = nz.n2(x / 3, y / 3)
          let k: K = n > 0.72 ? 'night' : 'void'
          const gd = Math.hypot((x - glow.x) * 0.8, (y - by) * 1.6) / glow.r
          if (gd < 0.8) k = gd < 0.35 ? 'blood1' : dith(x, y, (0.8 - gd) * 2.5) ? 'blood0' : k
          hill.set(x, y, k)
        }
      }
      const rocks: { x: number; y: number; rx: number; ry: number; fade: number; seed: number; lip: boolean }[] = []
      let x = -u
      while (x < LW + u) {
        const rx = u * (0.55 + rnd() * 0.7) * (L.portrait ? 0.9 : 1)
        const ry = rx * (0.6 + rnd() * 0.25)
        const d = Math.abs(x - bx)
        const isLip = d < plateau * 0.95 && rnd() < 0.35
        rocks.push({ x, y: top(x) + ry * 0.45, rx, ry, fade: 0, seed: Math.floor(rnd() * 1e6), lip: isLip && d > u * 0.6 })
        x += rx * (1.1 + rnd() * 0.5)
      }
      const rows = L.portrait ? 6 : 3
      for (let row = 1; row <= rows; row++) {
        let xx = -u + rnd() * u
        while (xx < LW + u) {
          const rx = u * (0.6 + rnd() * 0.9)
          const ry = rx * 0.65
          const yy = top(xx) + row * u * 1.05 + rnd() * u * 0.4
          if (yy < LH + ry) rocks.push({ x: xx, y: yy, rx, ry, fade: Math.min(0.82, 0.25 + row * 0.12), seed: Math.floor(rnd() * 1e6), lip: false })
          xx += rx * (1.5 + rnd() * 1.2)
        }
      }
      for (const r of rocks) {
        const dist = Math.hypot((r.x - bx) / 1.3, r.y - by) / (u * 9)
        r.fade = Math.min(0.8, Math.max(r.fade, (dist - 0.45) * 0.9))
      }
      rocks.sort((a, c) => a.y - c.y)
      for (const r of rocks) {
        if (r.lip) continue
        drawRock(hill, r.x, r.y, r.rx, r.ry, r.seed, r.fade, glow)
        if (rnd() < 0.55) drawBush(hill, r.x + (rnd() - 0.5) * r.rx * 1.6, r.y - r.ry * 0.5, u * (0.35 + rnd() * 0.45), Math.floor(rnd() * 1e6), r.fade, glow)
      }
      // borda da frente: pedras e moitas que tocam a base do monumento
      const lipSpots = [-4.6, -2.9, -0.4, 1.6, 3.6, 5.1]
      for (const s of lipSpots) {
        const lx = bx + s * u + (rnd() - 0.5) * u * 0.6
        const ly = by + u * (0.35 + rnd() * 0.25)
        if (rnd() < 0.5) drawRock(lip, lx, ly + u * 0.2, u * (0.45 + rnd() * 0.3), u * 0.35, Math.floor(rnd() * 1e6), 0, glow)
        drawBush(lip, lx + u * 0.4, ly, u * (0.35 + rnd() * 0.35), Math.floor(rnd() * 1e6), 0, glow)
      }
      for (const r of rocks) if (r.lip) drawRock(lip, r.x, r.y + u * 0.3, r.rx * 0.8, r.ry * 0.8, r.seed, 0, glow)

      // primeiro plano: silhuetas escuras nos cantos com borda de folhas
      const corner = (cx0: number, dir: number, hgt: number) => {
        for (let i = 0; i < 9; i++) {
          const lx = cx0 + dir * rnd() * W * 0.16
          const ly = LH - rnd() * hgt
          const r = u * (0.5 + rnd() * 0.8)
          drawBush(front, lx, ly, r, Math.floor(rnd() * 1e6), 0.85, null)
        }
      }
      const fh = L.portrait ? H * 0.07 : H * 0.12
      corner(0, 1, fh)
      corner(LW, -1, fh)
      this.hill = hill.canvas()
      this.lip = lip.canvas()
      this.front = front.canvas()
    }

    // gaivotas
    this.birds = Array.from({ length: L.portrait ? 4 : 6 }, (_, i) => ({
      x: rnd() * W,
      y: L.horizon * (0.25 + rnd() * 0.45),
      v: (2.5 + rnd() * 3) * (i % 3 === 0 ? -1 : 1),
      ph: rnd() * 10,
    }))
  }

  private lay(g: CanvasRenderingContext2D, c: HTMLCanvasElement, d: number, cam: Cam, dx = 0) {
    g.drawImage(c, Math.round(dx - PAD - cam.x * d), Math.round(-PY - cam.y * d))
  }

  /** tudo que fica atrás do monumento */
  drawBack(g: CanvasRenderingContext2D, t: number, cam: Cam) {
    const L = this.L
    g.fillStyle = HEX.void
    g.fillRect(0, 0, L.W, L.H)
    this.lay(g, this.sky, DEPTH.sky, cam)
    for (const s of this.stars) {
      const tw = Math.sin(t * s.sp + s.ph)
      if (tw < -0.3) continue
      g.fillStyle = HEX[tw > 0.6 ? s.k : 'stone1']
      g.fillRect(s.x, s.y, 1, 1)
      if (s.k === 'sparkle' && tw > 0.93) {
        g.fillStyle = HEX.stone2
        g.fillRect(s.x - 1, s.y, 1, 1)
        g.fillRect(s.x + 1, s.y, 1, 1)
        g.fillRect(s.x, s.y - 1, 1, 1)
        g.fillRect(s.x, s.y + 1, 1, 1)
      }
    }
    // lua: pulso de ±1 px na coroa a cada 4 s
    const m = Math.sin((t * Math.PI * 2) / 4) > 0 ? this.moonB : this.moonA
    g.drawImage(
      m,
      Math.round(L.moon.x - m.width / 2 - cam.x * DEPTH.moon),
      Math.round(L.moon.y - m.height / 2 - cam.y * DEPTH.moon),
    )
    // nuvens distantes: derivam para a esquerda
    this.wrap(g, this.cloudsFar, DEPTH.cloudsFar, cam, -t * 0.7)
    // gaivotas a 8 fps
    const f8 = Math.floor(t * 8)
    for (const b of this.birds) {
      const span = L.W + 20
      const bx = (((b.x + t * b.v) % span) + span) % span - 10
      const by = b.y + Math.round(Math.sin(t * 0.7 + b.ph) * 2)
      drawBird(g, Math.round(bx - cam.x * 0.08), Math.round(by), (f8 + Math.floor(b.ph)) % 3, b.v < 0 ? 'stone2' : 'stone3')
    }
    this.wrap(g, this.cloudsNear, DEPTH.cloudsNear, cam, t * 0.45)
    this.lay(g, this.skyline, DEPTH.skyline, cam)
    // Cristo
    g.drawImage(
      this.christ.c,
      Math.round(this.christ.x - cam.x * DEPTH.skyline),
      Math.round(this.christ.y - cam.y * DEPTH.skyline),
    )
    // bondinho indo e voltando
    {
      const c = this.cable
      const s = 0.5 - 0.5 * Math.cos(t * 0.12)
      const x = c.x0 + (c.x1 - c.x0) * s - PAD - cam.x * DEPTH.skyline
      const y = c.y0 + (c.y1 - c.y0) * s + Math.sin(s * Math.PI) * 2 - PY - cam.y * DEPTH.skyline
      g.fillStyle = HEX.goldHi
      g.fillRect(Math.round(x), Math.round(y) + 1, 2, 1)
      g.fillStyle = HEX.gold1
      g.fillRect(Math.round(x), Math.round(y) + 2, 2, 1)
    }
    this.lay(g, this.bay, DEPTH.bay, cam)
    // reflexos tremulando
    const ox = -cam.x * DEPTH.bay
    const oy = -cam.y * DEPTH.bay
    const f6 = Math.floor(t * 6)
    for (const s of this.streaks) {
      for (let k = 0; k < s.len; k++) {
        if ((k + f6 + Math.floor(s.ph * 3)) % 3 === 0) continue
        const fall = k / s.len
        if (fall > 0.5 && bayer(k, f6) < fall - 0.3) continue
        const jit = Math.sin(t * 2.6 + k * 0.9 + s.ph) > 0.55 ? 1 : 0
        const kk: K =
          s.k === 'crimson'
            ? fall < 0.3
              ? 'red'
              : fall < 0.6
                ? 'crimson'
                : 'crimsonDeep'
            : fall < 0.15
              ? s.k
              : fall < 0.4
                ? 'ember'
                : fall < 0.7
                  ? 'emberDark'
                  : 'blood1'
        g.fillStyle = HEX[kk]
        g.fillRect(Math.round(s.x + ox + jit), Math.round(s.y + oy + k), s.k === 'crimson' && fall < 0.5 ? 2 : 1, 1)
      }
    }
    // luzes piscando (estrada do Corcovado, orla)
    for (const l of this.lamps) {
      const tw = Math.sin(t * l.sp + l.ph)
      g.fillStyle = HEX[tw > 0.2 ? l.k : tw > -0.5 ? 'gold1' : 'gold0']
      g.fillRect(Math.round(l.x - cam.x * l.d), Math.round(l.y - cam.y * l.d), 1, 1)
    }
    this.lay(g, this.hill, DEPTH.hill, cam)
  }

  /** o que fica na frente da base do monumento */
  drawFront(g: CanvasRenderingContext2D, cam: Cam) {
    this.lay(g, this.lip, DEPTH.hill, cam)
    this.lay(g, this.front, DEPTH.front, cam)
  }

  private wrap(g: CanvasRenderingContext2D, c: HTMLCanvasElement, d: number, cam: Cam, drift: number) {
    const w = c.width
    let x = Math.round(drift - PAD - cam.x * d) % w
    if (x > 0) x -= w
    const y = Math.round(-PY - cam.y * d)
    for (; x < this.L.W; x += w) g.drawImage(c, x, y)
  }
}

type Glow = { x: number; y: number; r: number } | null

/** Pedra facetada: luz de cima-esquerda (lua), borda vermelha do lado dos anéis, contorno seletivo. */
export function drawRock(b: Buf, cx: number, cy: number, rx: number, ry: number, seed: number, fade: number, glow: Glow) {
  const r = mulberry32(seed)
  const a1 = r() * 6.28
  const a2 = r() * 6.28
  const a3 = r() * 6.28
  const facets = 5 + Math.floor(r() * 3)
  const fj = r() * 6.28
  const LX = -0.55
  const LY = -0.65
  const LZ = 0.52
  const stone: K[] = ['void', 'night', 'stone0', 'stone1', 'stone2', 'stone3']
  const redR: K[] = ['blood0', 'blood1', 'crimsonDeep', 'crimson', 'red', 'redHot']
  const x0 = Math.floor(cx - rx * 1.3)
  const x1 = Math.ceil(cx + rx * 1.3)
  const y0 = Math.floor(cy - ry * 1.3)
  const y1 = Math.ceil(cy + ry * 0.7)
  const cracks = new Set<number>()
  for (let c = 0; c < 2; c++) {
    let px = cx + (r() - 0.5) * rx
    let py = cy - ry * 0.4 + r() * ry * 0.4
    for (let s = 0; s < rx * 0.8; s++) {
      cracks.add(Math.round(py) * 4096 + Math.round(px))
      px += r() < 0.5 ? 1 : 0
      py += r() < 0.6 ? 1 : 0
    }
  }
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / rx
      const v = (y + 0.5 - cy) / ry
      if (v > 0.6) continue
      const th = Math.atan2(v, u)
      const R = 1 + 0.12 * Math.sin(3 * th + a1) + 0.08 * Math.sin(5 * th + a2) + 0.05 * Math.sin(7 * th + a3)
      const rr = Math.hypot(u, v) / R
      if (rr > 1) continue
      const step = (Math.PI * 2) / facets
      const tq = Math.round((th - fj) / step) * step + fj
      let nx: number
      let ny: number
      let nzv: number
      if (rr < 0.42) {
        nx = -0.15
        ny = -0.45
        nzv = 0.88
      } else {
        nx = Math.cos(tq) * 0.82
        ny = Math.sin(tq) * 0.82
        nzv = 0.57
      }
      const lam = nx * LX + ny * LY + nzv * LZ
      let val = 0.08 + lam * 0.72 - fade * 0.75
      let k: K = stone[Math.max(0, Math.min(5, Math.floor(val * 6)))] ?? 'void'
      if (glow) {
        const gx = glow.x - x
        const gy = glow.y - y
        const gd = Math.hypot(gx, gy)
        const gl = clamp01(1 - gd / glow.r)
        const facing = (nx * gx + ny * gy) / (gd || 1)
        const amt = gl * (0.35 + Math.max(0, facing) * 0.9) - fade * 0.6
        if (amt > 0.38 || (amt > 0.3 && dith(x, y, (amt - 0.3) * 8))) {
          val = amt * 0.9 + lam * 0.4
          k = redR[Math.max(0, Math.min(5, Math.floor(val * 6)))] ?? 'blood0'
        }
        if (rr > 0.86 && facing > 0.35 && gl > 0.25 && fade < 0.3) k = gl > 0.55 ? 'redHot' : 'red'
      }
      if (rr > 0.88 && u + v > 0.35 && k !== 'redHot' && k !== 'red') k = 'void'
      if (cracks.has(y * 4096 + x) && rr < 0.85) k = fade > 0.4 ? 'void' : 'stone0'
      b.set(x, y, k)
    }
}

/** Moita de folhas: sopros pequenos, topo claro (leafHi), sombra azulada embaixo (vine0). */
export function drawBush(b: Buf, cx: number, cy: number, rad: number, seed: number, fade: number, glow: Glow) {
  const r = mulberry32(seed)
  const n = Math.max(6, Math.round(rad * rad * 0.55))
  const leaves: { x: number; y: number; s: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.PI + r() * Math.PI
    const d = Math.sqrt(r())
    leaves.push({ x: cx + Math.cos(a) * rad * 1.25 * d, y: cy + Math.sin(a) * rad * d * 0.9 + rad * 0.25, s: 1.4 + r() * 1.5 })
  }
  leaves.sort((a, c) => c.y - a.y)
  const ramp: K[] = ['void', 'vine0', 'vine1', 'green', 'leafHi']
  for (const l of leaves) {
    const s = l.s
    for (let oy = -Math.ceil(s); oy <= Math.ceil(s); oy++)
      for (let ox = -Math.ceil(s * 1.3); ox <= Math.ceil(s * 1.3); ox++) {
        const q = (ox / (s * 1.3)) ** 2 + (oy / s) ** 2
        if (q > 1) continue
        const x = Math.round(l.x + ox)
        const y = Math.round(l.y + oy)
        const local = -(ox / s) * 0.35 - (oy / s) * 0.6
        const gpos = 1 - (y - (cy - rad)) / (rad * 1.6)
        let v = 1.3 + local * 1.1 + gpos * 1.6 - fade * 2.6
        if (q > 0.7 && oy > 0) v -= 0.8
        let k = ramp[Math.max(0, Math.min(4, Math.floor(v + (bayer(x, y) - 0.5) * 0.4)))] ?? 'vine0'
        if (glow && q > 0.55) {
          const gx = glow.x - x
          const gy = glow.y - y
          const gd = Math.hypot(gx, gy)
          const gl = clamp01(1 - gd / glow.r)
          if (gl > 0.35 && ox * gx + oy * gy > 0 && fade < 0.3) k = gl > 0.6 ? 'red' : 'crimson'
        }
        b.set(x, y, k)
      }
  }
}
