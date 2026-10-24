// Efeitos do passe de arte C (fases 9–13): polígonos pixel com face lateral grossa (três quartos),
// fitas de energia que passam na frente e atrás do objeto, barra de chefe em segmentos, faixa de evento,
// recompensa que voa até o contador e feixes verticais de luz. Só cores de src/lib/palette.ts, escala
// inteira, nada de alocação no laço quente (pools com teto). Regras: docs/research/visual.md e
// docs/reference/ref-13-v2.png (lições em três quartos, energia em fita, segmentos com número).
import { Container, Graphics, Sprite, type Text, type Texture } from 'pixi.js'
import { px } from '../engine/textures'
import type { GameCtx } from '../engine/types'
import { bake, type Col, clamp01, domRect, easeOutQuad, label, P, type Painter } from './kit-b'

// ---------- desenho ----------

/**
 * Polígono cheio rasterizado por linha (centro do pixel, sem antialias). `pts` em coordenadas-base
 * planas [x0,y0,x1,y1,...], multiplicadas por `f` e deslocadas por (ox, oy).
 */
export function poly(p: Painter, pts: readonly number[], col: Col, f = 1, ox = 0, oy = 0) {
  const n = pts.length >> 1
  if (n < 3) return
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let i = 0; i < n; i++) {
    const y = (pts[i * 2 + 1] ?? 0) * f + oy
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const xs: number[] = []
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const cy = y + 0.5
    xs.length = 0
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const x0 = (pts[i * 2] ?? 0) * f + ox
      const y0 = (pts[i * 2 + 1] ?? 0) * f + oy
      const x1 = (pts[j * 2] ?? 0) * f + ox
      const y1 = (pts[j * 2 + 1] ?? 0) * f + oy
      if (y0 <= cy === y1 <= cy) continue
      xs.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.ceil((xs[k] ?? 0) - 0.5)
      const b = Math.floor((xs[k + 1] ?? 0) - 0.5)
      if (b >= a) p.rect(a, y, b - a + 1, 1, col)
    }
  }
}

/** silhueta sólida de uma textura (quadro de impacto branco/vermelho, regra 30) */
export function solidTex(key: string, src: Texture, color: Col): Texture {
  return bake(`fxc-solid|${key}|${color}`, src.width, src.height, (p) => {
    const res = src.source.resource as CanvasImageSource
    p.g.drawImage(res, 0, 0)
    p.g.globalCompositeOperation = 'source-in'
    p.g.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    p.g.fillRect(0, 0, src.width, src.height)
    p.g.globalCompositeOperation = 'source-over'
  })
}

/** espelho horizontal pré-desenhado (sem escala negativa em tempo real) */
export function mirrorTex(key: string, src: Texture): Texture {
  return bake(`fxc-mirror|${key}`, src.width, src.height, (p) => {
    const res = src.source.resource as CanvasImageSource
    p.g.translate(src.width, 0)
    p.g.scale(-1, 1)
    p.g.drawImage(res, 0, 0)
    p.g.setTransform(1, 0, 0, 1, 0, 0)
  })
}

/** granito pontilhado da face lateral (ref v2: lateral escura, saturada e pontilhada) */
export function graniteAt(x: number, y: number, base: Col, dark: Col, fleck: Col): Col {
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0
  const v = (h % 97) / 97
  return v < 0.12 ? fleck : v < 0.42 ? dark : base
}

/** ícone de perigo "!" (7×11) em vermelho quente com contorno escuro */
export function warnTex(): Texture {
  return bake('fxc-warn', 9, 13, (p) => {
    poly(p, [4.5, 0, 9, 6.5, 4.5, 13, 0, 6.5], P.void)
    poly(p, [4.5, 1, 8, 6.5, 4.5, 12, 1, 6.5], P.redHot)
    poly(p, [4.5, 1, 8, 6.5, 4.5, 6.5, 1, 6.5], P.redGlow)
    p.rect(4, 3, 1, 5, P.white)
    p.rect(4, 9, 1, 1, P.white)
  })
}

