// Fase 8 · O Julgamento: monte a linha do tempo da trama golpista, do mais antigo ao mais recente.
// Cartas e trilho em DOM (.timeline-slots/.tl-card); em Pixi, a bancada do STF com o martelo do juiz,
// que bate a cada acerto (antecipação, smear, quadro de impacto sob hit-stop, onda de choque).
// Feel (números): martelo = antecipação 90 ms → smear 30 ms → impacto com hit-stop 90 ms, tremor vertical 2 px,
// anéis 30/16 px, 8 lascas; balança em mola (k 40, amortecimento 6/s), chute -0,6 no acerto e +1,6 no erro.
// Sem tempo (duration 0): pontos = max(60, 160 − 10 × erros) por evento; sequência sem erro sobe a cor do número.
import { Container, Graphics, Sprite } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { shuffle } from '../lib/rng'
import { domHand, Flyers, finale } from './fx-b'
import { rowsTex } from './kit-a'
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
  joy,
  P,
  ScorePops,
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

/** lateral da bancada em três quartos (px) e quanto ela sobe para o fundo */
const BENCH_D = 5
const BENCH_RISE = 2

function benchTex(w: number) {
  const h = 26
  return bake(`bench3q${w}`, w + BENCH_D, h + BENCH_RISE, (p) => {
    // lateral grossa em madeira-sangue com rim red-hot na aresta (lição da ref v2)
    for (let i = 0; i < BENCH_D; i++) {
      const lift = Math.round(((i + 1) / BENCH_D) * BENCH_RISE)
      const x = w + i
      p.rect(x, BENCH_RISE - lift, 1, 4, i === BENCH_D - 1 ? P.redHot : P.emberDark)
      p.rect(x, BENCH_RISE - lift + 4, 1, h - 4, i === BENCH_D - 1 ? P.redHot : i % 2 ? P.blood0 : P.blood1)
      if (i < BENCH_D - 1) p.dot(x, BENCH_RISE - lift + 9 + i * 3, P.crimsonDeep)
    }
    // tampo visto de cima: faixa fina recuando
    for (let j = 0; j < BENCH_RISE; j++) p.rect(BENCH_RISE - j, j, w, 1, j ? P.gold1 : P.gold)
    p.g.translate(0, BENCH_RISE)
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
    p.g.setTransform(1, 0, 0, 1, 0, 0)
    p.outline(P.void, P.stone0)
  })
}

