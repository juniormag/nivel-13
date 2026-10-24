// Fase 13 · A Grande Fake: a hidra de boatos. Cada cabeça só cai com o fato certo.
// Hidra de recortes de jornal com 5 cabeças. A cabeça ativa dá o bote com antecipação de 300 ms
// (recua, abre a boca, olhos acendem, linha de mira) quando você erra ou o tempo acaba. O fato certo
// destrói a cabeça: hit-stop de 180 ms com quadro branco → vermelho, explosão de papel, anel e tremor.
// A última cabeça dispara a explosão em cascata do corpo.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { shuffle } from '../lib/rng'
import {
  bake,
  clamp01,
  Debris,
  domRect,
  Embers,
  easeInQuad,
  easeOutBack,
  easeOutQuad,
  el,
  energyDot,
  flash,
  goldPulse,
  hintPulse,
  P,
  type Painter,
  Sparkles,
  shakeEl,
  stop,
  Timers,
  tactile,
} from './kit-b'

// Textos factuais (revisados): mesmos do jogo legado. Fontes em src/content/facts.ts, ids 'fome'
// (FAO/ONU jul/2025 e jul/2026), 'ir' (Lei 15.270/2025), 'julgamento' (STF 11/09/2025),
// 'floresta' (PRODES/INPE 2025) e 'emprego' (PNAD Contínua/IBGE).
const ROUNDS = [
  {
    claim: 'O Brasil voltou ao Mapa da Fome.',
    right: 'A ONU tirou o Brasil do Mapa da Fome em 2025, e ele seguiu fora em 2026.',
    wrong: [
      'Não existe nenhum dado oficial sobre fome no Brasil.',
      'A fome só caiu em outros países da América do Sul.',
    ],
  },
  {
    claim: 'Isenção do IR é mentira: quem ganha R$ 5 mil continua pagando.',
    right: 'Desde janeiro de 2026, quem ganha até R$ 5 mil por mês não paga IR, nem no 13º.',
    wrong: [
      'A isenção só vale para quem ganha mais de R$ 10 mil.',
      'A lei foi aprovada, mas só começa a valer em 2030.',
    ],
  },
  {
    claim: 'Bolsonaro foi inocentado da trama golpista.',
    right: 'O STF condenou Bolsonaro a 27 anos e 3 meses em setembro de 2025, por 4 a 1.',
    wrong: ['O processo foi arquivado sem julgamento.', 'O STF nunca abriu processo contra ele.'],
  },
  {
    claim: 'O desmatamento na Amazônia disparou.',
    right: 'Caiu pelo quarto ano seguido: 5.796 km² em 2025, a menor área em 11 anos (INPE).',
    wrong: ['O INPE parou de medir o desmatamento em 2023.', 'Subiu 50% em 2025, segundo o INPE.'],
  },
  {
    claim: 'O desemprego está no maior nível da história.',
    right: 'Chegou a 5,1% no fim de 2025, o menor da série do IBGE, iniciada em 2012.',
    wrong: ['O IBGE não divulga mais a taxa de desemprego.', 'Passou de 15% em 2026.'],
  },
]

const PER = 14
const WIND = 0.3
const LUNGE = 0.08
const RECOVER = 0.32
const HW = 20
const HH = 17
const BHW = 24
const BHH = 20

interface Head {
  alive: boolean
  phase: number
  dieT: number
  /** tempo real do golpe final (quadros branco → vermelho durante o hit-stop) */
  dieReal: number
  exploded: boolean
  s: Sprite
  attackT: number
  biteT: number
  x: number
  y: number
}

