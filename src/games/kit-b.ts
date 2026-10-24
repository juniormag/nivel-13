// Kit dos minijogos B (linha, memoria, raiox, escudo, pegar, chefe): texturas pixel feitas em código
// com paleta mestra, contorno seletivo e rim light, brasas que reagem ao ponteiro, brilhos de 4 pontas,
// destroços com gravidade, timers no tempo do jogo (respeitam pausa e hit-stop) e retorno tátil no DOM.
// Regras: docs/research/visual.md (paleta §2, brilho 15–16, squash 24, hit-stop 28, acessibilidade 34).
import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { px, tex, texFromCanvas } from '../engine/textures'
import type { GameCtx } from '../engine/types'
import { hex, PALETTE } from '../lib/palette'

export const P = PALETTE
export type Col = number

/** cor da paleta em CSS */
export const css = (n: Col) => `#${n.toString(16).padStart(6, '0')}`

/** letras dos sprites de src/lib/sprites.ts trocadas pela paleta mestra */
export const PALMAP: Record<string, string> = {
  k: hex('void'),
  w: hex('stoneHi'),
  g: hex('stone3'),
  G: hex('stone2'),
  D: hex('night'),
  r: hex('red'),
  R: hex('crimsonDeep'),
  p: hex('redGlow'),
  y: hex('gold'),
  Y: hex('gold1'),
  o: hex('ember'),
  b: hex('emberDark'),
  B: hex('gold0'),
  e: hex('green'),
  E: hex('vine1'),
  u: hex('blue1'),
  U: hex('blue0'),
  c: hex('sparkle'),
  s: hex('emberBright'),
  S: hex('emberDark'),
  x: hex('stone3'),
}
export const ptex = (name: string, extra?: Record<string, string>) =>
  tex(name, extra ? { ...PALMAP, ...extra } : PALMAP)

/** rampa do fogo/energia por idade (regra 27) */
export const FIRE: Col[] = [P.white, P.goldHi, P.emberBright, P.ember, P.red, P.crimson, P.blood1]

