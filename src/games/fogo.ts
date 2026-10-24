// Fase 4 · Floresta em Pé: apague os focos antes que a árvore queime; replante os tocos.
// Árvores procedurais com luz e rim light, fogo animado pela rampa, fumaça avisando antes de acender,
// brasa voando de uma árvore para outra antes de espalhar, água espirrando ao apagar.
import { Container, type Sprite, type Text, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { anchors } from '../scene/levels/l04'
import { Driver, Flyers, Hand, reticleFrames, whiteTex } from './fx-a'
import {
  Combo,
  clamp01,
  curve,
  FIRE,
  Field,
  frameAt,
  Grid,
  glowTex,
  gridTex,
  LEAF,
  label,
  lerp,
  P,
  popScale,
  rampBurst,
  rowsTex,
  SMOKE,
  setSquash,
  shade,
  shadowTex,
  spr,
  TapBuffer,
  WATER,
} from './kit-a'

type State = 'ok' | 'warn' | 'fire' | 'toco' | 'broto'

interface Tree {
  x: number
  y: number
  v: number
  state: State
  t: number
  /** quando acende (estado warn) */
  warnFor: number
  spread: boolean
  burnFor: number
  pop: number
  body: Sprite
  fire: Sprite
  glow: Sprite
  scorch: Sprite
  pip: Text
}

const CANOPY = [P.void, P.vine0, P.vine1, P.vine1, P.green]
const BURNING = [P.void, P.blood0, P.blood1, P.blood1, P.emberDark]
const CHAR = [P.void, P.stone0, P.stone1, P.stone1, P.stone2]
const BARK = [P.void, P.gold0, P.emberDark, P.gold1]

/**
 * árvore 20×26: copa numa silhueta só (sem bordas internas), tufos marcados por arcos de luz
 * em cima à esquerda, sombra violeta-verde embaixo, rim vermelho à direita e tronco com raízes.
 * Variantes: 0 = copa redonda, 1 = alta, 2 = larga e baixa.
 */
function treeTex(v: number, look: 'ok' | 'burn' | 'char' | 'warn', sway = 0) {
  return gridTex(`fogo-tree3-${v}${look}${sway}`, () => treeGrid(v, look, sway))
}

/** grade da árvore; `sway` 1 = copa de cima 1 px para a direita (idle de 2 quadros ao vento) */
function treeGrid(v: number, look: 'ok' | 'burn' | 'char' | 'warn', sway = 0) {
  {
    const m = new Grid(20, 26)
    m.rect(9, 15, 2, 9, 2).rect(8, 23, 4, 1, 2).set(7, 24, 2)
    m.set(12, 24, 2)
    const tufts: [number, number, number, number][] =
      v === 1
        ? [
            [10, 13, 6, 4.5],
            [7, 9, 4.5, 4],
            [13, 8, 4.5, 4],
            [10, 4.5, 4, 3.5],
          ]
        : v === 2
          ? [
              [10, 13, 8, 4],
              [5.5, 10, 4.5, 3.5],
              [14.5, 10, 4.5, 3.5],
              [10, 8, 5, 3.5],
            ]
          : [
              [10, 12, 7.5, 5],
              [6, 8.5, 4.5, 4],
              [14, 8.5, 4.5, 4],
              [10, 6, 4.5, 3.5],
            ]
    for (const [x, y, rx, ry] of tufts) m.ellipse(x + (sway && y < 10 ? 1 : 0), y, rx, ry, 1)
    const leaf = look === 'ok' || look === 'warn' ? CANOPY : look === 'burn' ? BURNING : CHAR
    const rim =
      look === 'ok' ? P.crimsonDeep : look === 'warn' ? P.redHot : look === 'burn' ? P.ember : undefined
    const g = shade(
      m,
      { 1: { ramp: leaf, grain: 0.12, rim }, 2: { ramp: look === 'char' ? CHAR : BARK } },
      7 + v,
    )
    // arcos de luz no alto-esquerda de cada tufo (lê como folhagem em camadas)
    const hi = leaf[leaf.length - 1] ?? P.green
    const mid = leaf[2] ?? P.vine1
    for (const [x, y, rx, ry] of tufts.slice(1))
      for (let a = 3.4; a < 4.9; a += 0.22) {
        const px = Math.round(x + Math.cos(a) * (rx - 1.2))
        const py = Math.round(y + Math.sin(a) * (ry - 1.2))
        if (m.get(px, py) === 1) g.set(px, py, a < 4.2 ? hi : mid)
      }
    // sombra dos tufos de cima sobre a copa de baixo
    for (let x = 4; x < 17; x++) if (m.get(x, 12) === 1 && x % 2) g.set(x, 12, leaf[1] ?? P.vine0)
    // personalidade: com a fumaça chegando, a árvore arregala os olhos e sua (gota azul)
    if (look === 'warn') {
      for (const ex of [7, 12]) {
        g.rect(ex, 10, 2, 2, P.white)
        g.set(ex + 1, 11, P.void)
      }
      g.rect(9, 14, 2, 1, P.void)
      g.set(15, 8, P.blue1)
      g.set(15, 9, P.sparkle)
    }
    return g
  }
}

function stumpTex() {
  return gridTex('fogo-stump', () => {
    const m = new Grid(18, 24)
    m.rect(7, 18, 4, 4, 1).rect(6, 21, 6, 1, 1)
    m.rect(7, 17, 4, 1, 2)
    const g = shade(m, { 1: { ramp: CHAR }, 2: { ramp: [P.gold0, P.emberDark, P.ember, P.emberBright] } })
    g.set(8, 19, P.blood1)
    g.set(9, 20, P.emberDark)
    return g
  })
}

function sproutTex() {
  return gridTex('fogo-sprout', () => {
    const m = new Grid(18, 24)
    m.rect(8, 17, 1, 5, 1)
    m.ellipse(6, 17, 2.4, 1.4, 2)
    m.ellipse(11, 16, 2.6, 1.5, 3)
    m.rect(6, 21, 6, 1, 4)
    return shade(m, {
      1: { ramp: [P.vine0, P.vine1, P.green] },
      2: { ramp: [P.vine0, P.vine1, P.green, P.leafHi] },
      3: { ramp: [P.vine0, P.vine1, P.green, P.leafHi] },
      4: { ramp: BARK },
    })
  })
}

/** chama procedural: núcleo branco embaixo no centro, pontas vermelhas pontilhadas */
function flameTex(size: number, f: number) {
  const H = [9, 14, 20][size] ?? 14
  const hw = [3.5, 5, 7][size] ?? 5
  return gridTex(`fogo-flame${size}-${f}`, () => {
    const W = Math.ceil(hw * 2) + 4
    const g = new Grid(W, H + 1, -1)
    const cx = (W - 1) / 2
    for (let y = 0; y <= H; y++) {
      const k = y / H
      const half = hw * (1 - k) ** 0.75 * (1 + 0.18 * Math.sin(y * 0.9 + f * 1.7))
      const shift = Math.sin(y * 0.55 + f * 1.4) * 1.6 * k
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x - cx - shift) / Math.max(0.6, half)
        if (dx > 1) continue
        const heat = (1 - dx) * (1 - 0.75 * k)
        const idx = Math.max(0, Math.min(FIRE.length - 1, Math.floor((1 - heat) * FIRE.length * 0.95)))
        if (idx >= FIRE.length - 2 && (x + y + f) % 2) continue
        g.set(x, H - y, FIRE[idx] ?? P.red)
      }
    }
    // línguas soltas acima da chama
    const tx = Math.round(cx + Math.sin(f * 2.3) * hw * 0.6)
    g.set(tx, 0, P.red)
    g.set(tx, 1, P.ember)
    return g
  })
}