/** gerador local estável para a arte */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function headTex(v: number, open: boolean, big: boolean): Texture {
  const w = big ? BHW : HW
  const h = big ? BHH : HH
  return bake(`hydra-head${v}${open ? 'o' : ''}${big ? 'b' : ''}`, w + 2, h + 2, (p) => {
    const r = seeded(31 + v * 17)
    const cx = Math.floor((w + 2) / 2)
    const cy = Math.floor((h + 2) / 2)
    // bola de papel amassado: base, luz em cima/esquerda, sombra embaixo/direita
    p.ellipse(cx, cy, Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, P.stone3)
    p.ellipse(cx - 2, cy - 2, Math.floor(w / 2) - 4, Math.floor(h / 2) - 4, P.stoneHi)
    for (let y = cy + 2; y < h; y++)
      for (let x = 1; x < w + 1; x++)
        if ((x + y) % 3 === 0 && y > cy + Math.floor(h / 4)) p.dot(x, y, P.stone2)
    // dobras
    for (let k = 0; k < 4; k++) {
      const x = 3 + Math.floor(r() * (w - 6))
      const y = 3 + Math.floor(r() * (h - 6))
      p.line(x, y, x + 2, y + 1, P.stone2)
    }
    // manchete vermelha com "letras"
    const by = 2 + (v % 2)
    const bh = big ? 4 : 3
    p.rect(3, by, w - 4, bh, P.red)
    p.rect(3, by + bh - 1, w - 4, 1, P.crimson)
    for (let x = 4; x < w - 2; x += 2) if (r() < 0.7) p.dot(x, by + 1, P.sparkle)
    // olhos raivosos (sobrancelha inclinada para o centro)
    const ey = Math.round(h * 0.52)
    const ex1 = Math.round(w * 0.3)
    const ex2 = Math.round(w * 0.72)
    for (const [ex, dir] of [
      [ex1, 1],
      [ex2, -1],
    ] as const) {
      p.rect(ex - 1, ey, 4, 3, P.void)
      p.rect(ex, ey + 1, 2, 1, P.redHot)
      p.dot(ex + (dir > 0 ? 1 : 0), ey + 1, P.white)
      p.line(
        ex - 1 - (dir < 0 ? 0 : 0),
        ey - 2 + (dir > 0 ? 0 : 1),
        ex + 3,
        ey - 2 + (dir > 0 ? 1 : 0),
        P.void,
      )
    }
    // boca serrilhada
    const my = Math.round(h * 0.76)
    const mw = Math.round(w * 0.56)
    const mx = cx - Math.floor(mw / 2)
    if (open) {
      p.rect(mx, my - 2, mw, 5, P.void)
      p.rect(mx + 1, my - 1, mw - 2, 3, P.crimsonDeep)
      p.rect(mx + 2, my, mw - 4, 1, P.red)
      for (let x = mx + 1; x < mx + mw - 1; x += 2) {
        p.dot(x, my - 1, P.stoneHi)
        p.dot(x + 1, my + 1, P.stoneHi)
      }
    } else {
      for (let x = mx; x < mx + mw; x++) p.dot(x, my + ((x - mx) % 2), P.void)
      for (let x = mx + 1; x < mx + mw - 1; x += 3) p.dot(x, my - 1, P.stoneHi)
    }
    p.outline(P.void, P.stone0)
    p.rim(P.redHot, 'r')
  })
}

/** silhueta sólida de uma textura (quadro de impacto branco e depois vermelho, regra 30) */
function solid(key: string, src: Texture, color: number): Texture {
  return bake(`solid|${key}|${color}`, src.width, src.height, (p) => {
    const res = src.source.resource as CanvasImageSource
    p.g.drawImage(res, 0, 0)
    p.g.globalCompositeOperation = 'source-in'
    p.g.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    p.g.fillRect(0, 0, src.width, src.height)
    p.g.globalCompositeOperation = 'source-over'
  })
}

function bodyTex(w: number, h: number): Texture {
  return bake(`hydra-body${w}x${h}`, w, h, (p: Painter) => {
    const r = seeded(77)
    const cx = w / 2
    const cy = h * 0.55
    // recortes empilhados: de trás (escuros) para a frente (claros)
    for (let layer = 0; layer < 3; layer++) {
      const n = 14 + layer * 6
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2
        const rr = (0.95 - layer * 0.25) * Math.sqrt(r())
        const x = cx + Math.cos(a) * (w / 2 - 6) * rr
        const y = cy + Math.sin(a) * (h / 2 - 4) * rr
        if (y > h - 4) continue
        const sw = 7 + Math.floor(r() * 7)
        const sh = 5 + Math.floor(r() * 4)
        const low = y > cy + h * 0.15
        const base = layer === 0 ? P.stone1 : low ? P.stone2 : r() < 0.5 ? P.stone3 : P.stoneHi
        p.rect(x - sw / 2, y - sh / 2, sw, sh, base)
        p.rect(x - sw / 2, y - sh / 2, sw, 1, layer === 0 ? P.stone2 : low ? P.stone3 : P.stoneHi)
        // linhas de texto e manchetes
        if (layer > 0) {
          for (let ty = 2; ty < sh - 1; ty += 2)
            p.rect(x - sw / 2 + 1, y - sh / 2 + ty, sw - 3 - (ty % 3), 1, low ? P.stone1 : P.stone2)
          if (r() < 0.3) p.rect(x - sw / 2 + 1, y - sh / 2 + 1, sw - 2, 2, low ? P.crimson : P.red)
        }
      }
    }
    // rasgos mostrando o núcleo em brasa
    for (const [hx, hy] of [
      [cx - w * 0.18, cy + 2],
      [cx + w * 0.2, cy - 1],
      [cx, cy + 5],
    ] as const) {
      p.rect(hx - 2, hy - 1, 5, 3, P.blood0)
      p.rect(hx - 1, hy, 3, 1, P.red)
      p.dot(hx, hy, P.redGlow)
    }
    p.outline(P.void, P.blood0)
    p.rim(P.redHot, 't')
  })
}

