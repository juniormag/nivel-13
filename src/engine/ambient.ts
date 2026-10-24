// Partículas ambientes interativas em todas as fases: brasas sobem, desviam do dedo e faíscas nascem no toque.
import { Particle, ParticleContainer } from 'pixi.js'
import { PALETTE } from '../lib/palette'
import { px } from './textures'

const RAMP = [PALETTE.sparkle, PALETTE.goldHi, PALETTE.emberBright, PALETTE.ember, PALETTE.red, PALETTE.crimson, PALETTE.blood1]

interface Ember {
  p: Particle
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  phase: number
}

export class Ambient {
  readonly root = new ParticleContainer({ dynamicProperties: { position: true, color: true } })
  private embers: Ember[] = []
  private pointer = { x: -999, y: -999, active: false }

  constructor(
    private W: number,
    private H: number,
    private reduced: boolean,
  ) {
    const mobile = W < H
    const n = reduced ? 10 : mobile ? 34 : 70
    for (let i = 0; i < n; i++) this.spawn(true)
  }

  private spawn(anywhere = false, x?: number, y?: number, burst = false) {
    const p = new Particle({ texture: px(), x: 0, y: 0, tint: PALETTE.ember, alpha: 0 })
    this.root.addParticle(p)
    const e: Ember = {
      p,
      x: x ?? Math.random() * this.W,
      y: y ?? (anywhere ? Math.random() * this.H : this.H + 4),
      vx: burst ? (Math.random() - 0.5) * 70 : (Math.random() - 0.5) * 4,
      vy: burst ? -20 - Math.random() * 50 : -(8 + Math.random() * 12),
      age: anywhere ? Math.random() : 0,
      life: burst ? 0.4 + Math.random() * 0.4 : 3 + Math.random() * 4,
      phase: Math.random() * 6.28,
    }
    this.embers.push(e)
  }

  pointerMove(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.active = true
  }

  pointerLeave() {
    this.pointer.active = false
  }

  /** faíscas no toque: o mundo responde a qualquer toque, mesmo o que erra */
  tap(x: number, y: number) {
    if (this.reduced) return
    for (let i = 0; i < 6; i++) this.spawn(false, x, y, true)
  }

  update(dt: number, t: number) {
    const pr = 34
    for (const e of this.embers) {
      e.age += dt
      // wobble senoidal ±6 px/s e empuxo do ponteiro
      e.vx += Math.sin(t * 2 + e.phase) * 6 * dt
      if (this.pointer.active) {
        const dx = e.x - this.pointer.x
        const dy = e.y - this.pointer.y
        const d = Math.hypot(dx, dy)
        if (d < pr && d > 0.01) {
          const f = (1 - d / pr) * 220 * dt
          e.vx += (dx / d) * f
          e.vy += (dy / d) * f
        }
      }
      e.vx *= 1 - 1.6 * dt
      e.x += e.vx * dt
      e.y += e.vy * dt
      const k = Math.min(1, e.age / e.life)
      e.p.tint = RAMP[Math.min(RAMP.length - 1, Math.floor(k * RAMP.length))] ?? PALETTE.red
      e.p.alpha = k < 0.1 ? k * 10 : 1 - Math.max(0, (k - 0.7) / 0.3)
      e.p.x = Math.round(e.x)
      e.p.y = Math.round(e.y)
    }
    const dead = this.embers.filter((e) => e.age >= e.life || e.y < -4)
    for (const d of dead) {
      this.root.removeParticle(d.p)
      const wasAmbient = d.life > 1
      this.embers.splice(this.embers.indexOf(d), 1)
      if (wasAmbient) this.spawn()
    }
  }
}