/** cruz dourada de 5 px com miolo branco (moeda de recompensa que voa ao contador) */
export function rewardTex(): Texture {
  return bake('fxc-reward', 5, 5, (p) => {
    p.rect(2, 0, 1, 5, P.gold)
    p.rect(0, 2, 5, 1, P.gold)
    p.rect(1, 1, 3, 3, P.goldHi)
    p.dot(2, 2, P.white)
  })
}

// ---------- fitas de energia (frente e trás) ----------

interface Ribbon {
  rx: number
  ry: number
  tilt: number
  speed: number
  phase: number
  len: number
}

/**
 * Fitas de energia em órbita elíptica: a metade de trás vai para `back` (atrás do objeto), a da frente
 * para `front` (ref v2, lição 11). Núcleo branco de 1 px na cabeça da fita, corpo vermelho, cauda
 * pontilhada. Cintilação de 2 cores a cada 4 quadros.
 */
export class Ribbons {
  readonly back = new Graphics()
  readonly front = new Graphics()
  private list: Ribbon[] = []
  /** 0..1: força da energia (cai com o dano do chefe) */
  power = 1
  cx = 0
  cy = 0
  constructor(private reduced: boolean) {
    this.back.blendMode = 'add'
    this.front.blendMode = 'add'
  }
  add(rx: number, ry: number, tilt: number, speed: number, phase: number, len = 2.4) {
    this.list.push({ rx, ry, tilt, speed, phase, len })
    return this
  }
  setSize(i: number, rx: number, ry: number) {
    const r = this.list[i]
    if (!r) return
    r.rx = rx
    r.ry = ry
  }
  update(time: number) {
    const b = this.back
    const f = this.front
    b.clear()
    f.clear()
    if (this.power <= 0) return
    const flick = Math.floor(time * 15) % 2 === 0
    const t = this.reduced ? time * 0.3 : time
    for (const r of this.list) {
      const head = r.phase + t * r.speed
      const len = r.len * (0.55 + 0.45 * this.power)
      const steps = Math.max(12, Math.round(((r.rx + r.ry) * len) / 2.2))
      for (let s = 0; s < steps; s++) {
        const k = s / steps
        const a = head - k * len * Math.sign(r.speed || 1)
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const x = Math.round(this.cx + ca * r.rx)
        const y = Math.round(this.cy + sa * r.ry + ca * r.rx * r.tilt)
        const g = sa < 0 ? b : f
        if (k < 0.08) {
          g.rect(x - 1, y - 1, 3, 3).fill({ color: P.redHot, alpha: 0.55 * this.power })
          g.rect(x, y, 1, 1).fill(P.white)
        } else if (k < 0.45) {
          const col = flick ? P.redHot : P.red
          g.rect(x, y - 1, 1, 3).fill({ color: P.crimson, alpha: 0.5 * this.power })
          g.rect(x, y, 1, 1).fill({ color: k < 0.2 ? P.sparkle : col, alpha: 0.95 * this.power })
        } else if (((x + y) & 1) === 0 || k < 0.6) {
          g.rect(x, y, 1, 1).fill({ color: k < 0.75 ? P.red : P.crimson, alpha: (1 - k) * 1.3 * this.power })
        }
      }
    }
  }
}

// ---------- feixes verticais finos ----------

