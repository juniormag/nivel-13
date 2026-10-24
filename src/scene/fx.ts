// Partículas e luzes 2D do mundo: brasas que sobem, faíscas soltas pela cabeça das fitas,
// brilhos de 4 pontas (ciclo de 6 quadros), raios de luz verticais com estrela, explosão dourada
// e poeira. Tudo interativo: o dedo/ponteiro empurra e gira as partículas, a inclinação do
// aparelho vira vento e um toque faz brotar brilhos. Só cores da paleta, posições inteiras.
import { bayer, EMBER_AGE, GOLD_AGE, HEX, type K } from './pal'
import { drawSparkle } from './props'

const SPARK_AGE: K[] = ['white', 'goldHi', 'redGlow', 'red', 'crimsonDeep']
const DUST_AGE: K[] = ['stone2', 'haze', 'hazeDark']

interface P {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  ramp: K[]
  g: number
  /** 0 brasa (sobe com ondulação), 1 faísca/explosão (balística), 2 poeira */
  kind: number
  size: number
  ph: number
}

interface Sparkle {
  x: number
  y: number
  t0: number
}

export interface Beam {
  x: number
  y: number
  up: number
  down: number
  ph: number
  period: number
}

export class Fx {
  ps: P[] = []
  sparkles: Sparkle[] = []
  beams: Beam[] = []
  max: number
  reduced: boolean
  wind = 0
  pointer = { x: -999, y: -999, vx: 0, vy: 0, on: false }
  private nextSparkle = 0
  private emberAcc = 0
  private sparkAcc = 0

  constructor(mobile: boolean, reduced: boolean) {
    this.max = mobile ? 120 : 300
    this.reduced = reduced
  }

  private add(p: Omit<P, 'age' | 'ph'>) {
    if (this.ps.length >= this.max) return
    this.ps.push({ ...p, age: 0, ph: Math.random() * 6.28 })
  }

  /** brasa subindo (regra 27): 8–20 px/s para cima, ondulação ±6 px/s */
  ember(x: number, y: number) {
    this.add({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -(8 + Math.random() * 12),
      life: 1 + Math.random() * 1.6,
      ramp: EMBER_AGE,
      g: 0,
      kind: 0,
      size: Math.random() < 0.25 ? 2 : 1,
    })
  }

  /** faísca solta pela cabeça da fita: herda 0,3 da tangente + 6–14 px/s aleatório, gravidade 4 */
  spark(x: number, y: number, tx: number, ty: number) {
    const a = Math.random() * Math.PI * 2
    const s = 6 + Math.random() * 8
    this.add({
      x,
      y,
      vx: tx * 0.3 + Math.cos(a) * s,
      vy: ty * 0.3 + Math.sin(a) * s,
      life: 0.25 + Math.random() * 0.45,
      ramp: SPARK_AGE,
      g: 4,
      kind: 1,
      size: Math.random() < 0.1 ? 3 : 1,
    })
  }

