// Fase 8 · O Julgamento: monte a linha do tempo da trama golpista, do mais antigo ao mais recente.
import { h } from '../core/dom'
import { shuffle } from '../core/rng'
import type { GameCtx, MicroGame } from './types'
import { rect } from './util'

const EVENTS = [
  { date: '30/10/2022', text: 'Lula vence a eleição no 2º turno' },
  { date: '08/01/2023', text: 'Golpistas invadem as sedes dos Três Poderes' },
  { date: 'jan/2023', text: 'PF acha a "minuta do golpe" na casa de Anderson Torres' },
  { date: '18/02/2025', text: 'PGR denuncia Bolsonaro e mais 33 pela trama golpista' },
  { date: '11/09/2025', text: 'STF condena Bolsonaro a 27 anos e 3 meses' },
  { date: 'nov/2025', text: 'Bolsonaro é preso para cumprir a pena' },
]

export function linhaGame(): MicroGame {
  let c: GameCtx
  let next = 0
  let mistakes = 0
  let slots: HTMLDivElement[] = []
  let cards: HTMLButtonElement[] = []
  let hammer = -10

  function pick(i: number, btn: HTMLButtonElement) {
    if (i === next) {
      const ev = EVENTS[i]
      const slot = slots[i]
      if (ev && slot) {
        slot.className = 'slot filled'
        slot.textContent = ev.date
        slot.setAttribute('aria-label', `${ev.date}: ${ev.text}`)
      }
      btn.classList.add('used')
      btn.disabled = true
      next++
      hammer = c.time
      c.addScore(Math.max(60, 160 - mistakes * 10))
      c.sfx('good')
      if (next >= EVENTS.length) {
        c.sfx('level')
        window.setTimeout(() => c.finish(), 500)
      }
    } else {
      mistakes++
      btn.classList.remove('bad')
      void btn.offsetWidth
      btn.classList.add('bad')
      c.hit()
    }
  }

  return {
    duration: 0,
    goal: 900,
    init(ctx) {
      c = ctx
      const rail = h('div', { class: 'timeline-slots', role: 'list', 'aria-label': 'Linha do tempo' })
      slots = EVENTS.map((_, i) => h('div', { class: 'slot', role: 'listitem' }, String(i + 1)))
      rail.append(...slots)
      rail.style.top = `${(c.top + 8) * c.css}px`
      const grid = h('div', { class: 'tl-cards' })
      const order = shuffle(
        EVENTS.map((e, i) => ({ e, i })),
        c.rnd,
      )
      cards = order.map(({ e, i }) => {
        const b = h('button', { class: 'tl-card' }, e.text)
        b.addEventListener('click', () => pick(i, b))
        return b
      })
      grid.append(...cards)
      grid.style.top = `${(c.top + 8) * c.css + 64}px`
      c.layer.append(rail, grid)
    },
    update() {},
    draw(g) {
      // martelo do juiz no rodapé
      const k = Math.min(1, (c.time - hammer) / 0.25)
      const ang = k < 1 ? -0.9 + k * 0.9 : 0
      const x = c.W / 2
      const y = c.bottom - 14
      rect(g, x - 16, y + 4, 32, 4, '#4e3122')
      rect(g, x - 16, y + 4, 32, 1, '#8a5a3a')
      g.save()
      g.translate(x + 10, y + 2)
      g.rotate(ang)
      rect(g, -18, -2, 18, 3, '#8a5a3a')
      rect(g, -24, -6, 8, 10, '#4e3122')
      rect(g, -24, -6, 8, 1, '#8a5a3a')
      g.restore()
      if (k < 1) rect(g, x - 20, y + 3, 40, 1, '#f5c04a')
    },
    hint() {
      const b = cards.find((_, j) => {
        const label = cards[j]?.textContent
        return label === EVENTS[next]?.text
      })
      if (!b) return false
      b.style.boxShadow = '0 0 0 3px var(--gold)'
      return true
    },
    clear() {
      const b = cards.find((x) => x.textContent === EVENTS[next]?.text)
      if (!b) return false
      pick(next, b)
      return true
    },
  }
}