interface Ray {
  x: number
  y0: number
  y1: number
  w: number
  col: Col
  t: number
  life: number
  alive: boolean
}
/** feixes de luz verticais (ref: raios finos nos nós de energia); aditivos, com teto */
export class Rays {
  readonly root = new Graphics()
  private pool: Ray[] = []
  constructor(private cap = 16) {
    this.root.blendMode = 'add'
  }
  spawn(x: number, y0: number, y1: number, col: Col = P.redHot, w = 1, life = 0.5) {
    let r = this.pool.find((q) => !q.alive)
    if (!r) {
      if (this.pool.length >= this.cap) return
      r = { x: 0, y0: 0, y1: 0, w: 1, col, t: 0, life: 1, alive: false }
      this.pool.push(r)
    }
    r.x = Math.round(x)
    r.y0 = Math.round(Math.min(y0, y1))
    r.y1 = Math.round(Math.max(y0, y1))
    r.w = w
    r.col = col
    r.t = 0
    r.life = life
    r.alive = true
  }
  update(dt: number) {
    const g = this.root
    g.clear()
    for (const r of this.pool) {
      if (!r.alive) continue
      r.t += dt
      if (r.t >= r.life) {
        r.alive = false
        continue
      }
      const k = r.t / r.life
      // cresce rápido do centro para as pontas, depois afina
      const grow = easeOutQuad(clamp01(k * 4))
      const mid = (r.y0 + r.y1) / 2
      const half = ((r.y1 - r.y0) / 2) * grow
      const a = 1 - k
      const y0 = Math.round(mid - half)
      const h = Math.max(1, Math.round(half * 2))
      if (r.w > 1 && k < 0.5) g.rect(r.x - 1, y0 + 2, 3, h - 4).fill({ color: P.crimson, alpha: 0.35 * a })
      g.rect(r.x, y0, 1, h).fill({ color: r.col, alpha: 0.7 * a })
      if (k < 0.3) g.rect(r.x, Math.round(mid - half * 0.4), 1, Math.round(half * 0.8)).fill(P.white)
    }
  }
}

// ---------- recompensa voando até o contador ----------

interface Coin {
  s: Sprite
  x0: number
  y0: number
  cx: number
  cy: number
  t: number
  dur: number
  alive: boolean
}
/**
 * Moedas/brilhos que saem do acerto e viajam em curva até o contador de pontos do HUD (DOM `.play-hud
 * .score`); na chegada, anel e brilho no contador. Sem DOM, voam para o canto de cima à direita.
 */
export class FlyToHud {
  readonly root = new Container()
  private pool: Coin[] = []
  private tx = 0
  private ty = 0
  private arrivedAt = -1
  constructor(
    private c: GameCtx,
    private cap = 24,
  ) {
    this.measure()
  }
  measure() {
    const e = typeof document !== 'undefined' ? document.querySelector('.play-hud .score') : null
    if (e) {
      const r = domRect(this.c, e)
      this.tx = Math.round(r.cx)
      this.ty = Math.round(r.cy)
    } else {
      this.tx = this.c.W - 16
      this.ty = Math.max(6, this.c.top - 10)
    }
  }
  /** solta `n` moedas de (x, y); cada uma chega escalonada em 35 ms */
  send(x: number, y: number, n = 6) {
    const tex = rewardTex()
    const r = this.c.rnd
    const count = this.c.reduced ? Math.min(2, n) : n
    for (let i = 0; i < count; i++) {
      let q = this.pool.find((p) => !p.alive)
      if (!q) {
        if (this.pool.length >= this.cap) return
        const s = new Sprite(tex)
        this.root.addChild(s)
        q = { s, x0: 0, y0: 0, cx: 0, cy: 0, t: 0, dur: 1, alive: false }
        this.pool.push(q)
      }
      q.x0 = x + (r() - 0.5) * 10
      q.y0 = y + (r() - 0.5) * 8
      const side = r() < 0.5 ? -1 : 1
      q.cx = q.x0 + side * (20 + r() * 30)
      q.cy = Math.min(q.y0, this.ty) - 10 - r() * 30
      q.t = -i * 0.035
      q.dur = 0.5 + r() * 0.18
      q.alive = true
      q.s.visible = false
    }
  }
  update(dt: number) {
    for (const q of this.pool) {
      if (!q.alive) continue
      q.t += dt
      if (q.t < 0) continue
      const k = clamp01(q.t / q.dur)
      if (k >= 1) {
        q.alive = false
        q.s.visible = false
        // chegada: pulso no contador (no máximo 1 a cada 90 ms para não virar ruído)
        if (this.c.time - this.arrivedAt > 0.09) {
          this.arrivedAt = this.c.time
          this.c.fx.ring(this.tx, this.ty, P.goldHi, 9)
          this.c.fx.burst(this.tx, this.ty, P.gold, 2, 30)
        }
        continue
      }
      const e = k * k
      const u = 1 - e
      const x = u * u * q.x0 + 2 * u * e * q.cx + e * e * this.tx
      const y = u * u * q.y0 + 2 * u * e * q.cy + e * e * this.ty
      q.s.visible = true
      q.s.x = Math.round(x - 2)
      q.s.y = Math.round(y - 2)
    }
  }
}

