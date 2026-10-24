// Fase 5 · Carteira Assinada: vagas aparecem nas janelas; o golpe do emprego falso também.
// Prédio procedural à noite: a janela acende antes (antecipação) e a cor da luz já diz o que vem.
import { Container, Graphics, type Sprite, type Text, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { mulberry32 } from '../lib/rng'
import { Flyers, finale, HandHint, HitFlash, LastFrame, showRight, solidTex } from './fx-b'
import {
  Combo,
  clamp01,
  curve,
  ENERGY,
  Field,
  frameAt,
  GOLD,
  Grid,
  glowTex,
  gridTex,
  label,
  lerp,
  P,
  popScale,
  rowsTex,
  setSquash,
  shade,
  shadowTex,
  spr,
  subTex,
  TapBuffer,
} from './kit-a'

interface Item {
  good: boolean
  t0: number
  life: number
  hitT: number
}

interface Win {
  x: number
  y: number
  w: number
  h: number
  item: Item | null
  /** 0..1 luz acesa (desce devagar depois que o item sai) */
  light: number
  crackT: number
  /** cor da última luz (para apagar na mesma cor) */
  kind: 'gold' | 'red'
  off: Texture
  pane: Sprite
  spr: Sprite
  pix: Text
}

/**
 * carteira de trabalho 16×18 em três quartos: capa azul com lombada escura, borda das páginas grossa
 * à direita (creme), brasão dourado e rim. `f` 0/1: brilho que corre pelo brasão (idle a 4 fps).
 */
function carteiraGrid(f: number) {
  const m = new Grid(16, 18)
  m.rect(2, 1, 11, 16, 1)
  m.rect(2, 1, 2, 16, 2)
  m.rect(13, 2, 2, 15, 3)
  const g = shade(m, {
    1: { ramp: [P.void, P.blue0, P.blue0, P.blue1, P.blue1], rim: P.sparkle },
    2: { ramp: [P.void, P.night, P.blue0, P.blue0] },
    3: { ramp: [P.stone1, P.stone2, P.stone3, P.stoneHi], rim: P.redHot, outline: P.void },
  })
  // páginas: linhas finas na borda grossa
  for (let y = 4; y < 16; y += 2) g.set(13, y, P.stone2)
  // brasão dourado e linhas de texto
  g.rect(6, 4, 5, 5, P.gold)
  g.rect(7, 5, 3, 3, P.goldHi)
  g.set(8, 6, P.sparkle)
  g.set(6, 4, P.gold1)
  g.set(10, 8, P.gold1)
  g.rect(5, 11, 7, 1, P.goldHi)
  g.rect(5, 13, 7, 1, P.stone3)
  g.rect(5, 15, 5, 1, P.stone3)
  // brilho que corre na capa (quadro 1)
  if (f === 1) {
    g.set(11, 3, P.white)
    g.set(12, 4, P.sparkle)
    g.set(10, 2, P.sparkle)
  }
  return g
}
const carteiraTex = (f = 0) => gridTex(`whack-carteira3q${f}`, () => carteiraGrid(f))

/**
 * golpe 16×18: celular vermelho em três quartos (lateral sangue grossa), tela com alerta e "R$".
 * `f` 0/1: a tela pisca entre âmbar e branco-quente (telegrafa a ameaça).
 */
function golpeGrid(f: number) {
  const m = new Grid(16, 18)
  m.rect(3, 1, 9, 16, 1)
  m.rect(12, 2, 2, 15, 3)
  m.rect(5, 3, 5, 10, 2)
  const g = shade(m, {
    1: { ramp: [P.blood0, P.blood1, P.crimsonDeep, P.crimson, P.red], rim: P.redHot },
    2: { ramp: [P.void, P.blood0, P.blood1, P.blood1], outline: null },
    3: { ramp: [P.void, P.blood0, P.blood1, P.crimsonDeep], rim: P.redHot, outline: P.void },
  })
  // triângulo de alerta
  const tri = f ? P.goldHi : P.emberBright
  for (let y = 0; y < 5; y++) g.rect(7 - Math.floor(y / 2), 5 + y, 1 + Math.floor(y / 2) * 2, 1, tri)
  g.rect(7, 6, 1, 2, P.void)
  g.set(7, 9, P.void)
  g.rect(6, 11, 3, 1, f ? P.redGlow : P.red)
  g.rect(6, 14, 3, 1, P.stone2)
  return g
}
const golpeTex = (f = 0) => gridTex(`whack-golpe3q${f}`, () => golpeGrid(f))

/** mini carteira 8×9 que voa até o contador */
function miniCarteiraTex() {
  return rowsTex('whack-mini', [
    '.bbbbbs.',
    'bBBBBBts',
    'bByyBBts',
    'bBYyBBts',
    'bBBBBBts',
    'bBYYYBts',
    'bBBBBBts',
    'bBBBBBts',
    '.bbbbbs.',
  ])
}

/**
 * fachada 3/4 assada numa textura: corpo de concreto noturno com pilastras e faixas de andar, cornija
 * chanfrada, lateral grossa em granito vermelho à direita (rim red-hot na aresta), teto com caixa d'água
 * e antena, molduras e peitoris claros nas janelas, marquise e porta acesa, caixa do letreiro em 3/4.
 */
function facadeTex(bw: number, bh: number, cols: number, rows: number, cw: number, ch: number, d: number) {
  return gridTex(`whack-facade${bw}x${bh}c${cols}r${rows}w${cw}h${ch}d${d}`, () => {
    const ox = 3
    const oy = 24
    const rise = Math.max(2, Math.round(d * 0.5))
    const g = new Grid(bw + ox + d + 2, bh + oy + 1, -1)
    const r = mulberry32(bw * 31 + bh)
    // lateral: granito vermelho pontilhado, sobe para o fundo, rim na aresta de fora
    for (let i = 0; i < d; i++) {
      const lift = Math.round(((i + 1) / d) * rise)
      for (let y = oy - lift; y < oy + bh - lift; y++) {
        const t = (y - oy + lift) / bh
        let k: number = t < 0.06 ? P.crimson : (i + y) % 3 === 0 || r() < 0.18 ? P.blood0 : P.blood1
        if (t > 0.08 && t < 0.9 && r() < 0.05) k = P.crimsonDeep
        if (i === d - 1) k = P.redHot
        g.set(ox + bw + i, y, k)
      }
      // janelinhas da lateral (fresta acesa por andar)
      if (i === Math.floor(d / 2))
        for (let rr = 0; rr < rows; rr++) {
          const y = oy + 8 + rr * (ch + 6) + Math.round(ch / 3) - lift
          g.rect(ox + bw + i, y, 1, Math.max(2, Math.round(ch / 3)), (rr * 5 + i) % 3 ? P.emberDark : P.ember)
        }
    }
    // teto em paralelogramo
    for (let j = 0; j < rise; j++) {
      const sh = Math.round(((j + 1) / rise) * d)
      for (let x = 0; x < bw; x++) g.set(ox + x + sh, oy - 1 - j, j === rise - 1 ? P.stone1 : P.stone0)
    }
    // frente: concreto com luz de cima, pilastras entre colunas e faixas de andar
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const t = y / bh
        let k: number = t < 0.25 && (x + y) % 2 === 0 && r() < 0.5 ? P.hazeDark : P.dusk
        if (t > 0.75 && (x + y) % 2 === 0) k = P.night
        g.set(ox + x, oy + y, k)
      }
    for (let k = 0; k <= cols; k++) {
      const x = 8 + k * (cw + 6) - 4
      for (let y = 4; y < bh - 14; y++) {
        g.set(ox + x, oy + y, P.hazeDark)
        g.set(ox + x + 1, oy + y, P.night)
      }
    }
    for (let rr = 0; rr <= rows; rr++) {
      const y = 8 + rr * (ch + 6) - 3
      g.rect(ox, oy + y, bw, 1, P.hazeDark)
      g.rect(ox, oy + y + 1, bw, 1, P.night)
    }
    // cornija chanfrada (1 px claro em cima) e bordas
    g.rect(ox - 1, oy, bw + 1, 2, P.stone1)
    g.rect(ox - 1, oy, bw + 1, 1, P.stone2)
    g.set(ox - 1, oy, P.stone3)
    for (let y = 0; y < bh; y++) {
      g.set(ox, oy + y, P.haze)
      g.set(ox - 1, oy + y, P.void)
      g.set(ox + bw - 1, oy + y, P.stone1)
    }
    // molduras, verga e peitoril das janelas
    for (let rr = 0; rr < rows; rr++)
      for (let k = 0; k < cols; k++) {
        const x = ox + 8 + k * (cw + 6)
        const y = oy + 8 + rr * (ch + 6)
        g.rect(x - 1, y - 1, cw + 2, ch + 2, P.void)
        g.rect(x - 2, y + ch + 1, cw + 4, 1, P.stone2)
        g.set(x - 2, y + ch + 1, P.stone3)
        g.rect(x - 1, y + ch + 2, cw + 2, 1, P.stone0)
        g.rect(x - 1, y - 2, cw + 2, 1, P.hazeDark)
      }
    // térreo: marquise em 3/4 e porta de vidro acesa
    const dx = ox + Math.round(bw / 2 - 8)
    const by2 = oy + bh
    g.rect(dx - 4, by2 - 15, 24, 2, P.stone2)
    g.rect(dx - 4, by2 - 15, 24, 1, P.stone3)
    g.rect(dx - 3, by2 - 13, 22, 1, P.stone0)
    g.rect(dx, by2 - 12, 16, 12, P.void)
    g.rect(dx + 1, by2 - 11, 14, 11, P.gold1)
    g.rect(dx + 1, by2 - 11, 14, 2, P.goldHi)
    g.rect(dx + 7, by2 - 11, 2, 11, P.void)
    g.set(dx + 2, by2 - 8, P.sparkle)
    // caixa d'água no teto (3/4) e antena
    const tx = ox + 6
    g.rect(tx, oy - rise - 7, 12, 6, P.stone1)
    g.rect(tx, oy - rise - 7, 12, 1, P.stone2)
    g.rect(tx + 12, oy - rise - 6, 2, 6, P.blood1)
    g.set(tx + 13, oy - rise - 6, P.redHot)
    for (let x = tx + 1; x < tx + 12; x += 3) g.set(x, oy - rise - 1, P.stone0)
    g.rect(ox + bw - 10, oy - 16, 1, 16 - rise, P.stone1)
    g.rect(ox + bw - 12, oy - 10, 5, 1, P.stone0)
    // caixa do letreiro em 3/4: fundo sangue, moldura escura, lateral, pés
    const sx = ox + Math.round(bw / 2) - 22
    g.rect(sx, oy - 14, 44, 11, P.void)
    g.rect(sx + 1, oy - 13, 42, 9, P.blood0)
    g.rect(sx + 1, oy - 13, 42, 1, P.blood1)
    g.rect(sx + 44, oy - 13, 2, 10, P.crimsonDeep)
    g.rect(sx + 45, oy - 13, 1, 10, P.crimson)
    g.rect(sx + 10, oy - 3, 1, 3, P.stone1)
    g.rect(sx + 33, oy - 3, 1, 3, P.stone1)
    return g
  })
}

