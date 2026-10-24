// Fase 8 · O Julgamento: monte a linha do tempo da trama golpista, do mais antigo ao mais recente.
// Cartas e trilho em DOM (.timeline-slots/.tl-card); em Pixi, a bancada do STF com o martelo do juiz,
// que bate a cada acerto (antecipação, smear, quadro de impacto sob hit-stop, onda de choque).
import { Container, Graphics, Sprite } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { shuffle } from '../lib/rng'
import {
  bake,
  bakeRotated,
  Debris,
  domRect,
  Embers,
  el,
  energyDot,
  flash,
  goldPulse,
  hintPulse,
  P,
  Sparkles,
  shakeEl,
  stop,
  Timers,
  tactile,
} from './kit-b'

// Textos factuais (revisados): mesmos do jogo legado. Fontes em src/content/facts.ts, ids
// 'oitodejaneiro' e 'julgamento' (Itatiaia 11/09/2025, Bloomberg Línea 11/09/2025).
const EVENTS = [
  { date: '30/10/2022', text: 'Lula vence a eleição no 2º turno' },
  { date: '08/01/2023', text: 'Golpistas invadem as sedes dos Três Poderes' },
  { date: 'jan/2023', text: 'PF acha a "minuta do golpe" na casa de Anderson Torres' },
  { date: '18/02/2025', text: 'PGR denuncia Bolsonaro e mais 33 pela trama golpista' },
  { date: '11/09/2025', text: 'STF condena Bolsonaro a 27 anos e 3 meses' },
  { date: 'nov/2025', text: 'Bolsonaro é preso para cumprir a pena' },
]

// ângulos pré-renderizados do martelo (positivo = levantado)
const A_IMPACT = 0
const A_REST = 0.2
const A_MID = 0.55
const A_UP = 1.0
const A_BOUNCE = 0.34

function gavelTex() {
  // pivô (mão) no centro da textura; cabeça à esquerda
  return bake('gavel', 48, 48, (p) => {
    const cy = 24
    // cabo: madeira escura com luz em cima
    p.rect(9, cy - 1, 16, 3, P.emberDark)
    p.rect(9, cy - 1, 16, 1, P.gold1)
    p.rect(9, cy + 1, 16, 1, P.gold0)
    p.rect(22, cy - 1, 3, 3, P.gold0)
    // cabeça
    p.rect(1, cy - 6, 9, 13, P.emberDark)
    p.rect(1, cy - 6, 2, 13, P.gold1)
    p.rect(8, cy - 6, 2, 13, P.gold0)
    p.rect(1, cy - 6, 9, 1, P.gold1)
    // anéis dourados
    p.rect(1, cy - 4, 9, 1, P.gold)
    p.rect(1, cy + 4, 9, 1, P.gold)
    p.dot(2, cy - 4, P.goldHi)
    p.dot(2, cy + 4, P.goldHi)
    p.outline(P.void, P.blood0)
    p.rim(P.redHot, 'r')
  })
}

function benchTex(w: number) {
  const h = 26
  return bake(`bench${w}`, w, h, (p) => {
    // tampo
    p.rect(0, 0, w, 4, P.emberDark)
    p.rect(0, 0, w, 1, P.gold1)
    p.rect(0, 3, w, 1, P.gold0)
    // frente com painéis rebaixados
    p.rect(2, 4, w - 4, h - 4, P.blood1)
    const n = 3
    const pw = Math.floor((w - 8 - (n - 1) * 3) / n)
    for (let i = 0; i < n; i++) {
      const x = 4 + i * (pw + 3)
      p.rect(x, 7, pw, h - 10, P.emberDark)
      p.rect(x, 7, pw, 1, P.gold0)
      p.rect(x, 7, 1, h - 10, P.gold0)
      p.rect(x + pw - 1, 8, 1, h - 11, P.gold1)
      p.rect(x + 1, h - 4, pw - 1, 1, P.gold1)
    }
    // emblema: balança no painel do meio
    const cx = Math.floor(w / 2)
    p.rect(cx, 9, 1, 9, P.gold)
    p.rect(cx - 5, 10, 11, 1, P.gold)
    p.rect(cx - 6, 12, 3, 1, P.gold1)
    p.rect(cx + 4, 12, 3, 1, P.gold1)
    p.rect(cx - 6, 11, 1, 1, P.gold)
    p.rect(cx + 6, 11, 1, 1, P.gold)
    p.rect(cx - 2, 18, 5, 1, P.gold1)
    p.dot(cx, 9, P.goldHi)
    p.outline(P.void, P.stone0)
    p.rim(P.redHot, 'r')
  })
}

