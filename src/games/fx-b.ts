// Ajudantes de feedback das fases 5–8 (level-art-lead B). Só visual e som: nada aqui muda regra,
// tempo ou pontuação. Pools fixos, nada alocado dentro do update.
import { Container, Sprite, type Texture } from 'pixi.js'
import type { GameCtx } from '../engine/types'
import { clamp01, easeOutQuad, GOLD, Grid, gridTex, lerp, P, rowsTex, sparkleFrames } from './kit-a'

/** silhueta de cor única de uma grade (o quadro branco de 1 frame do acerto, regra 30) */
export function solidTex(key: string, make: () => Grid, color: number = P.white) {
  return gridTex(`fxb-solid-${key}-${color}`, () => {
    const g = make()
    const out = new Grid(g.w, g.h, -1)
    for (let i = 0; i < g.d.length; i++) if ((g.d[i] ?? -1) >= 0) out.d[i] = color
    return out
  })
}

/** ponto do contador de pontos do HUD em pixels lógicos (ou o canto de cima à direita) */
export function hudScorePoint(c: GameCtx) {
  const e = document.querySelector('.play-right .score, .score')
  if (e) {
    const r = e.getBoundingClientRect()
    if (r.width > 0) return { x: (r.left + r.width / 2) / c.css, y: (r.top + r.height / 2) / c.css }
  }
  return { x: c.W - 14, y: 10 }
}

let pulseAt = 0
/** pulso curto do contador do HUD quando a recompensa chega (no máximo 1 a cada 90 ms) */
export function pulseScore(reduced: boolean) {
  if (reduced) return
  const now = performance.now()
  if (now - pulseAt < 90) return
  pulseAt = now
  const e = document.querySelector<HTMLElement>('.play-right .score, .score')
  e?.animate(
    [
      { transform: 'scale(1.25)', filter: 'brightness(1.6)' },
      { transform: 'scale(1)', filter: 'none' },
    ],
    {
      duration: 180,
      easing: 'steps(4, end)',
    },
  )
}

interface Fly {
  s: Sprite
  t: number
  dur: number
  x0: number
  y0: number
  x1: number
  y1: number
  arc: number
  frames: Texture[] | null
  done: (() => void) | null
}

/**
 * Recompensa que viaja: sprite (moeda, carteira, selo) sai do acerto em arco até o contador do HUD
 * (ou até um ponto dado), com rastro de brasa dourada; na chegada, pulso do contador e faísca.
 */
export class Flyers {
  readonly root = new Container()
  private list: Fly[] = []
  private spk: Texture[] = []
  private sparks: { s: Sprite; t: number }[] = []
  /** chamada a cada quadro de voo para o rastro (x, y) */
  trail: ((x: number, y: number) => void) | null = null