/** quadros de luz da janela: apagada, acesa boa (ouro) e acesa de golpe (sangue) */
function windowTex(w: number, h: number, kind: 'off' | 'gold' | 'red', lvl: number) {
  return gridTex(`whack-win${w}x${h}${kind}${lvl}`, () => windowGrid(w, h, kind, lvl))
}

function windowGrid(w: number, h: number, kind: 'off' | 'gold' | 'red', lvl: number) {
  {
    const g = new Grid(w, h, -1)
    const ramp =
      kind === 'gold'
        ? [P.gold0, P.gold1, P.gold, P.goldHi, P.sparkle]
        : kind === 'red'
          ? [P.blood0, P.blood1, P.crimsonDeep, P.crimson, P.red]
          : [P.night, P.dusk, P.hazeDark, P.hazeDark, P.haze]
    const top = Math.max(0, Math.min(ramp.length - 1, lvl))
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        // luz vem de cima (luminária): gradiente em faixas, transição pontilhada
        const k = y / h
        let i = Math.round(top - k * 3)
        if ((x + y) % 2 && Math.abs(k * 3 - Math.round(k * 3)) < 0.18) i--
        g.set(x, y, ramp[Math.max(0, i)] ?? P.night)
      }
    // reflexo diagonal no vidro
    for (let i = 0; i < Math.min(w, h) - 4; i++)
      if (i % 5 < 2) g.set(w - 3 - i, 2 + i, kind === 'off' ? P.haze : P.sparkle)
    // peitoril
    for (let x = 0; x < w; x++) g.set(x, h - 1, P.stone1)
    return g
  }
}

