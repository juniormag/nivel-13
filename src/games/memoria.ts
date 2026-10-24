// Fase 9 · Siga o Dinheiro: jogo da memória ligando cada ano ao fato documentado.
// Cartas em DOM (.grid-cards/.mcard) sobre um quadro de cortiça em Pixi; cada par certo é ligado por um
// barbante vermelho e uma trilha de moedas pixel que corre pelos vãos entre as cartas.
import { Container, Graphics, Sprite } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { shuffle } from '../lib/rng'
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

// Textos factuais (revisados): mesmos do jogo legado. Fontes em src/content/facts.ts, ids 'rachadinha'
// (InfoMoney 2025, Congresso em Foco 2021, Poder360 fev/2020) e 'mansao' (Diario de Pernambuco out/2026).
const PAIRS = [
  { year: '2005', text: 'Flávio dá a Medalha Tiradentes ao ex-PM Adriano da Nóbrega, então preso' },
  { year: '2007', text: 'Mulher de Adriano é nomeada no gabinete de Flávio na Alerj' },
  { year: '2018', text: 'Coaf aponta R$ 1,2 mi atípicos na conta de Queiroz, ex-assessor de Flávio' },
  { year: '2020', text: 'MP-RJ denuncia Flávio por peculato, lavagem e organização criminosa' },
  { year: '2021', text: 'STJ anula a quebra de sigilo e as provas caem' },
  { year: '2026', text: 'PF apura o financiamento da casa de R$ 6 mi de Flávio' },
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
  return bake('coin5', 5, 5, (p) => {
    p.rect(1, 0, 3, 5, P.gold)
    p.rect(0, 1, 5, 3, P.gold)
    p.rect(1, 1, 1, 2, P.goldHi)
    p.dot(1, 1, P.sparkle)
    p.rect(3, 3, 1, 1, P.gold1)
    p.rect(4, 2, 1, 2, P.gold1)
    p.rect(2, 4, 2, 1, P.gold1)
  })
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

/** cortiça: base escura dourada com grão pontilhado (valor baixo, para não brigar com as cartas) */
function corkTex(w: number, h: number) {
  return bake(`cork${w}x${h}`, w, h, (p) => {
    p.rect(0, 0, w, h, P.gold0)
    let s = 9
    const r = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    for (let i = 0; i < (w * h) / 5; i++)
      p.dot(
        Math.floor(r() * w),
        Math.floor(r() * h),
        r() < 0.6 ? P.blood1 : r() < 0.7 ? P.emberDark : P.gold1,
      )
    // moldura de madeira
    p.rect(0, 0, w, 3, P.emberDark)
    p.rect(0, 0, w, 1, P.gold1)
    p.rect(0, h - 3, w, 3, P.blood1)
    p.rect(0, 0, 3, h, P.emberDark)
    p.rect(0, 0, 1, h, P.gold1)
    p.rect(w - 3, 0, 3, h, P.blood1)
    p.rect(w - 1, 0, 1, h, P.blood0)
    p.outline(P.void)
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
        b.style.fontSize = d.year ? '' : ch < 80 ? '11px' : '13px'
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
      const shadow = new Graphics()
      shadow.rect(board.x + 2, board.y + bh + 1, bw, 2).fill({ color: P.void, alpha: 0.7 })
      shadow.rect(board.x + bw + 1, board.y + 2, 2, bh).fill({ color: P.void, alpha: 0.7 })
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
      root.addChild(shadow, board, strings, glow, coinLayer, pins, embers.root, sparkles.root, pops.root)
    },
    update(dt) {
      timers.update(dt)
      embers.update(dt, c.time)
      sparkles.update(dt)
      pops.update(dt)
      drawStrings()
      glow.clear()
      // moedas correndo pelo barbante
      for (const f of flying) {
        f.d += COIN_SPEED * dt * (f.loop ? 0.35 : 1)
        const p = along(f.t, f.d)
        f.s.x = p.x - 2
        f.s.y = p.y - 2
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
      embers?.destroy()
      grid?.remove()
      root.destroy({ children: true })
      cards = []
      trails = []
      coins = []
    },
  }
}