// ---------- barra de chefe em segmentos ----------

/**
 * Barra de vida de chefe no topo da área de jogo: nome em caixa alta espaçada, segmentos vermelhos e
 * número branco à direita (ref v2, lição 14). Segmento perdido: 2 quadros branco, depois rastro claro
 * que encolhe em 400 ms (barra de "dano atrasado" dos jogos mobile).
 */
export class BossBar {
  readonly root = new Container()
  private g = new Graphics()
  private name: Text
  private num: Text
  private hp: number
  private lostAt: number[] = []
  private shake = 0
  x = 0
  y = 0
  w = 120
  constructor(
    private c: GameCtx,
    title: string,
    private max: number,
  ) {
    this.hp = max
    this.name = label(title, P.stoneHi, 8)
    this.name.style.letterSpacing = 1
    this.num = label(String(max), P.white, 8)
    this.root.addChild(this.g, this.name, this.num)
    for (let i = 0; i < max; i++) this.lostAt.push(-1)
  }
  layout(cx: number, top: number, w: number) {
    this.w = Math.round(w)
    this.x = Math.round(cx - this.w / 2)
    this.y = Math.round(top)
    this.name.x = Math.round(cx)
    this.name.y = this.y + 4
    this.num.x = this.x + this.w + 7
    this.num.y = this.y + 13
  }
  hit() {
    if (this.hp <= 0) return
    this.hp--
    this.lostAt[this.hp] = this.c.time
    this.num.text = String(this.hp)
    this.shake = this.c.time
  }
  update() {
    const g = this.g
    g.clear()
    const now = this.c.time
    const sh = now - this.shake < 0.25 && !this.c.reduced ? (Math.floor(now * 30) % 2 ? 1 : -1) : 0
    const x0 = this.x + sh
    const y0 = this.y + 10
    const h = 6
    // moldura fina clara em cima, escura embaixo (bisel de 1 px)
    g.rect(x0 - 2, y0 - 2, this.w + 4, h + 4).fill(P.void)
    g.rect(x0 - 1, y0 - 1, this.w + 2, 1).fill(P.stone2)
    g.rect(x0 - 1, y0 + h, this.w + 2, 1).fill(P.stone0)
    g.rect(x0 - 1, y0 - 1, 1, h + 2).fill(P.stone1)
    g.rect(x0 + this.w, y0 - 1, 1, h + 2).fill(P.stone0)
    // marcas de canto (cantos marcados da referência)
    g.rect(x0 - 3, y0 - 3, 3, 1).fill(P.stoneHi)
    g.rect(x0 - 3, y0 - 3, 1, 3).fill(P.stoneHi)
    g.rect(x0 + this.w, y0 + h + 2, 3, 1).fill(P.stone3)
    g.rect(x0 + this.w + 2, y0 + h, 1, 3).fill(P.stone3)
    const gap = 2
    const sw = (this.w - gap * (this.max - 1)) / this.max
    for (let i = 0; i < this.max; i++) {
      const sx = Math.round(x0 + i * (sw + gap))
      const ex = Math.round(x0 + i * (sw + gap) + sw)
      const w = ex - sx
      g.rect(sx, y0, w, h).fill(P.blood0)
      g.rect(sx, y0 + h - 1, w, 1).fill(P.void)
      if (i < this.hp) {
        g.rect(sx, y0, w, h - 1).fill(P.red)
        g.rect(sx, y0, w, 1).fill(P.redGlow)
        g.rect(sx, y0 + h - 2, w, 1).fill(P.crimson)
        // último segmento vivo pulsa (perigo/urgência) a 4 Hz
        if (i === this.hp - 1 && this.hp <= 2 && Math.floor(now * 8) % 2 === 0)
          g.rect(sx, y0 + 1, w, 1).fill(P.redHot)
        continue
      }
      const lt = now - (this.lostAt[i] ?? -1)
      if (lt < 0.034 * 2) g.rect(sx, y0 - 1, w, h + 1).fill(P.white)
      else if (lt < 0.45) {
        const k = 1 - easeOutQuad(clamp01((lt - 0.07) / 0.38))
        g.rect(sx, y0, Math.max(0, Math.round(w * k)), h - 1).fill(P.sparkle)
      }
    }
  }
}

