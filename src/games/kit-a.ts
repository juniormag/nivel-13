// Kit dos minijogos A (swipe, ir, fogo, whack, ritmo, defesa): sprites procedurais com luz,
// brilho de energia aditivo, partículas que reagem ao dedo, curva de dificuldade e buffer de toque.
// Só cores de src/lib/palette.ts. Nada aqui aloca por quadro no laço quente.
import { Container, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { px, texFromCanvas } from '../engine/textures'
import type { GameCtx } from '../engine/types'
import { PALETTE as P } from '../lib/palette'
import { mulberry32 } from '../lib/rng'

export { P }

// ---------- DOM ----------
type Attrs = Record<string, string | ((e: Event) => void)> | null
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  ...kids: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs)
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v)
      else el.setAttribute(k, v)
    }
  for (const k of kids) if (k !== null && k !== undefined) el.append(k)
  return el
}

export const fmtBRL = (n: number, dec = 2) =>
  n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })

// ---------- rampas ----------
/** fogo/brasas por idade (regra 27): branco → ouro claro → brasa → laranja → vermelho → sangue */
export const FIRE = [P.white, P.goldHi, P.emberBright, P.ember, P.red, P.crimson, P.blood1] as const
/** energia vermelha da referência: núcleo branco → vermelho → vermelho escuro */
export const ENERGY = [P.white, P.redGlow, P.redHot, P.red, P.crimson, P.crimsonDeep] as const
export const GOLD = [P.white, P.sparkle, P.goldHi, P.gold, P.gold1, P.gold0] as const
export const WATER = [P.white, P.sparkle, P.blue1, P.blue1, P.blue0] as const
export const SMOKE = [P.stone3, P.stone2, P.stone1, P.stone0, P.hazeDark] as const
export const PAPER = [P.stoneHi, P.stoneHi, P.stone3, P.stone2, P.stone1] as const
export const LEAF = [P.leafHi, P.green, P.vine1, P.vine0] as const

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const clamp01 = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k)
export const easeOutBack = (k: number) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2
export const easeOutQuad = (k: number) => 1 - (1 - k) * (1 - k)
/** quadro de animação a `fps` (8–12 para personagens, 12–15 para efeitos) */
export const frameAt = (t: number, fps: number, n: number) => Math.floor(t * fps) % n

/**
 * Curva de dificuldade 0..1: fácil nos primeiros 10 s, pico em ~70% da duração e
 * leve alívio no fim (o jogador termina por cima).
 */
export function curve(t: number, dur: number) {
  const easyEnd = Math.min(10, dur * 0.35)
  const peak = dur * 0.7
  if (t < easyEnd) return 0.15 * (t / easyEnd)
  if (t < peak) {
    const k = (t - easyEnd) / (peak - easyEnd)
    return 0.15 + 0.85 * k * k * (3 - 2 * k)
  }
  return 1 - 0.15 * clamp01((t - peak) / (dur - peak))
}

// ---------- sprites procedurais ----------
export class Grid {
  readonly d: Int32Array
  constructor(
    readonly w: number,
    readonly h: number,
    empty = 0,
  ) {
    this.d = new Int32Array(w * h).fill(empty)
  }
  inb(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }
  get(x: number, y: number, out = 0) {
    return this.inb(x, y) ? (this.d[y * this.w + x] ?? out) : out
  }
  set(x: number, y: number, v: number) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.inb(x, y)) this.d[y * this.w + x] = v
  }
  rect(x: number, y: number, w: number, h: number, v: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, v)
    return this
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: number) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, v)
    return this
  }
  line(x0: number, y0: number, x1: number, y1: number, v: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, v)
    return this
  }
}

export interface Mat {
  /** escuro → claro, com hue shift (regra 7) */
  ramp: readonly number[]
  /** rim light de 1 px no lado direito (lado da energia) */
  rim?: number
  /** granulado de pedra 0..1 */
  grain?: number
  /** contorno; null = sem contorno */
  outline?: number | null
}