// ---------- easing ----------
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)
export const easeInQuad = (t: number) => t * t
export const easeOutBack = (t: number, s = 1.70158) => {
  const u = t - 1
  return 1 + (s + 1) * u * u * u + s * u * u
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Curva de dificuldade 0..1: 10 s fáceis (até 0,2), sobe com smoothstep até o pico aos 70% do tempo
 * e afrouxa para ~0,82 no fim (final generoso, GAME-DESIGN "Regras de sensação").
 */
export function ramp(t: number, dur: number, easyS = 10) {
  const e = Math.min(0.45, easyS / dur)
  const u = clamp01(t / dur)
  if (u < e) return 0.2 * (u / e)
  if (u < 0.7) {
    const k = (u - e) / (0.7 - e)
    return 0.2 + 0.8 * k * k * (3 - 2 * k)
  }
  return 1 - 0.6 * (u - 0.7)
}

/** hit-stop respeitando movimento reduzido (máx. 60 ms, regra 34) */
export function stop(c: GameCtx, ms: number) {
  c.fx.hitstop(c.reduced ? Math.min(60, ms) : ms)
}

/** limita clarões de tela a 3 por segundo (WCAG 2.3.1) e some em movimento reduzido */
let lastFlashes: number[] = []
export function flash(c: GameCtx, color: Col, ms = 120, alpha = 0.3) {
  if (c.reduced) return
  const now = performance.now()
  lastFlashes = lastFlashes.filter((t) => now - t < 1000)
  if (lastFlashes.length >= 3) return
  lastFlashes.push(now)
  c.fx.flash(color, ms, alpha)
}

// ---------- texto pixel ----------
export function label(text: string, color: Col = P.stoneHi, size = 8, stroke: Col = P.void) {
  const t = new Text({
    text,
    style: {
      fontFamily: 'Silkscreen',
      fontSize: size,
      fill: color,
      stroke: { color: stroke, width: 2 },
      align: 'center',
    },
    resolution: 1,
    textureStyle: { scaleMode: 'nearest' },
  })
  t.anchor.set(0.5)
  t.roundPixels = true
  return t
}

/** retângulo sólido de 1 px ampliado (para barras e blocos) */
export function block(color: Col, w = 1, h = 1, alpha = 1) {
  const s = new Sprite(px())
  s.tint = color
  s.width = w
  s.height = h
  s.alpha = alpha
  return s
}

/** posiciona um sprite com escala de squash/stretch sem pixel fracionário (regra 24). Base no pé. */
export function squashTo(
  s: Sprite,
  cx: number,
  footY: number,
  baseW: number,
  baseH: number,
  sx: number,
  sy: number,
) {
  const w = Math.max(1, Math.round(baseW * sx))
  const h = Math.max(1, Math.round(baseH * sy))
  s.width = w
  s.height = h
  s.x = Math.round(cx - w / 2)
  s.y = Math.round(footY - h)
}

// ---------- pintor de texturas pixel ----------
export class Painter {
  readonly c: HTMLCanvasElement
  readonly g: CanvasRenderingContext2D
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.c = document.createElement('canvas')
    this.c.width = w
    this.c.height = h
    const g = this.c.getContext('2d', { willReadFrequently: true })
    if (!g) throw new Error('canvas 2d indisponível')
    g.imageSmoothingEnabled = false
    this.g = g
  }
  rect(x: number, y: number, w: number, h: number, col: Col) {
    this.g.fillStyle = css(col)
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    return this
  }
  dot(x: number, y: number, col: Col) {
    return this.rect(x, y, 1, 1, col)
  }
  /** elipse cheia, rasterizada por linha (sem antialias) */
  ellipse(cx: number, cy: number, rx: number, ry: number, col: Col) {
    for (let y = -ry; y <= ry; y++) {
      const k = 1 - (y * y) / (ry * ry + 0.0001)
      if (k < 0) continue
      const hw = Math.round(rx * Math.sqrt(k))
      this.rect(cx - hw, cy + y, hw * 2 + 1, 1, col)
    }
    return this
  }
  line(x0: number, y0: number, x1: number, y1: number, col: Col) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++)
      this.dot(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col)
    return this
  }
  /** xadrez 50% (dither de halo, regra 17) */
  dither(x: number, y: number, w: number, h: number, col: Col, phase = 0) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if ((i + j + phase) % 2 === 0) this.dot(x + i, y + j, col)
    return this
  }
  private data() {
    return this.g.getImageData(0, 0, this.w, this.h)
  }
  /**
   * Contorno seletivo (regra 14): pixels vazios vizinhos da forma recebem `dark`; do lado de cima/esquerda
   * (luz) recebem `lit` se dado.
   */
  outline(dark: Col, lit?: Col) {
    const d = this.data()
    const a = (x: number, y: number) =>
      x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : (d.data[(y * this.w + x) * 4 + 3] ?? 0)
    const marks: [number, number, Col][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (a(x, y) > 0) continue
        const below = a(x, y + 1) > 0 || a(x + 1, y) > 0
        const any = below || a(x, y - 1) > 0 || a(x - 1, y) > 0
        if (!any) continue
        const onlyLitSide = below && !(a(x, y - 1) > 0 || a(x - 1, y) > 0)
        marks.push([x, y, lit !== undefined && onlyLitSide ? lit : dark])
      }
    for (const [x, y, col] of marks) this.dot(x, y, col)
    return this
  }
  /** rim light de 1 px nos pixels da borda voltados para `dir` (regra 12) */
  rim(col: Col, dir: 'r' | 'l' | 't' | 'b') {
    const d = this.data()
    const a = (x: number, y: number) =>
      x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : (d.data[(y * this.w + x) * 4 + 3] ?? 0)
    const [dx, dy] = dir === 'r' ? [1, 0] : dir === 'l' ? [-1, 0] : dir === 't' ? [0, -1] : [0, 1]
    const marks: [number, number][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (a(x, y) > 0 && a(x + dx, y + dy) === 0) marks.push([x, y])
    for (const [x, y] of marks) this.dot(x, y, col)
    return this
  }
}

/** textura pixel cacheada desenhada por `draw` */
export function bake(key: string, w: number, h: number, draw: (p: Painter) => void): Texture {
  return texFromCanvas(`kitb|${key}`, () => {
    const p = new Painter(w, h)
    draw(p)
    return p.c
  })
}

