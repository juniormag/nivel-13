// Fase 1 · Mapa da Fome: pinte o Brasil de verde levando comida a cada canto.
// Implementação de referência do contrato MicroGame em PixiJS (modo retido + juice).
// Passe de arte (level-art-lead A): o mapa é uma laje em três quartos com os estados em relevo
// (borda acesa em cima/esquerda, sombra embaixo/direita) e a lateral grossa de granito vermelho.
// Vermelho = chão rachado de fome; dourado = a onda de comida chegando; verde = roça plantada
// balançando ao vento, com brotos. A dinâmica (grade, raio, crise, tempos, pontos) é a mesma.
import { Container, type Sprite, type Texture } from 'pixi.js'
import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import type { GameCtx, MicroGame } from '../engine/types'
import { anchors } from '../scene/levels/l01'
import { Driver, Flyers, Hand, reticleFrames, step8 } from './fx-a'
import {
  Combo,
  Field,
  frameAt,
  GOLD,
  Grid,
  glowTex,
  gridTex,
  LEAF,
  label,
  P,
  popScale,
  rowsTex,
  setSquash,
  shade,
  spr,
  subTex,
} from './kit-a'

interface Tile {
  i: number
  j: number
  green: boolean
  t: number
  s: Sprite
  /** estado desenhado no quadro anterior (evita trocar textura à toa) */
  st: number
  k: number
}

// estados desenhados no atlas (uma cópia do mapa inteiro por faixa)
const HUNGRY = 0
const HOT = 1
const FLASH = 2
const GROW = 3
const FED0 = 4
const FED1 = 5
const NSTATE = 6

/** centros aproximados das 27 UFs (lon, lat): o Voronoi dá fronteiras plausíveis a 30 ladrilhos */
const UF_C: [number, number][] = [
  [-70.5, -9.0],
  [-64.5, -4.2],
  [-61.4, 2.0],
  [-51.9, 1.4],
  [-52.5, -4.0],
  [-45.3, -5.0],
  [-42.9, -7.6],
  [-39.5, -5.2],
  [-36.6, -5.8],
  [-36.7, -7.1],
  [-37.9, -8.4],
  [-36.6, -9.6],
  [-37.4, -10.6],
  [-41.7, -12.5],
  [-48.3, -10.2],
  [-62.8, -10.9],
  [-55.9, -12.9],
  [-49.6, -15.9],
  [-47.8, -15.8],
  [-54.8, -20.5],
  [-44.6, -18.5],
  [-40.6, -19.6],
  [-42.8, -22.3],
  [-48.6, -22.2],
  [-51.6, -24.6],
  [-50.5, -27.3],
  [-53.3, -29.7],
]

/** escuro → claro, com hue shift (sombra para o vinho/violeta, luz para o laranja/amarelo) */
const RAMPS: readonly (readonly number[])[] = [
  [P.blood0, P.blood1, P.crimsonDeep, P.crimson, P.red, P.redGlow],
  [P.blood1, P.crimsonDeep, P.crimson, P.red, P.redHot, P.redGlow],
  [P.gold1, P.gold, P.goldHi, P.sparkle, P.white, P.white],
  [P.gold0, P.gold1, P.gold, P.goldHi, P.sparkle, P.white],
  [P.vine0, P.vine0, P.vine1, P.green, P.leafHi, P.sparkle],
  [P.vine0, P.vine0, P.vine1, P.green, P.leafHi, P.sparkle],
]

function inside(cols: number, ts: number) {
  const S = cols * ts
  const memo = new Map<number, boolean>()
  return (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return false
    const i = Math.floor(x / ts)
    const j = Math.floor(y / ts)
    const key = j * 1000 + i
    let v = memo.get(key)
    if (v === undefined) {
      v = inBrazil(LON0 + ((i + 0.5) / cols) * (LON1 - LON0), LAT0 + ((j + 0.5) / cols) * (LAT1 - LAT0))
      memo.set(key, v)
    }
    return v
  }
}

