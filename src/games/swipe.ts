// Fase 2 e Desafio do Dia · Fato ou Fake: a mensagem cai como meteoro; responda antes do impacto.
// A carta é DOM (texto legível); o meteoro, o rastro de fogo e as explosões são PixiJS.
import { Container, type Sprite, type Text, type Texture } from 'pixi.js'
import { LEVEL2_IDS, STATEMENTS, type Statement } from '../content/statements'
import type { GameCtx, MicroGame } from '../engine/types'
import {
  Booms,
  clamp01,
  ENERGY,
  FIRE,
  Field,
  frameAt,
  GOLD,
  Grid,
  glowTex,
  gridTex,
  h,
  label,
  P,
  rampBurst,
  SMOKE,
  shade,
  shadowTex,
  spr,
} from './kit-a'

export interface SwipeOpts {
  statements: Statement[]
  perCard?: number
  onAnswer?: (s: Statement, correct: boolean) => void
}

/** mensagem-meteoro 32×26: balão de pedra granulada, rim light vermelho e selo "!" */
function meteorTex() {
  return gridTex('swipe-meteor2', () => {
    const m = new Grid(32, 26)
    m.rect(2, 3, 26, 16, 1)
    for (const [cx, cy, sx, sy] of [
      [2, 3, 1, 1],
      [27, 3, -1, 1],
      [2, 18, 1, -1],
      [27, 18, -1, -1],
    ] as const)
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
      ] as const)
        m.set(cx + dx * sx, cy + dy * sy, 0)
    for (let i = 0; i < 4; i++) m.rect(6, 19 + i, 5 - i, 1, 1)
    m.ellipse(26, 5, 4.6, 4.6, 2)
    const g = shade(m, {
      1: { ramp: [P.stone0, P.stone1, P.stone2, P.stone3, P.stoneHi], rim: P.redHot, grain: 0.12 },
      2: { ramp: [P.blood0, P.crimsonDeep, P.crimson, P.red, P.redGlow], rim: P.redHot },
    })
    for (const [y, x0, x1] of [
      [7, 6, 19],
      [10, 6, 23],
      [13, 6, 21],
      [16, 6, 14],
    ] as const)
      for (let x = x0; x <= x1; x++) if ((x - x0) % 6 !== 5) g.set(x, y, P.stone2)
    g.rect(26, 2, 1, 4, P.white)
    g.set(26, 7, P.white)
    // borda de baixo em brasa: é a frente que esquenta na queda
    for (let x = 4; x < 27; x++) if (g.get(x, 19, -1) !== -1 && x % 3) g.set(x, 19, P.ember)
    return g
  })
}

/** cauda de cometa 34×50 (4 quadros): núcleo branco junto ao balão, pontas vermelhas pontilhadas */
function flameTex(f: number) {
  return gridTex(`swipe-tail${f}`, () => {
    const W = 34
    const H = 50
    const g = new Grid(W, H, -1)
    const cx = (W - 1) / 2
    for (let y = 0; y < H; y++) {
      const k = y / H
      const half = 15 * (1 - k) ** 0.6 * (1 + 0.16 * Math.sin(y * 0.45 + f * 1.6))
      const shift = Math.sin(y * 0.22 + f * 1.1) * 2.5 * k
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x - cx - shift) / Math.max(0.6, half)
        if (dx > 1) continue
        const heat = (1 - dx ** 1.5) * (1 - 0.9 * k)
        const idx = Math.max(0, Math.min(FIRE.length - 1, Math.floor((1 - heat) * FIRE.length)))
        if (idx >= FIRE.length - 2 && (x + y + f) % 2) continue
        if (idx === FIRE.length - 1 && (x * 3 + y + f) % 4) continue
        g.set(x, H - 1 - y, FIRE[idx] ?? P.red)
      }
    }
    return g
  })
}

/** cratera queimada no topo da carta */
function scorchTex() {
  return gridTex('swipe-scorch', () => {
    const g = new Grid(30, 5, -1)
    for (let x = 0; x < 30; x++) {
      const d = Math.abs(x - 14.5) / 15
      const hh = Math.round((1 - d * d) * 4)
      for (let y = 0; y < hh; y++)
        g.set(x, 4 - y, y === hh - 1 ? P.emberDark : (x + y) % 3 ? P.blood0 : P.void)
    }
    return g
  })
}