/** gira um sprite de texto pré-renderizando o quadro (vizinho mais próximo, sem mixel, regra 4) */
export function bakeRotated(key: string, src: Texture, ang: number): Texture {
  return texFromCanvas(`kitb|rot|${key}|${ang.toFixed(3)}`, () => {
    const res = src.source.resource as CanvasImageSource & { width: number; height: number }
    const sw = res.width
    const sh = res.height
    const tmp = document.createElement('canvas')
    tmp.width = sw
    tmp.height = sh
    const tg = tmp.getContext('2d', { willReadFrequently: true })
    const size = Math.ceil(Math.hypot(sw, sh)) + 2
    const out = document.createElement('canvas')
    out.width = size
    out.height = size
    const og = out.getContext('2d')
    if (!tg || !og) return out
    tg.drawImage(res, 0, 0)
    const sd = tg.getImageData(0, 0, sw, sh).data
    const od = og.createImageData(size, size)
    const cos = Math.cos(-ang)
    const sin = Math.sin(-ang)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const rx = x + 0.5 - size / 2
        const ry = y + 0.5 - size / 2
        const sx = Math.floor(rx * cos - ry * sin + sw / 2)
        const sy = Math.floor(rx * sin + ry * cos + sh / 2)
        if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue
        const si = (sy * sw + sx) * 4
        const oi = (y * size + x) * 4
        od.data[oi] = sd[si] ?? 0
        od.data[oi + 1] = sd[si + 1] ?? 0
        od.data[oi + 2] = sd[si + 2] ?? 0
        od.data[oi + 3] = sd[si + 3] ?? 0
      }
    og.putImageData(od, 0, 0)
    return out
  })
}

// ---------- timers no tempo do jogo ----------
export class Timers {
  private list: { t: number; fn: () => void }[] = []
  after(sec: number, fn: () => void) {
    this.list.push({ t: sec, fn })
  }
  update(dt: number) {
    if (!this.list.length) return
    const due: (() => void)[] = []
    for (const it of this.list) {
      it.t -= dt
      if (it.t <= 0) due.push(it.fn)
    }
    if (due.length) this.list = this.list.filter((it) => it.t > 0)
    for (const fn of due) fn()
  }
  clear() {
    this.list = []
  }
}

// ---------- brilho de 4 pontas (regra 26) ----------
interface Spark {
  g: Graphics
  t: number
  frame: number
  long: number
  alive: boolean
}
const SPARK_FRAMES = 6
export class Sparkles {
  readonly root = new Container()
  private pool: Spark[] = []
  constructor(private reduced: boolean) {
    this.root.blendMode = 'add'
  }
  /** `long` > 0 desenha raios finos longos como na referência (estrela de cruz) */
  spawn(x: number, y: number, long = 0) {
    let s = this.pool.find((p) => !p.alive)
    if (!s) {
      if (this.pool.length >= (this.reduced ? 6 : 40)) return
      s = { g: new Graphics(), t: 0, frame: -1, long: 0, alive: false }
      this.root.addChild(s.g)
      this.pool.push(s)
    }
    s.alive = true
    s.t = 0
    s.frame = -1
    s.long = long
    s.g.x = Math.round(x)
    s.g.y = Math.round(y)
    s.g.visible = true
  }
  update(dt: number) {
    for (const s of this.pool) {
      if (!s.alive) continue
      s.t += dt
      const f = Math.floor(s.t * 12)
      if (f >= SPARK_FRAMES) {
        s.alive = false
        s.g.visible = false
        continue
      }
      if (f === s.frame) continue
      s.frame = f
      const g = s.g
      g.clear()
      const arm = [0, 1, 2, 3, 1, 0][f] ?? 0
      if (arm === 0) {
        g.rect(0, 0, 1, 1).fill(f === 0 ? P.goldHi : P.gold)
        continue
      }
      if (s.long && f >= 2 && f <= 4) {
        const L = Math.round(s.long * (f === 3 ? 1 : 0.6))
        g.rect(0, -L, 1, L * 2 + 1).fill({ color: P.redHot, alpha: 0.55 })
        g.rect(-Math.round(L * 0.6), 0, Math.round(L * 1.2) + 1, 1).fill({ color: P.redHot, alpha: 0.45 })
      }
      g.rect(-arm, 0, arm * 2 + 1, 1).fill(arm >= 3 ? P.gold : P.goldHi)
      g.rect(0, -arm, 1, arm * 2 + 1).fill(arm >= 3 ? P.gold : P.goldHi)
      if (arm >= 2) {
        g.rect(-arm + 1, 0, arm * 2 - 1, 1).fill(P.goldHi)
        g.rect(0, -arm + 1, 1, arm * 2 - 1).fill(P.goldHi)
      }
      g.rect(0, 0, 1, 1).fill(P.white)
    }
  }
}

