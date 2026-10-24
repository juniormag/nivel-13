// Fase 5 · Carteira Assinada: vagas aparecem nas janelas; o golpe do emprego falso também.
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect, text } from './util'

interface Win {
  x: number
  y: number
  w: number
  h: number
  item: null | { good: boolean; t0: number; life: number; hitT: number }
}

export function whackGame(): MicroGame {
  let c: GameCtx
  const wins: Win[] = []
  let spawn = 0.6
  let bx = 0
  let by = 0
  let bw = 0
  let bh = 0

  return {
    duration: 25,
    goal: 1000,
    init(ctx) {
      c = ctx
      const portrait = c.W < c.H
      const cols = portrait ? 3 : 5
      const rows = portrait ? 4 : 3
      const availH = c.bottom - c.top - 26
      const cw = Math.min(30, Math.floor((c.W - 30) / cols) - 4)
      const ch = Math.min(26, Math.floor(availH / rows) - 6)
      bw = cols * (cw + 6) + 10
      bh = rows * (ch + 6) + 16
      bx = Math.round(c.W / 2 - bw / 2)
      by = Math.round(c.top + 18 + (availH - bh) / 2)
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++)
          wins.push({ x: bx + 8 + k * (cw + 6), y: by + 14 + r * (ch + 6), w: cw, h: ch, item: null })
    },
    update(dt) {
      spawn -= dt
      if (spawn <= 0) {
        spawn = Math.max(0.32, 0.7 - c.time * 0.016)
        const free = wins.filter((w) => !w.item)
        const w = free[Math.floor(c.rnd() * free.length)]
        if (w)
          w.item = { good: c.rnd() > 0.3, t0: c.time, life: Math.max(0.8, 1.4 - c.time * 0.02), hitT: -1 }
      }
      for (const w of wins) {
        const it = w.item
        if (!it) continue
        if (it.hitT > 0 && c.time - it.hitT > 0.25) w.item = null
        else if (it.hitT < 0 && c.time - it.t0 > it.life) w.item = null
      }
    },
    draw(g) {
      // prédio
      rect(g, bx - 2, by - 2, bw + 4, bh + 4, '#0a0a0f')
      rect(g, bx, by, bw, bh, '#1c1a2e')
      rect(g, bx, by, bw, 2, '#3a3550')
      rect(g, bx + bw / 2 - 18, by - 10, 36, 10, '#e3242b')
      text(g, 'VAGAS', bx + bw / 2, by - 5, '#ffffff', 8)
      for (const w of wins) {
        const it = w.item
        rect(g, w.x - 1, w.y - 1, w.w + 2, w.h + 2, '#0a0a0f')
        rect(g, w.x, w.y, w.w, w.h, it ? (it.good ? '#ffd27a' : '#5a1416') : '#2a2640')
        rect(g, w.x, w.y + w.h - 2, w.w, 2, '#3a3550')
        if (!it) continue
        const age = c.time - it.t0
        const pop = Math.min(1, age / 0.12)
        const leaving = Math.max(0, (age - it.life + 0.15) / 0.15)
        const yo = (1 - pop) * 8 + leaving * 8 + (it.hitT > 0 ? -(c.time - it.hitT) * 30 : 0)
        g.save()
        g.beginPath()
        g.rect(w.x, w.y, w.w, w.h)
        g.clip()
        drawSprite(g, it.good ? 'carteira' : 'golpe', w.x + w.w / 2, w.y + w.h / 2 + yo, { center: true })
        g.restore()
        if (!it.good && it.hitT < 0) text(g, 'PIX?', w.x + w.w / 2, w.y + 4, '#ffffff', 8)
      }
    },
    down(x, y) {
      const w = wins.find((o) => x >= o.x - 3 && x <= o.x + o.w + 3 && y >= o.y - 3 && y <= o.y + o.h + 3)
      const it = w?.item
      if (!w || !it || it.hitT > 0) {
        c.sfx('tap')
        return
      }
      it.hitT = c.time
      if (it.good) {
        c.addScore(60, w.x + w.w / 2, w.y)
        c.burst(w.x + w.w / 2, w.y + w.h / 2, '#2f5fd0', 10)
        c.sfx('coin')
      } else {
        c.hit(w.x + w.w / 2, w.y + w.h / 2)
      }
    },
    clear() {
      let n = 0
      for (const w of wins) {
        if (!w.item || w.item.hitT > 0) continue
        if (w.item.good) c.addScore(60, w.x + w.w / 2, w.y)
        w.item.hitT = c.time
        n++
      }
      return n > 0
    },
    timeUp() {
      return true
    },
  }
}