/** atlas: o mapa inteiro em cada estado, pixel a pixel, com relevo por estado e textura do material */
function atlasGrid(cols: number, ts: number) {
  const S = cols * ts
  const ins = inside(cols, ts)
  const uf = new Int16Array(S * S).fill(-1)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (!ins(x, y)) continue
      const lon = LON0 + ((x + 0.5) / S) * (LON1 - LON0)
      const lat = LAT0 + ((y + 0.5) / S) * (LAT1 - LAT0)
      let best = 0
      let bd = 1e9
      for (let k = 0; k < UF_C.length; k++) {
        const u = UF_C[k] as [number, number]
        const d = (lon - u[0]) ** 2 + (lat - u[1]) ** 2 * 1.1
        if (d < bd) {
          bd = d
          best = k
        }
      }
      uf[y * S + x] = best
    }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= S || y >= S ? -1 : (uf[y * S + x] ?? -1))
  const g = new Grid(S, S * NSTATE, -1)
  for (let st = 0; st < NSTATE; st++) {
    const ramp = RAMPS[st] ?? []
    const oy = st * S
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const me = at(x, y)
        if (me < 0) continue
        // planalto de cada estado: alguns um degrau acima (relevo entre vizinhos)
        let v = 2 + ((me * 7) % 3 === 0 ? 1 : 0)
        const lit = at(x - 1, y) !== me || at(x, y - 1) !== me
        const sh = at(x + 1, y) !== me || at(x, y + 1) !== me
        const sh2 = at(x + 2, y) !== me || at(x, y + 2) !== me
        const coast = at(x - 1, y) < 0 || at(x, y - 1) < 0
        if (lit) v = coast ? 5 : 4
        else if (sh) v = 0
        else if (sh2) v = 1
        else if (st === HUNGRY || st === HOT) {
          // chão rachado: linha escura de 1 px com lábio claro em cima (lição 4)
          const crack = (x * 3 + y * 5 + me * 11) % 17 === 0 || (x * 2 + y + me) % 23 === 0
          if (crack) v = 0
          else if ((x * 3 + (y - 1) * 5 + me * 11) % 17 === 0) v = 4
          else if ((x * 7 + y * 13 + me) % 11 === 0) v = 1
        } else if (st === FED0 || st === FED1) {
          // roça em fileiras diagonais; os brotos balançam 1 px entre os dois quadros
          const sway = st === FED1 ? 1 : 0
          const row = (x + y + me) % 4
          if (row === 0) v = 1
          else if (row === 2 && (x + sway) % 3 === 0) v = 4
          if ((x * 5 + y * 3 + me * 7) % 19 === 0) v = 5
        } else if ((x + y) % 3 === 0) v = Math.min(5, v + 1)
        g.set(x, oy + y, ramp[Math.max(0, Math.min(ramp.length - 1, v))] ?? P.red)
      }
  }
  return g
}

/** lateral grossa da laje (granito vermelho pontilhado), contorno seletivo e sombra de contato */
function slabGrid(cols: number, ts: number) {
  const S = cols * ts
  const D = Math.max(4, Math.round(ts * 1.1))
  const ins = inside(cols, ts)
  const pad = D + 4
  const g = new Grid(S + pad * 2, S + pad * 2, -1)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (ins(x, y))
        for (let k = D + 1; k < D + 4; k++) if ((x + y + k) % 2 === 0) g.set(x + pad + 2, y + pad + k, P.void)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (!ins(x, y)) continue
      for (let k = 1; k <= D; k++) {
        if (ins(x, y + k)) break
        const t = k / D
        let col: number = t < 0.34 ? P.crimson : t < 0.7 ? P.crimsonDeep : P.blood1
        if (k === 1) col = P.redHot
        else if ((x * 7 + k * 3) % 5 === 0) col = t < 0.5 ? P.red : P.crimson
        if (k === D) col = P.blood0
        if (!ins(x + 1, y) && k > 1) col = k === 2 ? P.crimsonDeep : P.blood0
        g.set(x + pad, y + pad + k, col)
      }
    }
  for (let y = -1; y <= S; y++)
    for (let x = -1; x <= S; x++) {
      if (ins(x, y)) continue
      if (g.get(x + pad, y + pad, -1) !== -1) continue
      if (ins(x + 1, y) || ins(x, y + 1)) g.set(x + pad, y + pad, P.stone2)
      else if (ins(x - 1, y) || ins(x, y - 1)) g.set(x + pad, y + pad, P.void)
    }
  return { g, pad, D }
}

