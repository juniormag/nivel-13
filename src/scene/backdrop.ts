// Cenário da referência, procedural: Rio à noite, lua em eclipse, nuvens em brasa,
// Pão de Açúcar, Corcovado com o Cristo, baía com luzes e o morro onde o 13 se ergue.

import { BAYER4, ditherGradient, offscreen, type PixelFit } from '../core/pixel'
import { mulberry32 } from '../core/rng'

const PAD = 12

interface Light {
  x: number
  y: number
  c: string
  ph: number
  big: boolean
}

function noise1(seed: number) {
  const r = mulberry32(seed)
  const pts = Array.from({ length: 64 }, () => r())
  return (x: number) => {
    const i = Math.floor(x)
    const f = x - i
    const a = pts[((i % 64) + 64) % 64] ?? 0
    const b = pts[(((i + 1) % 64) + 64) % 64] ?? 0
    const u = f * f * (3 - 2 * f)
    return a + (b - a) * u
  }
}

function hash2(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return v - Math.floor(v)
}

export interface Layout {
  W: number
  H: number
  portrait: boolean
  horizon: number
  moon: { x: number; y: number; r: number }
  /** onde fica a base do monumento, em fração da tela */
  baseX: number
  baseY: number
}

export function layoutFor(W: number, H: number): Layout {
  const portrait = W / H < 0.9
  return {
    W,
    H,
    portrait,
    horizon: Math.round(H * (portrait ? 0.48 : 0.6)),
    moon: {
      x: Math.round(W * (portrait ? 0.2 : 0.15)),
      y: Math.round(H * (portrait ? 0.24 : 0.25)),
      r: Math.round(Math.min(W, H) * (portrait ? 0.09 : 0.085)),
    },
    baseX: 0.5,
    baseY: portrait ? 0.54 : 0.72,
  }
}

export class Backdrop {
  private g: CanvasRenderingContext2D
  L!: Layout
  private sky!: HTMLCanvasElement
  private moon!: HTMLCanvasElement
  private clouds: { c: HTMLCanvasElement; x: number; y: number; speed: number; depth: number }[] = []
  private far!: HTMLCanvasElement
  private water!: HTMLCanvasElement
  private hills!: HTMLCanvasElement
  private front!: HTMLCanvasElement
  private vignette!: HTMLCanvasElement
  private lights: Light[] = []
  private stars: { x: number; y: number; ph: number; b: number }[] = []
  private birds: { x: number; y: number; v: number; ph: number }[] = []
  private cristo = { x: 0, y: 0 }
  private reflect: { x: number; y: number; w: number; ph: number }[] = []
  private waterTop = 0
  private waterBottom = 0
  private waterRight = 0

  constructor(canvas: HTMLCanvasElement) {
    const g = canvas.getContext('2d', { alpha: false })
    if (!g) throw new Error('canvas 2d indisponível')
    this.g = g
  }

  resize(f: PixelFit) {
    this.build(f.W, f.H)
  }