// ---------- brasas interativas (reagem ao ponteiro) ----------
/**
 * Campo de brasas aditivas que sobem devagar (regra 27) e fogem do ponteiro; mexer o dedo solta faíscas.
 * Ouve o ponteiro na janela, então funciona também por cima das cartas DOM.
 */
export class Embers {
  readonly root = new Container()
  private sp: Sprite[] = []
  private x: Float32Array
  private y: Float32Array
  private vx: Float32Array
  private vy: Float32Array
  private life: Float32Array
  private max: Float32Array
  private ambient: number
  private px = -999
  private py = -999
  private lastX = -999
  private lastY = -999
  private off: (() => void) | null = null
  private ramp: Col[]

  constructor(
    private c: GameCtx,
    private area: { x0: number; y0: number; x1: number; y1: number },
    opts: { ambient?: number; sparks?: number; ramp?: Col[] } = {},
  ) {
    const small = c.W < 200
    this.ambient = Math.round((opts.ambient ?? 26) * (c.reduced ? 0.3 : small ? 0.7 : 1))
    const n = this.ambient + (c.reduced ? 6 : (opts.sparks ?? 30))
    this.ramp = opts.ramp ?? FIRE
    this.x = new Float32Array(n)
    this.y = new Float32Array(n)
    this.vx = new Float32Array(n)
    this.vy = new Float32Array(n)
    this.life = new Float32Array(n)
    this.max = new Float32Array(n)
    this.root.blendMode = 'add'
    for (let i = 0; i < n; i++) {
      const s = new Sprite(px())
      s.alpha = 0
      this.sp.push(s)
      this.root.addChild(s)
      this.life[i] = 1
      this.max[i] = 1
      if (i < this.ambient) this.respawn(i, true)
    }
  }

  /** escuta o ponteiro na janela (coordenadas lógicas = clientX / css, como o runner) */
  listen() {
    const mv = (e: PointerEvent) => this.pointer(e.clientX / this.c.css, e.clientY / this.c.css, false)
    const dn = (e: PointerEvent) => this.pointer(e.clientX / this.c.css, e.clientY / this.c.css, true)
    addEventListener('pointermove', mv, { passive: true })
    addEventListener('pointerdown', dn, { passive: true })
    this.off = () => {
      removeEventListener('pointermove', mv)
      removeEventListener('pointerdown', dn)
    }
    return this
  }

  private respawn(i: number, anywhere: boolean) {
    const a = this.area
    const r = this.c.rnd
    this.x[i] = a.x0 + r() * (a.x1 - a.x0)
    this.y[i] = anywhere ? a.y0 + r() * (a.y1 - a.y0) : a.y1 - r() * 6
    this.vx[i] = (r() - 0.5) * 4
    this.vy[i] = -(8 + r() * 12)
    this.max[i] = 0.9 + r() * 1.6
    this.life[i] = anywhere ? r() * (this.max[i] ?? 1) : 0
  }

  pointer(x: number, y: number, down: boolean) {
    const dx = x - this.lastX
    const dy = y - this.lastY
    const moved = Math.hypot(dx, dy)
    this.px = x
    this.py = y
    if (down || moved > 3) {
      const n = down ? 6 : Math.min(3, Math.floor(moved / 3))
      for (let k = 0; k < n; k++) this.spark(x, y, down ? 40 : 14, dx * 4, dy * 4)
    }
    this.lastX = x
    this.lastY = y
  }

  /** solta uma faísca; `speed` é a dispersão, (bvx,bvy) é a velocidade herdada */
  spark(x: number, y: number, speed = 30, bvx = 0, bvy = 0) {
    const n = this.sp.length
    let best = -1
    for (let i = this.ambient; i < n; i++)
      if ((this.life[i] ?? 0) >= (this.max[i] ?? 0)) {
        best = i
        break
      }
    if (best < 0) return
    const r = this.c.rnd
    const a = r() * Math.PI * 2
    const sp = speed * (0.3 + r())
    this.x[best] = x
    this.y[best] = y
    this.vx[best] = Math.cos(a) * sp + bvx * 0.2
    this.vy[best] = Math.sin(a) * sp + bvy * 0.2 - 10
    this.life[best] = 0
    this.max[best] = 0.35 + r() * 0.4
  }

