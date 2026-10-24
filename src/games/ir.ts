// Fase 3 · Seu Imposto: a conta da isenção com o salário da pessoa, e uma chuva de moedas.
// Calculadora em DOM (legível e acessível); moedas, brilho e pilha no chão em PixiJS.
import { Container, Sprite, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { getSave } from '../state/save'
import { coinFrames, Field, fmtBRL, frameAt, GOLD, glowTex, h, P, rampBurst, setSquash, spr } from './kit-a'

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

interface Coin {
  s: Sprite
  x: number
  y: number
  vx: number
  vy: number
  ph: number
  land: number
  rest: boolean
  bounces: number
}

export default function ir(): MicroGame {
  let c: GameCtx
  const root = new Container()
  let field: Field
  let frames: Texture[] = []
  const coins: Coin[] = []
  let heights: number[] = []
  const COL = 5
  let raining = false
  let rainLeft = 0
  let endT = -1
  let spawnT = 0
  let burstAt = { x: 0, y: 0 }
  let glow: Sprite
  let dispose: (() => void) | null = null

  function addCoin() {
    const s = new Sprite(frames[0])
    s.anchor.set(0.5)
    root.addChild(s)
    coins.push({
      s,
      x: 6 + c.rnd() * (c.W - 12),
      y: c.top - 10 - c.rnd() * 20,
      vy: 20 + c.rnd() * 30,
      vx: (c.rnd() - 0.5) * 10,
      ph: c.rnd() * 6,
      land: -1,
      rest: false,
      bounces: 0,
    })
  }

  return {
    duration: 0,
    goal: 1000,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      frames = coinFrames()
      field = new Field(c)
      field.trail = GOLD
      glow = spr(glowTex(18, GOLD), 0, 0)
      glow.blendMode = 'add'
      glow.alpha = 0
      root.addChild(glow, field.root)
      heights = Array(Math.ceil(c.W / COL) + 1).fill(0)

      let val = getSave().irMonthly ?? 4000
      let shownAno = economiaIR(val).ano
      let tween = 0
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
      // contador sobe com ease-out em 400 ms (regra 33), nunca pula
      const countTo = (to: number) => {
        cancelAnimationFrame(tween)
        const from = shownAno
        const t0 = performance.now()
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / 400)
          shownAno = from + (to - from) * (1 - (1 - k) ** 3)
          big.textContent = `${fmtBRL(shownAno)} por ano`
          if (k < 1) tween = requestAnimationFrame(step)
        }
        step()
      }
      const update = () => {
        const e = economiaIR(val)
        salary.textContent = fmtBRL(val, 0)
        countTo(e.ano)
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
      const stepBy = (d: number) => {
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
            getSave().patch({ irMonthly: val })
            const e = economiaIR(val)
            raining = true
            rainLeft = Math.max(14, Math.min(70, Math.round(e.mes / 5)))
            c.addScore(1000)
            c.sfx('coin')
            const r = confirm.getBoundingClientRect()
            burstAt = { x: (r.left + r.width / 2) / c.css, y: (r.top + r.height / 2) / c.css }
            c.fx.ring(burstAt.x, burstAt.y, P.goldHi, 34)
            c.fx.ring(burstAt.x, burstAt.y, P.white, 18)
            c.fx.flash(P.gold, 140, 0.18)
            rampBurst(c, burstAt.x, burstAt.y, GOLD, 18, 70)
            c.fx.float(`+${fmtBRL(e.mes, 0)}/mês`, burstAt.x, burstAt.y - 14, P.goldHi)
            glow.x = Math.round(burstAt.x)
            glow.y = Math.round(burstAt.y)
            glow.alpha = 0.7
            panel.style.transition = 'opacity .35s'
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
          h('button', { class: 'btn', 'aria-label': 'Diminuir R$ 100', onclick: () => stepBy(-100) }, '−'),
          range,
          h('button', { class: 'btn', 'aria-label': 'Aumentar R$ 100', onclick: () => stepBy(100) }, '+'),
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
      // o dedo no painel também mexe nas faíscas douradas
      const onMove = (e: PointerEvent) => field.pointer(e.clientX / c.css, e.clientY / c.css)
      panel.addEventListener('pointermove', onMove)
      c.layer.append(panel)
      update()
      dispose = () => {
        cancelAnimationFrame(tween)
        panel.remove()
      }
    },
    update(dt) {
      // brilho ambiente: poeira dourada subindo atrás do painel
      if (c.rnd() < (raining ? 0.5 : 0.12)) field.ember(c.rnd() * c.W, c.bottom - c.rnd() * 20, GOLD)
      if (raining && rainLeft > 0) {
        spawnT -= dt
        if (spawnT <= 0) {
          spawnT = 0.028
          rainLeft--
          addCoin()
          if (rainLeft % 4 === 0) c.sfx('coin')
        }
      }
      glow.alpha = Math.max(0, glow.alpha - dt * 0.8)
      const floor = c.bottom - 6
      for (const k of coins) {
        if (k.rest) {
          // pilha parada: só brilha de vez em quando
          if (c.rnd() < 0.004) field.sparkle(k.x + (c.rnd() - 0.5) * 6, k.y - 3)
          continue
        }
        k.vy += 140 * dt
        k.y += k.vy * dt
        k.x += k.vx * dt
        const col = Math.max(0, Math.min(heights.length - 1, Math.floor(k.x / COL)))
        const ground = floor - (heights[col] ?? 0)
        if (k.y > ground) {
          k.y = ground
          k.land = c.time
          k.bounces++
          if (k.bounces === 1) {
            field.blast(k.x, k.y + 5, 5, 30, GOLD, { add: true, life: 0.3 })
            if (c.rnd() < 0.35) field.sparkle(k.x, k.y - 4)
          }
          if (Math.abs(k.vy) < 30 || k.bounces > 3) {
            k.rest = true
            k.s.texture = frames[k.bounces % 2 ? 0 : 1] as Texture
            heights[col] = (heights[col] ?? 0) + 3
          } else {
            k.vy *= -0.38
            k.vx *= 0.6
          }
        }
        k.s.x = Math.round(k.x)
        k.s.y = Math.round(k.y)
        if (!k.rest) k.s.texture = frames[frameAt(c.time + k.ph, 12, frames.length)] as Texture
        // aterrissagem: squash 1,2 × 0,8 por 60 ms (área preservada), depois volta ao normal
        const squash = k.land > 0 && c.time - k.land < 0.06
        setSquash(k.s, squash ? 1.2 : 1, squash ? 0.8 : 1)
      }
      field.update(dt)
      if (endT > 0 && c.time > endT) {
        endT = -1
        c.finish()
      }
    },
    move(x, y) {
      field.pointer(x, y)
    },
    down(x, y) {
      field.pointer(x, y, true)
      // tocar numa moeda da pilha faz ela pular e brilhar
      for (const k of coins)
        if (k.rest && Math.abs(k.x - x) < 8 && Math.abs(k.y - y) < 8) {
          k.rest = false
          k.vy = -70
          k.vx = (c.rnd() - 0.5) * 30
          k.bounces = 2
          const col = Math.max(0, Math.min(heights.length - 1, Math.floor(k.x / COL)))
          heights[col] = Math.max(0, (heights[col] ?? 0) - 3)
          c.sfx('coin')
          field.sparkle(k.x, k.y - 6)
          break
        }
    },
    dispose() {
      dispose?.()
      root.destroy({ children: true })
    },
  }
}