// ---------- faixa de evento (vitória/chefe derrotado) ----------

/**
 * Faixa pixel no estilo do menu da referência: placa escura, faixa vermelha com ▶, título dourado
 * grande. Entra em escala inteira 3 → 2 → 1 (degraus de 50 ms), segura e sai.
 */
export class Banner {
  readonly root = new Container()
  private plate = new Graphics()
  private texts: Text[] = []
  private t = -1
  private hold = 1.6
  private cx = 0
  private cy = 0
  constructor(private c: GameCtx) {
    this.root.visible = false
    this.root.addChild(this.plate)
  }
  show(lines: { text: string; size: number; color: Col }[], cx: number, cy: number, hold = 1.6) {
    for (const t of this.texts) t.destroy()
    this.texts = lines.map((l) => {
      const t = label(l.text, l.color, l.size)
      t.style.letterSpacing = l.size >= 16 ? 2 : 1
      this.root.addChild(t)
      return t
    })
    this.cx = Math.round(cx)
    this.cy = Math.round(cy)
    this.t = 0
    this.hold = hold
    this.root.visible = true
  }
  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const t = this.t
    if (t > this.hold + 0.3) {
      this.root.visible = false
      this.t = -1
      return
    }
    let total = 0
    for (const tx of this.texts) total += Math.round(tx.height / tx.scale.y) + 2
    let wMax = 40
    for (const tx of this.texts) wMax = Math.max(wMax, Math.round(tx.width / tx.scale.x))
    // batida: entra em 2× (segura durante o hit-stop do impacto final) e assenta em 1×
    const sc = this.c.reduced ? 1 : t < 0.08 ? 2 : 1
    const out = t > this.hold ? clamp01((t - this.hold) / 0.3) : 0
    const pw = Math.min(this.c.W - 4, wMax + 28)
    const ph = total + 10
    const px0 = Math.round(this.cx - pw / 2)
    const py0 = Math.round(this.cy - ph / 2)
    const g = this.plate
    g.clear()
    // a placa entra inteira (quadro de impacto) e fecha na horizontal na saída
    const open = 1 - out
    const w = Math.max(2, Math.round(pw * open))
    const x = Math.round(this.cx - w / 2)
    g.rect(x - 1, py0 - 1, w + 2, ph + 2).fill(P.void)
    g.rect(x, py0, w, ph).fill(P.night)
    g.rect(x, py0, w, 1).fill(P.stone2)
    g.rect(x, py0 + ph - 1, w, 1).fill(P.stone0)
    g.rect(x, py0 + ph - 4, w, 2).fill(P.red)
    g.rect(x, py0 + ph - 4, w, 1).fill(P.redHot)
    g.rect(x + 3, py0 + ph - 5, 2, 4).fill(P.redGlow)
    // raios dourados de 1 px saindo da placa (6 quadros a 12 fps, depois param)
    if (!this.c.reduced && t < 0.5) {
      const f = Math.floor(t * 12)
      for (let i = 0; i < 6; i++) {
        const rx = px0 + Math.round(((i + 0.5) / 6) * pw)
        const L = 4 + ((i * 7 + f * 3) % 9)
        g.rect(rx, py0 - 2 - L, 1, L).fill({ color: P.goldHi, alpha: 0.6 })
        g.rect(rx, py0 + ph + 2, 1, Math.round(L * 0.6)).fill({ color: P.gold, alpha: 0.5 })
      }
    }
    let y = py0 + 5
    for (const tx of this.texts) {
      const h = Math.round(tx.height / tx.scale.y)
      tx.scale.set(sc)
      tx.x = this.cx
      tx.y = Math.round(y + h / 2)
      tx.alpha = out > 0 ? (Math.floor(t * 20) % 2 ? 0 : 1) : 1
      tx.visible = open > 0.5
      y += h + 2
    }
  }
  get active() {
    return this.t >= 0
  }
}