  build(W: number, H: number) {
    const L = layoutFor(W, H)
    this.L = L
    const r = mulberry32(1313)
    const WW = W + PAD * 2

    // céu: preto no alto, vinho no meio, brasa no horizonte
    {
      const { c, g } = offscreen(WW, L.horizon + 4)
      ditherGradient(g, 0, 0, WW, L.horizon + 4, [
        [0, '#05040a'],
        [0.42, '#0d0910'],
        [0.7, '#260b10'],
        [0.86, '#5e1715'],
        [0.95, '#a8361a'],
        [1, '#d0581f'],
      ])
      this.sky = c
    }
    this.stars = Array.from({ length: Math.round((W * L.horizon) / 260) }, () => ({
      x: Math.floor(r() * WW),
      y: Math.floor(r() * L.horizon * 0.7),
      ph: r() * 6.28,
      b: r(),
    }))

    // lua em eclipse: disco escuro, coroa vermelha e um crescente incandescente
    {
      const R = L.moon.r
      const S = R * 4
      const { c, g } = offscreen(S, S)
      const cx = S / 2
      const cy = S / 2
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const dx = x - cx + 0.5
          const dy = y - cy + 0.5
          const d = Math.sqrt(dx * dx + dy * dy)
          const th = ((x & 3) + (y & 3) * 4) / 16
          if (d < R) {
            // crescente: luz vindo de baixo à direita
            const lit = (dx * 0.55 + dy * 0.35) / R
            const rim = d > R - 2.2 && lit > -0.15
            if (rim && lit > 0.25) g.fillStyle = '#ffd9a0'
            else if (rim) g.fillStyle = '#ff6a2a'
            else if (d > R - 4 && lit > 0.35) g.fillStyle = '#b83218'
            else g.fillStyle = lit > 0.55 ? '#2a0c0e' : '#0b0709'
            g.fillRect(x, y, 1, 1)
          } else if (d < R * 1.9) {
            const a = 1 - (d - R) / (R * 0.9)
            if (a * a * 0.9 > th) {
              g.fillStyle = a > 0.75 ? '#c22a1a' : a > 0.45 ? '#7a1714' : '#3a0b0e'
              g.fillRect(x, y, 1, 1)
            }
          }
        }
      }
      this.moon = c
    }

    // nuvens em brasa
    this.clouds = []
    const cloudSpecs = L.portrait
      ? [
          { x: -0.15, y: 0.25, w: 0.9, h: 0.07, depth: 0.25 },
          { x: 0.55, y: 0.36, w: 0.7, h: 0.05, depth: 0.35 },
          { x: -0.1, y: 0.42, w: 0.6, h: 0.05, depth: 0.45 },
        ]
      : [
          { x: -0.05, y: 0.33, w: 0.5, h: 0.12, depth: 0.25 },
          { x: 0.12, y: 0.44, w: 0.42, h: 0.08, depth: 0.4 },
          { x: 0.62, y: 0.44, w: 0.42, h: 0.07, depth: 0.35 },
        ]
    cloudSpecs.forEach((cs, i) => {
      const cw = Math.round(cs.w * W)
      const ch = Math.round(cs.h * H) + 8
      const { c, g } = offscreen(cw, ch)
      const cr = mulberry32(77 + i * 31)
      const blobs = Array.from({ length: Math.round(cw / 7) }, (_, k) => ({
        x: (k / Math.round(cw / 7)) * cw + cr() * 6,
        y: ch * (0.45 + cr() * 0.35),
        rad: ch * (0.18 + cr() * 0.3) * (1 - Math.abs(k / Math.round(cw / 7) - 0.5) * 0.9),
      }))
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          let inside = false
          let top = 99
          for (const b of blobs) {
            const dx = x - b.x
            const dy = y - b.y
            const d = Math.sqrt(dx * dx + dy * dy * 1.6)
            if (d < b.rad) {
              inside = true
              top = Math.min(top, (y - (b.y - b.rad / 1.26)) / b.rad)
            }
          }
          if (!inside) continue
          const th = ((x & 3) + (y & 3) * 4) / 16
          g.fillStyle =
            top < 0.12
              ? '#ff7a3a'
              : top < 0.3
                ? th < 0.5
                  ? '#c8331d'
                  : '#9a2418'
                : top < 0.6
                  ? '#5e1416'
                  : '#2b0b10'
          g.fillRect(x, y, 1, 1)
        }
      }
      this.clouds.push({ c, x: cs.x * W, y: cs.y * H, speed: 0.6 + i * 0.25, depth: cs.depth })
    })

    // serras ao fundo e o Pão de Açúcar
    {
      const { c, g } = offscreen(WW, H)
      const n = noise1(9)
      const hz = L.horizon
      for (let x = 0; x < WW; x++) {
        const fx = x / WW
        let hgt = (n(fx * 9) * 0.5 + n(fx * 23) * 0.2) * H * 0.07 + H * 0.01
        // Pão de Açúcar e Urca
        const pa = L.portrait ? 0.12 : 0.19
        const pw = L.portrait ? 0.07 : 0.045
        const d1 = (fx - pa) / pw
        if (Math.abs(d1) < 1) hgt = Math.max(hgt, H * (L.portrait ? 0.075 : 0.13) * (1 - d1 * d1) ** 0.42)
        const d2 = (fx - pa - pw * 1.7) / (pw * 0.9)
        if (Math.abs(d2) < 1) hgt = Math.max(hgt, H * (L.portrait ? 0.04 : 0.06) * (1 - d2 * d2) ** 0.6)
        // morros da esquerda
        const d3 = (fx - (L.portrait ? 0.32 : 0.33)) / 0.08
        if (Math.abs(d3) < 1) hgt = Math.max(hgt, H * 0.09 * (1 - d3 * d3) ** 1.2 * (0.8 + n(fx * 40) * 0.3))
        const top = Math.round(hz - hgt)
        g.fillStyle = '#1b0c10'
        g.fillRect(x, top, 1, hz - top + 2)
        g.fillStyle = '#6e1c16'
        g.fillRect(x, top, 1, 1)
        if (n(fx * 60) > 0.6) {
          g.fillStyle = '#a3321c'
          g.fillRect(x, top, 1, 1)
        }
      }
      this.far = c
    }

    // baía (à esquerda), com reflexos
    {
      const { c, g } = offscreen(WW, H)
      this.waterTop = L.horizon + 1
      this.waterBottom = Math.round(H * (L.portrait ? 0.68 : 0.8))
      this.waterRight = Math.round(WW * (L.portrait ? 0.55 : 0.5))
      for (let y = this.waterTop; y < this.waterBottom; y++) {
        const t = (y - this.waterTop) / (this.waterBottom - this.waterTop)
        const right = this.waterRight * (1 - t * 0.55)
        g.fillStyle = t < 0.15 ? '#2a0e14' : t < 0.5 ? '#140a12' : '#0c080e'
        g.fillRect(0, y, right, 1)
        g.fillStyle = '#3a1418'
        g.fillRect(right, y, 1, 1)
      }
      this.water = c
      this.reflect = Array.from({ length: 26 }, () => ({
        x: r() * this.waterRight * 0.9,
        y: this.waterTop + 1 + r() * (this.waterBottom - this.waterTop) * 0.7,
        w: 2 + Math.floor(r() * 6),
        ph: r() * 6.28,
      }))
    }

    // luzes da cidade
    this.lights = []
    const cityCols = ['#ffcf6a', '#ff9a3d', '#fff1c4', '#ffb35a']
    const nL = Math.round((W * H) / 110)
    for (let i = 0; i < nL; i++) {
      const side = r()
      let x: number
      let y: number
      if (side < 0.55) {
        // orla e cidade à esquerda, sob o horizonte
        x = r() * W * 0.62
        y = L.horizon + r() ** 1.6 * H * 0.05
        if (x < this.waterRight * 0.85 && y > L.horizon + 2) y = L.horizon + r() * 2
      } else if (side < 0.85) {
        x = W * (0.55 + r() * 0.45)
        y = L.horizon - r() * 3 + r() ** 2 * H * 0.12
      } else {
        x = r() * W
        y = this.waterBottom - 2 + r() * H * 0.06
      }
      this.lights.push({
        x: Math.round(x),
        y: Math.round(y),
        c: cityCols[i % 4] ?? '#ffcf6a',
        ph: r() * 6.28,
        big: r() < 0.08,
      })
    }

    // Corcovado com o Cristo (direita) + morros escuros do primeiro plano
    {
      const { c, g } = offscreen(WW, H)
      const n = noise1(31)
      const peakX = W * (L.portrait ? 0.84 : 0.86) + PAD
      const peakY = H * (L.portrait ? 0.43 : 0.4)
      for (let x = 0; x < WW; x++) {
        const dx = (x - peakX) / (W * (L.portrait ? 0.22 : 0.18))
        const prof = dx < 0 ? 1 - Math.min(1, (-dx) ** 0.9) : 1 - Math.min(1, dx * 0.55)
        if (prof <= 0) continue
        const top = Math.round(peakY + (1 - prof) * (L.horizon + H * 0.06 - peakY) + n(x * 0.15) * 3)
        g.fillStyle = '#120a0d'
        g.fillRect(x, top, 1, H - top)
        g.fillStyle = '#4a1a16'
        g.fillRect(x, top, 1, 1)
        // textura de mata
        for (let y = top + 2; y < H; y += 3) {
          if (n(x * 0.7 + y * 0.31) > 0.62) {
            g.fillStyle = '#1d1210'
            g.fillRect(x, y, 1, 1)
          }
        }
      }
      // estrada iluminada em zigue-zague
      let px = peakX - 2
      let py = peakY + 4
      let dir = -1
      g.fillStyle = '#ffb35a'
      while (py < L.horizon + H * 0.04) {
        if (Math.round(py * 2) % 3 !== 0) g.fillRect(Math.round(px), Math.round(py), 1, 1)
        px += dir * 1.1
        py += 0.32
        if (Math.abs(px - peakX - (py - peakY) * 0.3) > 3 + (py - peakY) * 0.3) dir *= -1
      }
      this.cristo = { x: Math.round(peakX - PAD), y: Math.round(peakY) }

      // morros escuros em primeiro plano nas bordas
      for (let x = 0; x < WW; x++) {
        const fx = x / WW
        const left = Math.max(0, 1 - fx / (L.portrait ? 0.32 : 0.26))
        const right = Math.max(0, (fx - (L.portrait ? 0.7 : 0.78)) / (L.portrait ? 0.3 : 0.22))
        const hgt = Math.max(left, right) * H * (L.portrait ? 0.22 : 0.26) + n(x * 0.2) * 4
        if (hgt < 2) continue
        const top = Math.round(H - hgt)
        g.fillStyle = '#09070a'
        g.fillRect(x, top, 1, H - top)
        g.fillStyle = n(x * 0.9) > 0.5 ? '#1a2a14' : '#14100f'
        g.fillRect(x, top, 1, 1)
      }
      this.hills = c
    }

    // morro central de pedra e mata onde o monumento se apoia
    {
      const { c, g } = offscreen(WW, H)
      const n = noise1(57)
      const cx = W * L.baseX + PAD
      const topY = H * L.baseY
      const half = W * (L.portrait ? 0.42 : 0.3)
      for (let x = 0; x < WW; x++) {
        const d = (x - cx) / half
        if (Math.abs(d) > 1.25) continue
        const shape = Math.max(0, 1 - d * d)
        const top = Math.round(topY + (1 - shape) * H * 0.2 - shape * 4 + n(x * 0.35) * 5)
        for (let y = top; y < H; y++) {
          const k = hash2(Math.floor(x / 3), Math.floor(y / 2))
          const th = ((x & 3) + (y & 3) * 4) / 16
          let col = k > 0.66 ? '#3a2c2a' : k > 0.4 ? '#241a1a' : '#151012'
          if (y - top < 2) col = '#5a2a22'
          if (y - top < 1 && Math.abs(d) < 0.5) col = '#a03a22'
          // brilho vermelho do monumento sobre as pedras
          const glow = Math.max(0, 1 - Math.abs(d) * 1.4) * Math.max(0, 1 - (y - top) / 28)
          if (glow > 0.35 && th < glow * 0.7) col = '#7a1c18'
          g.fillStyle = col
          g.fillRect(x, y, 1, 1)
        }
        // arbustos no topo
        if (n(x * 0.8) > 0.55) {
          const bh = 2 + Math.round(n(x * 1.7) * 4)
          for (let y = top - bh; y < top + 1; y++) {
            g.fillStyle = (x + y) % 3 === 0 ? '#4fae3f' : y < top - bh + 1 ? '#6cc24a' : '#23561f'
            g.fillRect(x, y, 1, 1)
          }
        }
      }
      this.front = c
    }

    // vinheta
    {
      const { c, g } = offscreen(W, H)
      const grd = g.createRadialGradient(
        W / 2,
        H * 0.48,
        Math.min(W, H) * 0.3,
        W / 2,
        H * 0.5,
        Math.max(W, H) * 0.75,
      )
      grd.addColorStop(0, 'rgba(0,0,0,0)')
      grd.addColorStop(1, 'rgba(0,0,0,0.62)')
      g.fillStyle = grd
      g.fillRect(0, 0, W, H)
      this.vignette = c
    }

    this.birds = Array.from({ length: 4 }, (_, i) => ({
      x: r() * W,
      y: H * (0.15 + r() * 0.3),
      v: 3 + r() * 4,
      ph: i * 1.7,
    }))
  }

  draw(t: number, px = 0, py = 0) {
    const g = this.g
    const L = this.L
    if (!L) return
    const { W } = L
    const off = (depth: number) => Math.round(-PAD + px * depth * PAD)
    const offY = (depth: number) => Math.round(py * depth * 4)

    g.drawImage(this.sky, off(0.1), offY(0.1))
    // estrelas
    for (const s of this.stars) {
      const tw = Math.sin(t * (1 + s.b) + s.ph)
      if (tw < -0.2) continue
      g.fillStyle = s.b > 0.85 && tw > 0.7 ? '#ffffff' : s.b > 0.5 ? '#b9b1a6' : '#6b6560'
      g.fillRect(s.x + off(0.1), s.y + offY(0.1), 1, 1)
    }
    // lua
    const m = L.moon
    g.drawImage(
      this.moon,
      m.x - this.moon.width / 2 + off(0.15) + PAD,
      m.y - this.moon.height / 2 + offY(0.15),
    )
    // pássaros
    g.fillStyle = '#e8e0d4'
    for (const b of this.birds) {
      const bx = Math.round(((b.x + t * b.v) % (W + 40)) - 20)
      const by = Math.round(b.y + Math.sin(t * 0.8 + b.ph) * 3)
      const flap = Math.sin(t * 6 + b.ph) > 0 ? 1 : 0
      g.fillRect(bx - 2, by - flap, 1, 1)
      g.fillRect(bx - 1, by, 1, 1)
      g.fillRect(bx, by + 1, 1, 1)
      g.fillRect(bx + 1, by, 1, 1)
      g.fillRect(bx + 2, by - flap, 1, 1)
    }
    // nuvens
    for (const c of this.clouds) {
      const span = W + c.c.width
      const x = ((((c.x + t * c.speed) % span) + span) % span) - c.c.width * 0.15
      g.drawImage(c.c, Math.round(x + px * c.depth * PAD), Math.round(c.y + offY(c.depth)))
    }
    g.drawImage(this.far, off(0.3), offY(0.3))
    g.drawImage(this.water, off(0.35), offY(0.35))
    // reflexos na água
    for (const rf of this.reflect) {
      const a = Math.sin(t * 1.4 + rf.ph)
      if (a < 0) continue
      g.fillStyle = a > 0.7 ? '#ff9a3d' : '#7a2a1a'
      g.fillRect(
        Math.round(rf.x + off(0.35) + PAD + Math.sin(t + rf.ph) * 1.5),
        Math.round(rf.y + offY(0.35)),
        rf.w,
        1,
      )
    }
    // luzes
    const lo = off(0.45) + PAD
    const loy = offY(0.45)
    for (const l of this.lights) {
      const tw = Math.sin(t * 2 + l.ph)
      if (tw < -0.85) continue
      g.fillStyle = l.c
      g.fillRect(l.x + lo, l.y + loy, 1, 1)
      if (l.big && tw > 0.5) {
        g.globalAlpha = 0.5
        g.fillRect(l.x + lo - 1, l.y + loy, 3, 1)
        g.fillRect(l.x + lo, l.y + loy - 1, 1, 3)
        g.globalAlpha = 1
      }
    }
    g.drawImage(this.hills, off(0.55), offY(0.55))
    // Cristo Redentor iluminado
    {
      const cx = this.cristo.x + off(0.55) + PAD
      const cy = this.cristo.y + offY(0.55)
      const pulse = 0.85 + Math.sin(t * 1.3) * 0.15
      g.fillStyle = '#ffcf6a'
      for (let yy = -16; yy <= 4; yy++)
        for (let xx = -12; xx <= 12; xx++) {
          const d = Math.hypot(xx, (yy + 6) * 1.2) / 12
          if (d > 1) continue
          const th = BAYER4[((yy + 64) & 3) * 4 + ((xx + 64) & 3)] ?? 0.5
          if ((1 - d) * (1 - d) * 0.55 * pulse > th) g.fillRect(cx + xx, cy + yy, 1, 1)
        }
      g.fillStyle = '#f4e6c8'
      g.fillRect(cx, cy - 11, 1, 1) // cabeça
      g.fillRect(cx - 4, cy - 9, 9, 1) // braços
      g.fillRect(cx - 1, cy - 10, 3, 1)
      g.fillRect(cx - 1, cy - 9, 3, 7) // manto
      g.fillRect(cx - 2, cy - 3, 5, 1)
      g.fillStyle = '#c9a77a'
      g.fillRect(cx + 1, cy - 8, 1, 6)
      g.fillStyle = '#8a7258'
      g.fillRect(cx - 2, cy - 2, 5, 2) // pedestal
    }
    g.drawImage(this.front, off(0.75), offY(0.75))
    g.drawImage(this.vignette, 0, 0)
  }
}

/** Brilho de 4 pontas (as estrelas cintilantes da referência). */
export function sparkle(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  a: number,
  col = '#ffffff',
) {
  if (a <= 0) return
  const s = Math.max(1, Math.round(size))
  g.globalAlpha = Math.min(1, a)
  g.fillStyle = col
  g.fillRect(Math.round(x) - s, Math.round(y), s * 2 + 1, 1)
  g.fillRect(Math.round(x), Math.round(y) - s, 1, s * 2 + 1)
  g.fillStyle = '#ffffff'
  g.fillRect(Math.round(x), Math.round(y), 1, 1)
  if (s > 2) {
    g.globalAlpha = Math.min(1, a) * 0.5
    g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3)
  }
  g.globalAlpha = 1
}