  constructor(
    private c: GameCtx,
    tex: Texture,
    n = 8,
  ) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(tex)
      s.anchor.set(0.5)
      s.visible = false
      this.root.addChild(s)
      this.list.push({ s, t: -1, dur: 0.45, x0: 0, y0: 0, x1: 0, y1: 0, arc: 20, frames: null, done: null })
    }
    this.spk = sparkleFrames()
    for (let i = 0; i < 4; i++) {
      const s = new Sprite(this.spk[0])
      s.anchor.set(0.5)
      s.visible = false
      this.root.addChild(s)
      this.sparks.push({ s, t: -1 })
    }
  }

  /** dispara; `to` ausente = contador do HUD */
  send(
    x: number,
    y: number,
    o: {
      to?: { x: number; y: number }
      dur?: number
      arc?: number
      tex?: Texture
      frames?: Texture[]
      done?: () => void
    } = {},
  ) {
    const f = this.list.find((k) => k.t < 0)
    if (!f) return
    const to = o.to ?? hudScorePoint(this.c)
    f.t = 0
    f.dur = o.dur ?? 0.45
    f.x0 = x
    f.y0 = y
    f.x1 = to.x
    f.y1 = to.y
    f.arc = o.arc ?? 22
    f.frames = o.frames ?? null
    f.done = o.done ?? null
    if (o.tex) f.s.texture = o.tex
    f.s.visible = true
    f.s.x = Math.round(x)
    f.s.y = Math.round(y)
  }

  /** dt real: a recompensa segue voando durante o hit-stop e depois do fim da fase */
  update(dt: number) {
    for (const f of this.list) {
      if (f.t < 0) continue
      f.t += dt / f.dur
      // sai rápido e desacelera no alvo (ease-out), em arco para cima
      const k = easeOutQuad(clamp01(f.t))
      const x = lerp(f.x0, f.x1, k)
      const y = lerp(f.y0, f.y1, k) - Math.sin(clamp01(f.t) * Math.PI) * f.arc
      f.s.x = Math.round(x)
      f.s.y = Math.round(y)
      if (f.frames) f.s.texture = f.frames[Math.floor(f.t * 10) % f.frames.length] as Texture
      if (this.trail && !this.c.reduced) this.trail(x, y)
      if (f.t >= 1) {
        f.t = -1
        f.s.visible = false
        const sp = this.sparks.find((s) => s.t < 0)
        if (sp) {
          sp.t = 0
          sp.s.x = Math.round(f.x1)
          sp.s.y = Math.round(f.y1)
          sp.s.visible = true
        }
        pulseScore(this.c.reduced)
        f.done?.()
      }
    }
    for (const s of this.sparks) {
      if (s.t < 0) continue
      s.t += dt
      const tex = this.spk[Math.floor(s.t * 12)]
      if (!tex) {
        s.t = -1
        s.s.visible = false
      } else s.s.texture = tex
    }
  }
}

/** quadro branco de 1 frame (33 ms) por cima de um sprite no acerto; pool pequeno */
export class HitFlash {
  readonly root = new Container()
  private list: { s: Sprite; t: number }[] = []
  constructor(n = 4) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite()
      s.anchor.set(0.5)
      s.visible = false
      this.root.addChild(s)
      this.list.push({ s, t: -1 })
    }
  }
  show(tex: Texture, x: number, y: number, ax = 0.5, ay = 0.5) {
    const f = this.list.find((k) => k.t < 0) ?? this.list[0]
    if (!f) return
    f.s.texture = tex
    f.s.anchor.set(ax, ay)
    f.s.x = Math.round(x)
    f.s.y = Math.round(y)
    f.s.visible = true
    f.t = 0
  }
  update(dt: number) {
    for (const f of this.list) {
      if (f.t < 0) continue
      f.t += dt
      // 2 quadros brancos e some (o sprite real aparece por baixo)
      if (f.t > 0.034) {
        f.t = -1
        f.s.visible = false
      }
    }
  }
}

/**
 * Final de fase como evento: anéis em escada, chuva de brasas douradas e faíscas. Usa só o Juice do motor,
 * que continua animando depois que a fase termina (o jogo para de receber update).
 */
export function finale(c: GameCtx, x: number, y: number, ramp: readonly number[] = GOLD) {
  c.fx.ring(x, y, P.white, 14)
  c.fx.ring(x, y, P.goldHi, 34)
  c.fx.ring(x, y, P.redHot, 54)
  const n = c.reduced ? 1 : 3
  for (let i = 0; i < ramp.length; i++) c.fx.burst(x, y, ramp[i] ?? P.gold, n * 3, 70 + i * 6)
  c.fx.shake(2, 200, { x: 0, y: 1 })
}

/** dispara uma vez quando a fase com tempo chega ao último quadro (o runner chama update antes de encerrar) */
export class LastFrame {
  private fired = false
  constructor(private duration: number) {}
  check(c: GameCtx, fn: () => void) {
    if (this.fired || this.duration <= 0) return
    if (c.time >= this.duration - 1e-6) {
      this.fired = true
      fn()
    }
  }
}