  /** onda de choque: empurra as brasas para longe de (x, y) */
  blast(x: number, y: number, power = 120, radius = 60) {
    for (let i = 0; i < this.sp.length; i++) {
      const dx = (this.x[i] ?? 0) - x
      const dy = (this.y[i] ?? 0) - y
      const d = Math.hypot(dx, dy)
      if (d > radius || d < 0.01) continue
      const f = (1 - d / radius) * power
      this.vx[i] = (this.vx[i] ?? 0) + (dx / d) * f
      this.vy[i] = (this.vy[i] ?? 0) + (dy / d) * f
    }
  }

  update(dt: number, time: number) {
    const n = this.sp.length
    const rmp = this.ramp
    for (let i = 0; i < n; i++) {
      const s = this.sp[i] as Sprite
      let life = (this.life[i] ?? 0) + dt
      const max = this.max[i] ?? 1
      if (life >= max) {
        if (i < this.ambient) {
          this.respawn(i, false)
          life = 0
        } else {
          s.alpha = 0
          this.life[i] = max
          continue
        }
      }
      this.life[i] = life
      let vx = this.vx[i] ?? 0
      let vy = this.vy[i] ?? 0
      const x = this.x[i] ?? 0
      const y = this.y[i] ?? 0
      // fuga do ponteiro
      const dx = x - this.px
      const dy = y - this.py
      const d2 = dx * dx + dy * dy
      if (d2 < 400 && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = (1 - d / 20) * 260 * dt
        vx += (dx / d) * f
        vy += (dy / d) * f
      }
      if (i < this.ambient) {
        vx += Math.sin(time * 2 + i) * 6 * dt
        vx *= 1 - 1.5 * dt
        vy += (-(10 + (i % 7)) - vy) * 1.2 * dt
      } else {
        vy += 40 * dt
        vx *= 1 - 2 * dt
      }
      this.vx[i] = vx
      this.vy[i] = vy
      this.x[i] = x + vx * dt
      this.y[i] = y + vy * dt
      const k = life / max
      const ci = Math.min(rmp.length - 1, Math.floor((i < this.ambient ? 0.25 + k * 0.75 : k) * rmp.length))
      s.tint = rmp[ci] ?? P.red
      s.alpha = Math.min(0.7, (1 - k) * 1.2)
      s.x = Math.round(this.x[i] ?? 0)
      s.y = Math.round(this.y[i] ?? 0)
    }
  }

  destroy() {
    this.off?.()
    this.off = null
    this.root.destroy({ children: true })
  }
}

