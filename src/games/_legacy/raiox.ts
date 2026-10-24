// Fase 10 · Raio-X: as malas passam pelo scanner; segure só as que trazem joias.
import { drawSprite, sprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect, text } from './util'

interface Bag {
  x: number
  items: string[]
  jewel: boolean
  seized: number
  w: number
  col: string
}

const XR = {
  k: '#1d5a78',
  x: '#9fe6ff',
  w: '#e0faff',
  c: '#e0faff',
  g: '#9fe6ff',
  r: '#9fe6ff',
  y: '#e0faff',
  G: '#5ab0d0',
  R: '#5ab0d0',
  e: '#9fe6ff',
  E: '#5ab0d0',
  u: '#9fe6ff',
  U: '#5ab0d0',
}
const CLEAN = ['camisa', 'livro', 'camera', 'sapato']
const BAG_COLS = ['#5a3a2a', '#2a3a5a', '#3a2a4a', '#4a4a30', '#5a2a2a']

export function raioxGame(): MicroGame {
  let c: GameCtx
  let bags: Bag[] = []
  let spawn = 0.3
  let beltY = 0
  let sx0 = 0
  let sx1 = 0
  let speed = 30
  let revealAll = 0
  let stamp: { x: number; t: number } | null = null

  const bagH = 22

  function seize(b: Bag) {
    b.seized = c.time
    if (b.jewel) {
      c.addScore(70, b.x + b.w / 2, beltY - bagH)
      c.sfx('coin')
      c.burst(b.x + b.w / 2, beltY - bagH / 2, '#8fe3ff', 14)
      stamp = { x: b.x + b.w / 2, t: c.time }
    } else {
      c.addScore(-30, b.x + b.w / 2, beltY - bagH)
      c.sfx('bad')
      c.shake(2)
    }
  }

  return {
    duration: 30,
    goal: 650,
    init(ctx) {
      c = ctx
      beltY = Math.round(c.top + (c.bottom - c.top) * 0.55)
      const sw = Math.min(90, c.W * 0.36)
      sx0 = Math.round(c.W / 2 - sw / 2)
      sx1 = Math.round(c.W / 2 + sw / 2)
    },
    update(dt) {
      speed = 28 + c.time * 0.9
      revealAll = Math.max(0, revealAll - dt)
      spawn -= dt
      if (spawn <= 0) {
        const last = bags[bags.length - 1]
        if (!last || last.x > 10) {
          spawn = 0.9 + c.rnd() * 0.9 - c.time * 0.012
          const jewel = c.rnd() < 0.34
          const items = [
            CLEAN[Math.floor(c.rnd() * 4)] ?? 'camisa',
            CLEAN[Math.floor(c.rnd() * 4)] ?? 'livro',
          ]
          if (jewel) items[Math.floor(c.rnd() * 2)] = c.rnd() < 0.5 ? 'joia' : 'colar'
          bags.push({
            x: -34,
            items,
            jewel,
            seized: -1,
            w: 30,
            col: BAG_COLS[Math.floor(c.rnd() * 5)] ?? '#5a3a2a',
          })
        }
      }
      for (const b of bags) {
        if (b.seized > 0) continue
        b.x += speed * dt
        if (b.x > c.W + 2) {
          b.seized = -2
          if (b.jewel) c.hit(c.W - 6, beltY - 10)
        }
      }
      bags = bags.filter((b) => b.seized === -1 || (b.seized > 0 && c.time - b.seized < 0.6))
    },
    draw(g) {
      // esteira
      rect(g, 0, beltY, c.W, 6, '#2a2a34')
      for (let x = -((c.time * speed) % 6); x < c.W; x += 6) rect(g, x, beltY + 2, 3, 1, '#4a4a58')
      rect(g, 0, beltY + 6, c.W, 2, '#0a0a0f')
      // malas
      for (const b of bags) {
        const lift = b.seized > 0 ? (c.time - b.seized) * 50 : 0
        const y = beltY - bagH - lift
        const inScan = (b.x + b.w > sx0 && b.x < sx1) || revealAll > 0
        rect(g, b.x - 1, y - 1, b.w + 2, bagH + 2, '#0a0a0f')
        rect(g, b.x + b.w / 2 - 5, y - 4, 10, 3, '#0a0a0f')
        rect(g, b.x, y, b.w, bagH, b.col)
        rect(g, b.x, y, b.w, 1, '#ffffff22')
        if (inScan) {
          // dentro do scanner a mala vira raio-X
          g.save()
          g.beginPath()
          if (revealAll > 0) g.rect(b.x, y, b.w, bagH)
          else g.rect(Math.max(b.x, sx0), y, Math.min(b.x + b.w, sx1) - Math.max(b.x, sx0), bagH)
          g.clip()
          rect(g, b.x, y, b.w, bagH, '#0a2030')
          b.items.forEach((it, i) => {
            g.drawImage(sprite(it, XR), Math.round(b.x + 3 + i * 14), Math.round(y + 6))
          })
          g.restore()
        }
        if (b.seized > 0 && b.jewel) text(g, 'RETIDA', b.x + b.w / 2, y - 6, '#f5c04a', 8)
      }
      // scanner
      const top = beltY - bagH - 12
      rect(g, sx0 - 3, top, 3, bagH + 14, '#6b6560')
      rect(g, sx1, top, 3, bagH + 14, '#6b6560')
      rect(g, sx0 - 3, top - 3, sx1 - sx0 + 6, 3, '#b9b1a6')
      g.globalAlpha = 0.15 + Math.sin(c.time * 6) * 0.05
      rect(g, sx0, top, sx1 - sx0, bagH + 12, '#8fe3ff')
      g.globalAlpha = 1
      const scanY = top + ((c.time * 30) % (bagH + 10))
      rect(g, sx0, scanY, sx1 - sx0, 1, '#8fe3ff')
      text(g, 'RAIO-X', c.W / 2, top - 9, '#8fe3ff', 8)
      if (stamp && c.time - stamp.t < 0.8)
        drawSprite(g, 'joia', stamp.x, beltY - 50 - (c.time - stamp.t) * 20, { center: true, scale: 2 })
    },
    down(x, y) {
      const b = bags.find(
        (o) =>
          o.seized === -1 && x >= o.x - 4 && x <= o.x + o.w + 4 && y >= beltY - bagH - 14 && y <= beltY + 10,
      )
      if (b) seize(b)
      else c.sfx('tap')
    },
    hint() {
      revealAll = 4
      return true
    },
    clear() {
      const js = bags.filter((b) => b.seized === -1 && b.jewel && b.x > -20)
      if (!js.length) return false
      for (const b of js) seize(b)
      return true
    },
    timeUp() {
      return true
    },
  }
}