/** janela apagada com vida: 0 vazia, 1 cortinas, 2 persiana, 3 vaso de planta */
function offTex(w: number, h: number, deco: number) {
  return gridTex(`whack-off${w}x${h}d${deco}`, () => {
    const g = windowGrid(w, h, 'off', 1)
    if (deco === 1)
      for (let y = 0; y < h - 1; y++) {
        const cw = Math.max(2, Math.round(w * 0.22 - (y < h / 2 ? 0 : 1)))
        for (let x = 0; x < cw; x++) {
          g.set(x, y, x === cw - 1 ? P.blood0 : P.blood1)
          g.set(w - 1 - x, y, x === cw - 1 ? P.blood0 : P.blood1)
        }
      }
    else if (deco === 2)
      for (let y = 1; y < h * 0.55; y += 2) for (let x = 0; x < w; x++) g.set(x, y, P.hazeDark)
    else if (deco === 3) {
      const px = Math.round(w * 0.25)
      g.rect(px, h - 5, 4, 4, P.emberDark)
      g.rect(px, h - 5, 4, 1, P.gold0)
      g.ellipse(px + 1.5, h - 8, 3, 2.5, P.vine1)
      g.set(px, h - 9, P.green)
    }
    return g
  })
}

/** chaves de recorte pré-montadas (nada de string nova por quadro) */
const SUB_KEY = ['g0', 'g1', 'b0', 'b1']