// ---------- destroços com gravidade (papel, madeira, moedas) ----------
interface Bit {
  s: Sprite
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  ground: number
  paper: boolean
}
export class Debris {
  readonly root = new Container()
  private bits: Bit[] = []
  constructor(private cap = 80) {}
  spawn(
    x: number,
    y: number,
    color: Col,
    vx: number,
    vy: number,
    w = 2,
    h = 1,
    life = 1.4,
    ground = 99999,
    texture?: Texture,
  ) {
    let b = this.bits.find((q) => q.life >= q.max)
    if (!b) {
      if (this.bits.length >= this.cap) return
      const s = new Sprite(px())
      this.root.addChild(s)
      b = { s, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, ground: 0, paper: true }
      this.bits.push(b)
    }
    b.s.texture = texture ?? px()
    b.paper = !texture
    if (texture) {
      b.s.width = texture.width
      b.s.height = texture.height
      b.s.tint = 0xffffff
    } else {
      b.s.width = w
      b.s.height = h
      b.s.tint = color
    }
    b.s.visible = true
    b.s.alpha = 1
    b.x = x
    b.y = y
    b.vx = vx
    b.vy = vy
    b.life = 0
    b.max = life
    b.ground = ground
    b.s.x = Math.round(x)
    b.s.y = Math.round(y)
  }
  /** estouro radial de pedaços, mais para cima */
  burst(
    x: number,
    y: number,
    colors: Col[],
    n: number,
    speed: number,
    rnd: () => number,
    ground = 99999,
    life = 1.4,
  ) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.6
      const sp = speed * (0.35 + rnd() * 0.9)
      const big = rnd() < 0.35
      this.spawn(
        x + (rnd() - 0.5) * 6,
        y + (rnd() - 0.5) * 6,
        colors[i % colors.length] ?? P.stoneHi,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        big ? 3 : 2,
        big ? 2 : 1,
        life * (0.7 + rnd() * 0.6),
        ground,
      )
    }
  }
  update(dt: number) {
    for (const b of this.bits) {
      if (b.life >= b.max) continue
      b.life += dt
      if (b.life >= b.max) {
        b.s.visible = false
        continue
      }
      b.vy += 220 * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.y >= b.ground) {
        b.y = b.ground
        b.vy = -b.vy * 0.3
        b.vx *= 0.6
        if (Math.abs(b.vy) < 12) b.vy = 0
      }
      // papel tomba trocando largura e altura (sem girar sprite, regra 4)
      if (b.paper && b.vy !== 0 && Math.floor(b.life * 14) % 2 === 0 && b.s.width !== b.s.height) {
        const w = b.s.width
        b.s.width = b.s.height
        b.s.height = w
      }
      b.s.x = Math.round(b.x)
      b.s.y = Math.round(b.y)
      b.s.alpha = clamp01((b.max - b.life) / 0.4)
    }
  }
  clear() {
    for (const b of this.bits) {
      b.life = b.max
      b.s.visible = false
    }
  }
}

// ---------- energia (traço com núcleo branco → vermelho → vermelho escuro) ----------
/** desenha um ponto de energia em 3 camadas (regra 15) numa Graphics aditiva */
export function energyDot(
  g: Graphics,
  x: number,
  y: number,
  core: Col = P.sparkle,
  body: Col = P.redHot,
  halo: Col = P.crimson,
) {
  const X = Math.round(x)
  const Y = Math.round(y)
  g.rect(X - 1, Y - 1, 3, 3).fill({ color: halo, alpha: 0.35 })
  g.rect(X, Y - 1, 1, 3).fill({ color: body, alpha: 0.7 })
  g.rect(X - 1, Y, 3, 1).fill({ color: body, alpha: 0.7 })
  g.rect(X, Y, 1, 1).fill(core)
}

// ---------- DOM ----------
type Attrs = Record<string, string> | null
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs,
  ...kids: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  for (const k of kids) e.append(k)
  if (e instanceof HTMLButtonElement) e.type = 'button'
  return e
}

const reducedDom = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** pressionar: 0,92 em 60 ms e volta com 8% de overshoot em 150 ms (regra 32) */
export function tactile(b: HTMLElement) {
  const down = () => {
    if (reducedDom()) return
    b.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.92)' }], {
      duration: 60,
      easing: 'ease-out',
      fill: 'forwards',
    })
  }
  const up = () => {
    if (reducedDom()) return
    b.animate(
      [{ transform: 'scale(0.92)' }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'scale(1)' }],
      {
        duration: 150,
        easing: 'steps(5, end)',
        fill: 'forwards',
      },
    )
  }
  b.addEventListener('pointerdown', down)
  b.addEventListener('pointerup', up)
  b.addEventListener('pointerleave', up)
}

/** pulso dourado em degraus (acerto) */
export function goldPulse(e: HTMLElement, settle = 'var(--leaf)') {
  const g = css(P.gold)
  const hi = css(P.goldHi)
  const r = reducedDom()
  e.animate(
    [
      {
        boxShadow: `0 0 0 2px ${hi}, 0 0 0 6px ${g}`,
        transform: r ? 'none' : 'scale(1.1)',
        filter: 'brightness(1.6)',
      },
      {
        boxShadow: `0 0 0 2px ${g}, 0 0 0 10px ${css(P.gold1)}`,
        transform: r ? 'none' : 'scale(0.98)',
        filter: 'brightness(1.2)',
      },
      { boxShadow: `0 0 0 2px ${settle}`, transform: 'scale(1)', filter: 'brightness(1)' },
    ],
    { duration: 420, easing: 'steps(6, end)' },
  )
}

