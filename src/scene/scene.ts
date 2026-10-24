// Controla o palco do título: cenário 2D, monumento 3D (carregado depois) e brilhos.
// Pausa com a aba escondida e quando um jogo ocupa a tela.

import { reducedMotion } from '../core/dom'
import { applyFit, computeFit, type PixelFit } from '../core/pixel'
import { Backdrop, sparkle } from './backdrop'
import type { Monument } from './monument'

const bgC = document.getElementById('bg') as HTMLCanvasElement
const glC = document.getElementById('gl') as HTMLCanvasElement
const fxC = document.getElementById('fx') as HTMLCanvasElement

let fit: PixelFit = computeFit()
const backdrop = new Backdrop(bgC)
let monument: Monument | null = null
let glFailed = false
let running = false
let raf = 0
let t0 = performance.now()
let progress = 0
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
const sparks = Array.from({ length: 9 }, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  ph: i * 1.3,
  s: 2 + (i % 3),
}))

function resize() {
  fit = computeFit()
  for (const c of [bgC, glC, fxC]) applyFit(c, fit)
  backdrop.resize(fit)
  if (monument) monument.resize(fit, backdrop.L)
  if (!running) frame(performance.now())
}

function frame(now: number) {
  const reduce = reducedMotion()
  const t = reduce ? 4 : (now - t0) / 1000
  pointer.x += (pointer.tx - pointer.x) * 0.06
  pointer.y += (pointer.ty - pointer.y) * 0.06
  backdrop.draw(t, pointer.x, pointer.y)
  if (monument) monument.update(t, pointer.x, pointer.y)
  const g = fxC.getContext('2d')
  if (g) {
    g.clearRect(0, 0, fit.W, fit.H)
    if (glFailed) drawFallback13(g)
    const L = backdrop.L
    for (const s of sparks) {
      const a = Math.sin(t * 1.3 + s.ph)
      const x = L.W * (0.28 + s.x * 0.46)
      const y = L.H * (L.portrait ? 0.3 + s.y * 0.32 : 0.18 + s.y * 0.55)
      sparkle(g, x, y, s.s * (0.6 + a * 0.5), a, '#ffd6c8')
    }
  }
  if (running && !reduce) raf = requestAnimationFrame(frame)
}

/** Sem WebGL: um 13 desenhado em 2D no lugar do monumento. */
function drawFallback13(g: CanvasRenderingContext2D) {
  const L = backdrop.L
  const glyphs = [
    ['.XXX.', 'XXXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', 'XXXXX'],
    ['XXXXX.', 'XXXXXX', '....XX', '....XX', '.XXXX.', '....XX', '....XX', 'XXXXXX', 'XXXXX.'],
  ]
  const cell = Math.max(2, Math.round((L.portrait ? L.W * 0.7 : L.H * 0.45) / (L.portrait ? 12 : 9)))
  const totalW = 12 * cell
  const x0 = Math.round(L.W / 2 - totalW / 2)
  const y0 = Math.round(L.H * L.baseY - 9 * cell)
  glyphs.forEach((gl, gi) => {
    const ox = x0 + gi * 6 * cell + (gi ? cell : 0)
    gl.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== 'X') continue
        g.fillStyle = '#8e1218'
        g.fillRect(ox + x * cell + 2, y0 + y * cell + 2, cell, cell)
        g.fillStyle = (x + y) % 3 ? '#d9cfc0' : '#c2b39b'
        g.fillRect(ox + x * cell, y0 + y * cell, cell, cell)
      }
    })
  })
}

async function loadMonument() {
  try {
    const { Monument } = await import('./monument')
    monument = new Monument(glC)
    monument.resize(fit, backdrop.L)
    monument.setProgress(progress)
  } catch (err) {
    console.warn('WebGL indisponível, usando o 13 em 2D', err)
    glFailed = true
  }
  if (!running) frame(performance.now())
}

export const Scene = {
  init() {
    resize()
    addEventListener('resize', () => resize())
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / innerHeight - 0.5) * 2
    })
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return
      pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30))
      pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30))
    })
    document.addEventListener('visibilitychange', () => (document.hidden ? Scene.stop() : Scene.start()))
    // o monumento entra depois do primeiro quadro: a tela abre na hora
    requestAnimationFrame(() => setTimeout(loadMonument, 30))
    Scene.start()
  },
  start() {
    if (running || document.hidden || document.body.classList.contains('playing')) return
    running = true
    t0 = performance.now() - 4000
    raf = requestAnimationFrame(frame)
  },
  stop() {
    running = false
    cancelAnimationFrame(raf)
  },
  setProgress(p: number, animate = false) {
    progress = p
    monument?.setProgress(p, animate)
  },
  celebrate() {
    monument?.celebrate()
  },
  get fit() {
    return fit
  },
  get layout() {
    return backdrop.L
  },
  /** Desenha o cenário num canvas qualquer (para os cards de compartilhar). */
  renderBackdropTo(target: HTMLCanvasElement, W: number, H: number) {
    const b = new Backdrop(target)
    b.build(W, H)
    b.draw(6, 0, 0)
    return b.L
  },
}
