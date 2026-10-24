// Mapa da jornada em pixel: o Brasil em pedra sobre a noite (estilo do minimapa da referência),
// a trilha pontilhada das 13 fases, os nós (feito = medalha de ouro com estrela, liberado = medalha
// vermelha pulsando com ▶, trancado = pedra cinza com cadeado)
// e o avatar pulando no nó escolhido. Só a paleta, escala inteira.
import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import { LEVELS } from '../content/levels'
import { mulberry32 } from '../lib/rng'
import { sprite } from '../lib/sprites'
import { Buf, dith, HEX, type K, makeNoise, vgrad } from './pal'
import { drawSparkle } from './props'

const STAR = ['...+...', '...#...', '+#####+', '.#####.', '..###..', '.##.##.', '.#...#.']
const PLAY = ['.#.....', '.##....', '.###...', '.####..', '.###...', '.##....', '.#.....']
const LOCK = ['..###..', '.#...#.', '.#...#.', '#######', '#++k++#', '#++k++#', '#######']

export class JourneyMap {
  private g: CanvasRenderingContext2D
  W = 0
  H = 0
  private base: HTMLCanvasElement | null = null
  private ox = 0
  private oy = 0
  private size = 0
  private sparkles: { x: number; y: number; t0: number }[] = []
  private nextSparkle = 0

  constructor(readonly canvas: HTMLCanvasElement) {
    const g = canvas.getContext('2d', { alpha: false })
    if (!g) throw new Error('canvas 2d indisponível')
    this.g = g
  }

  /** `top`/`bottom` em pixels lógicos: área livre entre a barra do topo e o painel */
  layout(W: number, H: number, top: number, bottom: number) {
    this.W = Math.max(32, Math.floor(W))
    this.H = Math.max(32, Math.floor(H))
    this.canvas.width = this.W
    this.canvas.height = this.H
    this.g.imageSmoothingEnabled = false
    const avail = Math.max(40, H - top - bottom)
    const aspect = (LON1 - LON0) / (LAT0 - LAT1)
    this.size = Math.floor(Math.min(W - 16, avail * aspect))
    const hgt = Math.round(this.size / aspect)
    this.ox = Math.round(W / 2 - this.size / 2)
    this.oy = Math.round(top + (avail - hgt) / 2)
    this.bake(hgt)
  }

  xy(lon: number, lat: number) {
    return {
      x: Math.round(this.ox + ((lon - LON0) / (LON1 - LON0)) * this.size),
      y: Math.round(this.oy + ((lat - LAT0) / (LAT1 - LAT0)) * (this.size / ((LON1 - LON0) / (LAT0 - LAT1)))),
    }
  }

