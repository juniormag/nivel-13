// Fase 2 e Desafio do Dia · Fato ou Fake: a mensagem cai como meteoro; responda antes do impacto.

import type { Statement } from '../content/statements'
import { h } from '../core/dom'
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect, text } from './util'

export interface SwipeOpts {
  statements: Statement[]
  perCard?: number
  onAnswer?: (s: Statement, correct: boolean) => void
}

export function swipeGame(opts: SwipeOpts): MicroGame {
  let c: GameCtx
  let idx = 0
  let cardT = 0
  let state: 'ask' | 'show' | 'done' = 'ask'
  let card: HTMLDivElement
  let btnFake: HTMLButtonElement
  let btnFato: HTMLButtonElement
  let drag: { x0: number; dx: number } | null = null
  let showT = 0
  let meteorY = 0
  let targetY = 0
  let boomAt: { x: number; y: number } | null = null
  const per = opts.perCard ?? 10

  const cur = () => opts.statements[idx]

  function render() {
    const s = cur()
    if (!s) return
    card.className = 'fcard px-frame'
    card.style.transform = 'translate(-50%, -50%)'
    card.replaceChildren(
      h('div', { class: 'tag' }, `Mensagem ${idx + 1} de ${opts.statements.length}`),
      h('div', { class: 'q' }, `“${s.text}”`),
    )
    btnFake.disabled = false
    btnFato.disabled = false
    btnFake.classList.remove('btn--gold')
    btnFato.classList.remove('btn--gold')
    cardT = 0
    state = 'ask'
    const r = card.getBoundingClientRect()
    targetY = r.top / c.css - 4
  }

  function answer(fato: boolean | null) {
    const s = cur()
    if (!s || state !== 'ask') return
    const correct = fato === s.fato
    state = 'show'
    showT = 0
    btnFake.disabled = true
    btnFato.disabled = true
    const mx = c.W / 2
    if (correct) {
      const bonus = Math.round((1 - cardT / per) * 50)
      c.addScore(100 + bonus, mx, meteorY)
      c.burst(mx, meteorY, '#4fae3f', 18)
      c.sfx('good')
    } else {
      boomAt = { x: mx, y: targetY }
      c.burst(mx, targetY, '#ff3b3b', 22)
      c.hit(mx, targetY)
    }
    opts.onAnswer?.(s, correct)
    card.style.transform = 'translate(-50%, -50%)'
    card.classList.add(correct ? 'px-frame--gold' : 'px-frame--red')
    card.replaceChildren(
      h(
        'div',
        { class: 'tag' },
        fato === null ? 'Tempo esgotado' : correct ? 'Você acertou' : 'Não foi dessa vez',
      ),
      h('div', { class: `verdict ${s.fato ? 'ok' : 'no'}` }, s.fato ? '✓ Fato' : '✗ Fake'),
      h('div', { class: 'exp' }, s.exp),
      h('div', { class: 'src' }, `Fonte: ${s.src}`),
      h('div', { class: 'src' }, 'Toque para seguir'),
    )
  }

  function next() {
    idx++
    boomAt = null
    if (idx >= opts.statements.length) {
      state = 'done'
      card.remove()
      btnFake.parentElement?.remove()
      c.finish()
      return
    }
    render()
  }

  return {
    duration: 0,
    goal: opts.statements.length * 130,
    init(ctx) {
      c = ctx
      card = h('div', { class: 'fcard px-frame', role: 'group', 'aria-live': 'polite' })
      btnFake = h('button', { class: 'btn btn--red', onclick: () => answer(false) }, '← Fake')
      btnFato = h('button', { class: 'btn', onclick: () => answer(true) }, 'Fato →')
      btnFato.style.background = '#23561f'
      c.layer.append(card, h('div', { class: 'swipe-btns' }, btnFake, btnFato))
      card.addEventListener('pointerdown', (e) => {
        if (state === 'show') {
          next()
          return
        }
        drag = { x0: e.clientX, dx: 0 }
        card.setPointerCapture(e.pointerId)
      })
      card.addEventListener('pointermove', (e) => {
        if (!drag) return
        drag.dx = e.clientX - drag.x0
        card.style.transform = `translate(calc(-50% + ${drag.dx}px), -50%) rotate(${drag.dx / 22}deg)`
      })
      const release = () => {
        if (!drag) return
        const dx = drag.dx
        drag = null
        if (Math.abs(dx) > 70) {
          c.sfx('swipe')
          answer(dx > 0)
        } else card.style.transform = 'translate(-50%, -50%)'
      }
      card.addEventListener('pointerup', release)
      card.addEventListener('pointercancel', release)
      requestAnimationFrame(render)
    },
    update(dt) {
      if (state === 'ask') {
        cardT += dt
        if (cardT >= per) answer(null)
      } else if (state === 'show') {
        showT += dt
        if (showT > 4.5) next()
      }
      const k = Math.min(1, cardT / per)
      meteorY = c.top + 8 + (targetY - c.top - 8) * k * k
    },
    draw(g) {
      const mx = c.W / 2
      if (state === 'ask') {
        // rastro
        for (let i = 1; i < 10; i++) {
          const a = 1 - i / 10
          g.globalAlpha = a * 0.8
          rect(
            g,
            mx - 1 + Math.sin(c.time * 20 + i) * 1.5,
            meteorY - i * 3,
            3,
            2,
            i < 4 ? '#ffd6c8' : '#ff3b3b',
          )
        }
        g.globalAlpha = 1
        drawSprite(g, 'fake', mx, meteorY, { center: true, scale: 2, rot: Math.sin(c.time * 3) * 0.15 })
        const left = Math.max(0, per - cardT)
        text(g, `${Math.ceil(left)}`, mx + 18, meteorY - 8, left < 3 ? '#ff3b3b' : '#f5c04a', 8)
      }
      if (boomAt) {
        rect(g, boomAt.x - 20, boomAt.y - 2, 40, 2, '#ff3b3b')
      }
    },
    key(k, down) {
      if (!down) return
      if (state === 'show' && (k === 'Enter' || k === ' ')) next()
      if (state !== 'ask') return
      if (k === 'ArrowLeft' || k === 'f') answer(false)
      if (k === 'ArrowRight' || k === 'j') answer(true)
    },
    hint() {
      const s = cur()
      if (!s || state !== 'ask') return false
      ;(s.fato ? btnFato : btnFake).classList.add('btn--gold')
      return true
    },
    clear() {
      const s = cur()
      if (!s || state !== 'ask') return false
      answer(s.fato)
      return true
    },
  }
}