/** gotas de água em coroa: 3 quadros a 15 fps */
function splashTex(f: number) {
  return gridTex(`fogo-splash${f}`, () => {
    const g = new Grid(17, 9, -1)
    const r = 3 + f * 2.5
    for (let a = 0; a < 10; a++) {
      const ang = Math.PI + (a / 9) * Math.PI
      const x = 8 + Math.cos(ang) * r
      const y = 8 + Math.sin(ang) * r * 0.9 + f * 0.8
      g.set(x, y, f === 2 ? P.blue1 : a % 3 ? P.blue1 : P.sparkle)
      if (f === 0) g.set(x, y + 1, P.blue0)
    }
    if (f < 2) g.rect(5 - f, 8, 7 + f * 2, 1, P.blue1)
    return g
  })
}

/** chão queimado sob o toco */
function scorchTex() {
  return gridTex('fogo-scorch', () => {
    const g = new Grid(20, 5, -1)
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 20; x++) {
        const d = ((x - 9.5) / 10) ** 2 + ((y - 2) / 2.5) ** 2
        if (d > 1 || (d > 0.6 && (x + y) % 2)) continue
        g.set(x, y, d < 0.25 ? P.emberDark : (x * 7 + y) % 3 ? P.blood0 : P.blood1)
      }
    return g
  })
}