export default function linha(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const timers = new Timers()
  let embers: Embers
  let sparkles: Sparkles
  let pops: ScorePops
  let streak = 0
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
  let panX = 0
  let panY = 0
  let flyers: Flyers
  /** remove a mão de demonstração (no primeiro toque ou depois de 4 s) */
  let dropHand: () => void = () => {}

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
    c.sfx('stamp', { x: blockX })
    stop(c, 90)
    joy(c, 2, 160)
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
    dropHand()
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
      // o fato vira uma barra de ouro que voa da carta até o prato da balança
      const from = domRect(c, btn)
      flyers.send(from.cx, from.cy, {
        to: scOn ? { x: panX, y: panY } : { x: blockX, y: blockY - 6 },
        dur: 0.42,
        arc: 14,
        done: () => {
          c.fx.ring(scOn ? panX : blockX, scOn ? panY : blockY, P.goldHi, 14)
          sparkles.spawn(scOn ? panX + 6 : blockX, (scOn ? panY : blockY) - 6, 0)
        },
      })
      next++
      const pts = Math.max(60, 160 - mistakes * 10)
      streak++
      pops.score(pts, blockX, blockY - 22, streak, embers)
      c.sfx('good', { x: blockX, combo: streak })
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
          finale(c, blockX, blockY)
        })
        timers.after(1.7, () => c.finish())
      }
    } else {
      mistakes++
      streak = 0
      btn.classList.remove('bad')
      void btn.offsetWidth
      btn.classList.add('bad')
      timers.after(0.45, () => btn.classList.remove('bad'))
      tiltV += 1.6
      shakeEl(btn)
      // o erro ensina: a carta certa pisca (a pontuação já descontou o erro, nada muda)
      const right = cards.find((x) => !x.disabled && x.textContent === EVENTS[next]?.text)
      if (right) hintPulse(right, 2)
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
    const bench = new Sprite(benchTex(benchW))
    bench.x = Math.round(cx - benchW / 2)
    bench.y = benchTop - BENCH_RISE
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
    // o Palácio do STF agora está no cenário da fase (src/scene/levels/l08.ts), em três quartos
    root.addChild(shadow, scaleG, scaleGlow, bench, block, glow, lamps, gavel, smear)
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
    // coluna em três quartos: frente de pedra clara (3 tons) e lateral vermelha com rim, capitel dourado
    g.rect(scX - 3, scY, 7, 30).fill(P.void)
    g.rect(scX - 2, scY, 1, 30).fill(P.stoneHi)
    g.rect(scX - 1, scY, 1, 30).fill(P.stone3)
    g.rect(scX, scY, 1, 30).fill(P.stone2)
    g.rect(scX + 1, scY, 1, 30).fill(P.crimsonDeep)
    g.rect(scX + 2, scY, 1, 30).fill(P.redHot)
    g.rect(scX - 3, scY + 2, 6, 2).fill(P.gold1)
    g.rect(scX - 3, scY + 2, 6, 1).fill(P.goldHi)
    // base em três quartos: degrau com tampo, frente e lateral
    g.rect(scX - 10, scY + 28, 22, 6).fill(P.void)
    g.rect(scX - 9, scY + 29, 18, 1).fill(P.stoneHi)
    g.rect(scX - 9, scY + 30, 18, 3).fill(P.stone2)
    g.rect(scX - 9, scY + 32, 18, 1).fill(P.stone1)
    g.rect(scX + 9, scY + 29, 2, 4).fill(P.blood1)
    g.rect(scX + 10, scY + 29, 1, 4).fill(P.redHot)
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
      // prato em 4 faixas (aro claro, bojo, sombra violeta-ouro) com contorno escuro
      g.rect(px - 9, by - 1, 19, 6).fill(P.void)
      g.rect(px - 8, by, 17, 1).fill(P.goldHi)
      g.rect(px - 7, by + 1, 15, 1).fill(P.gold)
      g.rect(px - 6, by + 2, 13, 1).fill(P.gold1)
      g.rect(px - 4, by + 3, 9, 1).fill(P.gold0)
      g.rect(px + 7, by + 1, 1, 1).fill(P.redHot)
      g.rect(px - 8, by, 1, 1).fill(P.sparkle)
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
    panX = x0
    panY = y0 + 14
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
      // tela estreita: o trilho quebra em 2 linhas de 3 para as datas caberem sem cortar
      if (innerWidth < 520) {
        rail.style.flexWrap = 'wrap'
        rail.style.rowGap = '6px'
        for (const sl of slots) {
          sl.style.flex = '1 0 30%'
          sl.style.minWidth = '0'
          sl.style.minHeight = '34px'
        }
      }
      // etiquetas legíveis no celular (11 px); a grade das cartas é posicionada logo abaixo do trilho
      for (const sl of slots) sl.style.fontSize = '11px'
      c.layer.append(rail, grid)
      grid.style.top = `${Math.round(rail.getBoundingClientRect().bottom + 10)}px`

      layoutScene()
      const area = { x0: 0, y0: blockY - 60, x1: c.W, y1: c.bottom }
      embers = new Embers(c, area, { ambient: 18 }).listen()
      sparkles = new Sparkles(c.reduced)
      pops = new ScorePops(c)
      flyers = new Flyers(c, rowsTex('linha-barra', ['.YYYYYs', 'yyyyyYY', 'yyyyyy6', '6666665']), 6)
      flyers.trail = (x, y) => {
        if (c.rnd() < 0.4) embers.spark(x, y, 12)
      }
      root.addChild(debris.root, embers.root, sparkles.root, pops.root, flyers.root)
      markNext()
      cards[0]?.focus({ preventScroll: true })
      // demonstração: a mão aponta a carta mais antiga (o primeiro passo) até o primeiro toque
      const first = cards.find((x) => x.textContent === EVENTS[0]?.text)
      if (first) {
        const off = domHand(c, first)
        let alive = true
        dropHand = () => {
          if (!alive) return
          alive = false
          off()
        }
        timers.after(4, () => dropHand())
      }
    },
    update(dt) {
      timers.update(dt)
      flyers.update(dt)
      embers.update(dt, c.time)
      sparkles.update(dt)
      pops.update(dt)
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
      dropHand()
      timers.clear()
      embers?.destroy()
      rail?.remove()
      grid?.remove()
      root.destroy({ children: true })
    },
  }
}