/**
 * Sombreamento direcional (luz de cima à esquerda, sem "pillow"): borda clara em cima/esquerda,
 * duas sombras em baixo/direita, contorno seletivo (mais claro do lado da luz) e rim light.
 */
export function shade(mask: Grid, mats: Record<number, Mat>, seed = 1): Grid {
  const out = new Grid(mask.w, mask.h, -1)
  const r = mulberry32(seed)
  for (let y = 0; y < mask.h; y++)
    for (let x = 0; x < mask.w; x++) {
      const m = mask.get(x, y)
      const mat = mats[m]
      if (!m || !mat) continue
      const L = mat.ramp.length
      const same = (dx: number, dy: number) => mask.get(x + dx, y + dy) === m
      let i = L - 2
      if (!same(-1, 0) || !same(0, -1)) i = L - 1
      else if (!same(1, 0) || !same(0, 1)) i = 1
      else if (L >= 5 && (!same(2, 0) || !same(0, 2) || !same(1, 1))) i = 2
      if (mat.grain && i > 0 && i < L - 1 && r() < mat.grain) i += r() < 0.7 ? -1 : 1
      let col = mat.ramp[Math.max(0, Math.min(L - 1, i))] ?? 0
      if (mat.rim !== undefined && mask.get(x + 1, y) === 0) col = mat.rim
      out.set(x, y, col)
    }
  for (let y = 0; y < mask.h; y++)
    for (let x = 0; x < mask.w; x++) {
      if (mask.get(x, y)) continue
      // vizinho material: direita/baixo → este pixel está no lado iluminado
      const right = mask.get(x + 1, y)
      const down = mask.get(x, y + 1)
      const left = mask.get(x - 1, y)
      const up = mask.get(x, y - 1)
      const m = right || down || left || up
      const mat = mats[m]
      if (!m || !mat || mat.outline === null) continue
      const lit = (right || down) && !(left || up)
      const ramp = mat.ramp
      out.set(x, y, mat.outline ?? (lit && ramp.length >= 4 ? (ramp[1] ?? 0) : (ramp[0] ?? 0)))
    }
  return out
}

function toCanvas(g: Grid) {
  const cv = document.createElement('canvas')
  cv.width = g.w
  cv.height = g.h
  const ctx = cv.getContext('2d')
  if (!ctx) return cv
  const img = ctx.createImageData(g.w, g.h)
  for (let i = 0; i < g.d.length; i++) {
    const c = g.d[i] ?? -1
    if (c < 0) continue
    img.data[i * 4] = (c >> 16) & 255
    img.data[i * 4 + 1] = (c >> 8) & 255
    img.data[i * 4 + 2] = c & 255
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return cv
}

/** textura de uma grade de cores (−1 transparente), em cache por chave */
export const gridTex = (key: string, make: () => Grid) => texFromCanvas(`kitA:${key}`, () => toCanvas(make()))

/** letras → cores da paleta para arte escrita à mão */
const LETTER: Record<string, number> = {
  k: P.void,
  n: P.night,
  d: P.dusk,
  h: P.hazeDark,
  z: P.haze,
  '1': P.blood0,
  '2': P.blood1,
  '3': P.crimsonDeep,
  '4': P.crimson,
  r: P.red,
  R: P.redHot,
  q: P.redGlow,
  e: P.emberDark,
  o: P.ember,
  O: P.emberBright,
  '5': P.gold0,
  '6': P.gold1,
  y: P.gold,
  Y: P.goldHi,
  s: P.sparkle,
  w: P.white,
  '7': P.stone0,
  '8': P.stone1,
  '9': P.stone2,
  t: P.stone3,
  T: P.stoneHi,
  v: P.vine0,
  V: P.vine1,
  g: P.green,
  G: P.leafHi,
  b: P.blue0,
  B: P.blue1,
}
export function rowsTex(key: string, rows: string[]) {
  return gridTex(key, () => {
    const w = Math.max(...rows.map((r) => r.length))
    const g = new Grid(w, rows.length, -1)
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = LETTER[row[x] ?? '.']
        if (c !== undefined) g.set(x, y, c)
      }
    })
    return g
  })
}

