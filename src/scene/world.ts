// O mundo do título: compõe o cenário (backdrop), o monumento 3D pixel nativo (carregado depois
// da primeira pintura), a bandeira e a coroa desenhadas à mão, as partículas e a câmera que respira.
// Tudo num único canvas 2D em pixels lógicos, ampliado com nearest por escala inteira.
import { Backdrop, type Cam } from './backdrop'
import { Fx } from './fx'
import { PAD } from './layout'
import type { Anchors } from './monument'
import { HEX, U32 } from './pal'
import { crown, flagFrames } from './props'

export interface MonumentLike {
  readonly canvas: HTMLCanvasElement
  readonly w: number
  readonly h: number
  origin: { x: number; y: number }
  onLand?: (x: number, y: number) => void
  render(t: number): void
  setProgress(p: number, animate?: boolean): void
  setFlare(k: number): void
  anchors(): Anchors
  dispose(): void
}

export interface WorldOpts {
  reduced?: boolean
  mobile?: boolean
  /** quadro único (share card): sem RAF, sem interação */
  still?: boolean
}

const PAL_SET = new Set(Object.values(U32))

export class World {
  readonly canvas: HTMLCanvasElement
  private g: CanvasRenderingContext2D
  W = 0
  H = 0
  bd!: Backdrop
  fx: Fx
  mon: MonumentLike | null = null
  private flag!: { frames: HTMLCanvasElement[]; yOff: number }
  private crownSpr!: HTMLCanvasElement
  private crownSquash!: HTMLCanvasElement
  private crownShine: HTMLCanvasElement[] = []
  private cam: Cam = { x: 0, y: 0 }
  private follow = { x: 0, y: 0, tx: 0, ty: 0 }
  private progress = 0
  private crownOn = false
  private crownLocked = false
  private crownDrop = -1
  private crownLanded = false
  private flare = 0
  private lastT = 0
  private reduced: boolean
  private mobile: boolean
  private loading: Promise<void> | null = null
  private disposed = false
  private palcheckAt = 0
  palcheck = false

  constructor(canvas: HTMLCanvasElement, W: number, H: number, opts: WorldOpts = {}) {
    this.canvas = canvas
    const g = canvas.getContext('2d', { alpha: false })
    if (!g) throw new Error('canvas 2d indisponível')
    this.g = g
    this.reduced = !!opts.reduced
    this.mobile = !!opts.mobile
    this.fx = new Fx(this.mobile, this.reduced)
    this.resize(W, H)
  }

  resize(W: number, H: number) {
    W = Number.isFinite(W) ? Math.max(32, Math.floor(W)) : 32
    H = Number.isFinite(H) ? Math.max(32, Math.floor(H)) : 32
    if (W === this.W && H === this.H) return
    this.W = W
    this.H = H
    this.canvas.width = W
    this.canvas.height = H
    this.g.imageSmoothingEnabled = false
    this.bd = new Backdrop(W, H)
    const u = this.bd.L.ppu
    this.flag = flagFrames(Math.round(u * 2.7), Math.round(u * 1.85), 6)
    const cw = Math.round(u * 2.6)
    this.crownSpr = crown(cw)
    this.crownSquash = crown(cw, 0.78)
    this.crownShine = shineFrames(this.crownSpr)
    const L = this.bd.L
    const bx = L.base.x
    const by = L.base.y
    this.fx.beams = [
      {
        x: bx - Math.round(u * 5.4),
        y: by - Math.round(u * 4.3),
        up: Math.round(u * 2.2),
        down: Math.round(u * 2.6),
        ph: 0,
        period: 3.1,
      },
      {
        x: bx + Math.round(u * 5.6),
        y: by - Math.round(u * 6.6),
        up: Math.round(u * 1.8),
        down: Math.round(u * 3.4),
        ph: 1.3,
        period: 2.6,
      },
      {
        x: bx + Math.round(u * 4.6),
        y: by - Math.round(u * 2.2),
        up: Math.round(u * 1.2),
        down: Math.round(u * 1.6),
        ph: 2.1,
        period: 3.7,
      },
    ].map((b) => ({ ...b, x: Math.max(3, Math.min(W - 4, b.x)) }))
    if (this.mon) {
      this.mon.dispose()
      this.mon = null
      this.loading = null
      void this.loadMonument()
    }
  }

