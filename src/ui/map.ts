// Mapa da jornada: o Brasil em pixel com as 13 fases, do Sertão a Brasília.

import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import { LEVELS } from '../content/levels'
import { playMusic, sfx, unlockAudio } from '../core/audio'
import { h } from '../core/dom'
import { applyFit, computeFit, type PixelFit, toLogical } from '../core/pixel'
import { drawSprite } from '../core/sprites'
import { levelsDone, save } from '../core/store'
import { go, register } from './router'

register('map', (root) => {
  unlockAudio()
  playMusic('title')
  document.body.classList.remove('playing')
  const done = levelsDone()
  const unlocked = (i: number) => i <= done
  let sel = Math.min(12, done)
  const canvas = h('canvas', { class: 'map-canvas', 'aria-hidden': 'true' })
  let fit: PixelFit = computeFit(200)
  let ts = 3
  let ox = 0
  let oy = 0
  let size = 0
  let base: HTMLCanvasElement | null = null
  let raf = 0

  const toXY = (lon: number, lat: number) => ({
    x: ox + ((lon - LON0) / (LON1 - LON0)) * size,
    y: oy + ((lat - LAT0) / (LAT1 - LAT0)) * size,
  })

  function layout() {
    fit = computeFit(200)
    applyFit(canvas, fit)
    const top = 26
    const bottom = fit.H - 52
    size = Math.min(fit.W - 16, bottom - top)
    ts = Math.max(2, Math.floor(size / 48))
    const cells = Math.floor(size / ts)
    size = cells * ts
    ox = Math.round(fit.W / 2 - size / 2)
    oy = Math.round(top + (bottom - top - size) / 2)
    base = document.createElement('canvas')
    base.width = fit.W
    base.height = fit.H
    const g = base.getContext('2d')
    if (!g) return
    g.fillStyle = 'rgba(6,4,8,0.78)'
    g.fillRect(0, 0, fit.W, fit.H)
    const inside = (i: number, j: number) =>
      inBrazil(LON0 + ((i + 0.5) / cells) * (LON1 - LON0), LAT0 + ((j + 0.5) / cells) * (LAT1 - LAT0))
    for (let j = 0; j < cells; j++)
      for (let i = 0; i < cells; i++) {
        if (!inside(i, j)) continue
        const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)
        g.fillStyle = edge
          ? '#7a1c18'
          : (i * 3 + j * 5) % 11 === 0
            ? '#3a2422'
            : (i + j) % 2
              ? '#2a1a1a'
              : '#261818'
        g.fillRect(ox + i * ts, oy + j * ts, ts, ts)
      }
  }

  function frame(now: number) {
    const t = now / 1000
    const g = canvas.getContext('2d')
    if (!g || !base) return
    g.clearRect(0, 0, fit.W, fit.H)
    g.drawImage(base, 0, 0)
    // trilha
    LEVELS.forEach((l, i) => {
      const n = LEVELS[i + 1]
      if (!n) return
      const a = toXY(l.lon, l.lat)
      const b = toXY(n.lon, n.lat)
      const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 3))
      g.fillStyle = i < done ? '#f5c04a' : '#5a4a44'
      for (let s = 0; s <= steps; s++)
        g.fillRect(
          Math.round(a.x + ((b.x - a.x) * s) / steps),
          Math.round(a.y + ((b.y - a.y) * s) / steps),
          1,
          1,
        )
    })
    // nós
    LEVELS.forEach((l, i) => {
      const p = toXY(l.lon, l.lat)
      const stars = save.stars[i] ?? 0
      const isSel = i === sel
      const col = stars > 0 ? '#f5c04a' : unlocked(i) ? '#ff3b3b' : '#4a4240'
      const r = isSel ? 4 : 3
      g.fillStyle = '#0a0a0f'
      g.fillRect(Math.round(p.x) - r - 1, Math.round(p.y) - r - 1, r * 2 + 3, r * 2 + 3)
      g.fillStyle = col
      g.fillRect(Math.round(p.x) - r, Math.round(p.y) - r, r * 2 + 1, r * 2 + 1)
      g.fillStyle = '#0a0a0f'
      if (i + 1 >= 10) {
        g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 1, 3)
      }
      if (isSel && Math.sin(t * 6) > 0) {
        g.fillStyle = '#ffffff'
        g.fillRect(Math.round(p.x) - r - 2, Math.round(p.y) - r - 2, 2, 1)
        g.fillRect(Math.round(p.x) + r + 1, Math.round(p.y) - r - 2, 2, 1)
        g.fillRect(Math.round(p.x) - r - 2, Math.round(p.y) + r + 2, 2, 1)
        g.fillRect(Math.round(p.x) + r + 1, Math.round(p.y) + r + 2, 2, 1)
      }
    })
    // personagem pulando na fase escolhida
    const cur = LEVELS[sel]
    if (cur) {
      const p = toXY(cur.lon, cur.lat)
      drawSprite(g, save.avatar, p.x, p.y - 14 - Math.abs(Math.sin(t * 4)) * 3, { center: true })
    }
    raf = requestAnimationFrame(frame)
  }

  const panel = h('div', { class: 'map-panel px-frame px-frame--red' })
  function renderPanel() {
    const l = LEVELS[sel]
    if (!l) return
    const stars = save.stars[sel] ?? 0
    const can = unlocked(sel)
    panel.replaceChildren(
      h(
        'div',
        null,
        h('div', { class: 'lvl' }, `Fase ${l.n} de 13`),
        h('h3', null, l.title),
        h('div', { class: 'where' }, l.where),
        stars > 0
          ? h(
              'div',
              { class: 'stars', 'aria-label': `${stars} estrelas` },
              ...[0, 1, 2].map((k) => h('span', { class: k < stars ? '' : 'off' }, '★')),
            )
          : null,
      ),
      can
        ? h(
            'button',
            { class: 'btn btn--red btn--big', autofocus: true, onclick: () => play() },
            stars > 0 ? 'Rejogar' : 'Jogar ▶',
          )
        : h(
            'div',
            { class: 'muted small', style: 'max-width:130px;text-align:right' },
            `Complete a fase ${sel} para liberar`,
          ),
    )
  }
  const play = () => {
    sfx('tap')
    go('play', { level: sel + 1 })
  }
  const select = (i: number) => {
    sel = Math.max(0, Math.min(12, i))
    sfx('tick')
    renderPanel()
  }

  canvas.addEventListener('click', (e) => {
    const p = toLogical(fit, e.clientX, e.clientY)
    let best = -1
    let bd = 12
    LEVELS.forEach((l, i) => {
      const q = toXY(l.lon, l.lat)
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    if (best >= 0) {
      if (best === sel && unlocked(best)) play()
      else select(best)
    }
  })

  const nodeList = h(
    'ol',
    { class: 'sr-only', 'aria-label': 'Fases' },
    ...LEVELS.map((l, i) =>
      h(
        'li',
        null,
        h(
          'button',
          { disabled: !unlocked(i), onclick: () => go('play', { level: i + 1 }) },
          `Fase ${l.n}: ${l.title}, ${l.where}${(save.stars[i] ?? 0) > 0 ? ', concluída' : ''}`,
        ),
      ),
    ),
  )
  root.append(
    h(
      'div',
      { class: 'screen screen--clear', style: 'padding:0' },
      canvas,
      h(
        'div',
        { class: 'topbar' },
        h('button', { class: 'btn btn--ghost', onclick: () => go('title') }, '← Início'),
        h('span', { style: 'flex:1;text-align:center;letter-spacing:.14em' }, 'Jornada'),
        h('span', { class: 'countdown' }, `${done}/13`),
      ),
      panel,
      nodeList,
    ),
  )
  layout()
  renderPanel()
  raf = requestAnimationFrame(frame)
  const onResize = () => layout()
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') select(sel + 1)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') select(sel - 1)
    if (e.key === 'Escape') go('title')
  }
  addEventListener('resize', onResize)
  addEventListener('keydown', onKey)
  return () => {
    cancelAnimationFrame(raf)
    removeEventListener('resize', onResize)
    removeEventListener('keydown', onKey)
  }
})
