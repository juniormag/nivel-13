// Fase 1 · Mapa da Fome: pinte o Brasil de verde levando comida a cada canto.
// Implementação de referência do contrato MicroGame em PixiJS (modo retido + juice).
import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { LAT0, LAT1, LON0, LON1, inBrazil } from '../content/brazil'
import { px } from '../engine/textures'
import type { GameCtx, MicroGame } from '../engine/types'

interface Tile {
  i: number
  j: number
  green: boolean
  t: number
  s: Sprite
}

const RED = [0x8e1218, 0xa51419]
const GREEN = [0x3b8f31, 0x4fae3f]

export default function mapa(): MicroGame {
  let c: GameCtx
  const root = new Container()
  let tiles: Tile[] = []
  const grid = new Map<string, Tile>()
  let ts = 4
  let ox = 0
  let oy = 0
  let crisisT = 9
  let done = false
  const bar = new Graphics()
  let label: Text

  const pct = () => tiles.filter((t) => t.green).length / Math.max(1, tiles.length)

  function feed(cx: number, cy: number, radius: number) {
    let n = 0
    for (const t of tiles) {
      if (t.green) continue
      const d = Math.hypot(t.i - cx, t.j - cy)
      if (d <= radius) {
        t.green = true
        t.t = c.time + d * 0.04
        n++
      }
    }
    return n
  }

  function drawBar() {
    const p = pct()
    const bw = Math.min(c.W - 40, 160)
    const by = c.bottom - 12
    const x0 = Math.round(c.W / 2 - bw / 2)
    bar.clear()
    bar.rect(x0 - 1, by - 1, bw + 2, 6).fill(0x0a0a0f)
    bar.rect(x0, by, bw, 4).fill(0x3a1013)
    bar.rect(x0, by, Math.round(bw * p), 4).fill(0x4fae3f)
    bar.rect(x0 + Math.round(bw * 0.85), by - 2, 1, 8).fill(0xf5c04a)
    label.text = `ALIMENTADO ${Math.round(p * 100)}%`
    label.y = by - 8
  }

  return {
    duration: 35,
    goal: 900,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      const availW = c.W - 12
      const availH = c.bottom - c.top - 26
      const size = Math.min(availW, availH)
      ts = Math.max(3, Math.floor(size / 30))
      const cols = Math.floor(size / ts)
      ox = Math.round(c.W / 2 - (cols * ts) / 2)
      oy = Math.round(c.top + 6 + (availH - cols * ts) / 2)
      const edges = new Graphics()
      for (let j = 0; j < cols; j++)
        for (let i = 0; i < cols; i++) {
          const lon = LON0 + ((i + 0.5) / cols) * (LON1 - LON0)
          const lat = LAT0 + ((j + 0.5) / cols) * (LAT1 - LAT0)
          if (!inBrazil(lon, lat)) continue
          const s = new Sprite(px())
          s.x = ox + i * ts
          s.y = oy + j * ts
          s.width = ts
          s.height = ts
          s.tint = RED[(i + j) % 2] ?? 0x8e1218
          root.addChild(s)
          const t = { i, j, green: false, t: 0, s }
          tiles.push(t)
          grid.set(`${i},${j}`, t)
        }
      for (const t of tiles) {
        const x = ox + t.i * ts
        const y = oy + t.j * ts
        if (!grid.has(`${t.i},${t.j - 1}`)) edges.rect(x, y, ts, 1).fill(0xefe8dc)
        if (!grid.has(`${t.i - 1},${t.j}`)) edges.rect(x, y, 1, ts).fill(0xefe8dc)
        if (!grid.has(`${t.i},${t.j + 1}`)) edges.rect(x, y + ts - 1, ts, 1).fill(0x6b6560)
        if (!grid.has(`${t.i + 1},${t.j}`)) edges.rect(x + ts - 1, y, 1, ts).fill(0x6b6560)
      }
      root.addChild(edges, bar)
      label = new Text({ text: '', style: { fontFamily: 'Silkscreen', fontSize: 8, fill: 0xefe8dc, stroke: { color: 0, width: 2 } }, resolution: 1 })
      label.anchor.set(0.5)
      label.x = Math.round(c.W / 2)
      root.addChild(label)
      drawBar()
    },
    update(dt) {
      if (done) return
      crisisT -= dt
      if (crisisT <= 0 && c.time > 8) {
        crisisT = Math.max(1.6, 3 - c.time * 0.04)
        const greens = tiles.filter((t) => t.green)
        const pick = greens[Math.floor(c.rnd() * greens.length)]
        if (pick) {
          for (const t of tiles) if (Math.hypot(t.i - pick.i, t.j - pick.j) <= 1.5) t.green = false
          c.fx.burst(ox + pick.i * ts + ts / 2, oy + pick.j * ts + ts / 2, 0xff3b3b, 8)
          c.fx.ring(ox + pick.i * ts + ts / 2, oy + pick.j * ts + ts / 2, 0xff3b3b, 10)
        }
      }
      const now = c.time
      for (const t of tiles) {
        if (t.green) {
          const grow = (now - t.t) / 0.22
          t.s.tint = grow < 0 ? (RED[(t.i + t.j) % 2] ?? 0x8e1218) : grow < 1 ? 0xf5c04a : (GREEN[(t.i + t.j) % 2] ?? 0x4fae3f)
        } else {
          const flick = Math.sin(now * 3 + t.i * 0.7 + t.j * 1.3) > 0.9
          t.s.tint = flick ? 0xe3242b : (RED[(t.i + t.j) % 2] ?? 0x8e1218)
        }
      }
      drawBar()
      if (pct() >= 0.85) {
        done = true
        c.addScore(Math.round(pct() * 1000))
        c.fx.flash(0x4fae3f, 260, 0.25)
        c.finish()
      }
    },
    down(x, y) {
      if (done) return
      const i = Math.floor((x - ox) / ts)
      const j = Math.floor((y - oy) / ts)
      const n = feed(i, j, 2.4)
      if (n > 0) {
        c.addScore(n * 4, x, y - 6)
        c.sfx('good')
        c.fx.burst(x, y, 0x4fae3f, 10)
        c.fx.ring(x, y, 0xf5c04a, 14)
      } else c.sfx('tap')
    },
    clear() {
      const reds = tiles.filter((t) => !t.green)
      const pick = reds[Math.floor(c.rnd() * reds.length)]
      if (!pick) return false
      feed(pick.i, pick.j, 6)
      c.fx.ring(ox + pick.i * ts, oy + pick.j * ts, 0xf5c04a, 40)
      return true
    },
    timeUp() {
      c.addScore(Math.round(pct() * 1000) - 200)
      return pct() >= 0.5
    },
    dispose() {
      root.destroy({ children: true })
      tiles = []
    },
  }
}