  /** carrega o three só agora (depois da primeira pintura); sem WebGL cai no monumento 2D */
  loadMonument(): Promise<void> {
    if (this.loading) return this.loading
    const ppu = this.bd.L.ppu
    this.loading = (async () => {
      let mon: MonumentLike | null = null
      try {
        if (!webgl2()) throw new Error('sem webgl2')
        const { Monument3D } = await import('./monument')
        mon = new Monument3D(ppu)
      } catch {
        const { Monument2D } = await import('./monument2d')
        mon = new Monument2D(ppu)
      }
      if (this.disposed) {
        mon.dispose()
        return
      }
      mon.onLand = (x, y) => {
        const o = this.monPos()
        this.fx.dust(x + o.x, y + o.y)
      }
      mon.setProgress(this.progress)
      this.mon = mon
    })()
    return this.loading
  }

  setProgress(p: number, animate = false) {
    const prev = this.progress
    this.progress = p
    this.mon?.setProgress(p, animate && !this.reduced)
    if (p >= 1 && !this.crownOn && !this.crownLocked) {
      this.crownOn = true
      if (animate && prev < 1 && !this.reduced) this.dropCrown()
      else this.crownLanded = true
    }
  }

  showCrown() {
    this.setCrown(true)
  }

  /** liga/desliga a coroa sem animação (cards de share pedem `crown: false` mesmo no progresso 1) */
  setCrown(on: boolean) {
    this.crownOn = on
    this.crownLocked = !on
    this.crownLanded = true
    this.crownDrop = -1
  }

  /** tira o monumento (cards só com o cenário) */
  dropMonument() {
    this.mon?.dispose()
    this.mon = null
    this.loading = null
  }

  /** a coroa cai do alto, quica 2 vezes e explode em dourado */
  celebrate() {
    this.crownOn = true
    if (this.reduced) {
      this.crownLanded = true
      return
    }
    this.dropCrown()
  }

  private dropCrown() {
    this.crownDrop = this.lastT
    this.crownLanded = false
  }

  pointerMove(x: number, y: number, dx: number, dy: number) {
    const p = this.fx.pointer
    p.x = x
    p.y = y
    p.vx = dx
    p.vy = dy
    p.on = true
    if (!this.reduced) {
      this.follow.tx = Math.max(-3, Math.min(3, ((x / this.W) * 2 - 1) * 3))
      this.follow.ty = Math.max(-2, Math.min(2, ((y / this.H) * 2 - 1) * 2))
    }
  }

  pointerLeave() {
    this.fx.pointer.on = false
    this.follow.tx = 0
    this.follow.ty = 0
  }

  tap(x: number, y: number) {
    this.fx.tap(x, y, this.lastT)
  }

  tilt(gamma: number, beta: number) {
    if (this.reduced) return
    const g = Math.max(-15, Math.min(15, gamma)) / 15
    const b = Math.max(-15, Math.min(15, beta - 40)) / 15
    this.fx.wind = g
    this.follow.tx = g * 3
    this.follow.ty = b * 2
  }

  private monPos() {
    const L = this.bd.L
    const m = this.mon
    if (!m) return { x: 0, y: 0 }
    return {
      x: Math.round(L.base.x - m.origin.x - this.cam.x),
      y: Math.round(L.base.y - m.origin.y - this.cam.y),
    }
  }

  /** simula só as partículas (sem desenhar): usado para encher o ar antes de um quadro parado */
  simulate(t: number, dt: number) {
    this.lastT = t
    const L = this.bd.L
    const u = L.ppu
    const a = this.mon?.anchors()
    const mp = this.monPos()
    const heads = a ? a.heads.map((h) => ({ ...h, x: h.x + mp.x, y: h.y + mp.y })) : []
    const anchors = a ? a.edges.map((e) => ({ x: e.x + mp.x, y: e.y + mp.y })) : []
    this.fx.update(dt, t, { heads, base: { x: L.base.x, y: L.base.y - u, w: u * 9 }, anchors, mobile: false })
  }