const subCache = new Map<string, Texture>()
/** recorte de uma textura (cache), para revelar sprites por linhas sem máscara */
export function subTex(key: string, t: Texture, x: number, y: number, w: number, h: number): Texture {
  const k = `${key}|${x},${y},${w},${h}`
  let s = subCache.get(k)
  if (!s) {
    s = new Texture({
      source: t.source,
      frame: new Rectangle(t.frame.x + x, t.frame.y + y, Math.max(1, w), Math.max(1, h)),
    })
    subCache.set(k, s)
  }
  return s
}

/**
 * Brilho em camadas (regra 15): núcleo branco, halo, corpo e queda pontilhada.
 * `ramp` vai do centro para fora. Use com blendMode 'add' e alfa ≤ 0,7.
 */
export function glowTex(r: number, ramp: readonly number[] = ENERGY) {
  return gridTex(`glow${r}|${ramp.join(',')}`, () => {
    const n = r * 2 + 1
    const g = new Grid(n, n, -1)
    const L = ramp.length
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const d = Math.hypot(x - r, y - r) / (r + 0.5)
        if (d > 1) continue
        const k = Math.min(L - 1, Math.floor(d ** 0.8 * L))
        // as duas faixas de fora são pontilhadas (xadrez e depois esparso)
        if (k >= L - 2 && (x + y) % 2 === 1) continue
        if (k === L - 1 && (x % 2 === 1 || y % 2 === 1)) continue
        g.set(x, y, ramp[k] ?? 0)
      }
    return g
  })
}

/** brilho de 4 pontas (regra 26): 6 quadros a 12 fps */
export function sparkleFrames(): Texture[] {
  const F = [
    ['.....', '.....', '..w..', '.....', '.....'],
    ['.....', '..Y..', '.YwY.', '..Y..', '.....'],
    ['..Y..', '..Y..', 'YYwYY', '..Y..', '..Y..'],
    ['...y...', '...Y...', '...Y...', 'yYYwYYy', '...Y...', '...Y...', '...y...'],
    ['.....', '..Y..', '.YsY.', '..Y..', '.....'],
    ['.....', '.....', '..y..', '.....', '.....'],
  ]
  return F.map((rows, i) => rowsTex(`spk${i}`, rows))
}

/** sombra pontilhada no chão (profundidade sem alfa) */
export function shadowTex(w: number) {
  return gridTex(`shadow${w}`, () => {
    const hh = Math.max(2, Math.round(w / 5))
    const g = new Grid(w, hh, -1)
    for (let y = 0; y < hh; y++)
      for (let x = 0; x < w; x++) {
        const d = ((x - (w - 1) / 2) / (w / 2)) ** 2 + ((y - (hh - 1) / 2) / (hh / 2)) ** 2
        if (d > 1) continue
        if (d > 0.55 && (x + y) % 2) continue
        g.set(x, y, P.void)
      }
    return g
  })
}

const COIN = [P.gold0, P.gold1, P.gold, P.goldHi, P.sparkle]
/** moeda 14×14 girando em 6 quadros (largura 12 → 2 px), sem rotação em tempo real (regra 4) */
export function coinFrames(): Texture[] {
  const widths = [12, 10, 6, 2, 6, 10]
  return widths.map((w, f) =>
    gridTex(`ir-coin${f}`, () => {
      const m = new Grid(14, 14)
      const cx = 6.5
      m.ellipse(cx, 6.5, w / 2, 6, 1)
      if (w >= 6) m.ellipse(cx, 6.5, Math.max(1, w / 2 - 2.2), 3.8, 2)
      const back = f > 3
      const g = shade(m, {
        1: { ramp: COIN, rim: P.redHot },
        2: { ramp: [P.gold0, P.gold1, P.gold1, P.gold, P.goldHi], outline: null },
      })
      // "13" estampado na face
      if (w >= 10 && !back) {
        g.rect(Math.round(cx) - 3, 4, 1, 5, P.gold1)
        g.rect(Math.round(cx) - 1, 4, 3, 1, P.gold1)
        g.rect(Math.round(cx) + 1, 5, 1, 4, P.gold1)
        g.rect(Math.round(cx) - 1, 6, 2, 1, P.gold1)
        g.rect(Math.round(cx) - 1, 8, 2, 1, P.gold1)
      }
      if (w >= 6) g.set(Math.round(cx - w / 2 + 2), 3, P.white)
      return g
    }),
  )
}