/** prato feito (arroz, feijão, verdura) 16×11, com vapor em 2 quadros */
function pratoTex(f: number) {
  return gridTex(`mapa-prato${f}`, () => {
    const m = new Grid(16, 11)
    m.ellipse(7.5, 7, 7.4, 3.4, 1)
    m.ellipse(5, 6.2, 2.8, 1.6, 2)
    m.ellipse(10, 6.4, 2.6, 1.5, 3)
    m.ellipse(7.5, 5, 1.8, 1, 4)
    const g = shade(m, {
      1: { ramp: [P.stone1, P.stone2, P.stone3, P.stoneHi, P.white], outline: P.stone0 },
      2: { ramp: [P.stone3, P.stoneHi, P.sparkle, P.white], outline: null },
      3: { ramp: [P.blood0, P.gold0, P.emberDark, P.gold1], outline: null },
      4: { ramp: [P.vine0, P.vine1, P.green, P.leafHi], outline: null },
    })
    for (const x of f ? [5, 9] : [6, 10]) {
      g.set(x, 2 - f, P.stone2)
      g.set(x + (f ? 1 : -1), 1 - f, P.stone1)
      g.set(x, 3, P.stone1)
    }
    return g
  })
}

/** broto que nasce no ladrilho que acabou de ficar verde: 4 quadros (semente, broto, folhas, espiga) */
function sproutFrames() {
  return [
    rowsTex('mapa-br0', ['...', '...', '...', '.G.', '6y6']),
    rowsTex('mapa-br1', ['...', '...', '.G.', 'gVg', '.V.']),
    rowsTex('mapa-br2', ['.Y.', 'GyG', 'gVg', '.V.', '.v.']),
    rowsTex('mapa-br3', ['.s.', 'GYG', 'gyV', '.V.', '.v.']),
  ]
}

const grains = () => [
  rowsTex('mapa-grao0', ['.Y.', 'YsY', '.y.']),
  rowsTex('mapa-grao1', ['.y.', 'yYy', '.6.']),
]

