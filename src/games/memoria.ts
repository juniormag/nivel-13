// Fase 9 · Siga o Dinheiro: jogo da memória ligando cada ano ao fato documentado.
import { h } from '../core/dom'
import { shuffle } from '../core/rng'
import type { GameCtx, MicroGame } from './types'

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
}

export function memoriaGame(): MicroGame {
  let c: GameCtx
  let cards: Card[] = []
  let first: Card | null = null
  let lock = false
  let pairs = 0
  let misses = 0

  function flip(card: Card) {
    if (lock || card.open || card.done) return
    card.open = true
    card.el.classList.add('open')
    card.el.setAttribute('aria-pressed', 'true')
    c.sfx('tap')
    if (!first) {
      first = card
      return
    }
    const a = first
    first = null
    if (a.pair === card.pair) {
      for (const k of [a, card]) {
        k.done = true
        k.el.classList.add('done')
        k.el.disabled = true
      }
      pairs++
      c.addScore(Math.max(80, 170 - misses * 8))
      c.sfx('good')
      if (pairs === PAIRS.length) window.setTimeout(() => c.finish(), 450)
    } else {
      misses++
      lock = true
      for (const k of [a, card]) k.el.classList.add('bad')
      if (misses % 4 === 0) c.hit()
      else c.sfx('tick')
      window.setTimeout(() => {
        for (const k of [a, card]) {
          k.open = false
          k.el.classList.remove('open', 'bad')
          k.el.setAttribute('aria-pressed', 'false')
        }
        lock = false
      }, 850)
    }
  }

  return {
    duration: 80,
    goal: 950,
    init(ctx) {
      c = ctx
      const portrait = innerWidth < innerHeight
      const cols = portrait ? 3 : 4
      const rows = 12 / cols
      const availH = (c.bottom - c.top) * c.css - 40
      const cw = Math.min(150, (innerWidth - 32 - (cols - 1) * 8) / cols)
      const ch = Math.min(110, (availH - (rows - 1) * 8) / rows)
      const grid = h('div', { class: 'grid-cards', role: 'grid', 'aria-label': 'Cartas da memória' })
      grid.style.gridTemplateColumns = `repeat(${cols}, ${cw}px)`
      grid.style.gridAutoRows = `${ch}px`
      const deck = shuffle(
        PAIRS.flatMap((p, i) => [
          { pair: i, label: p.year, year: true },
          { pair: i, label: p.text, year: false },
        ]),
        c.rnd,
      )
      cards = deck.map((d) => {
        const el = h(
          'button',
          {
            class: `mcard${d.year ? ' year' : ''}`,
            'aria-pressed': 'false',
            'aria-label': `Carta: ${d.label}`,
          },
          d.label,
          h('span', { class: 'back', 'aria-hidden': 'true' }, '13'),
        )
        el.style.fontSize = d.year ? '' : ch < 80 ? '11px' : '13px'
        const card: Card = { pair: d.pair, el, open: false, done: false }
        el.addEventListener('click', () => flip(card))
        return card
      })
      grid.append(...cards.map((k) => k.el))
      c.layer.append(grid)
    },
    update() {},
    draw() {},
    hint() {
      if (lock) return false
      lock = true
      for (const k of cards) if (!k.done) k.el.classList.add('open')
      window.setTimeout(() => {
        for (const k of cards) if (!k.done && !k.open) k.el.classList.remove('open')
        lock = false
      }, 1600)
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
  }
}