/**
 * Explosão 33×33 em 7 quadros a 15 fps: 1 quadro de impacto branco (segurado no hit-stop),
 * 1 quadro de fogo e depois quase tudo fumaça que se abre e se desfaz em pontilhado.
 */
export function boomFrames(ramp: readonly number[] = FIRE, smoke: readonly number[] = SMOKE): Texture[] {
  const R = [7, 11, 13, 14, 15, 16, 16]
  return R.map((r, f) =>
    gridTex(`boom2-${f}|${ramp[2]}|${smoke[0]}`, () => {
      const g = new Grid(33, 33, -1)
      const rr = mulberry32(f * 31 + 5)
      for (let y = 0; y < 33; y++)
        for (let x = 0; x < 33; x++) {
          // borda irregular: puff, não círculo perfeito
          const ang = Math.atan2(y - 16, x - 16)
          const edge = r * (1 + 0.12 * Math.sin(ang * 5 + f) + 0.06 * Math.sin(ang * 11 - f * 2))
          const d = Math.hypot(x - 16, y - 16 + (f >= 3 ? (f - 2) * 0.8 : 0))
          if (d > edge) continue
          const k = d / edge
          if (f === 0) {
            g.set(x, y, k < 0.55 ? P.white : k < 0.85 ? (ramp[1] ?? P.goldHi) : (ramp[2] ?? P.emberBright))
            continue
          }
          if (f === 1) {
            const idx = Math.min(ramp.length - 1, Math.floor(k * 4) + 1)
            if (k > 0.85 && (x + y) % 2) continue
            g.set(x, y, ramp[idx] ?? P.red)
            continue
          }
          // fumaça: oca por dentro, brasas só na borda de dentro, rarefaz a cada quadro
          const inner = edge * (0.25 + (f - 2) * 0.15)
          if (d < inner) continue
          const thin = (f - 2) * 0.16
          if (rr() < thin || (f >= 5 && (x + y) % 2)) continue
          const si = Math.min(smoke.length - 1, f - 2 + (k > 0.8 ? 1 : 0))
          const ember = f === 2 && d < inner + 1.5
          g.set(x, y, ember ? (ramp[4] ?? P.red) : (smoke[si] ?? P.stone1))
        }
      return g
    }),
  )
}

/** pool de explosões */
export class Booms {
  readonly root = new Container()
  private list: { s: Sprite; t: number; fr: Texture[] }[] = []
  constructor(n = 4) {
    const fr = boomFrames()
    for (let i = 0; i < n; i++) {
      const s = new Sprite(fr[0])
      s.anchor.set(0.5)
      s.visible = false
      this.root.addChild(s)
      this.list.push({ s, t: -1, fr })
    }
  }
  play(x: number, y: number, frames?: Texture[]) {
    const b = this.list.find((k) => k.t < 0) ?? this.list[0]
    if (!b) return
    if (frames) b.fr = frames
    b.t = 0
    b.s.x = Math.round(x)
    b.s.y = Math.round(y)
    b.s.texture = b.fr[0] as Texture
    b.s.visible = true
  }
  /** dt real: a explosão continua durante o hit-stop */
  update(dt: number) {
    for (const b of this.list) {
      if (b.t < 0) continue
      b.t += dt
      const tex = b.fr[Math.floor(b.t * 15)]
      if (!tex) {
        b.t = -1
        b.s.visible = false
      } else b.s.texture = tex
    }
  }
}