/** pulso de dica: contorno dourado que pisca algumas vezes */
export function hintPulse(e: HTMLElement, times = 4) {
  e.animate(
    [
      { boxShadow: `0 0 0 3px ${css(P.goldHi)}` },
      { boxShadow: `0 0 0 3px ${css(P.gold1)}` },
      { boxShadow: `0 0 0 3px ${css(P.goldHi)}` },
    ],
    { duration: 500, iterations: times, easing: 'steps(2, end)' },
  )
  e.style.boxShadow = `0 0 0 3px ${css(P.gold)}`
}

/** tremida de erro em degraus */
export function shakeEl(e: HTMLElement) {
  if (reducedDom()) return
  e.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 300, easing: 'steps(6, end)' },
  )
}

/** virada de carta em degraus: fecha (scaleX→0), troca a face no meio e abre */
export function flipEl(e: HTMLElement, mid: () => void) {
  if (reducedDom()) {
    mid()
    return
  }
  const a = e.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.05)' }], {
    duration: 90,
    easing: 'steps(3, end)',
    fill: 'forwards',
  })
  a.onfinish = () => {
    mid()
    const b = e.animate(
      [{ transform: 'scaleX(0.05)' }, { transform: 'scaleX(1.06)', offset: 0.7 }, { transform: 'scaleX(1)' }],
      {
        duration: 120,
        easing: 'steps(4, end)',
      },
    )
    b.onfinish = () => a.cancel()
  }
}

/** retângulo de um elemento DOM em pixels lógicos */
export function domRect(c: GameCtx, e: Element) {
  const r = e.getBoundingClientRect()
  return {
    x: r.left / c.css,
    y: r.top / c.css,
    w: r.width / c.css,
    h: r.height / c.css,
    cx: (r.left + r.width / 2) / c.css,
    cy: (r.top + r.height / 2) / c.css,
  }
}

// ---------- explosão: 1 quadro branco, anel, e depois quase só fumaça (x-craft §5) ----------
interface Boom {
  g: Graphics
  x: number
  y: number
  r: number
  frames: number
  t: number
  last: number
  puffs: { dx: number; dy: number; r: number; rise: number }[]
}
export class Explosions {
  readonly root = new Container()
  private list: Boom[] = []
  constructor(private c: GameCtx) {}
  /** r = raio do disco de impacto em px lógicos */
  spawn(x: number, y: number, r = 10) {
    const g = new Graphics()
    this.root.addChild(g)
    const n = 5 + Math.floor(this.c.rnd() * 4)
    const puffs = []
    for (let i = 0; i < n; i++) {
      const a = this.c.rnd() * Math.PI * 2
      const d = r * (0.2 + this.c.rnd() * 0.7)
      puffs.push({
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d * 0.7,
        r: r * (0.33 + this.c.rnd() * 0.17),
        rise: 6 + this.c.rnd() * 4,
      })
    }
    this.list.push({ g, x: Math.round(x), y: Math.round(y), r, frames: 0, t: 0, last: -1, puffs })
  }
  private disc(g: Graphics, cx: number, cy: number, r: number, mask: number) {
    const R = Math.max(1, Math.round(r))
    for (let y = -R; y <= R; y++) {
      const hw = Math.round(Math.sqrt(Math.max(0, R * R - y * y)))
      if (mask === 0) g.rect(cx - hw, cy + y, hw * 2 + 1, 1)
      else
        for (let x = -hw; x <= hw; x++)
          if ((((x + y) % mask) + mask) % mask === 0) g.rect(cx + x, cy + y, 1, 1)
    }
  }
  update(dt: number) {
    for (const b of this.list) {
      b.frames++
      b.t += dt
      const g = b.g
      // quadro 1: disco branco (1 quadro a 60 Hz); em movimento reduzido vira um tom claro a 30%
      if (b.frames === 1) {
        g.clear()
        this.disc(g, b.x, b.y, b.r, 0)
        g.fill(this.c.reduced ? { color: P.sparkle, alpha: 0.3 } : P.white)
        continue
      }
      if (b.frames === 2) {
        g.clear()
        const n = Math.round(b.r * 1.4 * 6.28)
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2
          g.rect(Math.round(b.x + Math.cos(a) * b.r * 1.4), Math.round(b.y + Math.sin(a) * b.r * 1.4), 1, 1)
        }
        g.fill(P.goldHi)
        this.c.fx.burst(b.x, b.y, P.goldHi, 8, 60)
        continue
      }
      // quadros 3–14 a 15 fps: fumaça violeta com a parte de baixo acesa pelo fogo
      const f = Math.floor(b.t * 15)
      if (f === b.last) continue
      b.last = f
      g.clear()
      if (f >= 12) continue
      const k = f / 12
      const mask = f >= 11 ? 4 : f >= 9 ? 2 : 0
      for (const p of b.puffs) {
        const r = p.r * (1 - k * 0.6) + 0.5
        const cx = Math.round(b.x + p.dx * (1 + k * 0.6))
        const cy = Math.round(b.y + p.dy - p.rise * k * 1.4)
        this.disc(g, cx, cy + 1, r, mask)
        g.fill(P.crimsonDeep)
        this.disc(g, cx, cy, r, mask)
        g.fill(k < 0.3 ? P.haze : P.hazeDark)
        if (r > 2 && mask === 0) {
          g.rect(cx - 1, cy - Math.round(r) + 1, 2, 1)
          g.fill(P.stone1)
        }
      }
    }
    const dead = this.list.filter((b) => b.t > 0.85)
    for (const d of dead) d.g.destroy()
    if (dead.length) this.list = this.list.filter((b) => b.t <= 0.85)
  }
}

