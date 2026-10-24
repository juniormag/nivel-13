// Fase 6 · Escola que Paga: duas pistas no ritmo do baião; cada acerto é uma presença no Pé-de-Meia.
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect, text } from './util'

interface Note {
  t: number
  lane: 0 | 1
  judged: boolean
}

export function ritmoGame(): MicroGame {
  let c: GameCtx
  const notes: Note[] = []
  const beat = 60 / 116
  const travel = 1.7
  let lineY = 0
  let laneX: [number, number] = [0, 0]
  let combo = 0
  let misses = 0
  let total = 0
  let flash: { lane: number; t: number; txt: string; col: string } | null = null
  let jar = 0

  function judge(lane: 0 | 1) {
    const now = c.time
    let best: Note | null = null
    let bd = 0.17
    for (const n of notes) {
      if (n.judged || n.lane !== lane) continue
      const d = Math.abs(n.t - now)
      if (d < bd) {
        bd = d
        best = n
      }
    }
    if (!best) {
      c.sfx('tap')
      return
    }
    best.judged = true
    combo++
    jar++
    const perfect = bd < 0.075
    const pts = (perfect ? 100 : 60) + Math.min(combo, 20) * 2
    c.addScore(pts, laneX[lane], lineY - 10)
    c.burst(laneX[lane], lineY, perfect ? '#f5c04a' : '#efe8dc', perfect ? 10 : 5)
    c.sfx(perfect ? 'coin' : 'good')
    flash = { lane, t: now, txt: perfect ? 'PERFEITO' : 'BOM', col: perfect ? '#f5c04a' : '#efe8dc' }
  }

  return {
    duration: 26,
    goal: 2600,
    init(ctx) {
      c = ctx
      lineY = c.bottom - 30
      laneX = [Math.round(c.W / 2 - Math.min(48, c.W * 0.22)), Math.round(c.W / 2 + Math.min(48, c.W * 0.22))]
      // partitura: semínimas com colcheias e pausas, começando devagar
      let t = 2
      let lane: 0 | 1 = 0
      while (t < 25.5) {
        notes.push({ t, lane, judged: false })
        const r = c.rnd()
        lane = r < 0.55 ? (lane ? 0 : 1) : lane
        t += t > 12 && r < 0.3 ? beat / 2 : r > 0.85 ? beat * 2 : beat
      }
      total = notes.length
    },
    update() {
      for (const n of notes) {
        if (!n.judged && c.time - n.t > 0.18) {
          n.judged = true
          combo = 0
          misses++
          if (misses % 4 === 0) c.hit(laneX[n.lane], lineY)
          else c.sfx('tick')
        }
      }
    },
    draw(g) {
      const top = c.top + 6
      for (const lane of [0, 1] as const) {
        const x = laneX[lane]
        rect(g, x - 13, top, 26, lineY - top + 10, 'rgba(255,255,255,0.04)')
        rect(g, x - 13, top, 1, lineY - top + 10, '#2a1a2e')
        rect(g, x + 12, top, 1, lineY - top + 10, '#2a1a2e')
        const lit = flash && flash.lane === lane && c.time - flash.t < 0.12
        rect(g, x - 13, lineY - 1, 26, 3, lit ? '#f5c04a' : '#e3242b')
      }
      for (const n of notes) {
        if (n.judged) continue
        const k = 1 - (n.t - c.time) / travel
        if (k < 0) continue
        const y = top + (lineY - top) * k
        drawSprite(g, n.lane ? 'livro' : 'moeda', laneX[n.lane], y, { center: true, scale: 2 })
      }
      if (flash && c.time - flash.t < 0.5)
        text(g, flash.txt, laneX[flash.lane as 0 | 1], lineY + 14, flash.col, 8)
      // o porquinho enche
      const fill = Math.min(1, jar / Math.max(1, total * 0.8))
      const px = c.W / 2
      const py = lineY - 30
      drawSprite(g, 'cofre', px, py, { center: true, scale: 2 })
      rect(g, px - 14, py + 16, 28, 3, '#3a1013')
      rect(g, px - 14, py + 16, 28 * fill, 3, '#f5c04a')
      if (combo > 3) text(g, `${combo}x`, px, py - 18, '#ff7a3d', 8)
      text(g, '←', laneX[0], lineY + 26, '#7d766f', 8)
      text(g, '→', laneX[1], lineY + 26, '#7d766f', 8)
    },
    down(x) {
      judge(x < c.W / 2 ? 0 : 1)
    },
    key(k, down) {
      if (!down) return
      if (k === 'ArrowLeft' || k === 'f' || k === 'a') judge(0)
      if (k === 'ArrowRight' || k === 'j' || k === 'l') judge(1)
    },
    clear() {
      const near = notes.filter((n) => !n.judged && n.t - c.time < travel && n.t - c.time > -0.1)
      if (!near.length) return false
      for (const n of near) {
        n.judged = true
        jar++
        c.addScore(100)
      }
      return true
    },
    timeUp() {
      return jar >= total * 0.5
    },
  }
}