// ---------- demonstração: mão pixel mostrando o gesto (some no primeiro toque) ----------
const HAND_ROWS = [
  '....kk......',
  '...kTTk.....',
  '...kTTk.....',
  '...kTTkk....',
  '...kTTkTkk..',
  '.kkkTTkTkTk.',
  'kTtkTTTTTTTk',
  'kTTkTTTTTTtk',
  '.kTTTTTTTTtk',
  '..kTTTTTTttk',
  '...kTTTTttk.',
  '....kTTttk..',
  '....kkkkkk..',
]

/**
 * Mão de demonstração: aponta o primeiro alvo e "toca" a cada 0,8 s (desce 3 px e solta um anel).
 * Fica nos primeiros segundos da fase e some de vez no primeiro toque do jogador. Movimento reduzido:
 * mão parada, sem anel.
 */
export class HandHint {
  readonly root: Sprite
  private gone = false
  private lastTap = -1

  constructor(
    private c: GameCtx,
    /** até quando (tempo da fase, s) a demonstração pode aparecer */
    private until = 3.5,
  ) {
    this.root = new Sprite(rowsTex('fxb-hand', HAND_ROWS))
    // a ponta do dedo fica no alvo
    this.root.anchor.set(4.5 / 12, 0)
    this.root.visible = false
  }

  dismiss() {
    this.gone = true
    this.root.visible = false
  }

  /** `target` em pixels lógicos (ou null quando não há alvo para mostrar agora) */
  update(target: { x: number; y: number } | null) {
    const t = this.c.time
    if (this.gone || t > this.until || !target) {
      this.root.visible = false
      if (t > this.until) this.gone = true
      return
    }
    this.root.visible = true
    const phase = (t % 0.8) / 0.8
    const press = !this.c.reduced && phase > 0.55 && phase < 0.8
    this.root.x = Math.round(target.x)
    this.root.y = Math.round(target.y + (press ? 0 : 3))
    const k = Math.floor(t / 0.8)
    if (press && k !== this.lastTap && !this.c.reduced) {
      this.lastTap = k
      this.c.fx.ring(target.x, target.y, P.stoneHi, 10)
    }
  }
}

/** marca "era aqui": anel e faísca dourada no alvo certo depois de um erro (o erro ensina) */
export function showRight(c: GameCtx, x: number, y: number) {
  c.fx.ring(x, y, P.goldHi, 16)
  c.fx.burst(x, y, P.gold, c.reduced ? 2 : 5, 30)
}

const HAND_COL: Record<string, string> = { k: '#07050a', T: '#ece6de', t: '#bdb4b6' }

/**
 * Mão de demonstração em DOM (para fases com cartas em DOM, por cima do canvas): aponta `target`,
 * em escala inteira, e "toca" em degraus. Devolve a função que a remove.
 */
export function domHand(c: GameCtx, target: Element): () => void {
  const cv = document.createElement('canvas')
  cv.width = 12
  cv.height = HAND_ROWS.length
  const g = cv.getContext('2d')
  if (g)
    HAND_ROWS.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = HAND_COL[row[x] ?? '.']
        if (!col) continue
        g.fillStyle = col
        g.fillRect(x, y, 1, 1)
      }
    })
  const scale = Math.max(2, Math.round(c.css * 1.5))
  const r = target.getBoundingClientRect()
  Object.assign(cv.style, {
    position: 'fixed',
    left: `${Math.round(r.left + r.width * 0.72 - 4.5 * scale)}px`,
    top: `${Math.round(r.top + r.height * 0.45)}px`,
    width: `${12 * scale}px`,
    height: `${HAND_ROWS.length * scale}px`,
    imageRendering: 'pixelated',
    pointerEvents: 'none',
    zIndex: '5',
  })
  cv.setAttribute('aria-hidden', 'true')
  document.body.append(cv)
  const anim = c.reduced
    ? null
    : cv.animate([{ transform: `translateY(${3 * scale}px)` }, { transform: 'translateY(0)' }], {
        duration: 800,
        iterations: Number.POSITIVE_INFINITY,
        easing: 'steps(2, jump-none)',
      })
  return () => {
    anim?.cancel()
    cv.remove()
  }
}