// ---------- sprites e texto ----------
export function spr(t: Texture, x = 0, y = 0, anchorX = 0.5, anchorY = 0.5) {
  const s = new Sprite(t)
  s.anchor.set(anchorX, anchorY)
  s.x = Math.round(x)
  s.y = Math.round(y)
  return s
}

/** squash/stretch com resultado em pixels inteiros (regra 24) */
export function setSquash(s: Sprite, sx: number, sy: number) {
  const tw = s.texture.frame.width
  const th = s.texture.frame.height
  s.width = Math.max(1, Math.round(tw * sx))
  s.height = Math.max(1, Math.round(th * sy))
}

/** pop de coleta: 1,25 → 1 em 180 ms com ease-out-back; antes, 60 ms de squash */
export function popScale(age: number): [number, number] {
  if (age < 0) return [1, 1]
  if (age < 0.06) return [1.25, 0.8]
  const k = clamp01((age - 0.06) / 0.18)
  const s = 1.25 - 0.25 * easeOutBack(k)
  return [s, s]
}

export function label(text: string, color: number = P.stoneHi, size = 8) {
  const t = new Text({
    text,
    style: {
      fontFamily: 'Silkscreen',
      fontSize: size,
      fill: color,
      stroke: { color: P.void, width: 2 },
      align: 'center',
    },
    resolution: 1,
    textureStyle: { scaleMode: 'nearest' },
  })
  t.anchor.set(0.5)
  return t
}

/** estoura partículas em várias cores de uma rampa (do quente para o frio) */
export function rampBurst(c: GameCtx, x: number, y: number, ramp: readonly number[], n = 16, speed = 60) {
  const per = Math.max(1, Math.round(n / ramp.length))
  ramp.forEach((col, i) => {
    c.fx.burst(x, y, col, per, speed * (1 - i * 0.08))
  })
}

// ---------- combo estilo Balatro ----------
/**
 * Contador de sequência: cada acerto em até `win` s soma 1; o número dá pop 1,15 → 1 em 120 ms,
 * esquenta pela rampa de fogo por faixa (3/6/10/15) e solta brasas a partir de 6.
 */
export class Combo {
  readonly text: Text
  n = 0
  private last = -9
  private popT = -9
  constructor(
    private c: GameCtx,
    private field: Field | null,
    private win = 1.2,
  ) {
    this.text = label('', P.emberBright)
    this.text.visible = false
  }
  /** registra um acerto; devolve o tamanho da sequência */
  hit(x: number, y: number) {
    const now = this.c.time
    this.n = now - this.last <= this.win ? this.n + 1 : 1
    this.last = now
    this.popT = now
    if (this.n >= 2) {
      this.text.text = `${this.n}x`
      this.text.x = Math.round(x)
      this.text.y = Math.round(y)
      this.text.visible = true
      if (this.n % 5 === 0) {
        this.c.fx.ring(x, y, P.redHot, 18 + Math.min(this.n, 20))
        this.c.fx.shake(2, 140, { x: 0, y: 1 })
      }
    }
    return this.n
  }
  reset() {
    this.n = 0
    this.text.visible = false
  }
  update() {
    const now = this.c.time
    if (now - this.last > this.win + 0.4) {
      this.text.visible = false
      if (now - this.last > this.win) this.n = 0
      return
    }
    if (!this.text.visible) return
    const age = now - this.popT
    const k = clamp01(age / 0.12)
    const s = 1.15 - 0.15 * easeOutQuad(k)
    this.text.scale.set(Math.round(s * 8) / 8)
    const tier = this.n >= 15 ? 0 : this.n >= 10 ? 1 : this.n >= 6 ? 2 : this.n >= 3 ? 3 : 4
    const ramp = [P.white, P.goldHi, P.emberBright, P.ember, P.stoneHi]
    this.text.style.fill = age < 0.034 ? P.white : (ramp[tier] ?? P.stoneHi)
    if (this.field && this.n >= 6 && this.c.rnd() < 0.2 + this.n * 0.02)
      this.field.ember(this.text.x + (this.c.rnd() - 0.5) * 14, this.text.y - 3)
  }
}