  frame(t: number, dt: number) {
    this.lastT = t
    const g = this.g
    const L = this.bd.L
    const u = L.ppu
    // câmera: respiração de ±2 px em 6 s + seguir de leve o ponteiro/inclinação (lerp 0,08)
    if (!this.reduced) {
      this.follow.x += (this.follow.tx - this.follow.x) * 0.08
      this.follow.y += (this.follow.ty - this.follow.y) * 0.08
      this.cam.x = Math.round(Math.sin((t * Math.PI * 2) / 6) * 2 + this.follow.x)
      this.cam.y = Math.round(Math.sin((t * Math.PI * 2) / 6 + 1.3) * 1 + this.follow.y)
    }
    this.bd.drawBack(g, t, this.cam)

    const mon = this.mon
    let anchors: Anchors | null = null
    const mp = this.monPos()
    if (mon) {
      // fitas acendem quando o dedo chega perto do monumento
      const pt = this.fx.pointer
      const near =
        pt.on && Math.hypot((pt.x - L.base.x) / 1.4, pt.y - (L.base.y - u * 4)) < u * 5.5 && !this.reduced
          ? 1
          : 0
      this.flare += (near - this.flare) * Math.min(1, dt * 5)
      mon.setFlare(this.flare)
      mon.render(t)
      g.drawImage(mon.canvas, mp.x, mp.y)
      anchors = mon.anchors()
      if (anchors.flag) this.drawFlag(g, t, anchors.flag.x + mp.x, anchors.flag.y + mp.y, u)
    }
    this.bd.drawFront(g, this.cam)
    if (mon && anchors && this.crownOn) this.drawCrown(g, t, anchors.crown.x + mp.x, anchors.crown.y + mp.y)

    // partículas e luzes
    const ox = -Math.round(this.cam.x)
    const oy = -Math.round(this.cam.y)
    const sparkAnchors: { x: number; y: number }[] = []
    if (anchors) {
      for (const e of anchors.edges)
        sparkAnchors.push({ x: e.x + mp.x + this.cam.x, y: e.y + mp.y + this.cam.y })
      if (this.crownOn && this.crownLanded) {
        const c = { x: anchors.crown.x + mp.x + this.cam.x, y: anchors.crown.y + mp.y + this.cam.y }
        for (let i = 0; i < 4; i++) sparkAnchors.push({ x: c.x + (i - 1.5) * u * 0.7, y: c.y - u * 0.5 })
      }
    }
    const city = this.bd.cityAnchors
    for (let i = 0; i < city.length; i += 9) {
      const a = city[i]
      if (a) sparkAnchors.push(a)
    }
    const heads = anchors
      ? anchors.heads.map((h) => ({ ...h, x: h.x + mp.x + this.cam.x, y: h.y + mp.y + this.cam.y }))
      : []
    this.fx.update(dt, t, {
      heads,
      base: { x: L.base.x, y: L.base.y - u, w: u * 9 },
      anchors: sparkAnchors,
      mobile: this.mobile,
    })
    if (mon) this.fx.drawBeams(g, t, ox, oy)
    this.fx.draw(g, t, ox, oy)

    if (this.palcheck && t > this.palcheckAt) {
      this.palcheckAt = t + 2
      const n = countOffPalette(g, this.W, this.H)
      console.info(`[palcheck] pixels fora da paleta: ${n} de ${this.W * this.H}`)
    }
  }

  private drawFlag(g: CanvasRenderingContext2D, t: number, x: number, y: number, u: number) {
    const poleH = Math.round(u * 3.4)
    const px = Math.round(x)
    const top = Math.round(y) - poleH
    g.fillStyle = HEX.stone3
    g.fillRect(px, top, 1, poleH)
    g.fillStyle = HEX.stone1
    g.fillRect(px + 1, top, 1, poleH)
    g.fillStyle = HEX.redHot
    g.fillRect(px + 2, top + Math.round(poleH * 0.55), 1, Math.round(poleH * 0.45))
    g.fillStyle = HEX.goldHi
    g.fillRect(px, top - 2, 2, 2)
    g.fillStyle = HEX.gold1
    g.fillRect(px + 1, top - 1, 1, 1)
    const f = this.reduced ? 0 : Math.floor(t * 10) % this.flag.frames.length
    const fr = this.flag.frames[f]
    if (fr) g.drawImage(fr, px + 2, top + 1 - this.flag.yOff)
  }

  private drawCrown(g: CanvasRenderingContext2D, t: number, x: number, y: number) {
    let spr = this.crownSpr
    let dy = 0
    if (this.crownDrop >= 0 && !this.crownLanded) {
      const k = (t - this.crownDrop) / 1.1
      if (k >= 1) {
        this.crownLanded = true
        this.crownDrop = -1
        this.fx.goldBurst(x, y)
      } else {
        dy = -(1 - bounce2(k)) * this.H * 0.45
        // squash no impacto (≈80 ms em cada quique)
        if (k > 0.5 && Math.abs(dy) < 1.5) spr = this.crownSquash
      }
    } else {
      // flutua ±1 px em degraus de 0,6 s
      dy = Math.floor(t / 0.6) % 2 === 0 ? 0 : -1
      // brilho atravessando a cada 4 s
      const sh = Math.floor(((t % 4) - 3.2) * 15)
      if (!this.reduced && sh >= 0 && sh < this.crownShine.length) spr = this.crownShine[sh] ?? spr
    }
    g.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height / 2 + dy))
  }

  dispose() {
    this.disposed = true
    this.mon?.dispose()
    this.mon = null
  }

  /** move a origem do layout do monumento (usado no fallback e nos stills) */
  get layout() {
    return this.bd.L
  }
  get pad() {
    return PAD
  }
}

