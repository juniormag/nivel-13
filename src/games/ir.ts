// Fase 3 · Seu Imposto: a conta da isenção com o salário da pessoa, e uma chuva de moedas.
import { fmtBRL, h } from '../core/dom'
import { drawSprite } from '../core/sprites'
import { save } from '../core/store'
import type { GameCtx, MicroGame } from './types'

/** Tabela mensal do IRPF (vigente desde maio/2025) sobre a base após o desconto simplificado. */
export function tabela(base: number) {
  if (base <= 2428.8) return 0
  if (base <= 2826.65) return base * 0.075 - 182.16
  if (base <= 3751.05) return base * 0.15 - 394.16
  if (base <= 4664.68) return base * 0.225 - 675.49
  return base * 0.275 - 908.73
}

export const DESCONTO_SIMPLIFICADO = 607.2

/** Lei 15.270/2025: redução de até R$ 312,89 até R$ 5 mil; entre R$ 5 mil e R$ 7.350, 978,62 − 0,133145 × renda. */
export function reducao(renda: number) {
  if (renda <= 5000) return 312.89
  if (renda <= 7350) return Math.max(0, 978.62 - 0.133145 * renda)
  return 0
}

export function economiaIR(salario: number) {
  const antes = Math.max(0, tabela(salario - DESCONTO_SIMPLIFICADO))
  const red = Math.min(antes, reducao(salario))
  const agora = antes - red
  return { antes, agora, mes: red, ano: red * 13 }
}

export function irGame(): MicroGame {
  let c: GameCtx
  const coins: { x: number; y: number; vy: number; vx: number; r: number }[] = []
  let raining = false
  let rainLeft = 0
  let endT = -1

  return {
    duration: 0,
    goal: 1000,
    init(ctx) {
      c = ctx
      let val = save.irMonthly ?? 4000
      const big = h('div', { class: 'big', 'aria-live': 'polite' })
      const lines = h('div')
      const note = h('p', { class: 'small muted', style: 'margin:10px 0 0' })
      const range = h('input', {
        class: 'range',
        type: 'range',
        min: '1500',
        max: '12000',
        step: '50',
        value: String(val),
        'aria-label': 'Salário bruto mensal',
      })
      const salary = h('div', {
        style: 'font-family:var(--f-hud);font-size:20px;text-align:center;margin:6px 0 2px',
      })
      const update = () => {
        const e = economiaIR(val)
        salary.textContent = fmtBRL(val)
        big.textContent = `${fmtBRL(e.ano)} por ano`
        lines.replaceChildren(
          h('div', { class: 'line' }, h('span', null, 'IR por mês antes'), h('b', null, fmtBRL(e.antes))),
          h('div', { class: 'line' }, h('span', null, 'IR por mês em 2026'), h('b', null, fmtBRL(e.agora))),
          h(
            'div',
            { class: 'line' },
            h('span', null, 'Fica no seu bolso por mês'),
            h('b', { style: 'color:var(--leaf)' }, fmtBRL(e.mes)),
          ),
        )
        note.textContent =
          e.antes === 0
            ? 'Nessa faixa você já era isento. A lei nova protege quem ganha até R$ 5 mil e reduz o IR até R$ 7.350.'
            : val > 7350
              ? 'Acima de R$ 7.350 não há redução. Quem ganha mais de R$ 600 mil por ano passa a pagar um imposto mínimo.'
              : 'Estimativa com desconto simplificado, sem dependentes, incluindo o 13º. Lei 15.270/2025.'
      }
      range.addEventListener('input', () => {
        val = Number(range.value)
        update()
      })
      const step = (d: number) => {
        val = Math.min(12000, Math.max(1500, val + d))
        range.value = String(val)
        update()
      }
      const confirm = h(
        'button',
        {
          class: 'btn btn--red btn--wide',
          style: 'margin-top:14px',
          onclick: () => {
            if (raining) return
            save.irMonthly = val
            const e = economiaIR(val)
            raining = true
            rainLeft = Math.max(14, Math.min(70, Math.round(e.mes / 5)))
            c.addScore(1000)
            c.sfx('coin')
            panel.style.opacity = '0.25'
            endT = c.time + 2.6
          },
        },
        'Confirmar',
      )
      const panel = h(
        'div',
        { class: 'calc px-frame px-frame--gold' },
        h('div', { class: 'eyebrow' }, 'Seu salário bruto por mês'),
        salary,
        h(
          'div',
          { class: 'row', style: 'flex-wrap:nowrap' },
          h('button', { class: 'btn', 'aria-label': 'Diminuir R$ 100', onclick: () => step(-100) }, '−'),
          range,
          h('button', { class: 'btn', 'aria-label': 'Aumentar R$ 100', onclick: () => step(100) }, '+'),
        ),
        lines,
        h(
          'div',
          { class: 'eyebrow', style: 'margin-top:14px;color:var(--gold)' },
          'Com a isenção, você economiza',
        ),
        big,
        note,
        confirm,
      )
      c.layer.append(panel)
      update()
    },
    update(dt) {
      if (raining && rainLeft > 0 && c.rnd() < 0.6) {
        rainLeft--
        coins.push({
          x: c.rnd() * c.W,
          y: c.top - 10,
          vy: 20 + c.rnd() * 30,
          vx: (c.rnd() - 0.5) * 10,
          r: c.rnd() * 6,
        })
        if (rainLeft % 4 === 0) c.sfx('coin')
      }
      for (const k of coins) {
        k.vy += 140 * dt
        k.y += k.vy * dt
        k.x += k.vx * dt
        if (k.y > c.bottom - 6) {
          k.y = c.bottom - 6
          k.vy *= -0.35
          k.vx *= 0.6
        }
      }
      if (endT > 0 && c.time > endT) {
        endT = -1
        c.finish()
      }
    },
    draw(g) {
      for (const k of coins) drawSprite(g, 'moeda', k.x, k.y, { center: true, rot: k.r + c.time * 4 })
    },
  }
}