export default function chefe(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const shadow = new Graphics()
  const body = new Sprite()
  const bodyFlash = new Sprite()
  const necks = new Graphics()
  const headLayer = new Container()
  const ghosts = [new Sprite(), new Sprite()]
  const glow = new Graphics()
  const aim = new Graphics()
  const bar = new Graphics()
  const timers = new Timers()
  const debris = new Debris(120)
  let embers: Embers
  let sparkles: Sparkles
  let heads: Head[] = []
  let round = 0
  let roundT = 0
  let ui: HTMLDivElement
  let claimEl: HTMLDivElement | null = null
  let opts: { b: HTMLButtonElement; ok: boolean }[] = []
  let busy = false
  let attacking = false
  let bodyX = 0
  let bodyY = 0
  let targetBodyY = 0
  let floorY = 0
  let bw = 120
  const bh = 34
  let born = 0
  let flinchT = -10
  let dying = -1
  let sinkY = 0
  let over = false
  let hitY = 0

  function headRest(i: number) {
    const n = heads.length
    const spread = Math.min(c.W * 0.86, 240)
    const base = bodyX - spread / 2 + (spread / (n - 1)) * i
    const hd = heads[i]
    const ph = hd?.phase ?? 0
    const swayX = Math.sin(c.time * 1.6 + ph) * 3
    const swayY = Math.sin(c.time * 2.1 + ph * 1.7) * 2
    const arch = (1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)) * 8
    const active = i === round && hd?.alive
    // pressão: a cabeça ativa desce até 6 px conforme o tempo acaba
    const press = active && !busy ? (roundT / PER) * 6 : 0
    const fl = c.time - flinchT < 0.3 ? -Math.round(Math.sin(((c.time - flinchT) / 0.3) * Math.PI) * 4) : 0
    return { x: base + swayX, y: bodyY - 36 - arch + swayY + press + fl + sinkY }
  }

  /** posição atual da cabeça incluindo o bote */
  function headPos(i: number) {
    const p = headRest(i)
    const hd = heads[i]
    if (!hd) return p
    const t = c.time - hd.attackT
    if (t >= 0 && t < WIND + LUNGE + RECOVER) {
      const tx = c.W / 2
      const ty = hitY
      if (t < WIND) {
        // antecipação: recua 8 px para cima e treme 1 px
        const k = easeOutQuad(t / WIND)
        p.y -= 8 * k
        p.x += (p.x - tx) * 0.08 * k + (Math.floor(t * 30) % 2 ? 1 : -1)
      } else if (t < WIND + LUNGE) {
        const k = easeInQuad((t - WIND) / LUNGE)
        p.x = p.x + (tx - p.x) * 0.55 * k
        p.y = p.y - 8 + (ty - (p.y - 8)) * 0.8 * k
      } else {
        const k = easeOutQuad((t - WIND - LUNGE) / RECOVER)
        const lx = p.x + (tx - p.x) * 0.55
        const ly = p.y - 8 + (ty - (p.y - 8)) * 0.8
        p.x = lx + (p.x - lx) * k
        p.y = ly + (p.y - ly) * k
      }
    }
    return p
  }

  function attack() {
    const hd = heads[round]
    if (!hd?.alive || attacking) return
    attacking = true
    hd.attackT = c.time
    c.sfx('tick')
    timers.after(WIND + LUNGE, () => {
      const p = headPos(round)
      c.fx.ring(Math.round(p.x), Math.round(p.y + 8), P.redHot, 22)
      c.fx.burst(Math.round(p.x), Math.round(p.y + 8), P.red, 10, 60)
      embers.blast(p.x, p.y + 8, 160, 60)
      c.hit(Math.round(p.x), Math.round(p.y + 10))
    })
    timers.after(WIND + LUNGE + RECOVER * 0.6, () => {
      attacking = false
    })
  }

  function killHead(i: number) {
    const hd = heads[i]
    if (!hd) return
    hd.alive = false
    hd.dieT = c.time
    hd.dieReal = performance.now()
    hd.exploded = false
    const p = headPos(i)
    hd.x = p.x
    hd.y = p.y
    c.sfx('boom')
    // golpe pesado: congela 180 ms com a cabeça em branco e depois vermelho
    stop(c, 180)
    // assim que a simulação volta: explosão de papel
    timers.after(0.001, () => explodeHead(hd))
  }

  function explodeHead(hd: Head) {
    hd.exploded = true
    hd.s.visible = false
    const x = Math.round(hd.x)
    const y = Math.round(hd.y)
    c.fx.shake(4, 280)
    c.fx.ring(x, y, P.goldHi, 44)
    c.fx.ring(x, y, P.redHot, 26)
    c.fx.burst(x, y, P.stoneHi, 18, 90)
    c.fx.burst(x, y, P.red, 10, 70)
    flash(c, P.white, 60, 0.18)
    debris.burst(x, y, [P.stoneHi, P.stone3, P.red, P.stone2], 18, 110, c.rnd, floorY, 2.6)
    // pescoço desaba em pedaços
    const i = heads.indexOf(hd)
    const ax = anchorX(i)
    for (let s = 1; s < 8; s++) {
      const t = s / 8
      const nx = ax + (x - ax) * t
      const ny = bodyY - 8 + (y - (bodyY - 8)) * t
      debris.spawn(
        nx,
        ny,
        s % 2 ? P.stone3 : P.stone2,
        (c.rnd() - 0.5) * 40,
        -20 - c.rnd() * 30,
        4,
        3,
        2.4,
        floorY,
      )
    }
    embers.blast(x, y, 220, 90)
    sparkles.spawn(x - 10, y - 6, 12)
    sparkles.spawn(x + 12, y + 2, 8)
    sparkles.spawn(x, y - 14, 0)
    flinchT = c.time
  }

  function anchorX(i: number) {
    const n = heads.length
    return bodyX - bw * 0.32 + ((bw * 0.64) / (n - 1)) * i
  }

  function measureUi() {
    if (!ui.isConnected) return
    const r = domRect(c, ui)
    const uiTop = r.y
    const mid = (c.top + uiTop) / 2
    targetBodyY = Math.round(Math.min(uiTop - bh / 2 - 4, Math.max(c.top + 64, mid + 22)))
    hitY = Math.round(uiTop - 6)
  }

  function renderRound() {
    const r = ROUNDS[round]
    if (!r) return
    roundT = 0
    busy = false
    const choices = shuffle([{ t: r.right, ok: true }, ...r.wrong.map((t) => ({ t, ok: false }))], c.rnd)
    opts = choices.map((ch, k) => {
      const b = el('button', { class: 'boss-opt', 'aria-keyshortcuts': String(k + 1) }, ch.t)
      tactile(b)
      b.addEventListener('click', () => choose(ch.ok, b))
      return { b, ok: ch.ok }
    })
    claimEl = el(
      'div',
      { class: 'boss-claim px-frame px-frame--red' },
      el('small', null, `Cabeça ${round + 1} de ${ROUNDS.length} diz`),
      `“${r.claim}”`,
    )
    ui.replaceChildren(claimEl, ...opts.map((o) => o.b))
    const red = !matchMedia('(prefers-reduced-motion: reduce)').matches
    if (red) {
      claimEl.animate(
        [
          { transform: 'scale(0.9)', opacity: 0 },
          { transform: 'scale(1.04)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1)' },
        ],
        {
          duration: 220,
          easing: 'steps(5, end)',
        },
      )
      for (const [k, o] of opts.entries())
        o.b.animate(
          [
            { transform: 'translateY(8px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 160,
            delay: 80 + k * 70,
            easing: 'steps(4, end)',
            fill: 'backwards',
          },
        )
    }
    opts[0]?.b.focus({ preventScroll: true })
    measureUi()
  }

  function choose(ok: boolean, b: HTMLButtonElement) {
    if (busy || attacking || over) return
    if (ok) {
      busy = true
      b.classList.add('ok')
      goldPulse(b)
      for (const o of opts) if (o.b !== b) o.b.style.opacity = '0.45'
      if (claimEl) {
        claimEl.style.textDecoration = `line-through 3px #${P.red.toString(16)}`
        claimEl.style.opacity = '0.6'
      }
      const p = headPos(round)
      c.addScore(200 + Math.round((1 - roundT / PER) * 120), Math.round(p.x), Math.round(p.y) - 14)
      killHead(round)
      timers.after(0.9, () => {
        round++
        if (round >= ROUNDS.length) defeat()
        else renderRound()
      })
    } else {
      b.classList.add('no')
      b.disabled = true
      shakeEl(b)
      attack()
    }
  }

  function defeat() {
    over = true
    ui.remove()
    dying = c.time
    c.sfx('fanfare')
    // explosão em cascata: 11 estouros em 1,4 s pelo corpo, cada vez maiores
    for (let k = 0; k < 11; k++)
      timers.after(k * 0.13, () => {
        const x = Math.round(bodyX + (c.rnd() - 0.5) * bw * 0.8)
        const y = Math.round(bodyY + sinkY + (c.rnd() - 0.6) * bh * 0.7)
        const big = k / 10
        c.fx.burst(x, y, k % 2 ? P.goldHi : P.redHot, 10 + Math.round(big * 8), 60 + big * 50)
        c.fx.ring(x, y, k % 2 ? P.gold : P.red, 14 + Math.round(big * 22))
        debris.burst(x, y, [P.stoneHi, P.stone3, P.red], 6, 90 + big * 60, c.rnd, floorY, 2.2)
        c.fx.shake(2 + Math.round(big * 2), 160)
        embers.blast(x, y, 180, 70)
        if (k % 3 === 0) c.sfx('boom')
        if (k % 2 === 0) stop(c, 40)
      })
    timers.after(1.5, () => {
      const x = Math.round(bodyX)
      const y = Math.round(bodyY + sinkY)
      stop(c, 200)
      flash(c, P.goldHi, 220, 0.3)
      c.fx.ring(x, y, P.goldHi, 110)
      c.fx.ring(x, y, P.red, 70)
      c.fx.burst(x, y, P.sparkle, 24, 120)
      debris.burst(x, y, [P.stoneHi, P.stone3, P.red, P.gold], 30, 160, c.rnd, floorY, 3)
      for (let k = 0; k < 8; k++)
        sparkles.spawn(Math.round(x + (c.rnd() - 0.5) * c.W * 0.8), Math.round(y - c.rnd() * 60), 14)
      c.fx.float('A GRANDE FAKE CAIU', x, Math.round(y - 30), P.goldHi)
      body.visible = false
      bodyFlash.visible = false
      c.sfx('level')
    })
    timers.after(2.6, () => c.finish())
  }

  function drawNecks() {
    const g = necks
    g.clear()
    const segs: { x: number; y: number; k: number }[] = []
    for (let i = 0; i < heads.length; i++) {
      const hd = heads[i]
      if (!hd?.alive) continue
      const p = headPos(i)
      const ax = anchorX(i)
      const ay = bodyY - 8 + sinkY
      const hx = p.x
      const hy = p.y + 6
      for (let s = 0; s <= 9; s++) {
        const t = s / 9
        const ctrlX = ax + (hx - ax) * 0.3
        const ctrlY = ay - (ay - hy) * 0.9
        const x =
          (1 - t) * (1 - t) * ax +
          2 * (1 - t) * t * ctrlX +
          t * t * hx +
          Math.sin(t * 3 + c.time * 2 + hd.phase) * 2 * t * (1 - t) * 4
        const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * ctrlY + t * t * hy
        segs.push({ x: Math.round(x), y: Math.round(y), k: s })
      }
    }
    for (const s of segs) g.rect(s.x - 3, s.y - 3, 7, 7)
    g.fill(P.void)
    for (const s of segs) g.rect(s.x - 2, s.y - 2, 5, 5)
    g.fill(P.stone3)
    for (const s of segs) g.rect(s.x - 2, s.y - 2, 5, 1)
    g.fill(P.stoneHi)
    for (const s of segs) g.rect(s.x - 2, s.y + 2, 5, 1)
    g.fill(P.stone1)
    for (const s of segs) if (s.k % 3 === 1) g.rect(s.x - 2, s.y, 5, 1)
    g.fill(P.red)
  }

  return {
    duration: 0,
    goal: 1500,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      bw = Math.round(Math.min(c.W * 0.64, 150))
      bodyX = Math.round(c.W / 2)
      ui = el('div', { class: 'boss-ui' })
      c.layer.append(ui)
      heads = ROUNDS.map((_, i) => {
        const s = new Sprite(headTex(i, false, false))
        headLayer.addChild(s)
        return {
          alive: true,
          phase: i * 1.3,
          dieT: 0,
          dieReal: 0,
          exploded: false,
          s,
          attackT: -10,
          biteT: -10 - i,
          x: 0,
          y: 0,
        }
      })
      renderRound()
      bodyY = targetBodyY
      floorY = bodyY + Math.round(bh / 2) + 2
      body.texture = bodyTex(bw, bh)
      bodyFlash.texture = solid('hydra-body', body.texture, P.white)
      bodyFlash.visible = false
      for (const g of ghosts) {
        g.visible = false
        g.alpha = 0.5
      }
      glow.blendMode = 'add'
      aim.blendMode = 'add'
      embers = new Embers(
        c,
        { x0: bodyX - bw / 2, y0: c.top, x1: bodyX + bw / 2, y1: floorY },
        { ambient: 30, sparks: 40 },
      ).listen()
      sparkles = new Sparkles(c.reduced)
      root.addChild(
        shadow,
        embers.root,
        necks,
        body,
        bodyFlash,
        headLayer,
        ...ghosts,
        glow,
        aim,
        bar,
        debris.root,
        sparkles.root,
      )
      born = c.time
    },
    update(dt) {
      timers.update(dt)
      // acompanha a altura da interface (a pergunta muda de tamanho a cada rodada)
      bodyY += (targetBodyY - bodyY) * Math.min(1, dt * 6)
      floorY = Math.round(bodyY + bh / 2 + 2)
      // entrada: a hidra sobe do chão com overshoot
      const rise =
        c.time - born < 0.7 ? Math.round((1 - easeOutBack(clamp01((c.time - born) / 0.7))) * 40) : 0
      if (dying >= 0) sinkY = Math.round(easeInQuad(clamp01((c.time - dying) / 1.5)) * 18)
      else sinkY = rise
      if (!busy && !over && !attacking) {
        roundT += dt
        if (roundT > PER) {
          roundT = 0
          attack()
        }
      }
      const breathe = c.reduced ? 0 : Math.round(Math.sin(c.time * 2.4))
      const shake = c.time - flinchT < 0.3 ? (Math.floor(c.time * 30) % 2 ? 1 : -1) : 0
      body.x = Math.round(bodyX - bw / 2) + shake + (dying >= 0 ? (Math.floor(c.time * 25) % 2 ? 1 : -1) : 0)
      body.y = Math.round(bodyY - bh / 2) + sinkY + breathe
      bodyFlash.x = body.x
      bodyFlash.y = body.y
      bodyFlash.visible = body.visible && dying >= 0 && Math.floor(c.time * 12) % 3 === 0

      // sombra pontilhada no chão
      shadow.clear()
      const sw = Math.round(bw * 0.9)
      for (let y = 0; y < 4; y++) {
        const w = sw - y * 10
        for (let x = 0; x < w; x++)
          if ((x + y) % 2 === 0) shadow.rect(Math.round(bodyX - w / 2) + x, floorY - 2 + y, 1, 1)
      }
      shadow.fill({ color: P.void, alpha: 0.85 })

      drawNecks()
      glow.clear()
      aim.clear()
      bar.clear()
      const now = performance.now()
      for (let i = 0; i < heads.length; i++) {
        const hd = heads[i] as Head
        const active = i === round && !over
        if (!hd.alive) {
          if (hd.exploded) continue
          // quadro de impacto durante o hit-stop: branco 120 ms, vermelho 60 ms
          const ms = now - hd.dieReal
          const base = headTex(i, true, active)
          hd.s.texture = solid(`h${i}${active ? 'b' : ''}`, base, ms < 120 ? P.white : P.redHot)
          continue
        }
        const p = headPos(i)
        const t = c.time - hd.attackT
        const winding = t >= 0 && t < WIND
        const lunging = t >= WIND && t < WIND + LUNGE
        // mordida ociosa das outras cabeças, para dar vida
        if (!active && c.time - hd.biteT > 3 + hd.phase && c.rnd() < dt * 0.5) hd.biteT = c.time
        const open = winding || lunging || (t >= 0 && t < WIND + LUNGE + 0.12) || c.time - hd.biteT < 0.22
        const big = active
        hd.s.texture = headTex(i, open, big)
        const w = big ? BHW + 2 : HW + 2
        const h = big ? BHH + 2 : HH + 2
        hd.s.x = Math.round(p.x - w / 2)
        hd.s.y = Math.round(p.y - h / 2)
        hd.x = p.x
        hd.y = p.y
        // olhos: brilho em 3 camadas, mais forte na cabeça ativa e na antecipação
        const ey = Math.round(hd.s.y + h * 0.52 + 1)
        const e1 = Math.round(hd.s.x + w * 0.3 + 1)
        const e2 = Math.round(hd.s.x + w * 0.72)
        if (active || winding) {
          const core = winding ? P.white : P.sparkle
          energyDot(glow, e1, ey, core, P.redHot, P.crimson)
          energyDot(glow, e2, ey, core, P.redHot, P.crimson)
        }
        if (winding && !c.reduced) {
          // mira: linha pontilhada piscando até onde o bote vai bater
          if (Math.floor(t * 20) % 2 === 0) {
            const tx = c.W / 2
            const n = 10
            for (let k = 1; k < n; k++) {
              const x = Math.round(p.x + (tx - p.x) * (k / n))
              const y = Math.round(p.y + 10 + (hitY - p.y - 10) * (k / n))
              aim.rect(x, y, 1, 1).fill({ color: P.redHot, alpha: 0.7 })
            }
          }
        }
        // smear do bote: duas silhuetas vermelhas no caminho (1 quadro cada)
        if (lunging) {
          const base = headTex(i, true, big)
          for (const [k, g] of ghosts.entries()) {
            g.texture = solid(`h${i}${big ? 'b' : ''}`, base, P.crimson)
            g.visible = true
            const back = (k + 1) * 0.33
            g.x = Math.round(hd.s.x + (headRest(i).x - p.x) * back)
            g.y = Math.round(hd.s.y + (headRest(i).y - 8 - p.y) * back)
          }
        }
        if (active && !busy) {
          // barra de tempo acima da cabeça
          const left = Math.max(0, 1 - roundT / PER)
          const bx = Math.round(p.x - 12)
          const by = Math.round(hd.s.y - 6)
          const low = left < 0.3
          bar.rect(bx - 1, by - 1, 26, 5).fill(P.void)
          bar.rect(bx, by, 24, 3).fill(P.blood0)
          bar
            .rect(bx, by, Math.round(24 * left), 3)
            .fill(low && Math.floor(c.time * 6) % 2 ? P.redHot : low ? P.red : P.gold)
          bar.rect(bx, by, Math.round(24 * left), 1).fill(low ? P.redGlow : P.goldHi)
        }
      }
      if (!heads.some((hd) => c.time - hd.attackT >= WIND && c.time - hd.attackT < WIND + LUNGE))
        for (const g of ghosts) g.visible = false

      // brasas e brilho saindo dos rasgos do corpo
      if (body.visible && !c.reduced && c.rnd() < dt * 8)
        embers.spark(bodyX + (c.rnd() - 0.5) * bw * 0.5, bodyY + sinkY, 12, 0, -40)
      embers.update(dt, c.time)
      sparkles.update(dt)
      debris.update(dt)
    },
    key(k, down) {
      if (!down) return
      const i = k === '1' ? 0 : k === '2' ? 1 : k === '3' ? 2 : -1
      const o = opts[i]
      if (o && !o.b.disabled) o.b.click()
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        const live = opts.filter((x) => !x.b.disabled)
        const cur = live.findIndex((x) => x.b === document.activeElement)
        const n = live[(cur + (k === 'ArrowDown' ? 1 : -1) + live.length) % live.length]
        n?.b.focus({ preventScroll: true })
      }
    },
    hint() {
      const o = opts.find((x) => x.ok)
      if (!o || busy || over) return false
      hintPulse(o.b)
      return true
    },
    clear() {
      const o = opts.find((x) => x.ok)
      if (!o || busy || over || attacking) return false
      choose(true, o.b)
      return true
    },
    dispose() {
      timers.clear()
      embers?.destroy()
      ui?.remove()
      root.destroy({ children: true })
      heads = []
    },
  }
}
