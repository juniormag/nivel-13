// Fase 12 · Farmácia Popular: pegue os remédios e as casas; deixe o boato cair no chão.
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect } from './util'

interface Item {
  x: number
  y: number
  vy: number
  kind: 'remedio' | 'casa' | 'fake'
  rot: number
}

export function pegarGame(): MicroGame {
  let c: GameCtx
  let items: Item[] = []
  let bx = 0
  let target = 0
  let spawn = 0.4
  let keyDir = 0
  let by = 0

  return {
    duration: 25,
    goal: 750,
    init(ctx) {
      c = ctx
      bx = target = c.W / 2
      by = c.bottom - 14
    },
    update(dt) {
      target += keyDir * 160 * dt
      target = Math.max(14, Math.min(c.W - 14, target))
      bx += (target - bx) * Math.min(1, dt * 14)
      spawn -= dt
      if (spawn <= 0) {
        spawn = Math.max(0.3, 0.6 - c.time * 0.012)
        const r = c.rnd()
        items.push({
          x: 12 + c.rnd() * (c.W - 24),
          y: c.top - 8,
          vy: 40 + c.time * 2 + c.rnd() * 20,
          kind: r < 0.25 ? 'fake' : r < 0.38 ? 'casa' : 'remedio',
          rot: (c.rnd() - 0.5) * 0.6,
        })
      }
      for (const it of items) {
        it.y += it.vy * dt
        if (it.y > by - 6 && it.y < by + 4 && Math.abs(it.x - bx) < 16) {
          it.vy = 0
          if (it.kind === 'fake') {
            c.burst(it.x, it.y, '#ff3b3b', 12)
            c.hit(it.x, it.y)
          } else {
            const pts = it.kind === 'casa' ? 50 : 25
            c.addScore(pts, it.x, by - 12)
            c.burst(it.x, it.y, it.kind === 'casa' ? '#f5c04a' : '#4fae3f', 8)
            c.sfx('coin')
          }
        } else if (it.y > c.H + 10) it.vy = 0
      }
      items = items.filter((i) => i.vy > 0)
    },
    draw(g) {
      rect(g, 0, by + 8, c.W, c.H, '#101a14')
      for (const it of items)
        drawSprite(g, it.kind, it.x, it.y, {
          center: true,
          rot: it.rot,
          scale: it.kind === 'remedio' ? 2 : 1,
        })
      // cesta
      rect(g, bx - 15, by - 4, 30, 2, '#0a0a0f')
      rect(g, bx - 14, by - 3, 28, 10, '#e3242b')
      rect(g, bx - 14, by - 3, 28, 1, '#ff6b6b')
      rect(g, bx - 2, by, 4, 6, '#ffffff')
      rect(g, bx - 5, by + 2, 10, 2, '#ffffff')
      rect(g, bx - 14, by + 7, 28, 1, '#0a0a0f')
    },
    down(x) {
      target = x
    },
    move(x) {
      target = x
    },
    key(k, down) {
      if (k === 'ArrowLeft' || k === 'a') keyDir = down ? -1 : keyDir === -1 ? 0 : keyDir
      if (k === 'ArrowRight' || k === 'd') keyDir = down ? 1 : keyDir === 1 ? 0 : keyDir
    },
    clear() {
      const fakes = items.filter((i) => i.kind === 'fake')
      if (!fakes.length) return false
      for (const f of fakes) c.burst(f.x, f.y, '#ff3b3b', 6)
      items = items.filter((i) => i.kind !== 'fake')
      return true
    },
    timeUp() {
      return true
    },
  }
}