/** mato de primeiro plano (profundidade): silhueta escura com pontas acesas pelo fogo */
function grassTex(w: number) {
  return gridTex(`fogo-grass${w}`, () => {
    const g = new Grid(w, 12, -1)
    for (let x = 0; x < w; x++) {
      const hgt = 3 + Math.round(4 * Math.abs(Math.sin(x * 0.37)) + 3 * Math.abs(Math.sin(x * 1.13 + 1)))
      for (let y = 0; y < hgt; y++)
        g.set(x, 11 - y, y === hgt - 1 && x % 5 === 0 ? P.blood1 : y > hgt - 3 ? P.vine0 : P.void)
    }
    return g
  })
}

export default function fogo(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const shadows = new Container()
  const decals = new Container()
  const bodies = new Container()
  const glows = new Container()
  const fx = new Container()
  let field: Field
  let combo: Combo
  const trees: Tree[] = []
  let spawn = 1.2
  let burned = 0
  const tap = new TapBuffer(0.1)
  const flames: Texture[][] = []
  let splashF: Texture[] = []
  const splashes: { s: Sprite; t: number }[] = []
  const arcs: { from: Tree; to: Tree; t: number }[] = []
  const T: Record<string, Texture> = {}

  const look = (tr: Tree, l: 'ok' | 'burn' | 'char' | 'warn') => T[`${tr.v}${l}`] as Texture
  let flyers: Flyers
  let driver: Driver | null = null
  let leafF: Texture[] = []
  const flash = new Map<Tree, number>()
  const rets: { s: Sprite; tr: Tree | null }[] = []
  let retF: Texture[] = []
  const horizon: Sprite[] = []
  let ended = false
  let endT = 0
  let hand: Hand
  let lastTap = { x: 0, y: 0 }

  function finale() {
    ended = true
    endT = 0
    for (const t of trees)
      if (t.state === 'ok' || t.state === 'broto') {
        if (c.rnd() < 0.35) field.sparkle(t.x, t.y - 14)
        if (c.rnd() < 0.5) field.blast(t.x, t.y - 12, 4, 30, LEAF)
      }
    const x = c.W / 2
    const y = (c.top + c.bottom) / 2
    c.fx.ring(x, y, P.leafHi, 60)
    c.fx.ring(x, y, P.white, 28)
    flyers.retarget()
    flyers.send(x, y, leafF, 10, 30)
  }

  function live(dt: number) {
    flyers.update(dt)
    const now = performance.now() / 1000
    for (let i = 0; i < horizon.length; i++)
      (horizon[i] as Sprite).alpha = c.reduced ? 0.35 : frameAt(now + i * 0.29, 7, 3) === 1 ? 0.55 : 0.38
    if (ended) {
      endT += dt
      field.update(dt * (endT < 0.3 ? 0.3 : 1))
    }
  }

  function setBody(tr: Tree) {
    const s = tr.state
    tr.body.texture =
      s === 'toco'
        ? (T.stump as Texture)
        : s === 'broto'
          ? (T.sprout as Texture)
          : s === 'fire'
            ? look(tr, tr.t > tr.burnFor - 1.2 ? 'char' : 'burn')
            : s === 'warn'
              ? look(tr, 'warn')
              : look(tr, 'ok')
  }

  function warn(tr: Tree, secs: number) {
    if (tr.state !== 'ok') return
    tr.state = 'warn'
    tr.t = 0
    tr.warnFor = secs
  }

  function ignite(tr: Tree) {
    tr.state = 'fire'
    tr.t = 0
    tr.spread = false
    // queima devagar no começo (4,4 s) e rápido no pico (3,2 s)
    tr.burnFor = lerp(4.4, 3.2, curve(c.time, 30))
    c.fx.ring(tr.x, tr.y - 10, P.ember, 12)
    c.sfx('fire', { x: tr.x, volume: 0.7 })
    field.blast(tr.x, tr.y - 10, 8, 40, FIRE, { add: true })
    setBody(tr)
  }

  function splash(x: number, y: number) {
    const s = splashes.find((k) => k.t < 0)
    if (!s) return
    s.t = 0
    s.s.x = Math.round(x)
    s.s.y = Math.round(y)
    s.s.visible = true
  }

  function nearest(x: number, y: number, pred: (t: Tree) => boolean) {
    let best: Tree | null = null
    let bd = 16
    for (const t of trees) {
      if (!pred(t)) continue
      const d = Math.hypot(t.x - x, t.y - 9 - y)
      if (d < bd) {
        bd = d
        best = t
      }
    }
    return best
  }

  /** foco ou toco mais perto (sem limite de distância), para o erro mostrar onde era */
  function nearestAny(x: number, y: number) {
    let best: Tree | null = null
    let bd = 1e9
    for (const t of trees) {
      if (t.state !== 'fire' && t.state !== 'warn') continue
      const d = Math.hypot(t.x - x, t.y - 9 - y)
      if (d < bd) {
        bd = d
        best = t
      }
    }
    return best
  }

  /** tenta apagar/replantar no ponto; devolve true se acertou algo */
  function act(x: number, y: number) {
    const fire = nearest(x, y, (t) => t.state === 'fire' || t.state === 'warn')
    if (fire) {
      const early = fire.state === 'warn'
      flash.set(fire, c.time)
      flyers.retarget()
      flyers.send(fire.x, fire.y - 14, leafF, early ? 2 : 3, 10)
      c.fx.ring(fire.x, fire.y - 10, P.white, 8)
      fire.state = 'ok'
      fire.t = 0
      fire.pop = c.time
      fire.scorch.visible = false
      setBody(fire)
      const cy = fire.y - 10
      c.addScore(early ? 20 : 30, fire.x, cy - 12)
      combo.hit(fire.x, cy - 22)
      c.fx.ring(fire.x, cy, P.blue1, 18)
      field.blast(fire.x, cy, 18, 60, WATER, { grav: 160 })
      field.blast(fire.x, cy - 4, 10, 18, SMOKE, { grav: -30, life: 1, drag: 2 })
      splash(fire.x, fire.y - 2)
      c.sfx('water', { x: fire.x })
      c.sfx('good', { x: fire.x, combo: combo.n })
      return true
    }
    const toco = nearest(x, y, (t) => t.state === 'toco')
    if (toco) {
      toco.state = 'broto'
      toco.t = 0
      toco.pop = c.time
      toco.scorch.visible = false
      setBody(toco)
      c.addScore(15, toco.x, toco.y - 14)
      c.fx.ring(toco.x, toco.y - 4, P.leafHi, 14)
      flash.set(toco, c.time)
      flyers.retarget()
      flyers.send(toco.x, toco.y - 8, leafF, 1, 8)
      field.blast(toco.x, toco.y - 4, 10, 40, LEAF)
      field.sparkle(toco.x + 3, toco.y - 8)
      c.sfx('spark', { x: toco.x })
      return true
    }
    return false
  }

  return {
    duration: 30,
    goal: 700,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      field = new Field(c)
      field.trail = WATER
      combo = new Combo(c, field, 1.5)
      for (const v of [0, 1, 2])
        for (const l of ['ok', 'burn', 'char', 'warn'] as const) {
          T[`${v}${l}`] = treeTex(v, l)
          T[`${v}${l}1`] = treeTex(v, l, 1)
        }
      for (const v of [0, 1, 2]) T[`${v}white`] = whiteTex(`fogo-tree${v}`, () => treeGrid(v, 'ok'))
      T.stump = stumpTex()
      T.sprout = sproutTex()
      for (let s = 0; s < 3; s++) flames.push([0, 1, 2, 3].map((f) => flameTex(s, f)))
      splashF = [0, 1, 2].map(splashTex)
      const glowT = glowTex(9, FIRE)
      const shadowT = shadowTex(14)
      const scorchT = scorchTex()

      const top = c.top + 26
      const cols = Math.max(4, Math.floor((c.W - 12) / 20))
      const rows = Math.max(3, Math.min(6, Math.floor((c.bottom - top - 6) / 30)))
      const gx = (c.W - 12) / cols
      const gy = (c.bottom - top - 6) / rows
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
          if (r % 2 && k === cols - 1) continue
          const x = Math.round(6 + gx * (k + 0.5) + (c.rnd() - 0.5) * 7 + (r % 2 ? gx / 2 : 0))
          const y = Math.round(top + gy * (r + 0.55) + (c.rnd() - 0.5) * 7)
          const body = spr(T['0ok'] as Texture, x, y, 0.5, 1)
          const fire = spr(flames[0]?.[0] as Texture, x, y - 6, 0.5, 1)
          fire.visible = false
          const glow = spr(glowT, x, y - 8)
          glow.blendMode = 'add'
          glow.visible = false
          const scorch = spr(scorchT, x, y)
          scorch.visible = false
          const pip = label('!', P.redHot)
          pip.visible = false
          shadows.addChild(spr(shadowT, x, y))
          decals.addChild(scorch)
          trees.push({
            x,
            y,
            v: Math.floor(c.rnd() * 3),
            state: 'ok',
            t: 0,
            warnFor: 0,
            spread: false,
            burnFor: 3.4,
            pop: -1,
            body,
            fire,
            glow,
            scorch,
            pip,
          })
        }
      trees.sort((a, b) => a.y - b.y)
      for (const t of trees) {
        setBody(t)
        bodies.addChild(t.body, t.fire)
        glows.addChild(t.glow)
        fx.addChild(t.pip)
      }
      for (let i = 0; i < 6; i++) {
        const s = spr(splashF[0] as Texture, 0, 0, 0.5, 1)
        s.visible = false
        fx.addChild(s)
        splashes.push({ s, t: -1 })
      }
      const grass = spr(grassTex(c.W), 0, c.bottom + 2, 0, 1)
      // cenário vivo: os clarões das queimadas no horizonte tremulam
      for (const f of anchors(c.W, c.H).fires) {
        const g = spr(glowTex(9, FIRE), f.x, f.y - 2)
        g.blendMode = 'add'
        g.alpha = 0.4
        horizon.push(g)
        root.addChild(g)
      }
      // mira da ameaça (telegrafa) sobre as árvores com fumaça
      retF = reticleFrames(24)
      for (let i = 0; i < 8; i++) {
        const s = spr(retF[0] as Texture, 0, 0)
        s.visible = false
        fx.addChild(s)
        rets.push({ s, tr: null })
      }
      leafF = [rowsTex('fogo-leaf0', ['.G.', 'GgV', '.V.']), rowsTex('fogo-leaf1', ['..G', '.gV', 'V..'])]
      flyers = new Flyers(c, 30)
      flyers.trail = (x, y) => field.spawn(x, y, { life: 0.22, ramp: LEAF, add: false })
      flyers.onArrive = (x, y) => {
        if (c.rnd() < 0.4) field.sparkle(x, y + 4)
      }
      root.addChild(shadows, decals, glows, bodies, field.root, fx, grass, flyers.root, combo.text)
      hand = new Hand(c, 3.5)
      hand.x = Math.round(c.W / 2)
      hand.y = Math.round((c.top + c.bottom) / 2)
      root.addChild(hand.s)
      driver = new Driver(live)
      driver.start()
    },
    update(dt) {
      const d = curve(c.time, 30)
      spawn -= dt
      if (spawn <= 0) {
        spawn = lerp(1.9, 0.55, d)
        const ok = trees.filter((t) => t.state === 'ok')
        const pick = ok[Math.floor(c.rnd() * ok.length)]
        // antecipação: 0,7 s de fumaça antes de pegar fogo
        if (pick) warn(pick, lerp(0.9, 0.6, d))
      }
      tap.poll(c.time, act, () => {
        // o erro ensina: anel cinza no toque e a mira pisca no foco mais perto
        c.fx.ring(lastTap.x, lastTap.y, P.stone2, 6)
        const f = nearestAny(lastTap.x, lastTap.y)
        if (f) c.fx.ring(f.x, f.y - 10, P.redHot, 16)
      })
      // demonstração: a mão espera no meio e vai para a primeira árvore em perigo
      if (!hand.done) {
        const f = trees.find((t) => t.state === 'warn' || t.state === 'fire')
        if (f) {
          hand.x = f.x
          hand.y = f.y - 10
        }
        hand.update(dt)
      }
      for (const t of trees) {
        t.t += dt
        if (t.state === 'warn') {
          if (c.rnd() < 0.35)
            field.spawn(t.x + (c.rnd() - 0.5) * 8, t.y - 14, {
              vy: -14,
              vx: (c.rnd() - 0.5) * 6,
              life: 0.9,
              ramp: SMOKE,
              wob: 5,
            })
          if (t.t >= t.warnFor) ignite(t)
        } else if (t.state === 'fire') {
          if (!t.spread && t.t > 1.8) {
            t.spread = true
            const near = trees.filter((o) => o.state === 'ok' && Math.hypot(o.x - t.x, o.y - t.y) < 32)
            const n = near[Math.floor(c.rnd() * near.length)]
            if (n && c.rnd() < lerp(0.45, 0.8, d)) {
              warn(n, 0.45)
              arcs.push({ from: t, to: n, t: 0 })
            }
          }
          if (t.t > t.burnFor - 1.2 && t.t - dt <= t.burnFor - 1.2) setBody(t)
          if (t.t > t.burnFor) {
            t.state = 'toco'
            t.t = 0
            burned++
            setBody(t)
            t.scorch.visible = true
            field.blast(t.x, t.y - 8, 16, 50, [P.stone2, P.stone1, P.stone0, P.void], { grav: 140 })
            field.blast(t.x, t.y - 10, 10, 40, FIRE, { add: true })
            combo.reset()
            c.hit(t.x, t.y - 8)
          } else {
            const size = t.t < 1 ? 0 : t.t < t.burnFor - 1.2 ? 1 : 2
            t.fire.texture = flames[size]?.[frameAt(c.time + t.x * 0.13, 12, 4)] as Texture
            if (c.rnd() < 0.25 + size * 0.2) field.ember(t.x + (c.rnd() - 0.5) * 8, t.y - 12 - size * 4)
          }
        } else if (t.state === 'broto' && t.t > 4) {
          t.state = 'ok'
          t.pop = c.time
          setBody(t)
          field.sparkle(t.x, t.y - 16)
        }
        const burning = t.state === 'fire'
        t.fire.visible = burning
        t.glow.visible = burning
        if (burning) {
          // brilho respira 2 tons a cada 4 quadros
          t.glow.alpha = frameAt(c.time, 15, 2) ? 0.6 : 0.45
          const urgent = t.t > t.burnFor - 1.2
          t.pip.visible = urgent && frameAt(c.time, 4 + (t.t - t.burnFor + 1.2) * 8, 2) === 0
          t.pip.x = t.x
          t.pip.y = t.y - 30
        } else t.pip.visible = false
        // idle ao vento (2 quadros a 2 fps, em fase pela posição) e clarão branco de 1 quadro no acerto
        const fl = flash.get(t)
        if (fl !== undefined && c.time - fl < 0.05) t.body.texture = T[`${t.v}white`] as Texture
        else {
          if (fl !== undefined) flash.delete(t)
          if (t.state === 'ok' || t.state === 'warn') {
            const sw = Math.floor(c.time * 2 + t.x * 0.05) % 2 ? '1' : ''
            t.body.texture = T[`${t.v}${t.state}${sw}`] as Texture
          }
        }
        // ameaça treme: a árvore com fumaça tremelica 1 px a 15 fps
        t.body.x = t.state === 'warn' && !c.reduced ? t.x + (frameAt(c.time, 15, 2) ? 1 : -1) : t.x
        const [sx, sy] = popScale(t.pop < 0 ? 1 : c.time - t.pop)
        setSquash(t.body, sx, sy)
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i]
        if (!a) continue
        a.t += dt / 0.45
        const k = clamp01(a.t)
        const x = lerp(a.from.x, a.to.x, k)
        const y = lerp(a.from.y - 16, a.to.y - 12, k) - Math.sin(k * Math.PI) * 14
        field.spawn(x, y, { life: 0.3, ramp: FIRE, add: true, size: 2 })
        if (k >= 1) arcs.splice(i, 1)
      }
      for (const s of splashes) {
        if (s.t < 0) continue
        s.t += dt
        const tex = splashF[Math.floor(s.t * 15)]
        if (!tex) {
          s.t = -1
          s.s.visible = false
        } else s.s.texture = tex
      }
      // miras sobre as árvores em alerta
      let ri = 0
      for (const t of trees) {
        if (t.state !== 'warn' || ri >= rets.length) continue
        const r = rets[ri++] as { s: Sprite; tr: Tree | null }
        r.s.visible = true
        r.s.x = t.x
        r.s.y = t.y - 10
        r.s.texture = retF[Math.min(3, Math.floor((t.t / Math.max(0.1, t.warnFor)) * 4))] as Texture
      }
      for (; ri < rets.length; ri++) (rets[ri] as { s: Sprite }).s.visible = false
      combo.update()
      field.update(dt)
    },
    move(x, y) {
      field.pointer(x, y)
    },
    down(x, y) {
      field.pointer(x, y, true)
      hand.hide()
      lastTap = { x, y }
      if (!act(x, y)) tap.push(x, y, c.time)
    },
    clear() {
      const fires = trees.filter((t) => t.state === 'fire' || t.state === 'warn')
      if (!fires.length) return false
      for (const f of fires) {
        f.state = 'ok'
        f.t = 0
        f.pop = c.time
        setBody(f)
        field.blast(f.x, f.y - 10, 10, 50, WATER, { grav: 160 })
        splash(f.x, f.y - 2)
      }
      rampBurst(c, c.W / 2, (c.top + c.bottom) / 2, WATER, 8, 40)
      c.addScore(fires.length * 30)
      return true
    },
    timeUp() {
      const alive = trees.filter((t) => t.state === 'ok' || t.state === 'broto').length
      c.addScore(alive * 10)
      const ok = burned < trees.length / 2
      if (ok) finale()
      return ok
    },
    dispose() {
      driver?.stop()
      root.destroy({ children: true })
    },
  }
}
