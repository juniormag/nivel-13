// Ajudantes do passe de arte das fases 1–4 (level-art-lead A): peças de cenário em Buf (planos,
// luzes de cidade, reflexos, cachos de vegetação, primeiro plano quase preto, caixa em três quartos)
// e efeitos de jogo (recompensa que voa até o placar, mira de ameaça, laço próprio para o final da fase).
// Só cores de src/lib/palette.ts; nada aloca por quadro nos laços quentes.
import { Container, Sprite, type Texture } from 'pixi.js'
import type { GameCtx } from '../engine/types'
import { mulberry32 } from '../lib/rng'
import type { Ctx } from '../scene/levels'
import { bayer, type Buf, dith, type K } from '../scene/pal'
import { clamp01, Grid, gridTex, P } from './kit-a'

// =====================================================================================
// Cenário
// =====================================================================================

/** névoa de atmosfera: pontilha `k` por cima do que já existe, mais densa em `y1` (perspectiva atmosférica) */
export function haze(c: Ctx, y0: number, y1: number, k: K, max = 0.5, only?: (x: number, y: number) => boolean) {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(c.H, y1); y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * max
    for (let x = 0; x < c.W; x++) {
      if (only && !only(x, y)) continue
      if (c.b.get(x, y) && dith(x + ((y >> 2) & 1) * 2, y, t)) c.b.set(x, y, k)
    }
  }
}

/**
 * Serra/chapada com perfil `top(x)`: corpo `body`, aresta de cima em `rim` do lado da luz (`lightLeft`),
 * face de sombra 1 degrau mais escura e base que some na névoa.
 */
export function range(
  c: Ctx,
  top: (x: number) => number,
  body: K,
  shadow: K,
  rim: K,
  base: number,
  lightLeft = true,
) {
  const { b, W } = c
  for (let x = 0; x < W; x++) {
    const t = Math.round(top(x))
    if (t >= base) continue
    const slope = top(x + 1) - top(x - 1)
    // encosta que olha para a luz recebe a borda acesa de 1–2 px; a outra fica na sombra
    const lit = lightLeft ? slope > 0.25 : slope < -0.25
    const dark = lightLeft ? slope < -0.25 : slope > 0.25
    for (let y = Math.max(0, t); y <= base; y++) {
      let k: K = dark && y - t < 6 + Math.abs(slope) * 3 ? shadow : body
      if (y === t) k = rim
      else if (lit && y - t < 2) k = rim
      b.set(x, y, k)
    }
  }
}

/** luzes de cidade: pontos de 1 px agrupados em bairros, 3 tons e um ponto quente aqui e ali (lição 7) */
export function cityLights(c: Ctx, x0: number, x1: number, y0: number, y1: number, density: number, seed: number) {
  const r = mulberry32(seed)
  const n = Math.round(((x1 - x0) * (y1 - y0) * density) / 10)
  const hubs: [number, number][] = []
  for (let i = 0; i < Math.max(2, n / 18); i++) hubs.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)])
  for (let i = 0; i < n; i++) {
    const h = hubs[Math.floor(r() * hubs.length)] ?? [x0, y0]
    const x = Math.round(h[0] + (r() - 0.5) * (r() * 0.5 + 0.2) * (x1 - x0) * 0.5)
    const y = Math.round(h[1] + (r() - 0.5) * (y1 - y0) * 0.7)
    if (x < x0 || x >= x1 || y < y0 || y >= y1) continue
    const v = r()
    c.b.set(x, y, v > 0.97 ? 'sparkle' : v > 0.8 ? 'goldHi' : v > 0.5 ? 'gold' : v > 0.25 ? 'ember' : 'emberDark')
  }
}

/** reflexo na água: traços horizontais quebrados embaixo de uma luz, esfriando com a distância */
export function streaks(c: Ctx, x: number, y0: number, len: number, k: K, w = 3) {
  for (let i = 0; i < len; i++) {
    if (i % 2) continue
    const f = i / len
    const ww = Math.max(1, Math.round(w * (1 - f * 0.6) + Math.sin(i * 1.7 + x) * 1.2))
    const ox = Math.round(Math.sin(i * 0.9 + x * 0.3) * (1 + f * 2))
    const col: K = f < 0.25 ? k : f < 0.5 ? 'ember' : f < 0.75 ? 'emberDark' : 'blood1'
    for (let j = 0; j < ww; j++) if (!(f > 0.6 && (j + i) % 2)) c.b.set(x - (ww >> 1) + j + ox, y0 + i, col)
  }
}