// ---------- buffer de toque (regra 31) ----------
/** guarda um toque que não acertou nada e tenta de novo por `ms` (100 ms) */
export class TapBuffer {
  private x = 0
  private y = 0
  private until = -1
  constructor(private ms = 0.1) {}
  push(x: number, y: number, now: number) {
    this.x = x
    this.y = y
    this.until = now + this.ms
  }
  /** chama `fn` enquanto o toque vale; devolve true quando consumiu, chama `miss` ao expirar */
  poll(now: number, fn: (x: number, y: number) => boolean, miss?: () => void) {
    if (this.until < 0) return
    if (fn(this.x, this.y)) this.until = -1
    else if (now > this.until) {
      this.until = -1
      miss?.()
    }
  }
  clear() {
    this.until = -1
  }
}

// ---------- partículas interativas ----------
interface Part {
  s: Sprite
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  ramp: readonly number[]
  grav: number
  drag: number
  wob: number
  ph: number
  alive: boolean
}

export interface SpawnOpts {
  vx?: number
  vy?: number
  life?: number
  ramp?: readonly number[]
  grav?: number
  drag?: number
  wob?: number
  size?: number
  add?: boolean
}

/**
 * Campo de partículas do jogo (brasas, faíscas, gotas, papel picado). Pool fixo, cor pela idade
 * ao longo de uma rampa, e o dedo empurra as partículas por perto (e solta faíscas ao arrastar).
 */
export class Field {
  readonly root = new Container()
  private ps: Part[] = []
  private next = 0
  private px0 = Number.NaN
  private py0 = 0
  private sparks: { s: Sprite; t: number }[] = []
  private spk: Texture[] = []
  private trailT = 0
  /** cor das faíscas do dedo (null = sem rastro) */
  trail: readonly number[] | null = ENERGY

  constructor(
    private c: GameCtx,
    max = c.W < 220 ? 130 : 200,
  ) {
    if (c.reduced) max = Math.round(max * 0.4)
    for (let i = 0; i < max; i++) {
      const s = new Sprite(px())
      s.visible = false
      this.root.addChild(s)
      this.ps.push({
        s,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        ramp: FIRE,
        grav: 0,
        drag: 0,
        wob: 0,
        ph: 0,
        alive: false,
      })
    }
    this.spk = sparkleFrames()
    for (let i = 0; i < 10; i++) {
      const s = new Sprite(this.spk[0])
      s.anchor.set(0.5)
      s.visible = false
      this.root.addChild(s)
      this.sparks.push({ s, t: -1 })
    }
  }

  spawn(x: number, y: number, o: SpawnOpts = {}) {
    const p = this.ps[this.next]
    if (!p) return
    this.next = (this.next + 1) % this.ps.length
    p.x = x
    p.y = y
    p.vx = o.vx ?? 0
    p.vy = o.vy ?? 0
    p.life = 0
    p.max = o.life ?? 1
    p.ramp = o.ramp ?? FIRE
    p.grav = o.grav ?? 0
    p.drag = o.drag ?? 0
    p.wob = o.wob ?? 0
    p.ph = Math.random() * 6.28
    p.alive = true
    const sz = o.size ?? 1
    p.s.width = sz
    p.s.height = sz
    p.s.blendMode = o.add ? 'add' : 'normal'
    p.s.visible = true
  }

