// Fase 3 · Seu Imposto: a conta da isenção com o salário da pessoa, e uma chuva de moedas.
// Calculadora em DOM (legível e acessível); moedas, brilho e pilha no chão em PixiJS.
import { Container, Sprite, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { anchors } from '../scene/levels/l03'
import { getSave } from '../state/save'
import { Driver, domHand, Flyers, step8 } from './fx-a'
import {
  coinFrames,
  Field,
  fmtBRL,
  frameAt,
  GOLD,
  Grid,
  glowTex,
  gridTex,
  h,
  P,
  popScale,
  rampBurst,
  setSquash,
  shade,
  shadowTex,
  spr,
} from './kit-a'

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

/**
 * Cofrinho 34×26 em três quartos (o herói da fase): corpo de porcelana vermelho-coral com luz de cima
 * à esquerda, lateral do focinho em sombra, fenda com moeda, rim vermelho, olho com brilho.
 * Quadros: 0 = respira, 1 = respira (1 px mais alto), 2 = pisca, 3 = feliz (olhos ^ e boca aberta).
 */
function piggyTex(f: number) {
  return gridTex(`ir-piggy${f}`, () => {
    const m = new Grid(34, 26)
    const up = f === 1 ? 1 : 0
    m.ellipse(14, 14 - up, 11.5, 8.2 + up * 0.4, 1)
    m.ellipse(24, 12 - up, 6.5, 6.4, 1)
    // orelha (triângulo) e focinho (cilindro em três quartos: frente clara, lateral escura)
    for (let i = 0; i < 4; i++) m.rect(20 + (i >> 1), 3 + i - up, 4 - i, 1, 1)
    m.ellipse(30, 13 - up, 2.6, 3, 2)
    m.ellipse(31, 13 - up, 1.8, 2.4, 3)
    // pernas: as de trás mais escuras (material 4)
    for (const [x, mat] of [
      [6, 4],
      [10, 1],
      [17, 4],
      [21, 1],
    ] as const)
      m.rect(x, 20 - up, 3, 4 + up, mat)
    const g = shade(m, {
      1: { ramp: [P.blood0, P.crimsonDeep, P.crimson, P.red, P.redGlow], rim: P.redHot, grain: 0.04 },
      2: { ramp: [P.blood1, P.crimsonDeep, P.crimson, P.crimson], outline: P.blood0 },
      3: { ramp: [P.crimsonDeep, P.red, P.redGlow, P.redGlow], outline: null },
      4: { ramp: [P.blood0, P.blood1, P.crimsonDeep, P.crimsonDeep] },
    })
    // brilho de porcelana (2 px) e highlight no lombo
    g.set(9, 8 - up, P.sparkle)
    g.set(10, 8 - up, P.white)
    g.rect(7, 9 - up, 5, 1, P.redGlow)
    // fenda com moeda dourada aparecendo
    g.rect(12, 6 - up, 6, 1, P.blood0)
    if (f === 3) {
      g.rect(13, 4 - up, 4, 2, P.gold)
      g.set(13, 4 - up, P.goldHi)
    }
    // narinas
    g.set(31, 12 - up, P.blood0)
    g.set(31, 14 - up, P.blood0)
    // olho
    if (f === 2) g.rect(24, 10 - up, 3, 1, P.blood0)
    else if (f === 3) {
      g.set(24, 10 - up, P.blood0)
      g.set(25, 9 - up, P.blood0)
      g.set(26, 10 - up, P.blood0)
      // boca aberta e bochecha corada
      g.rect(27, 17 - up, 3, 2, P.blood0)
      g.set(28, 17 - up, P.redGlow)
      g.set(22, 14 - up, P.redGlow)
    } else {
      g.rect(24, 9 - up, 2, 2, P.blood0)
      g.set(24, 9 - up, P.white)
      g.set(28, 17 - up, P.blood0)
    }
    // rabinho enrolado
    for (const [x, y] of [
      [2, 12],
      [1, 11],
      [1, 10],
      [2, 9],
      [3, 10],
    ] as const)
      g.set(x, y - up, P.crimson)
    return g
  })
}

/** pilha de moedas empilhada (decoração do chão): 3 alturas */
function stackTex(n: number) {
  return gridTex(`ir-stack${n}`, () => {
    const m = new Grid(12, 4 + n * 3)
    for (let i = 0; i < n; i++) m.ellipse(5.5, 2 + (n - 1 - i) * 3 + 1, 5.4, 2, 1)
    const g = shade(m, { 1: { ramp: [P.gold0, P.gold1, P.gold, P.goldHi, P.sparkle], rim: P.redHot } })
    for (let i = 0; i < n; i++) g.rect(1, 3 + i * 3, 10, 1, P.gold1)
    g.set(3, 1, P.white)
    return g
  })
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
  // herói: o cofrinho e as pilhas de moedas
  let pig: Sprite
  let pigF: Texture[] = []
  let pigX = 0
  let pigY = 0
  let happyT = -9
  let hopT = -9
  let fed = 0
  let flyers: Flyers
  let driver: Driver | null = null
  let ended = false
  let finT = 0
  const lampGlows: Sprite[] = []

  /** cofrinho: respira a 4 fps, pisca a cada ~3 s, fica feliz e pula quando recebe moeda */
  function stepPig(now: number) {
    const happy = now - happyT < 0.35
    let f = Math.floor(now * 4) % 2
    if (now % 3.1 < 0.12) f = 2
    if (happy) f = 3
    pig.texture = pigF[f] as Texture
    const [sx, sy] = popScale(now - happyT)
    const hop = now - hopT
    const jump = hop >= 0 && hop < 0.3 ? Math.round(Math.sin((hop / 0.3) * Math.PI) * 6) : 0
    setSquash(pig, step8(sx), step8(sy))
    pig.y = pigY - jump
  }

  function feedPig(x: number) {
    fed++
    happyT = performance.now() / 1000
    c.sfx('coin', { x, combo: Math.min(12, fed), volume: 0.55 })
    field.blast(pigX, pigY - 20, 6, 30, GOLD, { add: true, life: 0.35 })
    if (fed % 3 === 1) field.sparkle(pigX - 2, pigY - 24)
  }

  function finale() {
    ended = true
    finT = 0
    hopT = performance.now() / 1000
    happyT = hopT
    field.blast(pigX, pigY - 12, 30, 80, GOLD, { add: true })
    field.blast(pigX, pigY - 12, 16, 60, [P.redGlow, P.red, P.crimson], { grav: 120 })
    c.fx.ring(pigX, pigY - 12, P.goldHi, 46)
    c.fx.ring(pigX, pigY - 12, P.white, 20)
    for (let i = 0; i < 5; i++) field.sparkle(pigX + (c.rnd() - 0.5) * 50, pigY - 10 - c.rnd() * 40)
  }

  function live(dt: number) {
    const now = performance.now() / 1000
    flyers.update(dt)
    stepPig(now)
    for (let i = 0; i < lampGlows.length; i++) {
      const g = lampGlows[i] as Sprite
      g.alpha = c.reduced ? 0.4 : frameAt(now + i * 0.37, 5, 4) === 1 ? 0.55 : 0.4
    }
    if (ended) {
      finT += dt
      field.update(dt * (finT < 0.3 ? 0.3 : 1))
    }
  }

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
      // cenário vivo: os lampiões da ladeira tremulam
      for (const l of anchors(c.W, c.H).lamps) {
        const g = spr(glowTex(5, GOLD), l.x, l.y - 1)
        g.blendMode = 'add'
        g.alpha = 0.4
        lampGlows.push(g)
        root.addChild(g)
      }
      // o cofrinho no chão, embaixo da calculadora, com sombra de contato e pilhas de moedas
      pigF = [0, 1, 2, 3].map(piggyTex)
      pigX = Math.round(c.W / 2)
      pigY = c.bottom - 5
      root.addChild(spr(shadowTex(30), pigX - 1, pigY))
      for (const [dx, n] of [
        [-30, 2],
        [-20, 3],
        [24, 1],
      ] as const)
        root.addChild(spr(stackTex(n), pigX + dx, pigY + 1, 0.5, 1))
      pig = spr(pigF[0] as Texture, pigX, pigY, 0.5, 1)
      root.addChild(pig)
      root.addChild(glow, field.root)
      flyers = new Flyers(c, 24)
      flyers.trail = (x, y) => field.spawn(x, y, { life: 0.22, ramp: GOLD, add: true })
      flyers.onArrive = (x, y, n) => {
        if (n % 3 === 0) c.sfx('coin', { x, combo: Math.min(12, n), volume: 0.4 })
        if (c.rnd() < 0.4) field.sparkle(x, y + 4)
      }
      root.addChild(flyers.root)
      driver = new Driver(live)
      driver.start()
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
      // contador sobe com ease-out em 400 ms (regra 33). Ao zerar (acima de R$ 7.350) o número
      // vai direto para R$ 0,00: contar para baixo deixava valores intermediários (ex.: R$ 48,25
      // por ano) na tela ao lado de "não há redução". Um timer garante o valor final mesmo se o
      // navegador segurar os quadros (aba em segundo plano, aparelho lento).
      let settle = 0
      const countTo = (to: number) => {
        cancelAnimationFrame(tween)
        clearTimeout(settle)
        const done = () => {
          shownAno = to
          big.textContent = `${fmtBRL(to)} por ano`
        }
        if (to === 0 || c.reduced) {
          done()
          return
        }
        const from = shownAno
        const t0 = performance.now()
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / 400)
          shownAno = from + (to - from) * (1 - (1 - k) ** 3)
          big.textContent = `${fmtBRL(shownAno)} por ano`
          if (k < 1) tween = requestAnimationFrame(step)
        }
        step()
        settle = window.setTimeout(done, 450)
      }
      const update = () => {
        const e = economiaIR(val)
        // mês e ano saem do mesmo valor em centavos: ano = mês arredondado × 13 (12 salários + 13º).
        // Sem isso, em R$ 7.350 a redução de R$ 0,004/mês aparecia como R$ 0,00 por mês e R$ 0,06 por ano.
        const mes = Math.round(e.mes * 100) / 100
        const ano = Math.round(mes * 13 * 100) / 100
        salary.textContent = fmtBRL(val, 0)
        countTo(ano)
        lines.replaceChildren(
          h('div', { class: 'line' }, h('span', null, 'IR por mês antes'), h('b', null, fmtBRL(e.antes))),
          h('div', { class: 'line' }, h('span', null, 'IR por mês em 2026'), h('b', null, fmtBRL(e.agora))),
          h(
            'div',
            { class: 'line' },
            h('span', null, 'Fica no seu bolso por mês'),
            h('b', { style: 'color:var(--leaf)' }, fmtBRL(mes)),
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
        // o cofrinho fareja cada mudança de salário (pulo curto, sem repetir em rajada)
        const now = performance.now() / 1000
        if (now - hopT > 0.35) hopT = now
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
            c.sfx('confirm')
            c.sfx('coin', { x: burstAt.x })
            const r = confirm.getBoundingClientRect()
            burstAt = { x: (r.left + r.width / 2) / c.css, y: (r.top + r.height / 2) / c.css }
            c.fx.ring(burstAt.x, burstAt.y, P.goldHi, 34)
            c.fx.ring(burstAt.x, burstAt.y, P.white, 18)
            c.fx.flash(P.gold, 140, 0.18)
            rampBurst(c, burstAt.x, burstAt.y, GOLD, 18, 70)
            // recompensa que viaja: moedas saem do botão até o placar
            flyers.retarget()
            flyers.send(burstAt.x, burstAt.y, frames, 12, 18)
            hopT = performance.now() / 1000
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
      // demonstração: a mão arrasta o salário para os dois lados; some no primeiro toque no painel
      let hand: HTMLImageElement | null = null
      const hideHand = () => {
        hand?.getAnimations().forEach((a) => {
          a.cancel()
        })
        hand?.remove()
        hand = null
      }
      if (!c.reduced)
        window.setTimeout(() => {
          if (!panel.isConnected || raining) return
          const rr = range.getBoundingClientRect()
          const lr = c.layer.getBoundingClientRect()
          hand = domHand(c)
          const x0 = rr.left - lr.left + rr.width * ((val - 1500) / 10500)
          hand.style.left = `${Math.round(x0)}px`
          hand.style.top = `${Math.round(rr.top - lr.top + rr.height * 0.5)}px`
          c.layer.append(hand)
          const d = Math.min(60, rr.width * 0.3)
          const a = hand.animate(
            [
              { transform: 'translate(0,0)', opacity: 0 },
              { transform: 'translate(0,0)', opacity: 1, offset: 0.15 },
              { transform: `translate(${d}px,0)`, opacity: 1, offset: 0.5 },
              { transform: `translate(${-d * 0.5}px,0)`, opacity: 1, offset: 0.85 },
              { transform: `translate(${-d * 0.5}px,0)`, opacity: 0 },
            ],
            { duration: 1600, iterations: 2, easing: 'ease-in-out' },
          )
          a.onfinish = hideHand
        }, 350)
      panel.addEventListener('pointerdown', hideHand)
      update()
      dispose = () => {
        hideHand()
        clearTimeout(settle)
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
          if (rainLeft % 4 === 0) c.sfx('coin', { x: c.rnd() * c.W, combo: 8 - (rainLeft % 8), volume: 0.6 })
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
        // moeda que cai em cima do cofrinho entra pela fenda (ele sorri)
        if (!k.rest && k.vy > 0 && Math.abs(k.x - pigX) < 9 && k.y > pigY - 26 && k.y < pigY - 14) {
          k.rest = true
          k.s.visible = false
          feedPig(k.x)
          continue
        }
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
        finale()
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
        if (k.rest && Math.abs(k.x - x) < 11 && Math.abs(k.y - y) < 11) {
          k.rest = false
          k.vy = -70
          k.vx = (c.rnd() - 0.5) * 30
          k.bounces = 2
          const col = Math.max(0, Math.min(heights.length - 1, Math.floor(k.x / COL)))
          heights[col] = Math.max(0, (heights[col] ?? 0) - 3)
          c.sfx('coin', { x: k.x, pitch: 5 })
          field.sparkle(k.x, k.y - 6)
          break
        }
    },
    dispose() {
      driver?.stop()
      dispose?.()
      root.destroy({ children: true })
    },
  }
}
