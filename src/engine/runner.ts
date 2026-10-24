// Runner: cria o app PixiJS em resolução lógica, roda o laço, aplica juice e expõe o estado ao HUD.
import { Application, Container, Sprite, Texture } from 'pixi.js'
import { hitstop as audioHitstop, setIntensity, sfx } from '../audio/audio'
import { mulberry32 } from '../lib/rng'
import { type PixelFit, computeFit, ditherGradient, offscreen } from '../lib/pixel'
import { type SkillKind, usePlay } from '../state/play'
import { Ambient } from './ambient'
import { JuiceLayer } from './juice'
import { tex } from './textures'
import type { GameCtx, MicroGame } from './types'

export interface Theme {
  top: string
  mid: string
  ground: string
}

export interface RunnerOpts {
  canvas: HTMLCanvasElement
  layer: HTMLElement
  game: MicroGame
  theme: Theme
  /** número da fase (1–13) para o cenário próprio; ausente no desafio diário */
  level?: number
  hearts: number
  reduced: boolean
  /** lido no início da fase: bordas do HUD em px CSS */
  safeArea: () => { top: number; bottom: number }
  onEnd: (r: { success: boolean; score: number }) => void
}

// Cenários por fase do diretor de arte (src/scene/index.ts); sem o arquivo, usa o fundo genérico.
const sceneMods = import.meta.glob<{ renderLevelBackdrop?: (level: number, W: number, H: number) => HTMLCanvasElement }>(
  '../scene/index.ts',
)

async function levelBackdrop(level: number | undefined, W: number, H: number, theme: Theme) {
  const load = sceneMods['../scene/index.ts']
  if (level && load) {
    try {
      const m = await load()
      const c = m.renderLevelBackdrop?.(level, W, H)
      if (c) return c
    } catch (err) {
      console.warn('cenário da fase indisponível', err)
    }
  }
  return backdrop(W, H, theme)
}

export const playTarget = () => (innerWidth < innerHeight ? 150 : 220)

function backdrop(W: number, H: number, theme: Theme) {
  const { c, g } = offscreen(W, H)
  const hz = Math.round(H * 0.72)
  ditherGradient(g, 0, 0, W, hz, [
    [0, '#06050a'],
    [0.55, theme.top],
    [1, theme.mid],
  ])
  ditherGradient(g, 0, hz, W, H - hz, [
    [0, theme.ground],
    [1, '#050407'],
  ])
  const r = mulberry32(7)
  for (let i = 0; i < (W * hz) / 300; i++) {
    g.fillStyle = r() > 0.8 ? '#b9b1a6' : '#4a4450'
    g.fillRect(Math.floor(r() * W), Math.floor(r() * hz * 0.6), 1, 1)
  }
  let x = 0
  while (x < W) {
    const w = 4 + Math.floor(r() * 10)
    const hh = 4 + Math.floor(r() * 18)
    g.fillStyle = '#0a080c'
    g.fillRect(x, hz - hh, w, hh)
    for (let k = 0; k < (w * hh) / 18; k++) {
      g.fillStyle = r() > 0.5 ? '#ffb35a' : '#5a3a2a'
      g.fillRect(x + 1 + Math.floor(r() * (w - 2)), hz - hh + 2 + Math.floor(r() * (hh - 3)), 1, 1)
    }
    x += w + Math.floor(r() * 3)
  }
  g.fillStyle = '#5a2a22'
  g.fillRect(0, hz, W, 1)
  return c
}

export class Runner {
  app = new Application()
  fit: PixelFit = computeFit(playTarget())
  world = new Container()
  gameLayer = new Container()
  juice!: JuiceLayer
  ambient!: Ambient
  ctx!: GameCtx
  time = 0
  slowUntil = 0
  shield = false
  hearts: number
  score = 0
  ended = false
  private lastIntensity = -1
  private lastTick = -1
  private running = false
  private rnd = mulberry32((Date.now() & 0xffff) ^ 1313)
  private listeners: [string, EventListener][] = []

  constructor(private o: RunnerOpts) {
    this.hearts = o.hearts
  }

