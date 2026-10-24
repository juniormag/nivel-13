// Fase 9 · Siga o Dinheiro: jogo da memória ligando cada ano ao fato documentado.
// Cartas em DOM (.grid-cards/.mcard) sobre um quadro de cortiça em Pixi; cada par certo é ligado por um
// barbante vermelho e uma trilha de moedas pixel que corre pelos vãos entre as cartas.
// Feel (números): virada em degraus 90 ms + 120 ms; par certo = hit-stop 70 ms, pulso dourado 420 ms, anel do
// tamanho da carta, 6 moedas a 150 px/s pelo barbante (uma a cada 50 ms); erro desvira em 850 ms e tira coração a
// cada 4 erros. 80 s; vence com 4 pares. Pontos = max(80, 170 − 8 × erros) por par.
import { Container, Graphics, Sprite } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { shuffle } from '../lib/rng'
import { Banner, domHand, FlyToHud } from './fx-c'
import {
  bake,
  domRect,
  Embers,
  el,
  energyDot,
  flipEl,
  goldPulse,
  hintPulse,
  joy,
  P,
  ScorePops,
  Sparkles,
  shakeEl,
  stop,
  Timers,
  tactile,
} from './kit-b'

// Textos factuais: só o que src/content/facts.ts sustenta, ids 'rachadinha' (InfoMoney 2025, Congresso em
// Foco 2021) e 'mansao' (Diario de Pernambuco out/2026, Poder360 2021). Sem associação com milícia (TSE,
// 15 e 20/10/2026). Os rótulos são únicos: 4 anos, o status de hoje e o valor financiado.
const PAIRS = [
  { year: '2018', text: 'Coaf aponta R$ 1,2 mi atípicos na conta de Queiroz, ex-assessor de Flávio' },
  { year: '2020', text: 'MP-RJ denuncia Flávio por peculato, lavagem e organização criminosa' },
  { year: '2021', text: 'STJ anula a quebra de sigilo e as provas caem' },
  { year: 'Hoje', text: 'Denúncia arquivada: Flávio nunca virou réu e nega irregularidades' },
  { year: 'R$ 3,1 mi', text: 'Parte da casa de R$ 6 mi de Flávio financiada pelo BRB' },
  { year: 'out/2026', text: 'PF apura o financiamento da casa; Flávio nega irregularidades' },
]

interface Card {
  pair: number
  el: HTMLButtonElement
  open: boolean
  done: boolean
  /** retângulo em px lógicos e posição na grade */
  r: { x: number; y: number; w: number; h: number; cx: number; cy: number }
  col: number
  row: number
}

interface Trail {
  pts: { x: number; y: number }[]
  len: number
  born: number
  coins: number
}

const COIN_SPEED = 150

function coinTex() {
  return coinFrame(0)
}

function pinTex() {
  return bake('pin', 5, 6, (p) => {
    p.rect(1, 0, 3, 3, P.red)
    p.dot(1, 0, P.redGlow)
    p.rect(1, 2, 3, 1, P.crimsonDeep)
    p.rect(2, 3, 1, 3, P.stone2)
    p.outline(P.void)
  })
}

/**
 * Quadro de cortiça em três quartos (ref v2): frente de cortiça em 3 tons com grão, moldura de madeira com
 * chanfro claro em cima, lateral grossa à direita e embaixo em madeira escura saturada, e a luz quente da
 * luminária lavando o alto do quadro. `w`×`h` é a frente; a textura tem +D de lateral.
 */