  goldBurst(x: number, y: number, n = 48) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2
      const s = 25 + Math.random() * 45
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 12,
        life: 0.7 + Math.random() * 0.7,
        ramp: GOLD_AGE,
        g: 40,
        kind: 1,
        size: Math.random() < 0.3 ? 2 : 1,
      })
    }
    for (let i = 0; i < 5; i++)
      this.sparkleAt(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 24, i * 0.08)
  }

  dust(x: number, y: number, n = 10) {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 === 0 ? -1 : 1
      this.add({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: dir * (6 + Math.random() * 16),
        vy: -(2 + Math.random() * 6),
        life: 0.5 + Math.random() * 0.5,
        ramp: DUST_AGE,
        g: 0,
        kind: 2,
        size: 2,
      })
    }
  }

  /** toque: brilhos brotam e uma coroa de brasas sai do ponto */
  tap(x: number, y: number, t: number) {
    if (this.reduced) {
      this.sparkleAt(x, y, 0, t)
      return
    }
    for (let i = 0; i < 3; i++)
      this.sparkleAt(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 14, i * 0.07, t)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const s = 18 + Math.random() * 20
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.35,
        ramp: i % 3 === 0 ? GOLD_AGE : SPARK_AGE,
        g: 10,
        kind: 1,
        size: 1,
      })
    }
  }

  sparkleAt(x: number, y: number, delay = 0, t = this.lastT) {
    for (const s of this.sparkles) if (Math.abs(s.x - x) < 12 && Math.abs(s.y - y) < 12) return
    this.sparkles.push({ x: Math.round(x), y: Math.round(y), t0: t + delay })
  }

  private lastT = 0

  update(
    dt: number,
    t: number,
    src: {
      heads: { x: number; y: number; front: boolean; dx: number; dy: number }[]
      base: { x: number; y: number; w: number }
      anchors: { x: number; y: number }[]
      mobile: boolean
    },
  ) {
    this.lastT = t
    dt = Math.min(dt, 0.05)
    if (!this.reduced) {
      // brasas da área dos anéis
      this.emberAcc += dt * (src.mobile ? 10 : 18)
      while (this.emberAcc > 1) {
        this.emberAcc--
        this.ember(
          src.base.x + (Math.random() - 0.5) * src.base.w,
          src.base.y - Math.random() * src.base.w * 0.35,
        )
      }
      // faíscas da cabeça das fitas que estão na frente
      this.sparkAcc += dt * (src.mobile ? 12 : 30)
      while (this.sparkAcc > 1) {
        this.sparkAcc--
        const front = src.heads.filter((h) => h.front)
        const h = front[Math.floor(Math.random() * front.length)]
        if (h) this.spark(h.x, h.y, h.dx * 60, h.dy * 60)
      }
    }
    // brilhos: 1 a cada 0,4–1,2 s (1 a cada 2 s com movimento reduzido)
    if (t > this.nextSparkle && src.anchors.length) {
      const a = src.anchors[Math.floor(Math.random() * src.anchors.length)]
      if (a)
        this.sparkleAt(
          a.x + Math.round((Math.random() - 0.5) * 4),
          a.y + Math.round((Math.random() - 0.5) * 4),
          0,
          t,
        )
      this.nextSparkle = t + (this.reduced ? 2 : 0.4 + Math.random() * 0.8)
    }
    this.sparkles = this.sparkles.filter((s) => t - s.t0 < 0.5)

    const pt = this.pointer
    const R = 34
    for (const p of this.ps) {
      p.age += dt
      if (p.kind === 0) {
        p.vx += (Math.sin(t * 3 + p.ph) * 6 - p.vx) * dt * 2
      } else if (p.kind === 2) {
        p.vx *= 1 - dt * 3
        p.vy *= 1 - dt * 3
      }
      p.vy += p.g * dt
      p.vx += this.wind * 14 * dt
      if (pt.on) {
        const dx = p.x - pt.x
        const dy = p.y - pt.y
        const d = Math.hypot(dx, dy)
        if (d < R && d > 0.01) {
          const f = (1 - d / R) ** 1.5
          // empurra para fora e gira em volta do dedo, com um pouco do arrasto dele
          p.vx += ((dx / d) * 260 + (-dy / d) * 180) * f * dt + pt.vx * f * dt * 4
          p.vy += ((dy / d) * 260 + (dx / d) * 180) * f * dt + pt.vy * f * dt * 4
        }
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.ps = this.ps.filter((p) => p.age < p.life)
  }

  draw(g: CanvasRenderingContext2D, t: number, ox = 0, oy = 0) {
    for (const p of this.ps) {
      const k = p.age / p.life
      const ramp = p.ramp
      const idx = Math.min(ramp.length - 1, Math.floor(k * ramp.length))
      const col = ramp[idx] ?? 'red'
      const x = Math.round(p.x + ox)
      const y = Math.round(p.y + oy)
      // some em 2 degraus de pontilhado no fim
      if (k > 0.8 && bayer(x, y) < (k - 0.8) * 5) continue
      g.fillStyle = HEX[col]
      if (p.size === 3 && p.age < 0.07) {
        g.fillRect(x - 1, y, 3, 1)
        g.fillRect(x, y - 1, 1, 3)
      } else if (p.size === 2 && k < 0.5) g.fillRect(x, y, 2, 2)
      else g.fillRect(x, y, 1, 1)
    }
    for (const s of this.sparkles) {
      const f = Math.floor((t - s.t0) * 12)
      if (f < 0 || f > 5) continue
      drawSparkle(g, s.x + ox, s.y + oy, f)
    }
  }

  /** raios de luz verticais com nó em estrela (até 3 em cena) */
  drawBeams(g: CanvasRenderingContext2D, t: number, ox = 0, oy = 0) {
    for (const b of this.beams) {
      const cyc = (t + b.ph) % b.period
      const step = Math.floor((t + b.ph) / 0.2) % 3
      const thin = step === 1 ? 0.4 : 0
      const x = Math.round(b.x + ox)
      const y = Math.round(b.y + oy)
      const line = (from: number, len: number, dir: number) => {
        for (let i = 1; i <= len; i++) {
          const yy = y + i * dir
          const fade = i > len - 8 ? (i - (len - 8)) / 8 : 0
          if (bayer(x, yy) < Math.max(fade, thin * (i > 3 ? 1 : 0))) continue
          g.fillStyle = HEX[i < 3 ? 'sparkle' : 'redGlow']
          g.fillRect(x, yy, 1, 1)
          if (i % 2 === 0 && i < len - 4) {
            g.fillStyle = HEX.crimson
            g.fillRect(x + 1, yy, 1, 1)
          }
        }
        return from
      }
      line(0, b.up, -1)
      line(0, b.down, 1)
      // braço horizontal curto
      const arm = 3 + Math.round(2 + Math.sin(t * 2 + b.ph) * 2)
      for (let i = 1; i <= arm; i++) {
        if (bayer(x + i, y) < i / (arm + 1)) continue
        g.fillStyle = HEX[i < 2 ? 'sparkle' : 'redGlow']
        g.fillRect(x + i, y, 1, 1)
        g.fillRect(x - i, y, 1, 1)
      }
      // estrela 9×9 no nó: ciclo de 6 quadros a cada `period`
      const f = Math.floor(cyc * 12)
      if (f <= 5) drawSparkle(g, x, y, f)
      else {
        g.fillStyle = HEX.white
        g.fillRect(x, y, 1, 1)
        g.fillStyle = HEX.sparkle
        g.fillRect(x - 1, y, 1, 1)
        g.fillRect(x + 1, y, 1, 1)
        g.fillRect(x, y - 1, 1, 1)
        g.fillRect(x, y + 1, 1, 1)
      }
    }
  }
}