/** cacho de vegetação (lição 10): sopros pequenos em 3 tons, highlight de 1 px e rim vermelho opcional */
export function clump(
  b: Buf,
  cx: number,
  cy: number,
  r: number,
  ramp: readonly K[],
  seed: number,
  rim: K | null = null,
  rimRight = true,
) {
  const rr = mulberry32(seed)
  const n = Math.max(4, Math.round(r * r * 0.5))
  const L = ramp.length
  for (let i = 0; i < n; i++) {
    const a = Math.PI + rr() * Math.PI
    const d = Math.sqrt(rr())
    const px = cx + Math.cos(a) * r * 1.2 * d
    const py = cy + Math.sin(a) * r * 0.9 * d + r * 0.3
    const s = 1.2 + rr() * 1.4
    for (let oy = -Math.ceil(s); oy <= Math.ceil(s); oy++)
      for (let ox = -Math.ceil(s * 1.25); ox <= Math.ceil(s * 1.25); ox++) {
        const q = (ox / (s * 1.25)) ** 2 + (oy / s) ** 2
        if (q > 1) continue
        const x = Math.round(px + ox)
        const y = Math.round(py + oy)
        const up = 1 - (y - (cy - r)) / (r * 1.8)
        let v = up * (L - 1) - (oy / s) * 0.9 - (ox / s) * 0.25 + (bayer(x, y) - 0.5) * 0.5
        if (q > 0.6 && oy > 0) v -= 1
        let k = ramp[Math.max(0, Math.min(L - 1, Math.floor(v)))] ?? ramp[0] ?? 'void'
        if (q < 0.25 && oy < 0 && ox < 0 && v > L - 1.5) k = ramp[L - 1] ?? k
        if (rim && q > 0.55 && (rimRight ? ox > 0 : ox < 0) && oy <= 0) k = rim
        b.set(x, y, k)
      }
  }
}

/** primeiro plano quase preto (lição 5): pedras e mato em silhueta nos cantos de baixo, com rim de 1 px */
export function fgFrame(c: Ctx, seed: number, rim: K, rimLeft: K = 'dusk', reach = 0.2, height = 0.1) {
  const r = mulberry32(seed)
  const { b, W, H } = c
  const prof = new Float32Array(W)
  for (let x = 0; x < W; x++) {
    const e = Math.min(x, W - 1 - x) / (W * reach)
    if (e >= 1) {
      prof[x] = H
      continue
    }
    const bump = Math.sin(x * 0.21 + seed) * 0.18 + Math.sin(x * 0.067 + seed * 2) * 0.3
    prof[x] = H - H * height * Math.max(0, 1 - e) * (1 + bump) - H * 0.012
  }
  // pedras arredondadas por cima do perfil
  for (const side of [0, 1])
    for (let i = 0; i < 4; i++) {
      const x = side ? W - r() * W * reach * 0.9 : r() * W * reach * 0.9
      const rx = 4 + r() * W * 0.04
      const top = (prof[Math.round(x)] ?? H) - rx * 0.4
      for (let y = Math.floor(top - rx * 0.6); y < H; y++)
        for (let xx = Math.floor(x - rx); xx <= x + rx; xx++) {
          const u = (xx - x) / rx
          const v = (y - top) / (rx * 0.6)
          if (u * u + v * v > 1 && y < top) continue
          if (Math.abs(u) > 1) continue
          if (xx >= 0 && xx < W) prof[xx] = Math.min(prof[xx] ?? H, y)
        }
    }
  for (let x = 0; x < W; x++) {
    const t = Math.round(prof[x] ?? H)
    if (t >= H) continue
    const slope = (prof[x + 1] ?? H) - (prof[x - 1] ?? H)
    for (let y = t; y < H; y++) b.set(x, y, 'void')
    // rim: do lado da energia (centro) em vermelho, do outro lado em dusk
    const towardCenter = x < W / 2 ? slope > 0.2 : slope < -0.2
    b.set(x, t, towardCenter ? rim : rimLeft)
    if (towardCenter && Math.abs(slope) > 1.2) b.set(x, t + 1, rim)
  }
  // capim e gravetos saindo da silhueta
  for (let i = 0; i < W * 0.12; i++) {
    const x = Math.floor(r() * W)
    const t = prof[x] ?? H
    if (t >= H - 1) continue
    const hh = 2 + Math.floor(r() * 6)
    const lean = r() < 0.5 ? -1 : 1
    for (let k = 0; k < hh; k++) b.set(x + Math.round((k / hh) * lean * 2), t - k, k === hh - 1 && r() < 0.4 ? rim : 'void')
  }
}