const BOARD_D = 4
function corkTex(w: number, h: number) {
  const D = BOARD_D
  return bake(`cork3q${w}x${h}`, w + D, h + D, (p) => {
    let s = 9
    const r = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    // lateral direita e de baixo (madeira escura, pontilhada como granito)
    for (let i = 1; i <= D; i++) {
      for (let y = i; y < h + i; y++) p.dot(w - 1 + i, y, (y + i) % 3 === 0 ? P.blood0 : P.blood1)
      for (let x = i; x < w + i; x++) p.dot(x, h - 1 + i, (x * 7 + i) % 5 === 0 ? P.crimsonDeep : P.blood1)
    }
    p.rect(w + D - 1, D, 1, h, P.redHot)
    // frente: cortiça escura com grão em 3 tons (valor baixo, as cartas é que brilham)
    p.rect(0, 0, w, h, P.gold0)
    for (let i = 0; i < (w * h) / 4; i++) {
      const v = r()
      p.dot(Math.floor(r() * w), Math.floor(r() * h), v < 0.5 ? P.blood1 : v < 0.8 ? P.emberDark : P.gold1)
    }
    // luz quente da luminária no alto, pontilhada e morrendo para baixo
    for (let y = 4; y < h * 0.35; y++)
      for (let x = 4; x < w - 4; x++) {
        const t = 1 - y / (h * 0.35)
        const cx = Math.abs(x - w / 2) / (w / 2)
        if (((x + y) & 1) === 0 && r() < t * (1 - cx) * 0.35) p.dot(x, y, P.gold1)
      }
    // moldura de madeira com chanfro: claro em cima/esquerda, escuro embaixo/direita
    p.rect(0, 0, w, 3, P.emberDark)
    p.rect(0, 0, w, 1, P.ember)
    p.rect(0, 0, 3, h, P.emberDark)
    p.rect(0, 0, 1, h, P.gold1)
    p.rect(0, h - 3, w, 3, P.blood1)
    p.rect(w - 3, 0, 3, h, P.blood1)
    p.rect(3, 3, w - 6, 1, P.blood0)
    p.rect(3, 3, 1, h - 6, P.blood0)
    p.outline(P.void)
  })
}

/** moeda girando em 4 quadros (frente, 3/4, perfil, 3/4) */
function coinFrame(f: number) {
  return bake(`coin5f${f}`, 5, 5, (p) => {
    const w = [5, 3, 1, 3][f] ?? 5
    const x0 = Math.floor((5 - w) / 2)
    if (w === 1) {
      p.rect(2, 0, 1, 5, P.gold1)
      p.dot(2, 1, P.goldHi)
      return
    }
    p.rect(x0 + (w > 3 ? 1 : 0), 0, w - (w > 3 ? 2 : 0), 5, P.gold)
    p.rect(x0, 1, w, 3, P.gold)
    p.rect(x0 + 1, 1, 1, 2, P.goldHi)
    p.dot(x0 + 1, 1, P.sparkle)
    p.rect(x0 + w - 1, 2, 1, 2, P.gold1)
    p.rect(x0 + 1, 4, w - 2, 1, P.gold1)
  })
}