function bounce2(k: number) {
  // queda + 2 quiques
  if (k < 0.55) return (k / 0.55) ** 2
  if (k < 0.8) {
    const q = (k - 0.675) / 0.125
    return 1 - 0.12 * (1 - q * q)
  }
  const q = (k - 0.9) / 0.1
  return 1 - 0.035 * Math.max(0, 1 - q * q)
}

function shineFrames(src: HTMLCanvasElement) {
  const w = src.width
  const h = src.height
  const g0 = src.getContext('2d')
  if (!g0) return []
  const base = g0.getImageData(0, 0, w, h)
  const gold = new Set([U32.gold, U32.gold1, U32.goldHi, U32.sparkle])
  const frames: HTMLCanvasElement[] = []
  for (let f = 0; f < 10; f++) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) continue
    const img = new ImageData(new Uint8ClampedArray(base.data), w, h)
    const d = new Uint32Array(img.data.buffer)
    const pos = f * 4 - h
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (!gold.has(d[i] ?? 0)) continue
        const band = x + y - pos - h * 0.5
        if (band >= 0 && band < 2) d[i] = U32.white
        else if (band >= 2 && band < 3) d[i] = U32.goldHi
      }
    g.putImageData(img, 0, 0)
    frames.push(c)
  }
  return frames
}

export function countOffPalette(g: CanvasRenderingContext2D, W: number, H: number) {
  const d = new Uint32Array(g.getImageData(0, 0, W, H).data.buffer)
  let n = 0
  for (let i = 0; i < d.length; i++) if (!PAL_SET.has(d[i] ?? 0)) n++
  return n
}

export function webgl2() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    const ok = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return ok
  } catch {
    return false
  }
}

/** mundos de quadro parado em cache por tamanho (cenário assado + monumento já compilado) */
const stillCache = new Map<string, World>()

/**
 * Quadro parado da cena do título para cards de compartilhar: cenário + monumento em escala de
 * pixel inteira. `progress` 0..1 reconstrói o 13; `crown` liga/desliga a coroa (padrão: só no 1);
 * `monument: false` devolve só o cenário. Determinístico: o mesmo pedido gera o mesmo card.
 */
export async function renderHeroStill(
  width: number,
  height: number,
  opts: { progress?: number; crown?: boolean; monument?: boolean; seed?: number } = {},
): Promise<HTMLCanvasElement> {
  width = Math.max(32, Math.floor(width) || 1200)
  height = Math.max(32, Math.floor(height) || 630)
  const s = Math.max(1, Math.round(Math.min(width, height) / 270))
  const W = Math.ceil(width / s)
  const H = Math.ceil(height / s)
  const key = `${W}x${H}`
  let world = stillCache.get(key)
  if (!world) {
    world = new World(document.createElement('canvas'), W, H, { reduced: false, mobile: false, still: true })
    stillCache.set(key, world)
    // no máximo 2 tamanhos vivos (cada um segura um contexto WebGL)
    if (stillCache.size > 2) {
      const [oldKey, old] = stillCache.entries().next().value as [string, World]
      old.dispose()
      stillCache.delete(oldKey)
    }
  }
  const p = Math.max(0, Math.min(1, opts.progress ?? 1))
  const withMonument = opts.monument !== false
  if (withMonument) await world.loadMonument()
  else world.dropMonument()
  world.setProgress(p)
  world.setCrown(opts.crown ?? p >= 1)
  world.fx.reseed(opts.seed ?? 1313)
  // enche o ar de brasas e faíscas sem desenhar, depois um único quadro
  let t = 5.2
  // fixa a posição das fitas no instante inicial (senão herda o card anterior)
  world.mon?.render(t)
  for (let i = 0; i < 50; i++) {
    t += 1 / 30
    world.simulate(t, 1 / 30)
  }
  world.frame(t, 0)
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const g = out.getContext('2d')
  if (g) {
    g.imageSmoothingEnabled = false
    g.drawImage(world.canvas, 0, 0, W * s, H * s)
  }
  return out
}