/** um pixel tingido (para blocos e barras em sprites, sem Graphics) */
export function pix(color: Col, w = 1, h = 1) {
  const s = new Sprite(px())
  s.tint = color
  s.width = w
  s.height = h
  return s
}

// ---------- mão de demonstração (aprender jogando) ----------

/** luva pixel apontando para cima (12×14), ponta do dedo em (3, 0); `press` = dedo afundado */
export function handTex(press: boolean): Texture {
  return bake(`fxc-hand${press ? 'p' : ''}`, 12, 15, (p) => {
    const o = press ? 1 : 0
    // dedo indicador
    p.rect(2, 0 + o, 3, 7, P.stoneHi)
    p.rect(4, 1 + o, 1, 6, P.stone3)
    // palma e dedos dobrados
    p.rect(1, 6, 9, 6, P.stoneHi)
    p.rect(5, 5, 2, 2, P.stoneHi)
    p.rect(7, 6, 2, 1, P.stone3)
    p.rect(9, 7, 1, 4, P.stone3)
    p.rect(1, 11, 9, 1, P.stone2)
    p.rect(6, 8, 1, 2, P.stone2)
    // punho vermelho (cor do jogo)
    p.rect(2, 12, 7, 2, P.red)
    p.rect(2, 12, 7, 1, P.redGlow)
    p.dot(3, 0 + o, P.white)
    p.outline(P.void, P.stone0)
  })
}

export type HandMode =
  | { kind: 'tap'; x: number; y: number }
  | { kind: 'drag'; x0: number; y0: number; x1: number; y1: number }
  | { kind: 'circle'; x: number; y: number; r: number }

/**
 * Demonstração do gesto nos primeiros segundos da fase: uma mão pixel toca, arrasta ou gira em cima do
 * primeiro alvo e some no primeiro toque do jogador (ou depois de `dur` segundos). Ouve o ponteiro na
 * janela, então funciona também sobre cartas e botões DOM. Movimento reduzido: a mão fica parada e pisca.
 */