/** Palácio do STF (Niemeyer): laje fina sobre pilares curvos, em silhueta de névoa */
function stfTex(w: number) {
  const h = 34
  return bake(`stf${w}`, w, h, (p) => {
    p.rect(0, 4, w, 3, P.hazeDark)
    p.rect(0, 4, w, 1, P.stone1)
    p.rect(2, 7, w - 4, h - 7, P.night)
    // pilares em "V" curvos
    const step = 11
    for (let x = 4; x < w - 4; x += step) {
      for (let y = 7; y < h; y++) {
        const k = (y - 7) / (h - 7)
        const off = Math.round(Math.sin(k * Math.PI) * 3)
        p.dot(x + off, y, P.haze)
        p.dot(x + 1 + off, y, P.hazeDark)
      }
    }
    // vidros com algumas luzes
    for (let i = 0; i < w / 6; i++) {
      const x = 4 + ((i * 37) % (w - 8))
      const y = 12 + ((i * 13) % (h - 16))
      p.dot(x, y, i % 3 ? P.gold0 : P.gold1)
    }
    // mastro com bandeira escura
    p.rect(w - 10, 0, 1, 5, P.stone1)
    p.outline(P.void)
    p.rim(P.crimson, 't')
  })
}

export default function linha(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const timers = new Timers()
  let embers: Embers
  let sparkles: Sparkles
  const debris = new Debris(60)
  let next = 0
  let mistakes = 0
  let slots: HTMLDivElement[] = []
  let cards: HTMLButtonElement[] = []
  let rail: HTMLDivElement
  let grid: HTMLDivElement
  let done = false

  // cena
  const gavel = new Sprite()
  const frames = new Map<number, ReturnType<typeof bakeRotated>>()
  const smear = new Graphics()
  const lamps = new Graphics()
  const scaleG = new Graphics()
  const scaleGlow = new Graphics()
  const glow = new Graphics()
  let pivotX = 0
  let pivotY = 0
  let blockX = 0
  let blockY = 0
  let lampY = 0
  let lampX0 = 0
  let strikeT = -10
  let impacted = true
  let wobbleT = -10
  let lampFlash = -10
  let lampBad = -10
  // balança da justiça: começa pendendo para o lado dos boatos e se equilibra a cada fato no lugar
  let tilt = 0.34
  let tiltV = 0
  let scX = 0
  let scY = 0
  let scL = 40
  let scOn = false

  const frame = (a: number) => frames.get(a)

  function setGavel(a: number) {
    const t = frame(a)
    if (t && gavel.texture !== t) gavel.texture = t
  }

  function strike() {
    strikeT = c.time
    impacted = false
  }

  function impact() {
    impacted = true
    c.sfx('boom')
    stop(c, 90)
    c.fx.shake(2, 160)
    c.fx.ring(blockX, blockY, P.goldHi, 30)
    c.fx.ring(blockX, blockY, P.redHot, 16)
    c.fx.burst(blockX, blockY - 2, P.goldHi, 8, 60)
    debris.burst(blockX, blockY - 2, [P.gold1, P.emberDark, P.gold0], 8, 70, c.rnd, blockY + 4, 1.1)
    embers.blast(blockX, blockY, 160, 70)
    sparkles.spawn(blockX - 8, blockY - 10, 10)
    sparkles.spawn(blockX + 9, blockY - 6, 0)
    lampFlash = c.time
  }

  function pick(i: number, btn: HTMLButtonElement) {
    if (done || btn.disabled) return
    if (i === next) {
      const ev = EVENTS[i]
      const slot = slots[i]
      if (ev && slot) {
        slot.className = 'slot filled'
        slot.textContent = ev.date
        slot.setAttribute('aria-label', `${ev.date}: ${ev.text}`)
        slot.style.outline = ''
        goldPulse(slot, 'var(--red)')
      }
      btn.disabled = true
      btn.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.06)', opacity: 1, offset: 0.3 },
          { transform: 'scale(0.6)', opacity: 0 },
        ],
        { duration: 200, easing: 'steps(4, end)', fill: 'forwards' },
      ).onfinish = () => btn.classList.add('used')
      next++
      const pts = Math.max(60, 160 - mistakes * 10)
      c.addScore(pts, blockX, blockY - 22)
      c.sfx('good')
      strike()
      tiltV -= 0.6
      markNext()
      if (next >= EVENTS.length) {
        done = true
        // três batidas finais e a bancada inteira acende
        timers.after(0.38, strike)
        timers.after(0.76, () => {
          strike()
          c.sfx('level')
        })
        timers.after(0.95, () => {
          flash(c, P.goldHi, 160, 0.22)
          c.fx.ring(blockX, blockY, P.gold, 70)
          for (let k = 0; k < 6; k++)
            sparkles.spawn(blockX + (c.rnd() - 0.5) * 80, blockY - 10 - c.rnd() * 30, 8)
          c.fx.float('ORDEM CERTA', Math.round(c.W / 2), blockY - 34, P.goldHi)
        })
        timers.after(1.7, () => c.finish())
      }
    } else {
      mistakes++
      btn.classList.remove('bad')
      void btn.offsetWidth
      btn.classList.add('bad')
      timers.after(0.45, () => btn.classList.remove('bad'))
      tiltV += 1.6
      shakeEl(btn)
      wobbleT = c.time
      lampBad = c.time
      c.hit(blockX, blockY - 10)
    }
  }

  function markNext() {
    for (const [k, s] of slots.entries()) {
      if (k === next && !done) {
        s.style.outline = `2px solid #${P.gold.toString(16)}`
        s.style.outlineOffset = '2px'
      } else s.style.outline = ''
    }
  }

  function layoutScene() {
    const g = domRect(c, grid)
    const a1 = c.bottom - 2
    const benchW = Math.min(c.W < 200 ? 96 : 124, c.W - 24)
    const cx = Math.round(c.W / 2)
    const benchTop = Math.round(Math.max(g.y + g.h + 20, a1 - 26))
    const stfW = Math.min(c.W - 8, 176)
    const stf = new Sprite(stfTex(stfW))
    stf.x = Math.round(cx - stfW / 2)
    stf.y = benchTop - 22
    stf.alpha = 0.9
    const bench = new Sprite(benchTex(benchW))
    bench.x = Math.round(cx - benchW / 2)
    bench.y = benchTop
    // bloco de som
    const block = new Sprite(
      bake('soundblock', 16, 6, (p) => {
        p.rect(1, 0, 14, 2, P.emberDark)
        p.rect(2, 0, 11, 1, P.gold1)
        p.rect(0, 2, 16, 4, P.gold0)
        p.rect(0, 2, 16, 1, P.gold1)
        p.outline(P.void)
      }),
    )
    blockX = cx - 8
    blockY = benchTop - 5
    block.x = blockX - 9
    block.y = blockY - 1
    pivotX = blockX + 20
    pivotY = blockY - 7
    gavel.anchor.set(0.5)
    gavel.x = pivotX
    gavel.y = pivotY
    lampY = benchTop + 7
    lampX0 = Math.round(cx - (6 * 6 - 1) / 2)
    // sombra sob a bancada
    const shadow = new Graphics()
    shadow.rect(bench.x - 4, benchTop + 26, benchW + 8, 1).fill({ color: P.void, alpha: 0.8 })
    shadow.rect(bench.x - 2, benchTop + 27, benchW + 4, 1).fill({ color: P.void, alpha: 0.5 })
    // a balança ocupa o vão entre as cartas e a bancada, se couber
    const free = benchTop - 26 - (g.y + g.h)
    scOn = free > 44
    scL = Math.round(Math.min(56, c.W * 0.32))
    scX = cx
    scY = Math.round(g.y + g.h + Math.max(12, (free - 30) / 2))
    scaleGlow.blendMode = 'add'
    root.addChild(stf, shadow, scaleG, scaleGlow, bench, block, glow, lamps, gavel, smear)
  }

  function drawScale(dt: number) {
    scaleG.clear()
    scaleGlow.clear()
    if (!scOn) return
    // mola com overshoot rumo ao alvo (6 fatos = nivelada)
    const target = ((EVENTS.length - next) / EVENTS.length) * 0.34
    tiltV += (target - tilt) * 40 * dt
    tiltV *= 1 - 6 * dt
    tilt += tiltV * dt
    const ca = Math.cos(tilt)
    const sa = Math.sin(tilt)
    const x0 = Math.round(scX - ca * scL)
    const y0 = Math.round(scY - sa * scL)
    const x1 = Math.round(scX + ca * scL)
    const y1 = Math.round(scY + sa * scL)
    const g = scaleG
    // coluna e base
    g.rect(scX - 2, scY, 4, 30).fill(P.void)
    g.rect(scX - 1, scY, 2, 30).fill(P.stone2)
    g.rect(scX - 1, scY, 1, 30).fill(P.stone3)
    g.rect(scX - 9, scY + 29, 19, 4).fill(P.void)
    g.rect(scX - 8, scY + 30, 17, 2).fill(P.stone2)
    g.rect(scX - 8, scY + 30, 17, 1).fill(P.stoneHi)
    // travessão rasterizado (sem antialias)
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n)
      const y = Math.round(y0 + ((y1 - y0) * i) / n)
      g.rect(x, y - 1, 1, 4)
    }
    g.fill(P.void)
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n)
      const y = Math.round(y0 + ((y1 - y0) * i) / n)
      g.rect(x, y, 1, 1)
    }
    g.fill(P.goldHi)
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n)
      const y = Math.round(y0 + ((y1 - y0) * i) / n)
      g.rect(x, y + 1, 1, 1)
    }
    g.fill(P.gold1)
    // correntes e pratos
    const pan = (px: number, py: number, fakes: number, facts: number) => {
      for (let k = 2; k < 16; k += 2)
        g.rect(px - 5 + Math.floor(k / 4), py + k, 1, 1).rect(px + 5 - Math.floor(k / 4), py + k, 1, 1)
      g.fill(P.gold1)
      const by = py + 16
      g.rect(px - 8, by, 17, 4).fill(P.void)
      g.rect(px - 7, by + 1, 15, 2).fill(P.gold1)
      g.rect(px - 7, by + 1, 15, 1).fill(P.gold)
      g.rect(px - 5, by + 3, 11, 1).fill(P.gold0)
      // carga: barras de ouro (fatos) ou papéis de boato
      for (let k = 0; k < facts; k++) {
        const x = px - 6 + (k % 3) * 5
        const y = by - 2 - Math.floor(k / 3) * 2
        g.rect(x, y, 4, 2).fill(P.gold)
        g.rect(x, y, 4, 1).fill(P.goldHi)
      }
      for (let k = 0; k < fakes; k++) {
        const x = px - 6 + (k % 3) * 5
        const y = by - 3 - Math.floor(k / 3) * 3
        g.rect(x, y, 4, 3).fill(P.stone3)
        g.rect(x, y, 4, 1).fill(P.red)
      }
    }
    pan(x0, y0, 0, next)
    pan(x1, y1, EVENTS.length - next, 0)
    energyDot(scaleGlow, scX, scY, P.white, P.goldHi, P.gold1)
    if (done) {
      const on = Math.floor(c.time * 8) % 2 === 0
      for (let i = 0; i <= n; i += 2) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n)
        const y = Math.round(y0 + ((y1 - y0) * i) / n)
        if (on) scaleGlow.rect(x, y - 2, 1, 1).fill({ color: P.gold, alpha: 0.5 })
      }
    }
  }

  function drawLamps() {
    lamps.clear()
    glow.clear()
    const t = c.time
    for (let i = 0; i < EVENTS.length; i++) {
      const x = lampX0 + i * 6
      const on = i < next
      const isNext = i === next && !done
      const bad = isNext && t - lampBad < 0.4 && Math.floor((t - lampBad) * 12) % 2 === 0
      const fresh = i === next - 1 && t - lampFlash < 0.25
      lamps.rect(x - 1, lampY - 1, 6, 5).fill(P.void)
      if (on) {
        lamps.rect(x, lampY, 4, 3).fill(fresh ? P.white : P.gold)
        lamps.rect(x, lampY, 2, 1).fill(P.goldHi)
        glow.rect(x - 1, lampY - 2, 6, 1).fill({ color: P.gold, alpha: 0.35 })
        glow.rect(x - 2, lampY, 1, 3).fill({ color: P.gold, alpha: 0.25 })
        glow.rect(x + 5, lampY, 1, 3).fill({ color: P.gold, alpha: 0.25 })
      } else if (bad) {
        lamps.rect(x, lampY, 4, 3).fill(P.redHot)
      } else {
        const blink = isNext && Math.floor(t * 3) % 2 === 0
        lamps.rect(x, lampY, 4, 3).fill(blink ? P.crimson : P.blood0)
        if (blink) lamps.rect(x, lampY, 1, 1).fill(P.redGlow)
      }
    }
  }

  return {
    duration: 0,
    goal: 900,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      for (const a of [A_IMPACT, A_REST, A_BOUNCE, A_MID, A_UP])
        frames.set(a, bakeRotated('gavel', gavelTex(), a))
      setGavel(A_REST)
      smear.blendMode = 'add'
      glow.blendMode = 'add'

      rail = el('div', { class: 'timeline-slots', role: 'list', 'aria-label': 'Linha do tempo' })
      slots = EVENTS.map((_, i) => el('div', { class: 'slot', role: 'listitem' }, String(i + 1)))
      rail.append(...slots)
      rail.style.top = `${(c.top + 8) * c.css}px`
      grid = el('div', { class: 'tl-cards' })
      const order = shuffle(
        EVENTS.map((e, i) => ({ e, i })),
        c.rnd,
      )
      cards = order.map(({ e, i }) => {
        const b = el('button', { class: 'tl-card' }, e.text)
        tactile(b)
        b.addEventListener('click', () => pick(i, b))
        return b
      })
      grid.append(...cards)
      grid.style.top = `${(c.top + 8) * c.css + 64}px`
      c.layer.append(rail, grid)

      layoutScene()
      const area = { x0: 0, y0: blockY - 60, x1: c.W, y1: c.bottom }
      embers = new Embers(c, area, { ambient: 18 }).listen()
      sparkles = new Sparkles(c.reduced)
      root.addChild(debris.root, embers.root, sparkles.root)
      markNext()
      cards[0]?.focus({ preventScroll: true })
    },
    update(dt) {
      timers.update(dt)
      embers.update(dt, c.time)
      sparkles.update(dt)
      debris.update(dt)
      // martelo: antecipação 90 ms → smear 30 ms → impacto (segura no hit-stop) → quique → repouso
      const s = c.time - strikeT
      smear.clear()
      if (s < 0.04) setGavel(A_MID)
      else if (s < 0.1) setGavel(A_UP)
      else if (s < 0.13) {
        setGavel(A_MID)
        // smear: arco de luz entre o alto e o impacto (1 quadro)
        for (let a = 0.15; a < 0.95; a += 0.07) {
          const x = pivotX - Math.cos(a) * 20
          const y = pivotY - Math.sin(a) * 20
          smear.rect(Math.round(x) - 3, Math.round(y), 7, 1).fill({ color: P.goldHi, alpha: 0.55 })
        }
      } else {
        if (!impacted) impact()
        if (s < 0.22) setGavel(A_IMPACT)
        else if (s < 0.3) setGavel(A_BOUNCE)
        else setGavel(A_REST)
      }
      // erro: o martelo balança de leve, em degraus de 1 px
      const w = c.time - wobbleT
      gavel.x = pivotX + (w < 0.3 ? (Math.floor(w * 20) % 2 ? 1 : -1) : 0)
      // brilho do bloco logo após o impacto
      if (s > 0.13 && s < 0.4) energyDot(smear, blockX, blockY - 1, P.white, P.goldHi, P.gold)
      drawLamps()
      drawScale(dt)
    },
    key(k, down) {
      if (!down) return
      const live = cards.filter((b) => !b.disabled)
      if (!live.length) return
      const i = Math.max(0, live.indexOf(document.activeElement as HTMLButtonElement))
      const step =
        k === 'ArrowRight' || k === 'ArrowDown' || k === 'd'
          ? 1
          : k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a'
            ? -1
            : 0
      if (step) live[(i + step + live.length) % live.length]?.focus({ preventScroll: true })
    },
    hint() {
      if (done) return false
      const b = cards.find((x) => !x.disabled && x.textContent === EVENTS[next]?.text)
      if (!b) return false
      hintPulse(b)
      return true
    },
    clear() {
      if (done) return false
      const b = cards.find((x) => !x.disabled && x.textContent === EVENTS[next]?.text)
      if (!b) return false
      pick(next, b)
      return true
    },
    dispose() {
      timers.clear()
      embers?.destroy()
      rail?.remove()
      grid?.remove()
      root.destroy({ children: true })
    },
  }
}
