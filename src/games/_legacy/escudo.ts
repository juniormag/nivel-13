// Fase 11 · Soberania: gire o escudo em volta do Brasil e bloqueie tarifas e sanções.

import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect, ring } from './util'

interface Shot {
  a: number
  r: number
  sp: number
}

export function escudoGame(): MicroGame {
  let c: GameCtx
  let cx = 0
  let cy = 0
  let R = 30
  let ang = -Math.PI / 4
  const arc = 1.25
  let shots: Shot[] = []
  let spawn = 0.8
  let keyDir = 0
  const mapPx: [number, number][] = []
  let dragging = false

  const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  return {
    duration: 30,
    goal: 750,
    init(ctx) {
      c = ctx
      cx = Math.round(c.W / 2)
      cy = Math.round((c.top + c.bottom) / 2)
      R = Math.round(Math.min(c.W, c.bottom - c.top) * 0.2)
      const size = Math.round(R * 1.1)
      for (let j = 0; j < size; j++)
        for (let i = 0; i < size; i++) {
          const lon = LON0 + ((i + 0.5) / size) * (LON1 - LON0)
          const lat = LAT0 + ((j + 0.5) / size) * (LAT1 - LAT0)
          if (inBrazil(lon, lat)) mapPx.push([i - size / 2, j - size / 2])
        }
    },
    update(dt) {
      ang += keyDir * 4.2 * dt
      spawn -= dt
      if (spawn <= 0) {
        spawn = Math.max(0.38, 1 - c.time * 0.022)
        // a maioria vem de cima à direita (o norte do mapa)
        const a = c.rnd() < 0.6 ? -Math.PI / 4 + (c.rnd() - 0.5) * 1.6 : c.rnd() * Math.PI * 2
        shots.push({ a, r: Math.max(c.W, c.H) * 0.6, sp: 46 + c.time * 1.4 + c.rnd() * 14 })
      }
      for (const s of shots) {
        const prev = s.r
        s.r -= s.sp * dt
        if (prev > R && s.r <= R && Math.abs(angDiff(s.a, ang)) < arc / 2) {
          s.sp = 0
          const x = cx + Math.cos(s.a) * R
          const y = cy + Math.sin(s.a) * R
          c.addScore(30, x, y)
          c.burst(x, y, '#f5c04a', 8)
          c.sfx('tap')
        } else if (s.r < 9) {
          s.sp = 0
          c.burst(cx, cy, '#ff3b3b', 14)
          c.hit(cx, cy)
        }
      }
      shots = shots.filter((s) => s.sp > 0)
    },
    draw(g) {
      ring(g, cx, cy, R, '#2a2440', 0.05)
      ring(g, cx, cy, R * 1.9, '#1a1626', 0.04)
      // Brasil
      for (const [x, y] of mapPx) rect(g, cx + x, cy + y, 1, 1, (x + y) % 5 === 0 ? '#f7d61c' : '#1f8a3a')
      // escudo
      for (let a = -arc / 2; a <= arc / 2; a += 0.025) {
        const x = cx + Math.cos(ang + a) * R
        const y = cy + Math.sin(ang + a) * R
        rect(g, x - 1, y - 1, 3, 3, '#f5c04a')
        rect(g, cx + Math.cos(ang + a) * (R + 2), cy + Math.sin(ang + a) * (R + 2), 1, 1, '#ffe29a')
      }
      for (const s of shots) {
        const x = cx + Math.cos(s.a) * s.r
        const y = cy + Math.sin(s.a) * s.r
        drawSprite(g, 'tarifa', x, y, { center: true, rot: s.a + Math.PI })
      }
    },
    down(x, y) {
      dragging = true
      ang = Math.atan2(y - cy, x - cx)
    },
    move(x, y) {
      if (dragging) ang = Math.atan2(y - cy, x - cx)
    },
    up() {
      dragging = false
    },
    key(k, down) {
      if (k === 'ArrowLeft' || k === 'a') keyDir = down ? -1 : keyDir === -1 ? 0 : keyDir
      if (k === 'ArrowRight' || k === 'd') keyDir = down ? 1 : keyDir === 1 ? 0 : keyDir
    },
    clear() {
      if (!shots.length) return false
      for (const s of shots) c.burst(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r, '#f5c04a', 6)
      c.addScore(shots.length * 30)
      shots = []
      return true
    },
    timeUp() {
      return true
    },
  }
}