// ---------- contador que sobe (estilo Balatro): número com cor por faixa de combo ----------
interface Pop {
  t: Text
  x: number
  y: number
  life: number
  big: boolean
}
/** cor do número pela sequência: pedra → ouro → brasa → vermelho quente */
export const tierColor = (combo: number): Col =>
  combo >= 10 ? P.redHot : combo >= 6 ? P.emberBright : combo >= 3 ? P.gold : P.stoneHi

export class ScorePops {
  readonly root = new Container()
  private pops: Pop[] = []
  constructor(private c: GameCtx) {}
  /**
   * soma os pontos e mostra o número com pop (escala inteira 2 → 1 em 60 ms) e a sequência "x5" ao lado;
   * a partir de 6 a sequência solta brasas para cima (chama de Balatro em pixel)
   */
  score(n: number, x: number, y: number, combo = 0, embers?: Embers) {
    this.c.addScore(n)
    const col = tierColor(combo)
    this.add(`+${n}`, x, y, col, combo >= 3)
    if (combo >= 2) this.add(`x${combo}`, x + 14, y - 7, combo >= 6 ? P.redHot : P.gold, false)
    if (embers && combo >= 6)
      for (let i = 0; i < Math.min(12, combo); i++) embers.spark(x + (this.c.rnd() - 0.5) * 10, y, 10, 0, -90)
  }
  add(text: string, x: number, y: number, color: Col, big: boolean) {
    const t = label(text, color, 8)
    t.x = Math.round(x)
    t.y = Math.round(y)
    if (big && !this.c.reduced) t.scale.set(2)
    this.root.addChild(t)
    this.pops.push({ t, x: Math.round(x), y: Math.round(y), life: 0, big })
  }
  update(dt: number) {
    for (const p of this.pops) {
      p.life += dt
      if (p.big && p.life > 0.06) p.t.scale.set(1)
      p.t.y = Math.round(p.y - 16 * easeOutQuad(clamp01(p.life / 0.6)))
      p.t.alpha = clamp01((0.95 - p.life) / 0.25)
    }
    const dead = this.pops.filter((p) => p.life > 0.95)
    for (const d of dead) d.t.destroy()
    if (dead.length) this.pops = this.pops.filter((p) => p.life <= 0.95)
  }
}

/** tremor "feliz": só vertical (x-craft §23) */
export const joy = (c: GameCtx, px = 2, ms = 180) => c.fx.shake(px, ms, { x: 0, y: 1 })

/** impacto do motor (1 quadro branco e depois a cor) contando no limite de 3 clarões por segundo */
export function impact(c: GameCtx, color: Col) {
  if (c.reduced) return
  const now = performance.now()
  lastFlashes = lastFlashes.filter((t) => now - t < 1000)
  if (lastFlashes.length >= 2) return
  lastFlashes.push(now, now)
  c.fx.impact(color)
}