/**
 * Caixa em três quartos (lições 1–3): frente clara, lateral grossa escura e saturada à direita (ou esquerda),
 * topo em perspectiva, chanfro de 1 px com highlight na aresta que pega a luz.
 * front/side/top: rampas escuro → claro (≥ 3 tons). Devolve a geometria para pintar janelas etc.
 */
export function box3q(
  b: Buf,
  x: number,
  base: number,
  w: number,
  h: number,
  depth: number,
  front: readonly K[],
  side: readonly K[],
  top: readonly K[] | null,
  sideRight = true,
  rim: K | null = null,
) {
  const dy = Math.max(1, Math.round(depth * 0.45))
  const fx0 = sideRight ? x : x + depth
  const sx0 = sideRight ? x + w : x
  const F = front.length
  // frente: luz de cima-esquerda, sem pillow (escurece só embaixo e no lado oposto à luz)
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const gx = sideRight ? xx / w : 1 - xx / w
      const v = (1 - yy / h) * 0.45 + (1 - gx) * 0.25 + 0.3 + (bayer(fx0 + xx, base - h + yy) - 0.5) * 0.25
      b.set(fx0 + xx, base - h + yy, front[Math.max(0, Math.min(F - 2, Math.floor(v * (F - 1))))] ?? 'stone1')
    }
  // aresta de cima e aresta vertical da quina pegando a luz
  b.rect(fx0, base - h, w, 1, front[F - 1] ?? 'stoneHi')
  // lateral: paralelogramo subindo para trás
  const S = side.length
  for (let i = 0; i < depth; i++) {
    const cx = sideRight ? sx0 + i : sx0 + depth - 1 - i
    const lift = Math.round((i / depth) * dy)
    for (let yy = 0; yy < h; yy++) {
      const v = 0.55 - (yy / h) * 0.35 - (i / depth) * 0.25 + (bayer(cx, yy) - 0.5) * 0.3
      b.set(cx, base - h + yy - lift, side[Math.max(0, Math.min(S - 1, Math.floor(v * S)))] ?? 'blood0')
    }
    if (rim && i === depth - 1) for (let yy = 0; yy < h; yy++) b.set(cx, base - h + yy - lift, rim)
  }
  // quina chanfrada: 1 px de highlight
  const qx = sideRight ? fx0 + w - 1 : fx0
  for (let yy = 1; yy < h; yy++) b.set(qx, base - h + yy, side[S - 1] ?? 'crimson')
  // topo
  if (top)
    for (let i = 0; i < depth; i++) {
      const lift = Math.round(((i + 1) / depth) * dy)
      const cx0 = sideRight ? fx0 + i : fx0 - i
      for (let xx = 0; xx < w; xx++) {
        const k = top[Math.min(top.length - 1, i === 0 ? top.length - 1 : 1 + ((xx + i) % 2))] ?? 'stone2'
        for (let l = 0; l < lift && l < 1; l++) b.set(cx0 + xx + (sideRight ? 1 : -1), base - h - lift, k)
      }
    }
  return { fx: fx0, fy: base - h, fw: w, sx: sx0, dy }
}

