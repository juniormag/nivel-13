// Fase 7 · 8 de Janeiro: rasgue as minutas do golpe antes que alcancem a Praça dos Três Poderes.
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect } from './util'

interface Minuta {
  x: number
  y: number
  tx: number
  ty: number
  sp: number
  ph: number
  target: number
}

interface Building {
  x: number
  w: number
  h: number
  kind: 'stf' | 'congresso' | 'planalto'
  dmg: number
}

export function defesaGame(): MicroGame {
  let c: GameCtx
  let ms: Minuta[] = []
  let bs: Building[] = []
  let spawn = 1
  let ground = 0

  function drawBuilding(g: CanvasRenderingContext2D, b: Building) {
    const y = ground
    const stone = b.dmg > 1 ? '#8a7f74' : '#e6dccb'
    const shade = b.dmg > 1 ? '#5a524c' : '#b8ab98'
    if (b.kind === 'congresso') {
      rect(g, b.x, y - 6, b.w, 6, stone)
      rect(g, b.x, y - 6, b.w, 1, '#ffffff')
      // torres gêmeas
      const cx = b.x + b.w / 2
      rect(g, cx - 5, y - b.h, 4, b.h - 6, stone)
      rect(g, cx + 1, y - b.h, 4, b.h - 6, stone)
      rect(g, cx - 1, y - b.h + 6, 2, 2, shade)
      for (let k = 0; k < b.h - 8; k += 3) {
        rect(g, cx - 4, y - b.h + 2 + k, 2, 1, shade)
        rect(g, cx + 2, y - b.h + 2 + k, 2, 1, shade)
      }
      // cúpulas
      for (let a = 0; a < 7; a++) {
        rect(g, b.x + 4 + a, y - 8 - Math.round(Math.sqrt(9 - (a - 3) ** 2)), 1, 2, stone)
        rect(g, b.x + b.w - 11 + a, y - 7 + Math.round(Math.sqrt(9 - (a - 3) ** 2)) - 3, 1, 2, stone)
      }
      rect(g, b.x + b.w - 12, y - 7, 9, 1, stone)
    } else {
      rect(g, b.x, y - b.h, b.w, b.h, shade)
      rect(g, b.x - 2, y - b.h - 2, b.w + 4, 2, stone)
      rect(g, b.x - 2, y - 2, b.w + 4, 2, stone)
      for (let k = 2; k < b.w; k += 4) rect(g, b.x + k, y - b.h, 1, b.h, stone)
      if (b.kind === 'stf') rect(g, b.x + b.w / 2 - 1, y - b.h - 5, 2, 3, '#f5c04a')
    }
    if (b.dmg > 0) {
      g.fillStyle = '#0a0a0f'
      for (let k = 0; k < 4 + b.dmg * 4; k++)
        g.fillRect(Math.round(b.x + ((k * 37) % b.w)), Math.round(y - ((k * 13) % b.h) - 1), 1, 2)
    }
  }

  return {
    duration: 30,
    goal: 750,
    init(ctx) {
      c = ctx
      ground = c.bottom - 18
      const span = Math.min(c.W - 20, 260)
      const x0 = c.W / 2 - span / 2
      bs = [
        { x: x0, w: span * 0.22, h: 14, kind: 'stf', dmg: 0 },
        { x: x0 + span * 0.32, w: span * 0.36, h: 34, kind: 'congresso', dmg: 0 },
        { x: x0 + span * 0.76, w: span * 0.24, h: 12, kind: 'planalto', dmg: 0 },
      ]
    },
    update(dt) {
      spawn -= dt
      if (spawn <= 0) {
        spawn = Math.max(0.42, 1.25 - c.time * 0.03)
        const target = Math.floor(c.rnd() * 3)
        const b = bs[target]
        if (b)
          ms.push({
            x: c.rnd() * c.W,
            y: c.top - 6,
            tx: b.x + b.w / 2,
            ty: ground - b.h / 2,
            sp: 22 + c.time * 1.1 + c.rnd() * 10,
            ph: c.rnd() * 6,
            target,
          })
      }
      for (const m of ms) {
        const dx = m.tx - m.x
        const dy = m.ty - m.y
        const d = Math.hypot(dx, dy) || 1
        m.x += (dx / d) * m.sp * dt + Math.sin(c.time * 3 + m.ph) * 12 * dt
        m.y += (dy / d) * m.sp * dt
        if (d < 4) {
          m.sp = -1
          const b = bs[m.target]
          if (b) b.dmg++
          c.burst(m.x, m.y, '#ff3b3b', 14)
          c.hit(m.x, m.y)
        }
      }
      ms = ms.filter((m) => m.sp > 0)
    },
    draw(g) {
      rect(g, 0, ground, c.W, c.H - ground, '#1a1214')
      rect(g, 0, ground, c.W, 1, '#5a2a22')
      for (const b of bs) drawBuilding(g, b)
      for (const m of ms)
        drawSprite(g, 'minuta', m.x, m.y, { center: true, rot: Math.sin(c.time * 5 + m.ph) * 0.4 })
    },
    down(x, y) {
      let best = -1
      let bd = 12
      ms.forEach((m, i) => {
        const d = Math.hypot(m.x - x, m.y - y)
        if (d < bd) {
          bd = d
          best = i
        }
      })
      const m = ms[best]
      if (!m) {
        c.sfx('tap')
        return
      }
      m.sp = -1
      ms = ms.filter((o) => o.sp > 0)
      c.addScore(30, m.x, m.y)
      c.burst(m.x, m.y, '#f4efe6', 12)
      c.burst(m.x, m.y, '#e3242b', 4)
      c.sfx('swipe')
    },
    clear() {
      if (!ms.length) return false
      for (const m of ms) c.burst(m.x, m.y, '#f4efe6', 8)
      c.addScore(ms.length * 30)
      ms = []
      return true
    },
    timeUp() {
      return true
    },
  }
}
