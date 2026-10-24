// Fase 13 · A Grande Fake: a hidra de boatos. Cada cabeça só cai com o fato certo.
import { h } from '../core/dom'
import { shuffle } from '../core/rng'
import type { GameCtx, MicroGame } from './types'
import { rect } from './util'

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

interface Head {
  alive: boolean
  phase: number
  dieT: number
}

export function chefeGame(): MicroGame {
  let c: GameCtx
  let heads: Head[] = []
  let round = 0
  let roundT = 0
  const per = 14
  let ui: HTMLDivElement
  let opts: HTMLButtonElement[] = []
  let busy = false
  let bodyX = 0
  let bodyY = 0
  let lunge = 0

  function headPos(i: number) {
    const n = heads.length
    const spread = Math.min(c.W * 0.8, 220)
    const base = bodyX - spread / 2 + (spread / (n - 1)) * i
    const hd = heads[i]
    const sway = Math.sin(c.time * 1.6 + (hd?.phase ?? 0)) * 5
    const active = i === round && hd?.alive
    const y = bodyY - 26 - Math.abs(i - (n - 1) / 2) * -4 + (active ? lunge * 10 : 0)
    return { x: base + sway, y }
  }

  function renderRound() {
    const r = ROUNDS[round]
    if (!r) return
    roundT = 0
    busy = false
    const choices = shuffle([{ t: r.right, ok: true }, ...r.wrong.map((t) => ({ t, ok: false }))], c.rnd)
    opts = choices.map((ch) => {
      const b = h('button', { class: 'boss-opt' }, ch.t)
      b.addEventListener('click', () => choose(ch.ok, b))
      ;(b as HTMLButtonElement & { ok?: boolean }).ok = ch.ok
      return b
    })
    ui.replaceChildren(
      h(
        'div',
        { class: 'boss-claim px-frame px-frame--red' },
        h('small', null, `Cabeça ${round + 1} de ${ROUNDS.length} diz`),
        `“${r.claim}”`,
      ),
      ...opts,
    )
    opts[0]?.focus({ preventScroll: true })
  }

  function choose(ok: boolean, b: HTMLButtonElement) {
    if (busy) return
    if (ok) {
      busy = true
      b.classList.add('ok')
      const hd = heads[round]
      const p = headPos(round)
      if (hd) {
        hd.alive = false
        hd.dieT = c.time
      }
      c.burst(p.x, p.y, '#f4efe6', 26)
      c.burst(p.x, p.y, '#ff3b3b', 14)
      c.shake(4)
      c.sfx('boom')
      c.addScore(200 + Math.round((1 - roundT / per) * 120), p.x, p.y)
      window.setTimeout(() => {
        round++
        if (round >= ROUNDS.length) {
          ui.remove()
          c.sfx('fanfare')
          for (let k = 0; k < 6; k++)
            c.burst(
              bodyX + (c.rnd() - 0.5) * 60,
              bodyY + (c.rnd() - 0.5) * 20,
              k % 2 ? '#f5c04a' : '#ff3b3b',
              20,
            )
          window.setTimeout(() => c.finish(), 900)
        } else renderRound()
      }, 900)
    } else {
      b.classList.add('no')
      b.disabled = true
      lunge = 1
      const p = headPos(round)
      c.hit(p.x, p.y + 20)
    }
  }

  return {
    duration: 0,
    goal: 1500,
    init(ctx) {
      c = ctx
      heads = ROUNDS.map((_, i) => ({ alive: true, phase: i * 1.3, dieT: 0 }))
      bodyX = c.W / 2
      bodyY = c.top + Math.min(80, (c.bottom - c.top) * 0.36)
      ui = h('div', { class: 'boss-ui' })
      c.layer.append(ui)
      renderRound()
    },
    update(dt) {
      lunge = Math.max(0, lunge - dt * 2.5)
      if (busy || round >= ROUNDS.length) return
      roundT += dt
      if (roundT > per) {
        roundT = 0
        lunge = 1
        const p = headPos(round)
        c.hit(p.x, p.y + 20)
      }
    },
    draw(g) {
      // corpo: massa de jornal rasgado
      const bw = Math.min(c.W * 0.5, 120)
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2
        const rr = 1 + Math.sin(k * 7.3) * 0.25
        const x = bodyX + Math.cos(a) * bw * 0.5 * rr
        const y = bodyY + 10 + Math.sin(a) * 14 * rr + Math.sin(c.time * 2 + k) * 0.8
        rect(g, x - 5, y - 4, 10, 8, k % 3 ? '#d9cfc0' : '#b9b1a6')
        rect(g, x - 3, y - 1, 6, 1, '#6b6560')
      }
      rect(g, bodyX - bw * 0.42, bodyY + 4, bw * 0.84, 14, '#efe8dc')
      for (let k = 0; k < 6; k++)
        rect(g, bodyX - bw * 0.36, bodyY + 6 + k * 2, bw * (0.5 + ((k * 13) % 7) / 20), 1, '#6b6560')
      rect(g, bodyX - bw * 0.36, bodyY + 6, bw * 0.3, 3, '#e3242b')
      // pescoços e cabeças
      heads.forEach((hd, i) => {
        const p = headPos(i)
        if (!hd.alive) {
          const k = c.time - hd.dieT
          if (k < 0.6) rect(g, p.x - 8, p.y - 6 + k * 40, 16, 4, '#6b6560')
          return
        }
        for (let s = 0; s <= 8; s++) {
          const t = s / 8
          const x = bodyX + (p.x - bodyX) * t + Math.sin(t * 3 + c.time * 2 + hd.phase) * 3
          const y = bodyY + (p.y - bodyY) * t
          rect(g, x - 2, y - 2, 5, 5, '#b9b1a6')
          rect(g, x - 2, y - 2, 5, 1, '#efe8dc')
        }
        const active = i === round
        const s = active ? 1.25 : 1
        const w = 18 * s
        const hh = 15 * s
        rect(g, p.x - w / 2 - 1, p.y - hh / 2 - 1, w + 2, hh + 2, '#0a0a0f')
        rect(g, p.x - w / 2, p.y - hh / 2, w, hh, '#efe8dc')
        rect(g, p.x - w / 2, p.y - hh / 2, w, 3 * s, '#e3242b')
        // olhos
        const blink = Math.sin(c.time * 3 + hd.phase) > 0.95
        if (!blink) {
          rect(g, p.x - 5 * s, p.y - 1 * s, 3 * s, 2 * s, active ? '#ff3b3b' : '#8e1218')
          rect(g, p.x + 2 * s, p.y - 1 * s, 3 * s, 2 * s, active ? '#ff3b3b' : '#8e1218')
        }
        // boca serrilhada
        for (let k = 0; k < 5; k++)
          rect(g, p.x - 6 * s + k * 3 * s, p.y + 4 * s + (k % 2) * s, 2 * s, s, '#0a0a0f')
        if (active) {
          const left = Math.max(0, 1 - roundT / per)
          rect(g, p.x - 12, p.y - hh / 2 - 6, 24, 3, '#3a1013')
          rect(g, p.x - 12, p.y - hh / 2 - 6, 24 * left, 3, left < 0.3 ? '#ff3b3b' : '#f5c04a')
        }
      })
    },
    hint() {
      const b = opts.find((o) => (o as HTMLButtonElement & { ok?: boolean }).ok)
      if (!b || busy) return false
      b.style.boxShadow = '0 0 0 3px var(--gold)'
      return true
    },
    clear() {
      const b = opts.find((o) => (o as HTMLButtonElement & { ok?: boolean }).ok)
      if (!b || busy) return false
      choose(true, b)
      return true
    },
  }
}