/** chão rachado em lajes (lição 4): rede de rachaduras de 1 px escuro + lábio claro do lado da luz */
export function cracks(c: Ctx, y0: number, y1: number, seed: number, dark: K, lip: K, n: number) {
  const r = mulberry32(seed)
  for (let i = 0; i < n; i++) {
    let x = r() * c.W
    let y = y0 + r() * (y1 - y0)
    const len = 4 + r() * 14 * (0.4 + (y - y0) / (y1 - y0))
    let dir = r() < 0.5 ? 1 : -1
    for (let k = 0; k < len; k++) {
      if (!c.b.get(Math.round(x), Math.round(y))) break
      c.b.set(x, y, dark)
      c.b.set(x, y - 1, lip)
      if (r() < 0.25) dir = -dir
      x += dir
      if (r() < 0.35) y += 1
      if (r() < 0.08) {
        // ramo
        let bx = x
        let by = y
        for (let j = 0; j < 3 + r() * 4; j++) {
          bx += r() < 0.5 ? 0 : -dir
          by += 1
          c.b.set(bx, by, dark)
        }
      }
    }
  }
}

/** pássaro em V de 3–5 px (lição 12) */
export function bird(b: Buf, x: number, y: number, k: K, wide = false) {
  b.set(x, y, k)
  b.set(x - 1, y - 1, k)
  b.set(x + 1, y - 1, k)
  if (wide) {
    b.set(x - 2, y - 1, k)
    b.set(x + 2, y - 1, k)
  }
}

// =====================================================================================
// Jogo
// =====================================================================================

/** centro do placar do HUD (DOM) em pixels lógicos; sem HUD, o canto de cima à direita */
export function hudScore(c: GameCtx) {
  const el = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.play-top .score') : null
  const r = el?.getBoundingClientRect()
  if (!r || !r.width) return { x: c.W - 14, y: Math.max(6, c.top - 14), el: null }
  return { x: Math.round((r.left + r.width / 2) / c.css), y: Math.round((r.top + r.height / 2) / c.css), el }
}

/** pulso curto no placar quando a recompensa chega (respeita movimento reduzido) */
export function pulseEl(el: HTMLElement | null, reduced: boolean) {
  if (!el || reduced || typeof el.animate !== 'function') return
  el.animate([{ transform: 'scale(1.22)', filter: 'brightness(1.6)' }, { transform: 'scale(1)', filter: 'none' }], {
    duration: 160,
    easing: 'ease-out',
  })
}

/**
 * Laço próprio a 60 fps com dt real. Os efeitos de recompensa e o final da fase continuam
 * depois que o runner para de chamar `update` (fim da fase, hit-stop).
 */
export class Driver {
  private raf = 0
  private last = 0
  constructor(private fn: (dt: number) => void) {}
  start() {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return
    this.last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000)
      this.last = t
      this.fn(dt)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }
}

interface Fly {
  s: Sprite
  x0: number
  y0: number
  mx: number
  my: number
  t: number
  dur: number
  delay: number
  frames: Texture[] | null
  alive: boolean
  done: (() => void) | null
}

/**
 * Recompensa que viaja até o contador (Wildlife): estoura para fora em 120 ms e depois mergulha
 * numa curva até o placar, deixando rastro; quando chega, chama `onArrive` (som, pulso, brilho).
 */
export class Flyers {
  readonly root = new Container()
  private list: Fly[] = []
  target = { x: 0, y: 0 }
  el: HTMLElement | null = null
  onArrive: ((x: number, y: number, n: number) => void) | null = null
  trail: ((x: number, y: number) => void) | null = null
  private arrived = 0

