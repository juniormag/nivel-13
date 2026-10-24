// Fase 1 · Mapa da Fome: pinte o Brasil de verde levando comida a cada canto.

import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect, text } from './util'

interface Tile {
  i: number
  j: number
  green: boolean
  t: number
}

export function mapaGame(): MicroGame {
  let c: GameCtx
  let tiles: Tile[] = []
  const grid = new Map<string, Tile>()
  let ts = 4
  let ox = 0
  let oy = 0
  let crisisT = 0
  let pops: { x: number; y: number; t: number }[] = []
  let done = false

  const pct = () => tiles.filter((t) => t.green).length / Math.max(1, tiles.length)

  function feed(cx: number, cy: number, radius: number) {
    let n = 0
    for (const t of tiles) {
      if (t.green) continue
      const d = Math.hypot(t.i - cx, t.j - cy)
      if (d <= radius) {
        t.green = true
        t.t = c.time + d * 0.05
        n++
      }
    }
    return n
  }

  return {
    duration: 35,
    goal: 900,
    init(ctx) {
      c = ctx
      const availW = c.W - 12
      const availH = c.bottom - c.top - 26
      const size = Math.min(availW, availH)
      ts = Math.max(3, Math.floor(size / 30))
      const cols = Math.floor(size / ts)
      ox = Math.round(c.W / 2 - (cols * ts) / 2)
      oy = Math.round(c.top + 6 + (availH - cols * ts) / 2)
      tiles = []
      for (let j = 0; j < cols; j++)
        for (let i = 0; i < cols; i++) {
          const lon = LON0 + ((i + 0.5) / cols) * (LON1 - LON0)
          const lat = LAT0 + ((j + 0.5) / cols) * (LAT1 - LAT0)
          if (!inBrazil(lon, lat)) continue
          const t = { i, j, green: false, t: 0 }
          tiles.push(t)
          grid.set(`${i},${j}`, t)
        }
      crisisT = 9
    },
    update(dt) {
      if (done) return
      crisisT -= dt
      if (crisisT <= 0 && c.time > 8) {
        // crise: um pedaço volta a ficar vermelho
        crisisT = Math.max(1.6, 3 - c.time * 0.04)
        const greens = tiles.filter((t) => t.green)
        const pick = greens[Math.floor(c.rnd() * greens.length)]
        if (pick) {
          for (const t of tiles) if (Math.hypot(t.i - pick.i, t.j - pick.j) <= 1.5) t.green = false
          c.burst(ox + pick.i * ts + ts / 2, oy + pick.j * ts + ts / 2, '#ff3b3b', 6)
        }
      }
      pops = pops.filter((p) => c.time - p.t < 0.6)
      if (pct() >= 0.85) {
        done = true
        c.addScore(Math.round(pct() * 1000))
        c.sfx('level')
        c.finish()
      }
    },
    draw(g) {
      const now = c.time
      for (const t of tiles) {
        const x = ox + t.i * ts
        const y = oy + t.j * ts
        let col: string
        if (t.green) {
          const grow = Math.min(1, Math.max(0, (now - t.t) / 0.25))
          col = grow < 1 ? '#f5c04a' : (t.i + t.j) % 2 ? '#3b8f31' : '#4fae3f'
        } else {
          const flick = Math.sin(now * 3 + t.i * 0.7 + t.j * 1.3) > 0.85
          col = flick ? '#e3242b' : (t.i + t.j) % 2 ? '#8e1218' : '#a51419'
        }
        rect(g, x, y, ts, ts, col)
        // borda
        if (!grid.has(`${t.i},${t.j - 1}`)) rect(g, x, y, ts, 1, '#efe8dc')
        if (!grid.has(`${t.i - 1},${t.j}`)) rect(g, x, y, 1, ts, '#efe8dc')
        if (!grid.has(`${t.i},${t.j + 1}`)) rect(g, x, y + ts - 1, ts, 1, '#6b6560')
        if (!grid.has(`${t.i + 1},${t.j}`)) rect(g, x + ts - 1, y, 1, ts, '#6b6560')
      }
      for (const p of pops) {
        const k = (now - p.t) / 0.6
        drawSprite(g, 'prato', p.x, p.y - k * 10, { center: true, alpha: 1 - k })
      }
      // barra de progresso
      const p = pct()
      const bw = Math.min(c.W - 40, 160)
      const by = c.bottom - 14
      rect(g, c.W / 2 - bw / 2 - 1, by - 1, bw + 2, 6, '#0a0a0f')
      rect(g, c.W / 2 - bw / 2, by, bw, 4, '#3a1013')
      rect(g, c.W / 2 - bw / 2, by, bw * p, 4, '#4fae3f')
      rect(g, c.W / 2 - bw / 2 + bw * 0.85, by - 2, 1, 8, '#f5c04a')
      text(g, `ALIMENTADO ${Math.round(p * 100)}%`, c.W / 2, by - 8, '#efe8dc', 8)
    },
    down(x, y) {
      if (done) return
      const i = Math.floor((x - ox) / ts)
      const j = Math.floor((y - oy) / ts)
      const n = feed(i, j, 2.4)
      if (n > 0) {
        c.addScore(n * 4, x, y)
        c.sfx('good')
        pops.push({ x, y, t: c.time })
        c.burst(x, y, '#4fae3f', 8)
      } else c.sfx('tap')
    },
    clear() {
      const reds = tiles.filter((t) => !t.green)
      const pick = reds[Math.floor(c.rnd() * reds.length)]
      if (!pick) return false
      feed(pick.i, pick.j, 6)
      c.burst(ox + pick.i * ts, oy + pick.j * ts, '#f5c04a', 24)
      return true
    },
    timeUp() {
      c.addScore(Math.round(pct() * 1000) - 200)
      return pct() >= 0.5
    },
  }
}