  async init() {
    const { canvas } = this.o
    await this.app.init({
      canvas,
      width: this.fit.W,
      height: this.fit.H,
      antialias: false,
      backgroundColor: 0x06050a,
      resolution: 1,
      roundPixels: true,
      preference: 'webgl',
      autoDensity: false,
    })
    canvas.style.width = `${this.fit.W * this.fit.css}px`
    canvas.style.height = `${this.fit.H * this.fit.css}px`
    canvas.style.imageRendering = 'pixelated'
    const bg = new Sprite(Texture.from(await levelBackdrop(this.o.level, this.fit.W, this.fit.H, this.o.theme)))
    bg.texture.source.scaleMode = 'nearest'
    this.juice = new JuiceLayer(this.fit.W, this.fit.H, this.o.reduced)
    this.ambient = new Ambient(this.fit.W, this.fit.H, this.o.reduced)
    this.world.addChild(bg, this.ambient.root, this.gameLayer, this.juice.root)
    this.app.stage.addChild(this.world)
    usePlay.setState({
      phase: 'intro',
      hearts: this.hearts,
      maxHearts: this.o.hearts,
      score: 0,
      duration: this.o.game.duration,
      timeLeft: this.o.game.duration,
      used: [],
      shield: false,
      slow: false,
      combo: 0,
    })
    this.app.ticker.add((t) => this.tick(t.deltaMS / 1000))
    this.bindInput()
  }

  private get css() {
    return this.fit.css
  }

  private makeCtx(): GameCtx {
    const self = this
    const area = this.o.safeArea()
    return {
      W: this.fit.W,
      H: this.fit.H,
      top: Math.ceil(area.top / this.css) + 2,
      bottom: Math.floor(area.bottom / this.css) - 2,
      css: this.css,
      stage: this.gameLayer,
      layer: this.o.layer,
      rnd: this.rnd,
      fx: this.juice,
      addScore(n, x, y) {
        self.score = Math.max(0, self.score + n)
        usePlay.setState({ score: self.score })
        if (x !== undefined && y !== undefined) self.juice.float(n >= 0 ? `+${n}` : `${n}`, x, y, n >= 0 ? 0xf5c04a : 0xff3b3b)
      },
      hit(x, y) {
        self.hit(x, y)
      },
      finish() {
        self.end(true)
      },
      sfx(n, opts) {
        // x chega em pixels lógicos; o áudio quer 0..1 para o pan
        sfx(n, opts?.x !== undefined ? { ...opts, x: Math.max(0, Math.min(1, opts.x / self.fit.W)) } : opts)
      },
      tex(name) {
        return tex(name)
      },
      get time() {
        return self.time
      },
      get reduced() {
        return self.o.reduced
      },
    }
  }

  async start() {
    this.ctx = this.makeCtx()
    await this.o.game.init(this.ctx)
    this.time = 0
    this.running = true
    usePlay.setState({ phase: 'run' })
  }

  pause() {
    if (!this.running || this.ended) return
    this.running = false
    usePlay.setState({ phase: 'pause' })
  }

  resume() {
    if (this.ended) return
    this.running = true
    usePlay.setState({ phase: 'run' })
  }

  hit(x?: number, y?: number) {
    if (!this.running) return
    const cx = x ?? this.fit.W / 2
    const cy = y ?? this.fit.H / 2
    if (this.shield) {
      this.shield = false
      usePlay.setState({ shield: false })
      sfx('shield', { x: cx / this.fit.W })
      this.juice.ring(cx, cy, 0x4fae3f, 30)
      this.juice.float('ESCUDO', cx, cy, 0x4fae3f)
      return
    }
    sfx('bad', { x: cx / this.fit.W })
    audioHitstop(70)
    this.juice.impact(0xff4a3d)
    this.juice.shake(4, 220, { x: 1, y: 0.6 })
    this.juice.hitstop(70)
    if (!this.o.hearts) return
    this.hearts--
    usePlay.setState({ hearts: this.hearts, combo: 0 })
    if (this.hearts <= 0) this.end(false)
  }

