// Fase 4 · Floresta em Pé: apague os focos antes que a árvore queime; replante os tocos.
import { drawSprite } from '../core/sprites'
import type { GameCtx, MicroGame } from './types'
import { rect } from './util'

interface Tree {
  x: number
  y: number
  state: 'ok' | 'fire' | 'toco' | 'broto'
  t: number
  spread: boolean
}

export function fogoGame(): MicroGame {
  let c: GameCtx
  const trees: Tree[] = []
  let spawn = 1
  let burned = 0

  function ignite(tr: Tree) {
    if (tr.state !== 'ok') return
    tr.state = 'fire'
    tr.t = 0
    tr.spread = false
  }

  function nearest(x: number, y: number, pred: (t: Tree) => boolean) {
    let best: Tree | null = null
    let bd = 13
    for (const t of trees) {
      if (!pred(t)) continue
      const d = Math.hypot(t.x - x, t.y - 5 - y)
      if (d < bd) {
        bd = d
        best = t
      }
    }
    return best
  }

  return {
    duration: 30,
    goal: 700,
    init(ctx) {
      c = ctx
      const cols = Math.max(4, Math.floor((c.W - 16) / 17))
      const rows = Math.max(3, Math.min(6, Math.floor((c.bottom - c.top - 20) / 22)))
      const gx = (c.W - 16) / cols
      const gy = (c.bottom - c.top - 20) / rows
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++)
          trees.push({
            x: 8 + gx * (k + 0.5) + (c.rnd() - 0.5) * 4 + (r % 2 ? gx / 4 : 0),
            y: c.top + 16 + gy * (r + 0.6),
            state: 'ok',
            t: 0,
            spread: false,
          })
      trees.sort((a, b) => a.y - b.y)
    },
    update(dt) {
      spawn -= dt
      if (spawn <= 0) {
        spawn = Math.max(0.55, 1.5 - c.time * 0.035)
        const ok = trees.filter((t) => t.state === 'ok')
        const pick = ok[Math.floor(c.rnd() * ok.length)]
        if (pick) ignite(pick)
      }
      for (const t of trees) {
        t.t += dt
        if (t.state === 'fire') {
          if (!t.spread && t.t > 1.8) {
            t.spread = true
            const near = trees.filter((o) => o.state === 'ok' && Math.hypot(o.x - t.x, o.y - t.y) < 26)
            const n = near[Math.floor(c.rnd() * near.length)]
            if (n && c.rnd() < 0.7) ignite(n)
          }
          if (t.t > 3.4) {
            t.state = 'toco'
            t.t = 0
            burned++
            c.burst(t.x, t.y, '#6b6560', 10)
            c.hit(t.x, t.y)
          }
        } else if (t.state === 'broto' && t.t > 4) {
          t.state = 'ok'
        }
      }
    },
    draw(g) {
      for (const t of trees) {
        rect(g, t.x - 7, t.y + 5, 14, 2, '#10200e')
        if (t.state === 'ok') drawSprite(g, 'arvore', t.x, t.y - 5, { center: true })
        else if (t.state === 'fire') {
          const k = Math.min(1, t.t / 3.4)
          drawSprite(g, 'arvore', t.x, t.y - 5, { center: true, alpha: 1 - k * 0.7 })
          const flip = Math.floor(c.time * 8 + t.x) % 2 === 0
          drawSprite(g, 'fogo', t.x, t.y - 7 - k * 3, { center: true, flip, scale: k > 0.5 ? 2 : 1 })
          if (c.rnd() < 0.3) rect(g, t.x + (c.rnd() - 0.5) * 8, t.y - 14 - c.rnd() * 10, 1, 1, '#ff7a3d')
          // aviso pulsante
          if (Math.sin(c.time * 12) > 0) rect(g, t.x - 1, t.y - 22, 2, 4, '#ff3b3b')
        } else if (t.state === 'toco') drawSprite(g, 'toco', t.x, t.y - 5, { center: true })
        else {
          const k = Math.min(1, t.t / 4)
          drawSprite(g, k < 0.5 ? 'broto' : 'arvore', t.x, t.y - 5, {
            center: true,
            alpha: k < 0.5 ? 1 : 0.6 + k * 0.4,
          })
        }
      }
    },
    down(x, y) {
      const fire = nearest(x, y, (t) => t.state === 'fire')
      if (fire) {
        fire.state = 'ok'
        fire.t = 0
        c.addScore(30, fire.x, fire.y - 10)
        c.burst(fire.x, fire.y - 6, '#8fe3ff', 12)
        c.sfx('swipe')
        return
      }
      const toco = nearest(x, y, (t) => t.state === 'toco')
      if (toco) {
        toco.state = 'broto'
        toco.t = 0
        c.addScore(15, toco.x, toco.y - 10)
        c.burst(toco.x, toco.y, '#4fae3f', 8)
        c.sfx('good')
        return
      }
      c.sfx('tap')
    },
    clear() {
      const fires = trees.filter((t) => t.state === 'fire')
      if (!fires.length) return false
      for (const f of fires) {
        f.state = 'ok'
        f.t = 0
        c.burst(f.x, f.y - 6, '#8fe3ff', 10)
      }
      c.addScore(fires.length * 30)
      return true
    },
    timeUp() {
      const alive = trees.filter((t) => t.state === 'ok' || t.state === 'broto').length
      c.addScore(alive * 10)
      return burned < trees.length / 2
    },
  }
}