  private bake(hgt: number) {
    const { W, H } = this
    const b = new Buf(W, H)
    const nz = makeNoise(77)
    vgrad(b, 0, 0, W, H, [
      [0, 'void'],
      [0.55, 'night'],
      [1, 'dusk'],
    ])
    const r = mulberry32(5)
    for (let i = 0; i < (W * H) / 120; i++) b.set(r() * W, r() * H, r() < 0.8 ? 'stone0' : 'stone1')
    // terra: dentro escuro e texturizado, borda de pedra acesa de cima/esquerda
    const land = new Uint8Array(W * H)
    const lonOf = (x: number) => LON0 + ((x + 0.5 - this.ox) / this.size) * (LON1 - LON0)
    const latOf = (y: number) => LAT0 + ((y + 0.5 - this.oy) / hgt) * (LAT1 - LAT0)
    for (let y = this.oy - 2; y < this.oy + hgt + 2; y++)
      for (let x = this.ox - 2; x < this.ox + this.size + 2; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        if (inBrazil(lonOf(x), latOf(y))) land[y * W + x] = 1
      }
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : (land[y * W + x] ?? 0))
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!at(x, y)) {
          // mar perto da costa: pontilhado azul
          let near = 0
          for (let d = 1; d <= 4 && !near; d++)
            if (at(x + d, y) || at(x - d, y) || at(x, y + d) || at(x, y - d)) near = d
          if (near && dith(x, y, (5 - near) * 0.12)) b.set(x, y, 'blue0')
          continue
        }
        const up = at(x, y - 1)
        const left = at(x - 1, y)
        const down = at(x, y + 1)
        const right = at(x + 1, y)
        let k: K
        if (!up || !left) k = 'stone3'
        else if (!down || !right) k = 'stone1'
        else {
          const inner = !at(x, y - 2) || !at(x - 2, y)
          const n = nz.fbm(x / 7, y / 7, 3)
          k = inner ? 'stone2' : n > 0.62 ? 'hazeDark' : n > 0.45 ? 'dusk' : 'night'
          if (n > 0.7 && dith(x, y, 0.4)) k = 'haze'
        }
        b.set(x, y, k)
      }
    // sombra projetada do país (1 px para baixo-direita)
    for (let y = H - 1; y > 0; y--)
      for (let x = W - 1; x > 0; x--) if (!at(x, y) && at(x - 1, y - 1) && !at(x - 1, y)) b.set(x, y, 'void')
    this.base = b.canvas()
  }

  /** nó mais próximo de um ponto lógico (ou -1) */
  hit(x: number, y: number) {
    let best = -1
    let bd = 14
    LEVELS.forEach((l, i) => {
      const p = this.xy(l.lon, l.lat)
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }

  draw(t: number, sel: number, done: number, stars: number[], avatar: string, reduced: boolean) {
    const g = this.g
    if (!this.base) return
    g.drawImage(this.base, 0, 0)
    const px = (x: number, y: number, k: K) => {
      g.fillStyle = HEX[k]
      g.fillRect(x, y, 1, 1)
    }
    /** disco com contorno, luz de cima-esquerda e sombra de baixo-direita (rampa escuro → claro, 4 tons) */
    const disc = (cx: number, cy: number, r: number, ramp: [K, K, K, K]) => {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = Math.hypot(x, y)
          if (d > r + 0.4) continue
          const k = d > r - 0.6 ? ramp[0] : x + y < -r * 0.7 ? ramp[3] : x + y > r * 0.6 ? ramp[1] : ramp[2]
          px(cx + x, cy + y, k)
        }
      // sombra de contato
      for (let x = -r + 2; x <= r - 2; x++) px(cx + x + 1, cy + r + 1, 'void')
    }
    /** carimba um desenho 7×7 ('#' = cor, '+' = realce, 'k' = vazado escuro) centrado */
    const stamp = (cx: number, cy: number, rows: string[], k: K, hi: K) => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x]
          if (ch === '#') px(cx - 3 + x, cy - 3 + y, k)
          else if (ch === '+') px(cx - 3 + x, cy - 3 + y, hi)
          else if (ch === 'k') px(cx - 3 + x, cy - 3 + y, 'void')
        }
      })
    }
    // trilha: ouro no que já foi, pedra no que falta, formiguinhas no trecho atual
    const march = reduced ? 0 : Math.floor(t * 6)
    LEVELS.forEach((l, i) => {
      const n = LEVELS[i + 1]
      if (!n) return
      const a = this.xy(l.lon, l.lat)
      const b = this.xy(n.lon, n.lat)
      const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)))
      for (let s = 2; s < steps - 1; s++) {
        const x = Math.round(a.x + ((b.x - a.x) * s) / steps)
        const y = Math.round(a.y + ((b.y - a.y) * s) / steps)
        if (i < done - 1) {
          if (s % 2 === 0) px(x, y, 'gold')
        } else if (i === done - 1) {
          if ((s + march) % 3 === 0) px(x, y, 'redHot')
          else if ((s + march) % 3 === 1) px(x, y, 'crimson')
        } else if (s % 3 === 0) px(x, y, 'stone1')
      }
    })
    // nós
    LEVELS.forEach((l, i) => {
      const p = this.xy(l.lon, l.lat)
      const st = stars[i] ?? 0
      if (st > 0) {
        // feita: medalha de ouro com estrela branca
        disc(p.x, p.y, 6, ['gold0', 'gold1', 'gold', 'goldHi'])
        stamp(p.x, p.y, STAR, 'sparkle', 'white')
      } else if (i <= done) {
        // liberada: medalha vermelha pulsando (anel de fora cresce 1 px a 3 fps) com ▶ branco
        const pulse = reduced ? 0 : Math.floor(t * 3) % 2
        const rr = 8 + pulse
        for (let y = -rr; y <= rr; y++)
          for (let x = -rr; x <= rr; x++) {
            const d = Math.hypot(x, y)
            if (d > 6.6 && d < rr + 0.5 && (x + y + pulse) & 1)
              px(p.x + x, p.y + y, d < 7.6 ? 'redHot' : 'crimson')
          }
        disc(p.x, p.y, 6, ['blood0', 'crimson', 'red', 'redGlow'])
        stamp(p.x, p.y, PLAY, 'white', 'sparkle')
      } else {
        // trancada: medalha de pedra cinza com cadeado
        disc(p.x, p.y, 5, ['void', 'stone0', 'stone1', 'stone2'])
        stamp(p.x, p.y, LOCK, 'stone3', 'stoneHi')
      }
      // cantoneiras brancas piscando no selecionado
      if (i === sel && (reduced || Math.floor(t * 4) % 2 === 0)) {
        const r = 9
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          px(p.x + sx * r, p.y + sy * r, 'white')
          px(p.x + sx * (r - 1), p.y + sy * r, 'white')
          px(p.x + sx * r, p.y + sy * (r - 1), 'white')
        }
      }
    })
    // brilhos nos nós de ouro
    if (!reduced && t > this.nextSparkle) {
      const doneIdx = stars.map((s, i) => (s > 0 ? i : -1)).filter((i) => i >= 0)
      const pick = doneIdx[Math.floor(Math.random() * doneIdx.length)]
      const l = pick !== undefined ? LEVELS[pick] : undefined
      if (l) {
        const p = this.xy(l.lon, l.lat)
        this.sparkles.push({ x: p.x + 3, y: p.y - 4, t0: t })
      }
      this.nextSparkle = t + 0.6 + Math.random() * 0.8
    }
    this.sparkles = this.sparkles.filter((s) => t - s.t0 < 0.5)
    for (const s of this.sparkles) drawSparkle(g, s.x, s.y, Math.floor((t - s.t0) * 12))
    // avatar no nó escolhido: idle de 2 quadros a 4 fps + pulinho
    const cur = LEVELS[sel]
    if (cur) {
      const p = this.xy(cur.lon, cur.lat)
      const f = reduced ? 0 : Math.floor(t * 4) % 2
      const spr = sprite(f ? `${avatar}_1` : avatar)
      const hop = reduced ? 0 : Math.round(Math.abs(Math.sin(t * 3.2)) * 3)
      // sombrinha no chão
      g.fillStyle = HEX.void
      g.fillRect(p.x - 4, p.y - 4, 9, 1)
      g.drawImage(spr, Math.round(p.x - spr.width / 2), Math.round(p.y - 4 - spr.height - hop))
    }
  }
}