  useSkill(kind: SkillKind): boolean {
    if (!this.running) return false
    const g = this.o.game
    let ok = false
    if (kind === 'checar') ok = !!g.clear?.()
    else if (kind === 'lembrar') ok = !!g.hint?.()
    else if (kind === 'foco') {
      this.slowUntil = performance.now() + 4000
      usePlay.setState({ slow: true })
      ok = true
    } else {
      this.shield = true
      usePlay.setState({ shield: true })
      ok = true
    }
    if (!ok) {
      sfx('error')
      return false
    }
    sfx(kind === 'foco' ? 'slowmo' : kind === 'proteger' ? 'shield' : kind === 'checar' ? 'spark' : 'power')
    const cx = this.fit.W / 2
    const cy = this.fit.H / 2
    this.juice.ring(cx, cy, kind === 'proteger' ? 0x4fae3f : kind === 'foco' ? 0xf5c04a : 0xff3b3b, 60)
    this.juice.flash(kind === 'proteger' ? 0x4fae3f : 0xf5c04a, 120, 0.2)
    usePlay.setState((s) => ({ used: [...s.used, kind] }))
    return true
  }

  end(success: boolean) {
    if (this.ended) return
    this.ended = true
    this.running = false
    usePlay.setState({ phase: 'end' })
    if (success) {
      this.juice.flash(0xf5c04a, 260, 0.25)
      sfx('level')
    }
    window.setTimeout(() => this.o.onEnd({ success, score: this.score }), 650)
  }

  private tick(realDt: number) {
    const dt0 = Math.min(0.05, realDt)
    this.juice.update(dt0)
    this.ambient.update(dt0, performance.now() / 1000)
    const now = performance.now()
    const slow = now < this.slowUntil
    if (usePlay.getState().slow !== slow) usePlay.setState({ slow })
    if (this.running && this.juice.freeze <= 0) {
      const dt = dt0 * (slow ? 0.45 : 1)
      this.time += dt
      this.o.game.update(dt)
      const d = this.o.game.duration
      if (d > 0) {
        const left = Math.max(0, d - this.time)
        // trilha adaptativa: a intensidade sobe com o tempo da fase
        const frac = 1 - left / d
        if (Math.abs(frac - this.lastIntensity) > 0.05) {
          this.lastIntensity = frac
          setIntensity(0.4 + 0.6 * frac)
        }
        if (Math.ceil(left) !== this.lastTick && left <= 5 && left > 0) {
          this.lastTick = Math.ceil(left)
          sfx('tick')
        }
        usePlay.setState({ timeLeft: left })
        if (left <= 0) this.end(this.o.game.timeUp ? this.o.game.timeUp() : true)
      }
    }
    const off = this.juice.offset(performance.now() / 1000)
    this.world.x = off.x
    this.world.y = off.y
  }

  private bindInput() {
    const c = this.o.canvas
    const L = (e: PointerEvent) => ({ x: e.clientX / this.css, y: e.clientY / this.css })
    const on = (type: string, fn: EventListener, target: EventTarget = c) => {
      target.addEventListener(type, fn)
      this.listeners.push([type, fn])
    }
    on('pointerdown', ((e: PointerEvent) => {
      const p = L(e)
      this.ambient.tap(p.x, p.y)
      if (!this.running) return
      e.preventDefault()
      this.o.game.down?.(p.x, p.y)
    }) as EventListener)
    on('pointermove', ((e: PointerEvent) => {
      const p = L(e)
      this.ambient.pointerMove(p.x, p.y)
      if (!this.running) return
      this.o.game.move?.(p.x, p.y)
    }) as EventListener)
    on('pointerleave', (() => this.ambient.pointerLeave()) as EventListener)
    on('pointerup', ((e: PointerEvent) => {
      if (e.pointerType !== 'mouse') this.ambient.pointerLeave()
      if (!this.running) return
      const p = L(e)
      this.o.game.up?.(p.x, p.y)
    }) as EventListener)
  }

  key(k: string, down: boolean) {
    if (!this.running) return
    this.o.game.key?.(k, down)
  }

  destroy() {
    for (const [t, fn] of this.listeners) this.o.canvas.removeEventListener(t, fn)
    this.o.game.dispose?.()
    this.app.destroy({ removeView: false }, { children: true })
  }
}