  /** brasa subindo (regra 27): 8–20 px/s para cima, oscilação ±6 px/s, 0,6–1,4 s */
  ember(x: number, y: number, ramp: readonly number[] = FIRE) {
    const r = this.c.rnd
    this.spawn(x, y, {
      vx: (r() - 0.5) * 6,
      vy: -(8 + r() * 12),
      life: 0.6 + r() * 0.8,
      ramp,
      wob: 6,
      drag: 0.4,
      size: r() < 0.25 ? 2 : 1,
      add: true,
    })
  }

  /** explosão radial com rampa por idade */
  blast(x: number, y: number, n: number, speed: number, ramp: readonly number[], o: SpawnOpts = {}) {
    const r = this.c.rnd
    const count = this.c.reduced ? Math.min(n, 6) : n
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2
      const sp = speed * (0.35 + r() * 0.8)
      this.spawn(x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - speed * 0.25,
        life: 0.35 + r() * 0.5,
        ramp,
        grav: 90,
        drag: 1.5,
        size: r() < 0.3 ? 2 : 1,
        ...o,
      })
    }
  }

  sparkle(x: number, y: number) {
    const s = this.sparks.find((k) => k.t < 0)
    if (!s) return
    s.t = 0
    s.s.x = Math.round(x)
    s.s.y = Math.round(y)
    s.s.visible = true
  }

  /** dedo: empurra partículas num raio de 22 px e deixa faíscas ao arrastar rápido */
  pointer(x: number, y: number, isDown = false) {
    if (Number.isNaN(this.px0) || isDown) {
      this.px0 = x
      this.py0 = y
    }
    const vx = x - this.px0
    const vy = y - this.py0
    this.px0 = x
    this.py0 = y
    const R = 22
    for (const p of this.ps) {
      if (!p.alive) continue
      const dx = p.x - x
      const dy = p.y - y
      const d2 = dx * dx + dy * dy
      if (d2 > R * R) continue
      const d = Math.sqrt(d2) || 1
      const f = (1 - d / R) * (isDown ? 90 : 50)
      p.vx += (dx / d) * f + vx * 6
      p.vy += (dy / d) * f + vy * 6
    }
    const sp = Math.hypot(vx, vy)
    if (this.trail && sp > 2 && this.trailT <= 0) {
      this.trailT = 0.03
      const r = this.c.rnd
      for (let i = 0; i < 2; i++)
        this.spawn(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, {
          vx: -vx * 3 + (r() - 0.5) * 20,
          vy: -vy * 3 + (r() - 0.5) * 20 - 10,
          life: 0.25 + r() * 0.3,
          ramp: this.trail,
          drag: 3,
          add: true,
        })
    }
  }

  update(dt: number) {
    this.trailT -= dt
    for (const p of this.ps) {
      if (!p.alive) continue
      p.life += dt
      if (p.life >= p.max) {
        p.alive = false
        p.s.visible = false
        continue
      }
      const k = p.life / p.max
      p.vy += p.grav * dt
      const dr = 1 - Math.min(1, p.drag * dt)
      p.vx *= dr
      p.vy *= dr
      p.x += (p.vx + (p.wob ? Math.sin(p.life * 7 + p.ph) * p.wob : 0)) * dt
      p.y += p.vy * dt
      p.s.x = Math.round(p.x)
      p.s.y = Math.round(p.y)
      const L = p.ramp.length
      p.s.tint = p.ramp[Math.min(L - 1, Math.floor(k * L))] ?? 0xffffff
      // aditivo nunca acima de 70% (regra 16); as últimas fases somem em degraus
      p.s.alpha = p.s.blendMode === 'add' ? (k > 0.8 ? 0.35 : 0.7) : k > 0.85 ? 0.5 : 1
    }
    for (const s of this.sparks) {
      if (s.t < 0) continue
      s.t += dt
      const f = Math.floor(s.t * 12)
      const tex = this.spk[f]
      if (!tex) {
        s.t = -1
        s.s.visible = false
      } else s.s.texture = tex
    }
  }

  count() {
    let n = 0
    for (const p of this.ps) if (p.alive) n++
    return n
  }
}
