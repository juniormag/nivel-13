// Juice: partículas, textos flutuantes, tremor, hit-stop, clarão e ondas de choque.
import { Container, Graphics, Particle, ParticleContainer, Sprite, Text } from 'pixi.js'
import type { Juice } from './types'
import { px } from './textures'

interface P {
  p: Particle
  vx: number
  vy: number
  life: number
  max: number
}

export class JuiceLayer implements Juice {
  readonly root = new Container()
  private parts = new ParticleContainer({ dynamicProperties: { position: true, color: true } })
  private ps: P[] = []
  private floats: { t: Text; life: number }[] = []
  private rings: { g: Graphics; x: number; y: number; r: number; max: number; color: number }[] = []
  private flashSprite = new Sprite(px())
  private flashLife = 0
  private flashMax = 1
  private flashAlpha = 0.5
  shakeAmp = 0
  private shakeDecay = 0
  freeze = 0

  constructor(
    private W: number,
    private H: number,
    private reduced: boolean,
  ) {
    this.root.addChild(this.parts)
    this.flashSprite.width = W
    this.flashSprite.height = H
    this.flashSprite.alpha = 0
    this.root.addChild(this.flashSprite)
  }

  burst(x: number, y: number, color: number | string, n = 10, speed = 50) {
    const count = this.reduced ? Math.min(n, 4) : n
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = speed * (0.4 + Math.random())
      const p = new Particle({ texture: px(), x, y, tint: color, scaleX: Math.random() < 0.3 ? 2 : 1, scaleY: Math.random() < 0.3 ? 2 : 1 })
      this.parts.addParticle(p)
      this.ps.push({ p, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speed * 0.4, life: 0, max: 0.35 + Math.random() * 0.45 })
    }
  }

  float(text: string, x: number, y: number, color: number | string = 0xefe8dc) {
    const t = new Text({
      text,
      style: { fontFamily: 'Silkscreen', fontSize: 8, fill: color, stroke: { color: 0x000000, width: 2 }, align: 'center' },
      resolution: 1,
      textureStyle: { scaleMode: 'nearest' },
    })
    t.anchor.set(0.5)
    t.x = Math.round(x)
    t.y = Math.round(y)
    this.root.addChild(t)
    this.floats.push({ t, life: 0 })
  }

  shake(amount: number, ms = 160) {
    if (this.reduced) return
    this.shakeAmp = Math.max(this.shakeAmp, amount)
    this.shakeDecay = amount / (ms / 1000)
  }

  hitstop(ms: number) {
    this.freeze = Math.max(this.freeze, ms / 1000)
  }

  flash(color: number | string, ms = 160, alpha = 0.45) {
    this.flashSprite.tint = color
    this.flashLife = ms / 1000
    this.flashMax = ms / 1000
    this.flashAlpha = this.reduced ? alpha * 0.4 : alpha
  }

  ring(x: number, y: number, color: number | string, maxR = 24) {
    const g = new Graphics()
    this.root.addChild(g)
    this.rings.push({ g, x, y, r: 1, max: maxR, color: typeof color === 'string' ? Number.parseInt(color.replace('#', ''), 16) : color })
  }

  /** dt real (sem hit-stop): partículas seguem mesmo com a simulação congelada */
  update(dt: number) {
    for (const s of this.ps) {
      s.life += dt
      s.vy += 120 * dt
      s.p.x += s.vx * dt
      s.p.y += s.vy * dt
      s.p.alpha = Math.max(0, 1 - s.life / s.max)
    }
    const dead = this.ps.filter((s) => s.life >= s.max)
    for (const d of dead) this.parts.removeParticle(d.p)
    this.ps = this.ps.filter((s) => s.life < s.max)

    for (const f of this.floats) {
      f.life += dt
      f.t.y -= 24 * dt
      f.t.alpha = Math.max(0, 1 - f.life / 0.9)
    }
    for (const f of this.floats.filter((x) => x.life >= 0.9)) f.t.destroy()
    this.floats = this.floats.filter((f) => f.life < 0.9)

    for (const r of this.rings) {
      r.r += dt * 90
      const a = Math.max(0, 1 - r.r / r.max)
      r.g.clear()
      // anel pixel: pontos na circunferência, sem antialias
      const steps = Math.max(12, Math.round(r.r * 6))
      for (let i = 0; i < steps; i++) {
        const ang = (i / steps) * Math.PI * 2
        r.g.rect(Math.round(r.x + Math.cos(ang) * r.r), Math.round(r.y + Math.sin(ang) * r.r), 1, 1)
      }
      r.g.fill({ color: r.color, alpha: a })
    }
    for (const r of this.rings.filter((x) => x.r >= x.max)) r.g.destroy()
    this.rings = this.rings.filter((x) => x.r < x.max)

    if (this.flashLife > 0) {
      this.flashLife = Math.max(0, this.flashLife - dt)
      this.flashSprite.alpha = (this.flashLife / this.flashMax) * this.flashAlpha
    } else this.flashSprite.alpha = 0

    this.shakeAmp = Math.max(0, this.shakeAmp - this.shakeDecay * dt)
    this.freeze = Math.max(0, this.freeze - dt)
  }
}