export default function whack(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const items = new Container()
  let field: Field
  let combo: Combo
  const wins: Win[] = []
  const tap = new TapBuffer(0.1)
  let spawn = 0.8
  let bx = 0
  let by = 0
  let bw = 0
  let bh = 0
  let cw = 0
  let ch = 0
  let good: Texture[] = []
  let bad: Texture[] = []
  let goodFlash: Texture
  let badFlash: Texture
  let flyers: Flyers
  const flash = new HitFlash(4)
  const last = new LastFrame(25)
  let hand: HandHint
  /** janela com uma carteira visível agora (para a mão de demonstração e para o erro ensinar) */
  const goodWin = () =>
    wins.find(
      (o) =>
        o.item?.good && o.item.hitT < 0 && c.time >= o.item.t0 && c.time - o.item.t0 < o.item.life - 0.15,
    )
  /** o erro ensina: mostra onde estava a carteira certa */
  function teach() {
    const w = goodWin()
    if (w) showRight(c, w.x + w.w / 2, w.y + w.h / 2)
  }
  let neon: Text
  let beacon: Sprite
  const winTex: Record<string, Texture> = {}
  const cracks = new Graphics()

  const lit = (kind: 'off' | 'gold' | 'red', lvl: number) => winTex[`${kind}${lvl}`] as Texture

  function drawCracks() {
    cracks.clear()
    for (const w of wins) {
      if (w.crackT < 0 || c.time - w.crackT > 1.2) continue
      const cx = w.x + w.w / 2
      const cy = w.y + w.h / 2
      for (let a = 0; a < 5; a++) {
        const ang = a * 1.3 + 0.4
        for (let r = 0; r < Math.min(w.w, w.h) / 2 - 1; r++)
          cracks.rect(
            Math.round(cx + Math.cos(ang) * r),
            Math.round(cy + Math.sin(ang) * r + (r % 3 === 0 ? 1 : 0)),
            1,
            1,
          )
      }
    }
    cracks.fill(P.stoneHi)
  }

  function hitAt(x: number, y: number) {
    const w = wins.find((o) => x >= o.x - 4 && x <= o.x + o.w + 4 && y >= o.y - 4 && y <= o.y + o.h + 4)
    const it = w?.item
    if (!w || !it || it.hitT > 0 || c.time < it.t0) return false
    it.hitT = c.time
    const cx = w.x + w.w / 2
    const cy = w.y + w.h / 2
    if (it.good) {
      c.addScore(60, cx, w.y - 4)
      combo.hit(cx, w.y - 12)
      c.fx.ring(cx, cy, P.goldHi, 22)
      field.blast(cx, cy, 16, 60, GOLD, { add: true })
      field.blast(cx, cy, 8, 40, [P.sparkle, P.blue1, P.blue0])
      field.sparkle(cx + 6, cy - 6)
      flash.show(goodFlash, cx, w.y + w.h - 2, 0.5, 1)
      flyers.send(cx, cy, { arc: 26 })
      c.fx.hitstop(50)
      c.sfx('coin', { x: cx, combo: combo.n })
    } else {
      w.crackT = c.time
      flash.show(badFlash, cx, w.y + w.h - 2, 0.5, 1)
      teach()
      combo.reset()
      field.blast(cx, cy, 14, 60, [P.stoneHi, P.stone3, P.stone2], { grav: 180 })
      field.blast(cx, cy, 10, 50, ENERGY, { add: true })
      c.sfx('shatter', { x: cx })
      c.hit(cx, cy)
    }
    return true
  }

  return {
    duration: 25,
    goal: 1000,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      field = new Field(c)
      field.trail = GOLD
      combo = new Combo(c, field, 1.5)
      good = [carteiraTex(0), carteiraTex(1)]
      bad = [golpeTex(0), golpeTex(1)]
      goodFlash = solidTex('carteira', () => carteiraGrid(0))
      badFlash = solidTex('golpe', () => golpeGrid(0), P.redGlow)
      flyers = new Flyers(c, miniCarteiraTex(), 8)
      hand = new HandHint(c, 3.5)
      flyers.trail = (x, y) => {
        if (c.rnd() < 0.5) field.spawn(x, y, { life: 0.25, ramp: GOLD, add: true, drag: 2 })
      }
      const portrait = c.W < c.H
      const cols = portrait ? 3 : 5
      const rows = portrait ? 4 : 3
      const availH = c.bottom - c.top - 30
      cw = Math.min(30, Math.floor((c.W - 30) / cols) - 4)
      ch = Math.min(28, Math.floor((availH - 18) / rows) - 6)
      bw = cols * (cw + 6) + 10
      bh = rows * (ch + 6) + 22
      bx = Math.round(c.W / 2 - bw / 2)
      by = Math.round(c.top + 20 + (availH - bh) / 2)
      for (const kind of ['off', 'gold', 'red'] as const)
        for (let l = 0; l < 5; l++) winTex[`${kind}${l}`] = windowTex(cw, ch, kind, l)
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
          const x = bx + 8 + k * (cw + 6)
          const y = by + 8 + r * (ch + 6)
          const s = spr(good[0] as Texture, x + cw / 2, y + ch, 0.5, 1)
          s.visible = false
          const pix = label('PIX?', P.white)
          pix.visible = false
          pix.x = Math.round(x + cw / 2)
          pix.y = y + 5
          const off = offTex(cw, ch, Math.floor(c.rnd() * 4))
          const pane = spr(off, x, y, 0, 0)
          wins.push({
            off,
            x,
            y,
            w: cw,
            h: ch,
            item: null,
            light: 0,
            crackT: -1,
            kind: 'gold',
            pane,
            spr: s,
            pix,
          })
        }
      const side = portrait ? 5 : 8
      const facade = spr(facadeTex(bw, bh, cols, rows, cw, ch, side), bx - 3, by - 24, 0, 0)
      const panes = new Container()
      for (const w of wins) {
        panes.addChild(w.pane)
        items.addChild(w.spr)
      }
      for (const w of wins) items.addChild(w.pix)
      // plano do meio: muro baixo da calçada com grades (os vizinhos e os marcos ficam no cenário l05)
      const back = new Graphics()
      back.rect(0, by + bh - 6, c.W, 6).fill(P.night)
      back.rect(0, by + bh - 6, c.W, 1).fill(P.hazeDark)
      for (let x = 1; x < c.W; x += 4) back.rect(x, by + bh - 10, 1, 4).fill(P.night)
      back.rect(0, by + bh - 10, c.W, 1).fill(P.night)
      const front = new Graphics()
      for (const lx of [Math.round(bx - 10), Math.round(bx + bw + 9)]) {
        front.rect(lx, by + bh - 26, 1, 27).fill(P.void)
        front.rect(lx - 2, by + bh - 27, 5, 2).fill(P.void)
        front.rect(lx - 1, by + bh - 25, 3, 1).fill(P.goldHi)
      }
      const lamps = [Math.round(bx - 10), Math.round(bx + bw + 9)].map((lx) => {
        const s = spr(glowTex(6, [P.white, P.goldHi, P.gold, P.gold1, P.gold0]), lx, by + bh - 24)
        s.blendMode = 'add'
        s.alpha = 0.5
        return s
      })
      // luz do letreiro escorrendo na fachada (pontilhado vermelho logo abaixo)
      const spill = new Graphics()
      for (let x = Math.round(bx + bw / 2 - 20); x < bx + bw / 2 + 20; x++)
        if (x % 2 === 0) spill.rect(x, by + 1, 1, 1).fill(P.crimson)
      neon = label('VAGAS', P.redHot)
      neon.x = Math.round(bx + bw / 2)
      neon.y = by - 8
      beacon = spr(glowTex(3, ENERGY), bx + bw - 10, by - 17)
      beacon.blendMode = 'add'
      const shadow = spr(shadowTex(Math.round(bw + 20)), bx + bw / 2, by + bh + 1)
      root.addChild(
        back,
        shadow,
        facade,
        spill,
        panes,
        items,
        cracks,
        field.root,
        neon,
        beacon,
        front,
        ...lamps,
        flash.root,
        flyers.root,
        combo.text,
        hand.root,
      )
    },
    update(dt) {
      const d = curve(c.time, 25)
      spawn -= dt
      if (spawn <= 0) {
        spawn = lerp(0.8, 0.34, d)
        const free = wins.filter((w) => !w.item && w.light < 0.05)
        const w = free[Math.floor(c.rnd() * free.length)]
        // a luz acende antes de o item subir e a cor já avisa: ouro = vaga (0,15 s), sangue = golpe (0,3 s)
        if (w) {
          const good = c.rnd() > lerp(0.22, 0.36, d)
          w.item = { good, t0: c.time + (good ? 0.15 : 0.3), life: lerp(1.5, 0.85, d), hitT: -1 }
        }
      }
      tap.poll(c.time, hitAt, teach)
      const gw = goodWin()
      hand.update(gw ? { x: gw.x + gw.w / 2, y: gw.y + gw.h / 2 } : null)
      for (const w of wins) {
        const it = w.item
        if (it) {
          const age = c.time - it.t0
          if (it.hitT > 0 && c.time - it.hitT > 0.3) w.item = null
          else if (it.hitT < 0 && age > it.life) w.item = null
        }
        const on = !!w.item && w.item.hitT < 0
        w.light = on ? 1 : Math.max(0, w.light - dt * 2.5)
        const cur = w.item
        // acende piscando (2 cintilações em 0,15 s), apaga em degraus na mesma cor
        if (cur) w.kind = cur.good ? 'gold' : 'red'
        const flick = !!cur && c.time < cur.t0 && frameAt(c.time, 30, 2) === 0
        const lvl = flick ? 2 : cur ? 4 : Math.round(w.light * 4)
        w.pane.texture = lvl <= 0 ? w.off : lit(w.kind, lvl)
        if (!cur || c.time < cur.t0) {
          w.spr.visible = false
          w.pix.visible = false
          continue
        }
        const age = c.time - cur.t0
        // sobe de trás do peitoril (recorte por linhas, sem máscara), desce ao sair
        // idle a 4 fps: brilho que corre na carteira; a tela do golpe pisca
        const fr = frameAt(c.time + w.x * 0.01, 4, 2)
        const tex = (cur.good ? good[fr] : bad[fr]) as Texture
        const th = tex.frame.height
        const rise = clamp01(age / 0.12)
        const leave = clamp01((age - cur.life + 0.15) / 0.15)
        let vis = Math.round(th * rise * (1 - leave))
        let yo = 0
        if (cur.hitT > 0) {
          const k = c.time - cur.hitT
          vis = th
          yo = cur.good ? -Math.round(k * 80) : Math.round(k * 30)
        }
        w.spr.visible = vis > 0
        w.spr.texture = subTex(
          SUB_KEY[cur.good ? fr : fr + 2] as string,
          tex,
          0,
          0,
          tex.frame.width,
          Math.max(1, vis),
        )
        // o golpe vibra 1 px (celular tocando) enquanto está na janela
        const buzz = !cur.good && cur.hitT < 0 && rise >= 1 ? (frameAt(c.time, 20, 2) ? 1 : -1) : 0
        w.spr.x = Math.round(w.x + w.w / 2) + buzz
        w.spr.y = Math.round(w.y + w.h - 2 + yo)
        if (cur.hitT > 0 && cur.good) {
          const [sx, sy] = popScale(c.time - cur.hitT)
          setSquash(w.spr, sx, sy)
        } else setSquash(w.spr, 1, 1)
        w.spr.alpha = cur.hitT > 0 && !cur.good ? (frameAt(c.time, 20, 2) ? 1 : 0.4) : 1
        w.pix.visible = !cur.good && cur.hitT < 0 && rise >= 1 && leave <= 0
      }
      drawCracks()
      // letreiro neon: 2 cores alternando a cada 4 quadros, com falha ocasional
      neon.style.fill = frameAt(c.time, 15, 2) ? P.redHot : P.red
      neon.alpha = c.rnd() < 0.01 ? 0.4 : 1
      beacon.alpha = frameAt(c.time, 1.5, 2) ? 0.7 : 0.1
      if (c.rnd() < 0.08) field.ember(bx + c.rnd() * bw, by + bh, ENERGY)
      combo.update()
      field.update(dt)
      flash.update(dt)
      flyers.update(dt)
      // final de fase como evento: o prédio inteiro acende e solta a chuva dourada
      last.check(c, () => {
        for (const w of wins) if (!w.item) w.pane.texture = lit('gold', 4)
        finale(c, bx + bw / 2, by + bh / 2)
        c.sfx('perfect', { x: bx + bw / 2 })
      })
    },
    move(x, y) {
      field.pointer(x, y)
    },
    down(x, y) {
      field.pointer(x, y, true)
      hand.dismiss()
      if (!hitAt(x, y)) {
        tap.push(x, y, c.time)
        c.sfx('tap')
      }
    },
    clear() {
      let n = 0
      for (const w of wins) {
        if (!w.item || w.item.hitT > 0) continue
        if (w.item.good) c.addScore(60, w.x + w.w / 2, w.y)
        else field.blast(w.x + w.w / 2, w.y + w.h / 2, 8, 40, [P.stone3, P.stone2])
        w.item.hitT = c.time
        n++
      }
      return n > 0
    },
    timeUp() {
      return true
    },
    dispose() {
      root.destroy({ children: true })
    },
  }
}