export class TutorialHand {
  readonly root = new Container()
  private s = new Sprite(handTex(false))
  private ring = new Graphics()
  private age = 0
  private gone = -1
  private off: (() => void) | null = null
  constructor(
    private c: GameCtx,
    public mode: HandMode,
    private dur = 3.2,
  ) {
    this.root.addChild(this.ring, this.s)
    const dn = () => this.dismiss()
    addEventListener('pointerdown', dn, { passive: true })
    addEventListener('keydown', dn)
    this.off = () => {
      removeEventListener('pointerdown', dn)
      removeEventListener('keydown', dn)
    }
  }
  dismiss() {
    if (this.gone < 0) this.gone = this.age
    this.off?.()
    this.off = null
  }
  get active() {
    return this.gone < 0 || this.age - this.gone < 0.25
  }
  update(dt: number) {
    if (!this.root.visible) return
    this.age += dt
    if (this.age > this.dur) this.dismiss()
    const fade = this.gone < 0 ? 1 : 1 - (this.age - this.gone) / 0.25
    if (fade <= 0) {
      this.root.visible = false
      this.off?.()
      return
    }
    // some em degraus (pisca) em vez de alfa contínuo
    this.root.alpha = fade < 1 ? (Math.floor(this.age * 20) % 2 ? 0.3 : 0.9) : 1
    const m = this.mode
    const T = 1.1
    const k = (this.age % T) / T
    let x = 0
    let y = 0
    let press = false
    if (this.c.reduced) {
      const p = m.kind === 'tap' ? m : m.kind === 'drag' ? { x: m.x0, y: m.y0 } : { x: m.x + m.r, y: m.y }
      x = p.x
      y = p.y
      press = Math.floor(this.age * 2) % 2 === 0
    } else if (m.kind === 'tap') {
      // aproxima 8 px, afunda 1 quadro, volta
      const lift = k < 0.45 ? (1 - easeOutQuad(k / 0.45)) * 8 : k < 0.6 ? 0 : easeOutQuad((k - 0.6) / 0.4) * 8
      x = m.x + lift * 0.6
      y = m.y + lift
      press = k >= 0.45 && k < 0.6
    } else if (m.kind === 'drag') {
      const e = k < 0.15 ? 0 : k > 0.85 ? 1 : (k - 0.15) / 0.7
      const ee = e < 0.5 ? 2 * e * e : 1 - 2 * (1 - e) * (1 - e)
      x = m.x0 + (m.x1 - m.x0) * ee
      y = m.y0 + (m.y1 - m.y0) * ee
      press = k > 0.1 && k < 0.9
    } else {
      const a = -Math.PI / 2 + k * Math.PI * 2 * 0.75
      x = m.x + Math.cos(a) * m.r
      y = m.y + Math.sin(a) * m.r
      press = true
    }
    this.s.texture = handTex(press)
    this.s.x = Math.round(x - 3)
    this.s.y = Math.round(y)
    const g = this.ring
    g.clear()
    if (press) {
      // anel pontilhado na ponta do dedo
      const R = m.kind === 'tap' ? 5 : 3
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        if (i % 2) continue
        g.rect(Math.round(x + Math.cos(a) * R), Math.round(y + Math.sin(a) * R), 1, 1)
      }
      g.fill({ color: P.goldHi, alpha: 0.9 })
    }
  }
  destroy() {
    this.off?.()
    this.off = null
  }
}

/**
 * Mão de demonstração em DOM, para alvos que são botões/cartas DOM (ficam por cima do canvas).
 * Mesmo desenho pixel da `handTex`, ampliado por inteiro (`c.css`); toca o elemento a cada 1,1 s e some
 * no primeiro toque/tecla ou depois de `dur` s. Movimento reduzido: fica parada.
 */
export function domHand(c: GameCtx, target: HTMLElement, dur = 3.2): () => void {
  const src = handTex(false).source.resource as CanvasImageSource
  const sc = Math.max(2, Math.round(c.css * 2))
  const cv = document.createElement('canvas')
  cv.width = 12 * sc
  cv.height = 15 * sc
  const g = cv.getContext('2d')
  if (g) {
    g.imageSmoothingEnabled = false
    g.drawImage(src, 0, 0, 12 * sc, 15 * sc)
  }
  const r = target.getBoundingClientRect()
  const lr = c.layer.getBoundingClientRect()
  cv.setAttribute('aria-hidden', 'true')
  cv.style.cssText = `position:absolute;pointer-events:none;z-index:5;image-rendering:pixelated;left:${Math.round(
    r.left - lr.left + Math.min(48, r.width * 0.3) - 3 * sc,
  )}px;top:${Math.round(r.top - lr.top + r.height * 0.5)}px`
  c.layer.append(cv)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const anim = reduced
    ? null
    : cv.animate(
        [
          { transform: `translate(${5 * sc}px, ${8 * sc}px)` },
          { transform: 'translate(0, 0)', offset: 0.45 },
          { transform: `translate(0, ${sc}px)`, offset: 0.55 },
          { transform: 'translate(0, 0)', offset: 0.62 },
          { transform: `translate(${5 * sc}px, ${8 * sc}px)` },
        ],
        { duration: 1100, iterations: Number.POSITIVE_INFINITY, easing: 'steps(8, end)' },
      )
  let done = false
  const kill = () => {
    if (done) return
    done = true
    anim?.cancel()
    cv.remove()
    removeEventListener('pointerdown', kill)
    removeEventListener('keydown', kill)
  }
  addEventListener('pointerdown', kill, { passive: true })
  addEventListener('keydown', kill)
  window.setTimeout(kill, dur * 1000)
  return kill
}