  constructor(
    private c: GameCtx,
    n = 24,
  ) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite()
      s.anchor.set(0.5)
      s.visible = false
      this.root.addChild(s)
      this.list.push({ s, x0: 0, y0: 0, mx: 0, my: 0, t: 0, dur: 0.5, delay: 0, frames: null, alive: false, done: null })
    }
    this.retarget()
  }

  retarget() {
    const h = hudScore(this.c)
    this.target.x = h.x
    this.target.y = h.y
    this.el = h.el
  }

  /** manda `n` peças de (x, y); `tex` é uma textura ou quadros animados */
  send(x: number, y: number, tex: Texture | Texture[], n = 1, spread = 10, done?: () => void) {
    const r = this.c.rnd
    const count = this.c.reduced ? Math.min(n, 2) : n
    for (let i = 0; i < count; i++) {
      const f = this.list.find((k) => !k.alive)
      if (!f) return
      const a = r() * Math.PI * 2
      f.x0 = x
      f.y0 = y
      f.mx = x + Math.cos(a) * spread
      f.my = y + Math.sin(a) * spread * 0.7 - spread * 0.4
      f.t = 0
      f.delay = i * 0.045
      f.dur = 0.42 + r() * 0.12
      f.frames = Array.isArray(tex) ? tex : null
      f.s.texture = Array.isArray(tex) ? (tex[0] as Texture) : tex
      f.s.x = Math.round(x)
      f.s.y = Math.round(y)
      f.s.visible = false
      f.alive = true
      f.done = i === count - 1 && done ? done : null
    }
  }

  get busy() {
    return this.list.some((k) => k.alive)
  }

  update(dt: number) {
    for (const f of this.list) {
      if (!f.alive) continue
      if (f.delay > 0) {
        f.delay -= dt
        continue
      }
      f.t += dt
      f.s.visible = true
      const out = 0.12
      let x: number
      let y: number
      if (f.t < out) {
        const k = 1 - (1 - f.t / out) ** 2
        x = f.x0 + (f.mx - f.x0) * k
        y = f.y0 + (f.my - f.y0) * k
      } else {
        const k = clamp01((f.t - out) / f.dur)
        const e = k * k * k
        // curva: sobe em arco para o canto do placar
        const cx = (f.mx + this.target.x) / 2 + (f.mx < this.target.x ? -20 : 20)
        const cy = Math.min(f.my, this.target.y) - 10
        const u = 1 - e
        x = u * u * f.mx + 2 * u * e * cx + e * e * this.target.x
        y = u * u * f.my + 2 * u * e * cy + e * e * this.target.y
        if (k >= 1) {
          f.alive = false
          f.s.visible = false
          this.arrived++
          this.onArrive?.(this.target.x, this.target.y, this.arrived)
          if (this.arrived % 3 === 1) pulseEl(this.el, this.c.reduced)
          f.done?.()
          continue
        }
        if (this.trail && Math.floor(f.t * 30) % 2 === 0) this.trail(x, y)
      }
      if (f.frames) f.s.texture = f.frames[Math.floor(f.t * 12) % f.frames.length] as Texture
      f.s.x = Math.round(x)
      f.s.y = Math.round(y)
    }
  }
}

/** mira de ameaça (telegrafa 300 ms antes): 4 cantos que fecham, 2 cores piscando */
export function reticleFrames(size: number): Texture[] {
  const out: Texture[] = []
  for (let f = 0; f < 4; f++)
    out.push(
      gridTex(`fxa-ret${size}-${f}`, () => {
        const g = new Grid(size, size, -1)
        const inset = 3 - Math.min(3, f)
        const L = Math.max(2, Math.round(size / 4))
        const col = f % 2 ? P.redHot : P.white
        const a = inset
        const z = size - 1 - inset
        for (let i = 0; i < L; i++) {
          g.set(a + i, a, col)
          g.set(a, a + i, col)
          g.set(z - i, a, col)
          g.set(z, a + i, col)
          g.set(a + i, z, col)
          g.set(a, z - i, col)
          g.set(z - i, z, col)
          g.set(z, z - i, col)
        }
        // sombra de 1 px por dentro (contorno seletivo)
        for (let i = 1; i < L; i++) {
          g.set(a + i, a + 1, P.blood0)
          g.set(z - i, z - 1, P.blood0)
        }
        return g
      }),
    )
  return out
}

/** silhueta branca de uma grade (clarão de 1 quadro no objeto atingido, regra 30) */
export function whiteTex(key: string, make: () => Grid, col: number = P.white) {
  return gridTex(`fxa-white-${key}-${col}`, () => {
    const g = make()
    for (let i = 0; i < g.d.length; i++) if ((g.d[i] ?? -1) >= 0) g.d[i] = col
    return g
  })
}

/** escala de "pop" em degraus inteiros de 1/8 (sem escala fracionária visível em sprite pequeno) */
export const step8 = (v: number) => Math.round(v * 8) / 8