export default function memoria(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const timers = new Timers()
  let embers: Embers
  let sparkles: Sparkles
  let pops: ScorePops
  let streak = 0
  const strings = new Graphics()
  const coinLayer = new Container()
  const pins = new Container()
  const glow = new Graphics()
  const pips = new Graphics()
  let fly: FlyToHud
  let banner: Banner
  let killHand: (() => void) | null = null
  let boardX = 0
  let boardY = 0
  let boardW = 0
  let coins: Sprite[] = []
  let cards: Card[] = []
  let trails: Trail[] = []
  let first: Card | null = null
  let lock = false
  let pairs = 0
  let misses = 0
  let grid: HTMLDivElement
  let cols = 3
  let gap = 12
  let gx0 = 0
  let gy0 = 0
  let gx1 = 0
  let gy1 = 0
  let cw = 0
  let ch = 0

  // ----- rota pelos vãos (siga o dinheiro) -----
  function route(a: Card, b: Card) {
    const g = gap / 2 / c.css
    // sai pela lateral de A voltada para B (ou pela direita), anda pelo corredor horizontal e entra em B
    const pts: { x: number; y: number }[] = []
    const ax = a.col <= b.col ? a.r.x + a.r.w + g : a.r.x - g
    const bx = a.col < b.col ? b.r.x - g : a.col > b.col ? b.r.x + b.r.w + g : b.r.x + b.r.w + g
    const down = b.row >= a.row
    const hy = down ? a.r.y + a.r.h + g : a.r.y - g
    pts.push({ x: a.r.cx, y: a.r.cy }, { x: ax, y: a.r.cy })
    if (a.row === b.row) {
      if (a.col === b.col) pts.push({ x: ax, y: b.r.cy })
      else if (Math.abs(a.col - b.col) > 1) {
        pts.push({ x: ax, y: hy }, { x: bx, y: hy }, { x: bx, y: b.r.cy })
      } else pts.push({ x: ax, y: b.r.cy })
    } else {
      const hy2 = down ? b.r.y - g : b.r.y + b.r.h + g
      pts.push({ x: ax, y: hy2 }, { x: bx, y: hy2 }, { x: bx, y: b.r.cy })
    }
    pts.push({ x: b.r.cx, y: b.r.cy })
    const clean = pts.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
    let len = 0
    for (let i = 1; i < clean.length; i++) {
      const p0 = clean[i - 1] as { x: number; y: number }
      const p1 = clean[i] as { x: number; y: number }
      len += Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y)
    }
    return { pts: clean, len }
  }

  function along(t: Trail, d: number) {
    let left = d
    for (let i = 1; i < t.pts.length; i++) {
      const p0 = t.pts[i - 1] as { x: number; y: number }
      const p1 = t.pts[i] as { x: number; y: number }
      const seg = Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y)
      if (left <= seg) {
        const k = seg ? left / seg : 0
        return { x: Math.round(p0.x + (p1.x - p0.x) * k), y: Math.round(p0.y + (p1.y - p0.y) * k) }
      }
      left -= seg
    }
    const last = t.pts[t.pts.length - 1] ?? { x: 0, y: 0 }
    return last
  }

  function drawStrings() {
    strings.clear()
    for (const t of trails) {
      const grow = Math.min(t.len, (c.time - t.born) * COIN_SPEED * 1.3)
      let left = grow
      for (let i = 1; i < t.pts.length && left > 0; i++) {
        const p0 = t.pts[i - 1] as { x: number; y: number }
        const p1 = t.pts[i] as { x: number; y: number }
        const seg = Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y)
        const k = Math.min(1, left / Math.max(1, seg))
        const x1 = Math.round(p0.x + (p1.x - p0.x) * k)
        const y1 = Math.round(p0.y + (p1.y - p0.y) * k)
        const x = Math.min(p0.x, x1)
        const y = Math.min(p0.y, y1)
        strings.rect(x, y, Math.abs(x1 - p0.x) + 1, Math.abs(y1 - p0.y) + 1).fill(P.red)
        strings
          .rect(x + 1, y + 1, Math.abs(x1 - p0.x) + 1, Math.abs(y1 - p0.y) + 1)
          .fill({ color: P.blood0, alpha: 0.8 })
        left -= seg
      }
    }
  }

  /**
   * Telegrafia do erro: 4 alfinetes na moldura mostram quantos erros faltam para perder um coração
   * (a cada 4 erros). O último aceso pisca em vermelho quente.
   */
  function drawPips() {
    const g = pips
    g.clear()
    const filled = misses % 4
    const x0 = boardX + boardW - 4 - 4 * 6
    const y = boardY - 1
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * 6
      const on = i < filled
      const warn = on && filled === 3 && Math.floor(c.time * 6) % 2 === 0
      g.rect(x - 1, y - 1, 5, 4).fill(P.void)
      g.rect(x, y, 3, 2).fill(on ? (warn ? P.redHot : P.red) : P.blood0)
      if (on) g.rect(x, y, 1, 1).fill(P.redGlow)
    }
  }

  function addPin(x: number, y: number) {
    const s = new Sprite(pinTex())
    s.x = Math.round(x - 2)
    s.y = Math.round(y - 5)
    pins.addChild(s)
  }

  function matched(a: Card, b: Card) {
    const tr = route(a, b)
    const t: Trail = { pts: tr.pts, len: tr.len, born: c.time, coins: 0 }
    trails.push(t)
    stop(c, 70)
    joy(c, 2, 160)
    c.sfx('good', { x: Math.round((a.r.cx + b.r.cx) / 2), combo: streak })
    for (const k of [a, b]) {
      c.fx.ring(k.r.cx, k.r.cy, P.gold, Math.round(Math.max(k.r.w, k.r.h) * 0.75))
      addPin(k.r.cx, k.r.y)
      sparkles.spawn(Math.round(k.r.x - 2), Math.round(k.r.y - 2), 6)
      sparkles.spawn(Math.round(k.r.x + k.r.w + 1), Math.round(k.r.y + k.r.h + 1), 0)
      embers.blast(k.r.cx, k.r.cy, 120, 50)
    }
    // recompensa voa até o contador de pontos
    fly.send(Math.round((a.r.cx + b.r.cx) / 2), Math.round((a.r.cy + b.r.cy) / 2), 6)
    // trilha de moedas: 6 moedas saem de A a cada 50 ms e chegam em B
    for (let i = 0; i < 6; i++) timers.after(i * 0.05, () => launchCoin(t, i === 5))
  }

  interface Flying {
    s: Sprite
    t: Trail
    d: number
    last: boolean
    loop: boolean
  }
  let flying: Flying[] = []

  function launchCoin(t: Trail, last: boolean, loop = false) {
    let s = coins.find((x) => !x.visible)
    if (!s) {
      if (coins.length > 60) return
      s = new Sprite(coinTex())
      coinLayer.addChild(s)
      coins.push(s)
    }
    s.visible = true
    s.alpha = loop ? 0.75 : 1
    flying.push({ s, t, d: 0, last, loop })
  }

  function flip(card: Card) {
    if (lock || card.open || card.done) return
    card.open = true
    card.el.setAttribute('aria-pressed', 'true')
    flipEl(card.el, () => card.el.classList.add('open'))
    c.sfx('flip', { x: Math.round(card.r.cx) })
    if (!first) {
      first = card
      return
    }
    const a = first
    first = null
    if (a.pair === card.pair) {
      for (const k of [a, card]) {
        k.done = true
        k.el.disabled = true
      }
      timers.after(0.2, () => {
        for (const k of [a, card]) {
          k.el.classList.add('done')
          goldPulse(k.el)
        }
        matched(a, card)
      })
      pairs++
      streak++
      const pts = Math.max(80, 170 - misses * 8)
      const sk = streak
      timers.after(0.2, () => pops.score(pts, Math.round(card.r.cx), Math.round(card.r.y) - 6, sk, embers))
      if (pairs === PAIRS.length) {
        timers.after(0.9, () => {
          c.sfx('level')
          for (const k of cards) sparkles.spawn(k.r.cx, k.r.y - 1, 6)
          c.fx.ring(
            Math.round((gx0 + gx1) / 2),
            Math.round((gy0 + gy1) / 2),
            P.goldHi,
            Math.round((gx1 - gx0) * 0.7),
          )
          banner.show(
            [
              { text: 'DINHEIRO', size: 8, color: P.stoneHi },
              { text: 'RASTREADO', size: 16, color: P.goldHi },
            ],
            Math.round((gx0 + gx1) / 2),
            Math.round((gy0 + gy1) / 2),
            0.6,
          )
          fly.send(Math.round((gx0 + gx1) / 2), Math.round((gy0 + gy1) / 2), 12)
        })
        timers.after(1.5, () => c.finish())
      }
    } else {
      misses++
      streak = 0
      lock = true
      timers.after(0.22, () => {
        for (const k of [a, card]) {
          k.el.classList.add('bad')
          shakeEl(k.el)
        }
        if (misses % 4 === 0) c.hit(card.r.cx, card.r.cy)
        else c.sfx('error', { x: Math.round(card.r.cx) })
      })
      timers.after(0.85, () => {
        for (const k of [a, card]) {
          k.open = false
          k.el.classList.remove('bad')
          k.el.setAttribute('aria-pressed', 'false')
          flipEl(k.el, () => k.el.classList.remove('open'))
        }
        lock = false
      })
    }
  }

  function measure() {
    for (const k of cards) {
      k.r = domRect(c, k.el)
    }
    const xs = [...new Set(cards.map((k) => Math.round(k.r.x)))].sort((a, b) => a - b)
    const ys = [...new Set(cards.map((k) => Math.round(k.r.y)))].sort((a, b) => a - b)
    for (const k of cards) {
      k.col = xs.indexOf(Math.round(k.r.x))
      k.row = ys.indexOf(Math.round(k.r.y))
    }
    const g = domRect(c, grid)
    gx0 = Math.round(g.x)
    gy0 = Math.round(g.y)
    gx1 = Math.round(g.x + g.w)
    gy1 = Math.round(g.y + g.h)
  }

  return {
    duration: 80,
    goal: 950,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      const portrait = innerWidth < innerHeight
      cols = portrait ? 3 : 4
      const rows = 12 / cols
      gap = portrait ? 12 : 16
      const availH = (c.bottom - c.top) * c.css - 48
      cw = Math.min(150, (innerWidth - 40 - (cols - 1) * gap) / cols)
      ch = Math.min(110, (availH - (rows - 1) * gap) / rows)
      grid = el('div', { class: 'grid-cards', role: 'grid', 'aria-label': 'Cartas da memória' })
      grid.style.gridTemplateColumns = `repeat(${cols}, ${Math.floor(cw)}px)`
      grid.style.gridAutoRows = `${Math.floor(ch)}px`
      grid.style.gap = `${gap}px`
      const deck = shuffle(
        PAIRS.flatMap((p, i) => [
          { pair: i, label: p.year, year: true },
          { pair: i, label: p.text, year: false },
        ]),
        c.rnd,
      )
      cards = deck.map((d) => {
        const b = el(
          'button',
          {
            class: `mcard${d.year ? ' year' : ''}`,
            'aria-pressed': 'false',
            'aria-label': `Carta: ${d.label}`,
          },
          d.label,
          el('span', { class: 'back', 'aria-hidden': 'true' }, '13'),
        )
        b.style.fontSize = d.year ? (d.label.length > 5 ? '15px' : '') : ch < 80 ? '11px' : '13px'
        tactile(b)
        const card: Card = {
          pair: d.pair,
          el: b,
          open: false,
          done: false,
          r: { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 },
          col: 0,
          row: 0,
        }
        b.addEventListener('click', () => flip(card))
        return card
      })
      grid.append(...cards.map((k) => k.el))
      c.layer.append(grid)
      measure()

      // quadro de cortiça atrás da grade, com margem para os alfinetes e o barbante
      const m = 7
      const bw = gx1 - gx0 + m * 2
      const bh = gy1 - gy0 + m * 2
      const board = new Sprite(corkTex(bw, bh))
      board.x = gx0 - m
      board.y = gy0 - m
      boardX = board.x
      boardY = board.y
      boardW = bw
      // sombra de contato pontilhada embaixo e à direita da lateral grossa
      const shadow = new Graphics()
      for (let x = 0; x < bw + BOARD_D; x++)
        for (let y = 0; y < 3; y++)
          if ((x + y) % 2 === 0) shadow.rect(board.x + 3 + x, board.y + bh + BOARD_D + y, 1, 1)
      shadow.fill({ color: P.void, alpha: 0.8 })
      // alfinetes de canto
      for (const [x, y] of [
        [board.x + 4, board.y + 4],
        [board.x + bw - 5, board.y + 4],
      ] as const)
        addPin(x + 2, y + 5)
      glow.blendMode = 'add'
      embers = new Embers(c, { x0: 0, y0: c.top, x1: c.W, y1: c.bottom }, { ambient: 16 }).listen()
      sparkles = new Sparkles(c.reduced)
      pops = new ScorePops(c)
      fly = new FlyToHud(c)
      banner = new Banner(c)
      root.addChild(
        shadow,
        board,
        strings,
        glow,
        coinLayer,
        pins,
        pips,
        embers.root,
        sparkles.root,
        pops.root,
        fly.root,
        banner.root,
      )
      // demonstração: a mão toca a primeira carta nos 3 primeiros segundos
      const firstCard = cards[0]?.el
      if (firstCard) killHand = domHand(c, firstCard)
    },
    update(dt) {
      timers.update(dt)
      embers.update(dt, c.time)
      sparkles.update(dt)
      pops.update(dt)
      fly.update(dt)
      banner.update(dt)
      drawPips()
      drawStrings()
      glow.clear()
      // moedas correndo pelo barbante
      for (const f of flying) {
        f.d += COIN_SPEED * dt * (f.loop ? 0.35 : 1)
        const p = along(f.t, f.d)
        f.s.x = p.x - 2
        f.s.y = p.y - 2
        f.s.texture = coinFrame(Math.floor(c.time * 12 + f.d * 0.05) % 4)
        if (!f.loop) energyDot(glow, p.x, p.y, P.sparkle, P.goldHi, P.gold1)
        if (f.d >= f.t.len) {
          f.s.visible = false
          if (f.last) {
            c.fx.burst(p.x, p.y, P.goldHi, 10, 50)
            sparkles.spawn(p.x, p.y, 8)
            c.sfx('coin', { x: p.x })
          }
        }
      }
      flying = flying.filter((f) => f.s.visible)
      // depois de ligado, o barbante continua levando uma moeda de vez em quando (permanência)
      if (!c.reduced)
        for (const t of trails)
          if (c.time - t.born > 1 && Math.floor((c.time - t.born) / 1.4) > t.coins) {
            t.coins++
            launchCoin(t, false, true)
          }
    },
    key(k, down) {
      if (!down) return
      const live = cards.filter((x) => !x.done)
      if (!live.length) return
      const cur = cards.findIndex((x) => x.el === document.activeElement)
      const step =
        k === 'ArrowRight' || k === 'd'
          ? 1
          : k === 'ArrowLeft' || k === 'a'
            ? -1
            : k === 'ArrowDown'
              ? cols
              : k === 'ArrowUp'
                ? -cols
                : 0
      if (!step) return
      let i = cur < 0 ? 0 : cur
      for (let n = 0; n < cards.length; n++) {
        i = (i + step + cards.length) % cards.length
        const cand = cards[i]
        if (cand && !cand.done) {
          cand.el.focus({ preventScroll: true })
          return
        }
      }
    },
    hint() {
      if (lock) return false
      lock = true
      const shown = cards.filter((k) => !k.done && !k.open)
      for (const k of shown) flipEl(k.el, () => k.el.classList.add('open'))
      timers.after(1.6, () => {
        for (const k of shown) if (!k.open) flipEl(k.el, () => k.el.classList.remove('open'))
        lock = false
      })
      const a = shown[0]
      if (a) hintPulse(a.el, 3)
      return true
    },
    clear() {
      if (lock) return false
      const left = cards.filter((k) => !k.done && !k.open)
      const a = first ?? left[0]
      if (!a) return false
      const b = cards.find((k) => k !== a && k.pair === a.pair && !k.done)
      if (!b) return false
      if (!first) flip(a)
      flip(b)
      return true
    },
    timeUp() {
      return pairs >= 4
    },
    dispose() {
      timers.clear()
      killHand?.()
      embers?.destroy()
      grid?.remove()
      root.destroy({ children: true })
      cards = []
      trails = []
      coins = []
    },
  }
}