export default function mapa(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const fxl = new Container()
  let tiles: Tile[] = []
  const grid = new Map<string, Tile>()
  let ts = 4
  let ox = 0
  let oy = 0
  let cols = 30
  let crisisT = 9
  let done = false
  let barSegs: Sprite[] = []
  let barTip: Sprite
  let label0: ReturnType<typeof label>
  let field: Field
  let combo: Combo
  let flyers: Flyers
  let driver: Driver | null = null
  let frames: Texture[][] = []
  let pratos: { s: Sprite; t: number }[] = []
  let pratoF: Texture[] = []
  let sprouts: { s: Sprite; t: number; tile: Tile | null }[] = []
  let sproutF: Texture[] = []
  let grainF: Texture[] = []
  let reticle: Sprite
  let retF: Texture[] = []
  let pre: Tile | null = null
  let preT = -1
  let barPulse = 0
  let ended = false
  let endT = 0
  let lamp: Sprite | null = null
  let bw = 0
  let bx0 = 0
  let by = 0
  let lastOn = -1
  let hand: Hand
  let hint: Sprite
  let hintT = -1

  const pct = () => tiles.filter((t) => t.green).length / Math.max(1, tiles.length)

  function feed(cx: number, cy: number, radius: number) {
    let n = 0
    for (const t of tiles) {
      if (t.green) continue
      const d = Math.hypot(t.i - cx, t.j - cy)
      if (d <= radius) {
        t.green = true
        t.t = c.time + d * 0.04
        n++
      }
    }
    return n
  }

  function drawBar(force = false) {
    const p = pct()
    const n = barSegs.length
    const on = Math.round(n * p)
    label0.text = `ALIMENTADO ${Math.round(p * 100)}%`
    if (on === lastOn && !force) return
    lastOn = on
    for (let k = 0; k < n; k++) {
      const s = barSegs[k] as Sprite
      const hot = barPulse > 0 && k >= on - 2 && k < on
      s.tint = k < on ? (hot ? P.white : k === on - 1 ? P.leafHi : P.green) : k % 2 ? P.blood0 : P.blood1
    }
    barTip.x = bx0 + Math.round(bw * p)
    barTip.visible = p > 0
  }

  function sprout(t: Tile) {
    const sp = sprouts.find((q) => q.t < 0)
    if (!sp) return
    sp.t = 0
    sp.tile = t
    sp.s.x = ox + t.i * ts + Math.round(ts / 2)
    sp.s.y = oy + t.j * ts + ts
    sp.s.visible = true
  }

  function stepSprouts(dt: number) {
    for (const sp of sprouts) {
      if (sp.t < 0) continue
      sp.t += dt
      // o broto morre se a crise secar o ladrilho; senão nasce em 4 quadros e fica 1,2 s
      if (sp.t > 1.6 || (sp.tile && !sp.tile.green)) {
        sp.t = -1
        sp.s.visible = false
        continue
      }
      sp.s.texture = sproutF[Math.min(3, Math.floor(sp.t * 10))] as Texture
    }
  }

  function strike(pick: Tile) {
    for (const t of tiles) if (Math.hypot(t.i - pick.i, t.j - pick.j) <= 1.5) t.green = false
    const x = ox + pick.i * ts + ts / 2
    const y = oy + pick.j * ts + ts / 2
    c.fx.burst(x, y, 0xff3b3b, 8)
    c.fx.ring(x, y, 0xff3b3b, 10)
    // a crise bate: terra rachando, cacos vermelhos e tremor curto vertical
    field.blast(x, y, 14, 55, [P.redHot, P.red, P.crimson, P.blood1], { grav: 140 })
    field.blast(x, y, 6, 20, [P.stone2, P.stone1, P.stone0], { grav: -20, life: 0.8, drag: 2 })
    c.fx.ring(x, y, P.white, 6)
    c.fx.shake(1.5, 120, { x: 0.4, y: 1 })
    c.sfx('shatter', { x, volume: 0.45 })
    combo.reset()
  }

  /** final como evento: câmera lenta curta (só visual), onda dourada e comida explodindo do centro */
  function finale() {
    ended = true
    endT = 0
    const cx = ox + (cols * ts) / 2
    const cy = oy + (cols * ts) / 2
    field.blast(cx, cy, 40, 90, LEAF)
    field.blast(cx, cy, 30, 70, GOLD, { add: true })
    c.fx.ring(cx, cy, P.goldHi, 60)
    c.fx.ring(cx, cy, P.white, 30)
    for (let k = 0; k < 10; k++) {
      const t = tiles[Math.floor(c.rnd() * tiles.length)]
      if (t?.green) field.sparkle(ox + t.i * ts + ts / 2, oy + t.j * ts + ts / 2)
    }
    flyers.retarget()
    flyers.send(cx, cy, grainF, 12, 24)
  }

  function updateTiles(now: number) {
    const warn = pre && preT >= 0 ? pre : null
    for (const t of tiles) {
      let st: number
      if (t.green) {
        const grow = (now - t.t) / 0.22
        if (grow < 0) st = HUNGRY
        else if (grow < 0.3) st = FLASH
        else if (grow < 1) st = GROW
        else st = (Math.floor(now * 2.5 - t.i * 0.35 + t.j * 0.12) & 1) === 0 ? FED0 : FED1
        // telegrafa a crise: os ladrilhos que vão secar piscam vermelho nos 300 ms antes
        if (warn && Math.hypot(t.i - warn.i, t.j - warn.j) <= 1.5 && frameAt(now, 12, 2)) st = HOT
        if (ended && endT < 0.8) {
          const d = Math.hypot(t.i - cols / 2, t.j - cols / 2) * 0.025
          if (endT > d && endT < d + 0.1) st = FLASH
        }
        if (st >= FED0 && t.st === GROW && !ended && (t.i * 3 + t.j) % 4 === 0) sprout(t)
      } else {
        st = Math.sin(now * 3 + t.i * 0.7 + t.j * 1.3) > 0.9 ? HOT : HUNGRY
      }
      if (st !== t.st) {
        t.st = st
        t.s.texture = frames[st]?.[t.k] as Texture
      }
    }
  }

  function live(dt: number) {
    // laço próprio: recompensas, final e o lampião seguem mesmo depois do fim da fase
    flyers.update(dt)
    if (barPulse > 0) {
      barPulse -= dt
      drawBar(true)
    }
    if (lamp) lamp.alpha = c.reduced ? 0.45 : frameAt(performance.now() / 1000, 6, 3) === 1 ? 0.62 : 0.42
    if (ended) {
      endT += dt
      const slow = endT < 0.3 ? 0.3 : 1
      field.update(dt * slow)
      updateTiles(c.time + endT)
      for (const p of pratos) stepPrato(p, dt * slow)
      stepSprouts(dt * slow)
    }
  }

  function stepPrato(p: { s: Sprite; t: number }, dt: number) {
    if (p.t < 0) return
    p.t += dt
    if (p.t > 0.75) {
      p.t = -1
      p.s.visible = false
      return
    }
    const [sx, sy] = popScale(p.t)
    setSquash(p.s, step8(sx), step8(sy))
    p.s.texture = pratoF[frameAt(p.t, 6, 2)] as Texture
    p.s.y -= p.t < 0.3 ? 0 : dt * 12
  }

  return {
    duration: 35,
    goal: 900,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      const availW = c.W - 12
      const availH = c.bottom - c.top - 26
      const size = Math.min(availW, availH)
      ts = Math.max(3, Math.floor(size / 30))
      cols = Math.floor(size / ts)
      ox = Math.round(c.W / 2 - (cols * ts) / 2)
      oy = Math.round(c.top + 6 + (availH - cols * ts) / 2)

      // lampião da casa de taipa (cenário): brilho dourado aditivo que tremula
      const A = anchors(c.W, c.H)
      lamp = spr(glowTex(6, GOLD), A.win.x + A.win.w / 2, A.win.y + A.win.h / 2)
      lamp.blendMode = 'add'
      lamp.alpha = 0.45
      root.addChild(lamp)

      // laje: lateral grossa + contorno + sombra (estático), embaixo dos ladrilhos
      const slab = slabGrid(cols, ts)
      root.addChild(
        spr(
          gridTex(`mapa-slab${cols}-${ts}`, () => slab.g),
          ox - slab.pad,
          oy - slab.pad,
          0,
          0,
        ),
      )
      const atlas = gridTex(`mapa-atlas${cols}-${ts}`, () => atlasGrid(cols, ts))
      const S = cols * ts
      for (let j = 0; j < cols; j++)
        for (let i = 0; i < cols; i++) {
          const lon = LON0 + ((i + 0.5) / cols) * (LON1 - LON0)
          const lat = LAT0 + ((j + 0.5) / cols) * (LAT1 - LAT0)
          if (!inBrazil(lon, lat)) continue
          const s = spr(subTex('mapa', atlas, i * ts, j * ts, ts, ts), ox + i * ts, oy + j * ts, 0, 0)
          root.addChild(s)
          const t: Tile = { i, j, green: false, t: 0, s, st: HUNGRY, k: tiles.length }
          tiles.push(t)
          grid.set(`${i},${j}`, t)
        }
      frames = []
      for (let st = 0; st < NSTATE; st++)
        frames.push(tiles.map((t) => subTex('mapa', atlas, t.i * ts, st * S + t.j * ts, ts, ts)))

      // barra segmentada (lição 14): moldura fina com cantos marcados, alvo de 85% em dourado
      bw = Math.min(c.W - 40, 160)
      by = c.bottom - 12
      bx0 = Math.round(c.W / 2 - bw / 2)
      const bar = new Container()
      const fr = new Grid(bw + 4, 8, -1)
      fr.rect(0, 0, bw + 4, 8, P.void)
      fr.rect(1, 0, bw + 2, 1, P.stone2)
      fr.rect(0, 1, 1, 6, P.stone2)
      fr.rect(1, 7, bw + 2, 1, P.stone0)
      fr.rect(bw + 3, 1, 1, 6, P.stone0)
      for (const [x, y] of [
        [0, 0],
        [bw + 3, 0],
        [0, 7],
        [bw + 3, 7],
      ] as const)
        fr.set(x, y, P.stoneHi)
      bar.addChild(
        spr(
          gridTex(`mapa-barframe${bw}`, () => fr),
          bx0 - 2,
          by - 2,
          0,
          0,
        ),
      )
      barSegs = []
      const segT = gridTex('mapa-seg', () => new Grid(3, 4, P.white))
      for (let x = 0; x + 3 <= bw; x += 4) {
        const s = spr(segT, bx0 + x, by, 0, 0)
        bar.addChild(s)
        barSegs.push(s)
      }
      const goal = spr(
        rowsTex('mapa-goal', ['.Y.', 'YsY', '.Y.', '.y.', '.y.', '.y.', '.y.', '.6.']),
        bx0 + Math.round(bw * 0.85),
        by - 3,
        0.5,
        0,
      )
      barTip = spr(rowsTex('mapa-tip', ['w', 'G', 'G', 'w']), bx0, by, 0.5, 0)
      bar.addChild(goal, barTip)
      label0 = label('', P.stoneHi)
      label0.x = Math.round(c.W / 2)
      label0.y = by - 8

      // efeitos
      field = new Field(c)
      field.trail = GOLD
      combo = new Combo(c, field, 0.9)
      flyers = new Flyers(c, 24)
      flyers.trail = (x, y) => field.spawn(x, y, { life: 0.25, ramp: GOLD, add: true })
      flyers.onArrive = (x, y) => {
        barPulse = 0.12
        if (c.rnd() < 0.5) field.sparkle(x + (c.rnd() - 0.5) * 6, y - 2)
      }
      grainF = grains()
      pratoF = [pratoTex(0), pratoTex(1)]
      pratos = []
      for (let k = 0; k < 4; k++) {
        const s = spr(pratoF[0] as Texture, 0, 0, 0.5, 1)
        s.visible = false
        fxl.addChild(s)
        pratos.push({ s, t: -1 })
      }
      sproutF = sproutFrames()
      sprouts = []
      for (let k = 0; k < 40; k++) {
        const s = spr(sproutF[0] as Texture, 0, 0, 0.5, 1)
        s.visible = false
        fxl.addChild(s)
        sprouts.push({ s, t: -1, tile: null })
      }
      retF = reticleFrames(ts * 3 + 8)
      reticle = spr(retF[0] as Texture, 0, 0)
      reticle.visible = false

      hint = spr(retF[0] as Texture, 0, 0)
      hint.visible = false
      // demonstração: a mão toca no vermelho perto do centro do mapa nos 3 primeiros segundos
      hand = new Hand(c, 3)
      const mid = tiles.reduce((a, t) =>
        Math.hypot(t.i - cols * 0.55, t.j - cols * 0.42) < Math.hypot(a.i - cols * 0.55, a.j - cols * 0.42)
          ? t
          : a,
      )
      hand.x = ox + mid.i * ts + ts / 2
      hand.y = oy + mid.j * ts + ts / 2
      root.addChild(bar, label0, fxl, reticle, hint, field.root, flyers.root, combo.text, hand.s)
      driver = new Driver(live)
      driver.start()
      drawBar(true)
    },
    update(dt) {
      if (done) return
      crisisT -= dt
      // telegrafa a próxima crise 300 ms antes; o ladrilho sai do mesmo sorteio entre os verdes
      if (crisisT <= 0.3 && c.time > 7.7 && preT < 0) {
        const greens = tiles.filter((t) => t.green)
        pre = greens[Math.floor(c.rnd() * greens.length)] ?? null
        preT = 0
        if (pre) c.sfx('tick', { x: ox + pre.i * ts, volume: 0.5 })
      }
      if (preT >= 0) preT += dt
      if (crisisT <= 0 && c.time > 8) {
        crisisT = Math.max(1.6, 3 - c.time * 0.04)
        let pick = pre
        if (!pick) {
          const greens = tiles.filter((t) => t.green)
          pick = greens[Math.floor(c.rnd() * greens.length)] ?? null
        }
        pre = null
        preT = -1
        if (pick) strike(pick)
      }
      if (pre && preT >= 0) {
        reticle.visible = true
        reticle.x = ox + pre.i * ts + Math.round(ts / 2)
        reticle.y = oy + pre.j * ts + Math.round(ts / 2)
        reticle.texture = retF[Math.min(3, Math.floor(preT * 13))] as Texture
      } else reticle.visible = false
      updateTiles(c.time)
      hand.update(dt)
      if (hintT >= 0) {
        hintT += dt
        hint.texture = retF[Math.min(3, Math.floor(hintT * 12))] as Texture
        hint.visible = hintT < 0.6 && frameAt(hintT, 10, 2) === 0
        if (hintT >= 0.6) hintT = -1
      }
      combo.update()
      field.update(dt)
      stepSprouts(dt)
      for (const p of pratos) stepPrato(p, dt)
      if (c.rnd() < 0.08) {
        const t = tiles[Math.floor(c.rnd() * tiles.length)]
        if (t?.green) field.sparkle(ox + t.i * ts + ts / 2, oy + t.j * ts)
      }
      flyers.target.x = bx0 + Math.round(bw * pct())
      flyers.target.y = by + 1
      drawBar()
      if (pct() >= 0.85) {
        done = true
        c.addScore(Math.round(pct() * 1000))
        c.fx.flash(0x4fae3f, 260, 0.25)
        finale()
        c.finish()
      }
    },
    down(x, y) {
      if (done) return
      hand.hide()
      field.pointer(x, y, true)
      const i = Math.floor((x - ox) / ts)
      const j = Math.floor((y - oy) / ts)
      const n = feed(i, j, 2.4)
      if (n > 0) {
        c.addScore(n * 4, x, y - 6)
        const k = combo.hit(x, y - 22)
        c.sfx('good', { x, combo: k - 1 })
        c.fx.burst(x, y, 0x4fae3f, 10)
        c.fx.ring(x, y, 0xf5c04a, 14)
        // acerto: anel branco curto, folhas e grãos, prato que salta e grãos voando até a barra
        c.fx.ring(x, y, P.white, 6)
        field.blast(x, y, 8 + Math.min(10, k * 2), 50, LEAF)
        field.blast(x, y, 6, 40, GOLD, { add: true })
        const p = pratos.find((q) => q.t < 0) ?? pratos[0]
        if (p) {
          p.t = 0
          p.s.x = Math.round(x)
          p.s.y = Math.round(y - 3)
          p.s.visible = true
        }
        flyers.send(x, y - 6, grainF, Math.min(4, 1 + Math.floor(n / 4)), 10)
      } else {
        // o erro ensina: marca o vermelho mais perto de onde a pessoa tocou
        c.sfx('tap')
        c.fx.ring(x, y, P.stone2, 6)
        let best: Tile | null = null
        let bd = 1e9
        for (const t of tiles) {
          if (t.green) continue
          const d = (t.i - i) ** 2 + (t.j - j) ** 2
          if (d < bd) {
            bd = d
            best = t
          }
        }
        if (best) {
          hint.x = ox + best.i * ts + Math.round(ts / 2)
          hint.y = oy + best.j * ts + Math.round(ts / 2)
          hintT = 0
        }
      }
    },
    move(x, y) {
      field.pointer(x, y)
    },
    clear() {
      const reds = tiles.filter((t) => !t.green)
      const pick = reds[Math.floor(c.rnd() * reds.length)]
      if (!pick) return false
      feed(pick.i, pick.j, 6)
      c.fx.ring(ox + pick.i * ts, oy + pick.j * ts, 0xf5c04a, 40)
      return true
    },
    timeUp() {
      c.addScore(Math.round(pct() * 1000) - 200)
      const ok = pct() >= 0.5
      if (ok) finale()
      return ok
    },
    dispose() {
      driver?.stop()
      root.destroy({ children: true })
      tiles = []
      barSegs = []
    },
  }
}