export default function swipe(opts?: SwipeOpts): MicroGame {
  const statements =
    opts?.statements ??
    LEVEL2_IDS.map((id) => STATEMENTS.find((s) => s.id === id)).filter((s): s is Statement => !!s)
  const per = opts?.perCard ?? 10
  // primeira carta com folga: dá tempo de ler e aprender o gesto
  const perFor = (i: number) => (opts?.perCard === undefined && i === 0 ? per + 2 : per)

  let c: GameCtx
  const root = new Container()
  let field: Field
  let booms: Booms
  let idx = 0
  let cardT = 0
  let state: 'ask' | 'crash' | 'show' | 'done' = 'ask'
  let card: HTMLDivElement
  let stamp: HTMLDivElement
  let btns: HTMLDivElement
  let btnFake: HTMLButtonElement
  let btnFato: HTMLButtonElement
  let drag: { x0: number; dx: number; t0: number; lastX: number; lastT: number; v: number } | null = null
  let showT = 0
  let mx = 0
  let my = 0
  let startX = 0
  let targetY = 0
  let crashFrom = 0
  let crashT = 0
  let lastCount = -1
  let streak = 0
  // objetos
  let meteor: Sprite
  let flame: Sprite
  let glow: Sprite
  let aim: Sprite
  let scorch: Sprite
  let count: Text
  let flames: Texture[] = []
  const aims: Texture[] = []

  const cur = () => statements[idx]
  const anim = (el: HTMLElement, frames: Keyframe[], ms: number) => {
    if (!c.reduced) el.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.9,.3,1.3)' })
  }

  function render() {
    const s = cur()
    if (!s) return
    card.className = 'fcard px-frame'
    card.style.transform = 'translate(-50%, -50%)'
    card.replaceChildren(
      h('div', { class: 'tag' }, `Mensagem ${idx + 1} de ${statements.length}`),
      h('div', { class: 'q' }, `“${s.text}”`),
      stamp,
    )
    stamp.style.opacity = '0'
    btnFake.disabled = false
    btnFato.disabled = false
    btnFake.classList.remove('btn--gold')
    btnFato.classList.remove('btn--gold')
    cardT = 0
    lastCount = -1
    state = 'ask'
    scorch.visible = false
    const r = card.getBoundingClientRect()
    targetY = Math.round(r.top / c.css) - 2
    startX = Math.round(c.W / 2 + Math.min(40, c.W * 0.18) * (idx % 2 ? -1 : 1))
    anim(
      card,
      [
        { transform: 'translate(-50%, -46%) scale(.94)', opacity: 0 },
        { transform: 'translate(-50%, -50%)', opacity: 1 },
      ],
      260,
    )
  }

  function explode(x: number, y: number) {
    c.fx.hitstop(80)
    booms.play(x, y)
    c.fx.shake(2, 120, { x: 0, y: 1 })
    c.fx.impact(P.goldHi)
    c.fx.ring(x, y, P.goldHi, 30)
    c.fx.ring(x, y, P.white, 16)
    field.blast(x, y, 34, 80, FIRE, { add: true })
    field.blast(x, y, 12, 50, SMOKE, { grav: -10, life: 0.9 })
    rampBurst(c, x, y, GOLD, 10, 60)
    for (let i = 0; i < 3; i++) field.sparkle(x + (c.rnd() - 0.5) * 30, y + (c.rnd() - 0.5) * 16)
  }

  function impact() {
    const x = mx
    const y = targetY - 6
    c.hit(x, y)
    booms.play(x, y - 4)
    field.blast(x, y, 28, 70, FIRE, { add: true })
    field.blast(x, y, 14, 55, [P.stone3, P.stone2, P.stone1, P.stone0], { grav: 160 })
    c.fx.ring(x, y, P.redHot, 26)
    scorch.x = Math.round(x)
    scorch.y = Math.round(targetY + 1)
    scorch.visible = true
    anim(
      card,
      [
        { transform: 'translate(-50%, -50%)' },
        { transform: 'translate(calc(-50% - 7px), calc(-50% + 5px))' },
        { transform: 'translate(calc(-50% + 5px), -50%)' },
        { transform: 'translate(-50%, -50%)' },
      ],
      240,
    )
  }

  function answer(fato: boolean | null) {
    const s = cur()
    if (!s || state !== 'ask') return
    const correct = fato === s.fato
    showT = 0
    btnFake.disabled = true
    btnFato.disabled = true
    if (correct) {
      state = 'show'
      const bonus = Math.round(clamp01(1 - cardT / perFor(idx)) * 50)
      c.addScore(100 + bonus, mx, my - 14)
      c.sfx('good')
      explode(mx, my)
      streak++
      if (streak >= 2) c.fx.float(`SEQUÊNCIA ${streak}`, mx, my - 24, streak >= 4 ? P.white : P.emberBright)
      anim(
        card,
        [{ transform: 'translate(-50%, -50%) scale(1.05)' }, { transform: 'translate(-50%, -50%) scale(1)' }],
        220,
      )
    } else {
      // o meteoro termina a queda (180 ms) e só então bate
      state = 'crash'
      streak = 0
      crashFrom = my
      crashT = 0
    }
    opts?.onAnswer?.(s, correct)
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
    // a carta de explicação é mais alta: o meteoro mira a nova borda de cima
    targetY = Math.round(card.getBoundingClientRect().top / c.css) - 2
  }

  function next() {
    if (state === 'crash') return
    idx++
    if (idx >= statements.length) {
      state = 'done'
      card.remove()
      btns.remove()
      root.visible = false
      c.finish()
      return
    }
    render()
  }

  function lean(dx: number) {
    const k = clamp01(Math.abs(dx) / 60)
    stamp.textContent = dx > 0 ? 'FATO' : 'FAKE'
    stamp.style.color = dx > 0 ? 'var(--leaf)' : 'var(--red-hot)'
    stamp.style.left = dx > 0 ? '14px' : ''
    stamp.style.right = dx > 0 ? '' : '14px'
    stamp.style.opacity = String(Math.round(k * 10) / 10)
  }

  return {
    duration: 0,
    goal: statements.length * 130,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      field = new Field(c)
      booms = new Booms(3)
      flames = [0, 1, 2, 3].map(flameTex)
      for (let w = 6; w <= 34; w += 4) aims.push(shadowTex(w))
      scorch = spr(scorchTex(), 0, 0, 0.5, 1)
      scorch.visible = false
      aim = spr(aims[0] as Texture, 0, 0)
      glow = spr(glowTex(15, [P.white, P.sparkle, P.redGlow, P.redHot, P.red, P.crimson]), 0, 0)
      glow.blendMode = 'add'
      glow.alpha = 0.6
      flame = spr(flames[0] as Texture, 0, 0, 0.5, 1)
      meteor = spr(meteorTex(), 0, 0)
      count = label('', P.gold)
      root.addChild(scorch, aim, glow, flame, meteor, booms.root, field.root, count)

      card = h('div', { class: 'fcard px-frame', role: 'group', 'aria-live': 'polite' })
      stamp = h('div', {
        'aria-hidden': 'true',
        style:
          'position:absolute;top:10px;font-family:var(--f-hud);font-size:16px;letter-spacing:.1em;opacity:0;pointer-events:none',
      })
      btnFake = h('button', { class: 'btn btn--red', onclick: () => answer(false) }, '← Fake')
      btnFato = h('button', { class: 'btn', onclick: () => answer(true) }, 'Fato →')
      btnFato.style.background = '#1c5230'
      btns = h('div', { class: 'swipe-btns' }, btnFake, btnFato)
      c.layer.append(card, btns)
      card.addEventListener('pointerdown', (e) => {
        if (state === 'show') {
          next()
          return
        }
        if (state !== 'ask') return
        const now = performance.now()
        drag = { x0: e.clientX, dx: 0, t0: now, lastX: e.clientX, lastT: now, v: 0 }
        card.setPointerCapture(e.pointerId)
        field.pointer(e.clientX / c.css, e.clientY / c.css, true)
      })
      card.addEventListener('pointermove', (e) => {
        field.pointer(e.clientX / c.css, e.clientY / c.css)
        if (!drag || state !== 'ask') return
        const now = performance.now()
        drag.dx = e.clientX - drag.x0
        drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT)
        drag.lastX = e.clientX
        drag.lastT = now
        card.style.transform = `translate(calc(-50% + ${drag.dx}px), -50%) rotate(${drag.dx / 22}deg)`
        lean(drag.dx)
      })
      const release = () => {
        if (!drag) return
        const { dx, v } = drag
        drag = null
        // perdão de entrada: 60 px de arrasto, ou um peteleco rápido de 30 px
        if (Math.abs(dx) > 60 || (Math.abs(dx) > 30 && Math.abs(v) > 0.5 && Math.sign(v) === Math.sign(dx))) {
          c.sfx('swipe')
          answer(dx > 0)
        } else {
          card.style.transform = 'translate(-50%, -50%)'
          stamp.style.opacity = '0'
        }
      }
      card.addEventListener('pointerup', release)
      card.addEventListener('pointercancel', release)
      requestAnimationFrame(render)
    },
    update(dt) {
      const limit = perFor(idx)
      if (state === 'ask') {
        cardT += dt
        // 100 ms de tolerância depois de o meteoro encostar na carta
        if (cardT >= limit + 0.1) {
          answer(null)
        }
      } else if (state === 'show') {
        showT += dt
        if (showT > 4.5) next()
      }
      const k = clamp01(cardT / limit)
      const top = c.top + 16
      if (state === 'ask') {
        mx = startX + (c.W / 2 - startX) * k
        my = top + (targetY - 14 - top) * k ** 1.6
      } else if (state === 'crash') {
        crashT += dt
        const q = clamp01(crashT / 0.18)
        my = crashFrom + (targetY - 14 - crashFrom) * q * q
        mx += (c.W / 2 - mx) * q
        if (q >= 1) {
          state = 'show'
          impact()
        }
      }
      const flying = state === 'ask' || state === 'crash'
      meteor.visible = flame.visible = glow.visible = count.visible = aim.visible = flying
      if (flying) {
        const urgent = limit - cardT < 3
        const wob = c.reduced ? 0 : Math.round(Math.sin(c.time * 23) * 0.6)
        meteor.x = Math.round(mx) + wob
        meteor.y = Math.round(my)
        flame.texture = flames[frameAt(c.time, 14, 4)] as Texture
        flame.x = meteor.x
        flame.y = meteor.y + 6
        glow.x = meteor.x
        glow.y = meteor.y + 8
        glow.alpha = urgent && frameAt(c.time, 8, 2) ? 0.7 : 0.55
        // rastro: brasas largadas atrás, sobem e esfriam
        const n = c.reduced ? 1 : 3
        for (let i = 0; i < n; i++)
          field.spawn(mx + (c.rnd() - 0.5) * 24, my - 10 - c.rnd() * 20, {
            vx: (c.rnd() - 0.5) * 10 + (startX - c.W / 2) * 0.15,
            vy: -18 - c.rnd() * 22,
            life: 0.35 + c.rnd() * 0.45,
            ramp: c.rnd() < 0.3 ? ENERGY : FIRE,
            wob: 6,
            size: c.rnd() < 0.3 ? 2 : 1,
            add: true,
          })
        // alvo de impacto: a sombra cresce e pisca nos 3 segundos finais
        const ai = Math.min(aims.length - 1, Math.floor(k * aims.length))
        aim.texture = aims[ai] as Texture
        aim.x = Math.round(c.W / 2)
        aim.y = targetY
        aim.tint = urgent && frameAt(c.time, 6, 2) ? P.red : 0xffffff
        const left = Math.max(0, Math.ceil(limit - cardT))
        if (left !== lastCount) {
          lastCount = left
          count.text = String(left)
          count.style.fill = left <= 3 ? P.redHot : P.gold
          if (left <= 3 && left > 0 && state === 'ask') c.sfx('tick')
        }
        count.x = meteor.x + 24
        count.y = meteor.y - 10
      }
      if (scorch.visible && c.rnd() < 0.3) field.ember(scorch.x + (c.rnd() - 0.5) * 24, scorch.y - 3)
      if (c.rnd() < 0.05) field.ember(c.rnd() * c.W, c.bottom, FIRE)
      field.update(dt)
      booms.update(dt)
    },
    move(x, y) {
      field.pointer(x, y)
    },
    down(x, y) {
      field.pointer(x, y, true)
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
    dispose() {
      card?.remove()
      btns?.remove()
      root.destroy({ children: true })
    },
  }
}
