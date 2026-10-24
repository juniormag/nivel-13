// Motor das fases: laço de jogo, vidas, tempo, habilidades, partículas e os overlays de início e fim.

import { LEVELS, type Level } from '../content/levels'
import { playMusic, type Sfx, sfx, unlockAudio } from '../core/audio'
import { announce, fmtInt, h, reducedMotion } from '../core/dom'
import { applyFit, computeFit, ditherGradient, offscreen, type PixelFit, toLogical } from '../core/pixel'
import { mulberry32 } from '../core/rng'
import { levelsDone, persist, save } from '../core/store'
import { makeGame } from '../games'
import type { GameCtx, MicroGame } from '../games/types'
import { rect, text } from '../games/util'
import { Scene } from '../scene/scene'
import { hearts as heartsEl, SKILLS, type SkillKind, skillButton, skillUnlocked } from './common'
import { go, register } from './router'

export interface CustomRun {
  title: string
  sub: string
  intro: string
  how: string[]
  game: MicroGame
  hearts: number | null
  onEnd: (score: number, success: boolean) => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  col: string
}

export function starsFor(score: number, goal: number) {
  return score >= goal ? 3 : score >= goal * 0.6 ? 2 : 1
}

register('play', (root, params) => {
  unlockAudio()
  const custom = params.custom as CustomRun | undefined
  const level: Level | undefined = custom ? undefined : LEVELS[Number(params.level ?? 1) - 1]
  if (!custom && !level) {
    go('map')
    return
  }
  const game: MicroGame = custom ? custom.game : makeGame((level as Level).kind)
  const maxHearts = custom ? (custom.hearts ?? 0) : 3
  const theme = level?.theme ?? LEVELS[1]?.theme ?? { top: '#0a0a14', mid: '#1a1430', ground: '#141020' }

  document.body.classList.add('playing')
  Scene.stop()
  playMusic(level?.n === 13 ? 'boss' : 'game')

  const canvas = document.getElementById('play') as HTMLCanvasElement
  // no celular em pé, pixels maiores: sprites legíveis e alvos de toque generosos
  const playTarget = () => (innerWidth < innerHeight ? 150 : 220)
  const fit: PixelFit = computeFit(playTarget())
  applyFit(canvas, fit)
  const g = canvas.getContext('2d') as CanvasRenderingContext2D
  g.imageSmoothingEnabled = false

  // ---------- estado ----------
  let hearts = maxHearts
  let score = 0
  let time = 0
  let state: 'intro' | 'count' | 'run' | 'pause' | 'end' = 'intro'
  let shake = 0
  let flash = 0
  let slowUntil = -1
  let shield = false
  const used = new Set<SkillKind>()
  let parts: Particle[] = []
  let floats: { s: string; x: number; y: number; t: number; col: string }[] = []
  const rnd = mulberry32((Date.now() & 0xffff) ^ 1313)
  const reduce = reducedMotion()

  // ---------- fundo ----------
  let bg: HTMLCanvasElement
  function buildBg() {
    const { c, g: bgG } = offscreen(fit.W, fit.H)
    const hz = Math.round(fit.H * 0.72)
    ditherGradient(bgG, 0, 0, fit.W, hz, [
      [0, '#06050a'],
      [0.55, theme.top],
      [1, theme.mid],
    ])
    ditherGradient(bgG, 0, hz, fit.W, fit.H - hz, [
      [0, theme.ground],
      [1, '#050407'],
    ])
    const r = mulberry32(7)
    for (let i = 0; i < (fit.W * hz) / 300; i++) {
      bgG.fillStyle = r() > 0.8 ? '#b9b1a6' : '#4a4450'
      bgG.fillRect(Math.floor(r() * fit.W), Math.floor(r() * hz * 0.6), 1, 1)
    }
    // silhueta de cidade
    let x = 0
    while (x < fit.W) {
      const w = 4 + Math.floor(r() * 10)
      const hh = 4 + Math.floor(r() * 18)
      bgG.fillStyle = '#0a080c'
      bgG.fillRect(x, hz - hh, w, hh)
      for (let k = 0; k < (w * hh) / 18; k++) {
        bgG.fillStyle = r() > 0.5 ? '#ffb35a' : '#5a3a2a'
        bgG.fillRect(x + 1 + Math.floor(r() * (w - 2)), hz - hh + 2 + Math.floor(r() * (hh - 3)), 1, 1)
      }
      x += w + Math.floor(r() * 3)
    }
    bgG.fillStyle = '#5a2a22'
    bgG.fillRect(0, hz, fit.W, 1)
    bg = c
  }
  buildBg()

  // ---------- HUD ----------
  const heartsBox = h('div')
  const renderHearts = () => heartsBox.replaceChildren(maxHearts ? heartsEl(hearts, maxHearts) : h('span'))
  renderHearts()
  const scoreEl = h('div', { class: 'score', 'aria-label': 'Pontos' }, '0')
  const timerFill = h('i', { style: 'width:100%' })
  const timer = h('div', { class: 'timer', 'aria-hidden': 'true' }, timerFill)
  if (!game.duration) timer.style.visibility = 'hidden'
  const pauseBtn = h(
    'button',
    { class: 'btn btn--ghost play-pause', 'aria-label': 'Pausar', onclick: () => pause() },
    'II',
  )
  const top = h(
    'div',
    { class: 'play-top' },
    heartsBox,
    h(
      'div',
      null,
      h(
        'div',
        { class: 'play-title' },
        custom ? custom.sub : `Fase ${level?.n} · `,
        h('b', null, custom ? custom.title : (level?.title ?? '')),
      ),
      timer,
    ),
    h('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' }, scoreEl, pauseBtn),
  )
  const skillBtns = new Map<SkillKind, HTMLButtonElement>()
  const skillsBar = h('div', { class: 'play-skills', 'aria-label': 'Habilidades' })
  if (!custom) {
    for (const s of SKILLS) {
      const b = skillButton(s.kind, () => useSkill(s.kind)) as HTMLButtonElement
      const supported = s.kind === 'checar' ? !!game.clear : s.kind === 'lembrar' ? !!game.hint : true
      if (!supported) {
        b.disabled = true
        b.classList.add('locked')
        b.title = `${s.label}: não serve nesta fase`
      } else if (skillUnlocked(s.kind)) b.classList.add('ready')
      skillBtns.set(s.kind, b)
      skillsBar.append(b)
    }
  }
  const layer = h('div', { class: 'g-layer' })
  const overlay = h('div', { style: 'position:absolute;inset:0;pointer-events:none' })
  const playRoot = h(
    'div',
    { style: 'position:absolute;inset:0;pointer-events:none' },
    layer,
    h('div', { class: 'play-hud' }, top, skillsBar),
    overlay,
  )
  root.append(playRoot)

  function safeArea() {
    const tb = top.getBoundingClientRect().bottom
    const sb = custom ? innerHeight - 8 : skillsBar.getBoundingClientRect().top
    return { top: Math.ceil(tb / fit.css) + 2, bottom: Math.floor(sb / fit.css) - 2 }
  }

  // ---------- contexto do jogo ----------
  const area = safeArea()
  const ctx: GameCtx = {
    W: fit.W,
    H: fit.H,
    top: area.top,
    bottom: area.bottom,
    rnd,
    css: fit.css,
    layer,
    addScore(n, x, y) {
      score = Math.max(0, score + n)
      scoreEl.textContent = fmtInt(score)
      if (x !== undefined && y !== undefined)
        floats.push({ s: n >= 0 ? `+${n}` : `${n}`, x, y, t: time, col: n >= 0 ? '#f5c04a' : '#ff3b3b' })
    },
    hit(x, y) {
      if (state !== 'run') return
      if (shield) {
        shield = false
        sfx('power')
        floats.push({ s: 'ESCUDO', x: x ?? fit.W / 2, y: y ?? fit.H / 2, t: time, col: '#4fae3f' })
        return
      }
      sfx('bad')
      flash = 0.25
      shake = Math.max(shake, 4)
      if (!maxHearts) return
      hearts--
      renderHearts()
      announce(`Perdeu uma vida. Restam ${hearts}.`)
      if (hearts <= 0) end(false)
    },
    finish() {
      if (state === 'run') end(true)
    },
    burst(x, y, col, n = 10) {
      if (reduce) n = Math.min(n, 4)
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2
        const sp = 20 + rnd() * 50
        parts.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 20,
          life: 0,
          max: 0.4 + rnd() * 0.4,
          col,
        })
      }
    },
    float(s, x, y, col = '#efe8dc') {
      floats.push({ s, x, y, t: time, col })
    },
    shake(a) {
      if (!reduce) shake = Math.max(shake, a)
    },
    sfx(n: Sfx) {
      sfx(n)
    },
    get time() {
      return time
    },
    get reduced() {
      return reduce
    },
  }

  // ---------- habilidades ----------
  function useSkill(kind: SkillKind) {
    if (state !== 'run' || used.has(kind) || !skillUnlocked(kind)) return
    let ok = false
    if (kind === 'checar') ok = !!game.clear?.()
    else if (kind === 'lembrar') ok = !!game.hint?.()
    else if (kind === 'foco') {
      slowUntil = performance.now() + 4000
      ok = true
    } else if (kind === 'proteger') {
      shield = true
      ok = true
    }
    if (!ok) {
      sfx('tick')
      return
    }
    used.add(kind)
    save.skillsUsed++
    sfx('power')
    const b = skillBtns.get(kind)
    if (b) {
      b.classList.remove('ready')
      b.classList.add('used')
      b.disabled = true
    }
    const label = SKILLS.find((s) => s.kind === kind)?.label.toUpperCase() ?? ''
    floats.push({ s: label, x: fit.W / 2, y: fit.H / 2, t: time, col: '#f5c04a' })
    ctx.burst(
      fit.W / 2,
      fit.H / 2,
      kind === 'proteger' ? '#4fae3f' : kind === 'foco' ? '#f5c04a' : '#ff3b3b',
      24,
    )
  }

  // ---------- laço ----------
  let raf = 0
  let last = performance.now()
  function loop(now: number) {
    let dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (state === 'run') {
      const slow = now < slowUntil
      dt *= slow ? 0.45 : 1
      time += dt
      game.update(dt)
      if (game.duration > 0) {
        const left = Math.max(0, game.duration - time)
        timerFill.style.width = `${(left / game.duration) * 100}%`
        timer.classList.toggle('low', left < 5)
        if (left <= 0 && state === 'run') end(game.timeUp ? game.timeUp() : true)
      }
    }
    // partículas
    for (const p of parts) {
      p.life += dt
      p.vy += 90 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    parts = parts.filter((p) => p.life < p.max)
    floats = floats.filter((f) => time - f.t < 0.9)
    shake = Math.max(0, shake - dt * 18)
    flash = Math.max(0, flash - dt)

    g.save()
    if (shake > 0) g.translate(Math.round((rnd() - 0.5) * shake), Math.round((rnd() - 0.5) * shake))
    g.drawImage(bg, 0, 0)
    if (state !== 'intro' && state !== 'count') game.draw(g)
    for (const p of parts) {
      g.globalAlpha = 1 - p.life / p.max
      rect(g, p.x, p.y, 1 + (p.max > 0.7 ? 1 : 0), 1 + (p.max > 0.7 ? 1 : 0), p.col)
    }
    g.globalAlpha = 1
    for (const f of floats) text(g, f.s, f.x, f.y - (time - f.t) * 24, f.col, 8)
    g.restore()
    if (now < slowUntil) {
      g.globalAlpha = 0.12
      rect(g, 0, 0, fit.W, fit.H, '#f5c04a')
      g.globalAlpha = 1
    }
    if (shield) {
      g.globalAlpha = 0.5 + Math.sin(now / 120) * 0.2
      rect(g, 0, 0, fit.W, 1, '#4fae3f')
      rect(g, 0, fit.H - 1, fit.W, 1, '#4fae3f')
      rect(g, 0, 0, 1, fit.H, '#4fae3f')
      rect(g, fit.W - 1, 0, 1, fit.H, '#4fae3f')
      g.globalAlpha = 1
    }
    if (flash > 0) {
      g.globalAlpha = flash * 1.6
      rect(g, 0, 0, fit.W, fit.H, '#e3242b')
      g.globalAlpha = 1
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  // ---------- entrada ----------
  const logical = (e: PointerEvent) => toLogical(fit, e.clientX, e.clientY)
  const onDown = (e: PointerEvent) => {
    if (state !== 'run') return
    e.preventDefault()
    const p = logical(e)
    game.down?.(p.x, p.y)
  }
  const onMove = (e: PointerEvent) => {
    if (state !== 'run') return
    const p = logical(e)
    game.move?.(p.x, p.y)
  }
  const onUp = (e: PointerEvent) => {
    if (state !== 'run') return
    const p = logical(e)
    game.up?.(p.x, p.y)
  }
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (down && (e.key === 'Escape' || e.key === 'p')) {
      if (state === 'run') pause()
      else if (state === 'pause') resume()
      return
    }
    if (state !== 'run') return
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (down && !custom) {
      const map: Record<string, SkillKind> = { q: 'checar', w: 'lembrar', e: 'foco', r: 'proteger' }
      const s = map[k]
      if (s) {
        useSkill(s)
        return
      }
    }
    if (k.startsWith('Arrow')) e.preventDefault()
    game.key?.(k, down)
  }
  const kd = (e: KeyboardEvent) => onKey(e, true)
  const ku = (e: KeyboardEvent) => onKey(e, false)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  addEventListener('keydown', kd)
  addEventListener('keyup', ku)
  const onVis = () => {
    if (document.hidden && state === 'run') pause()
  }
  document.addEventListener('visibilitychange', onVis)

  // ---------- overlays ----------
  function showOverlay(el: HTMLElement) {
    overlay.replaceChildren(el)
    overlay.style.pointerEvents = 'auto'
    el.querySelector<HTMLElement>('.btn--red, .btn')?.focus({ preventScroll: true })
  }
  function hideOverlay() {
    overlay.replaceChildren()
    overlay.style.pointerEvents = 'none'
  }

  function intro() {
    const t = custom?.title ?? level?.title ?? ''
    const box = h(
      'div',
      { class: 'overlay-center' },
      h(
        'div',
        { class: 'intro px-frame px-frame--red', role: 'dialog', 'aria-labelledby': 'intro-t' },
        h('div', { class: 'lvl' }, custom ? custom.sub : `Fase ${level?.n} de 13`),
        h('h2', { id: 'intro-t' }, t),
        level ? h('div', { class: 'where' }, level.where) : null,
        h('p', null, custom?.intro ?? level?.intro ?? ''),
        h(
          'div',
          { class: 'howto' },
          ...(custom?.how ?? level?.how ?? []).map((x) => h('span', null, `▸ ${x}`)),
        ),
        h('button', { class: 'btn btn--red btn--big', onclick: () => countdown() }, 'Começar ▶'),
        h(
          'div',
          { style: 'margin-top:10px' },
          h('button', { class: 'btn btn--ghost', onclick: () => go(custom ? 'title' : 'map') }, 'Voltar'),
        ),
      ),
    )
    showOverlay(box)
  }

  function countdown() {
    state = 'count'
    let n = reduce ? 1 : 3
    const tick = () => {
      if (n === 0) {
        hideOverlay()
        start()
        return
      }
      sfx('tick')
      showOverlay(
        h(
          'div',
          { class: 'overlay-center', style: 'background:transparent' },
          h('div', { class: 'count', 'aria-live': 'assertive' }, n),
        ),
      )
      n--
      window.setTimeout(tick, 450)
    }
    tick()
  }

  function start() {
    const a = safeArea()
    ctx.top = a.top
    ctx.bottom = a.bottom
    game.init(ctx)
    time = 0
    state = 'run'
    last = performance.now()
    announce('Valendo!')
  }

  function pause() {
    if (state !== 'run') return
    state = 'pause'
    showOverlay(
      h(
        'div',
        { class: 'overlay-center' },
        h(
          'div',
          { class: 'intro px-frame', role: 'dialog', 'aria-label': 'Pausa' },
          h('h2', null, 'Pausa'),
          h(
            'div',
            { class: 'stack', style: 'margin-top:14px' },
            h('button', { class: 'btn btn--red btn--wide', onclick: () => resume() }, 'Continuar'),
            custom
              ? null
              : h('button', { class: 'btn btn--wide', onclick: () => go('play', params) }, 'Recomeçar'),
            h(
              'button',
              { class: 'btn btn--ghost btn--wide', onclick: () => go(custom ? 'title' : 'map') },
              custom ? 'Sair' : 'Voltar ao mapa',
            ),
          ),
        ),
      ),
    )
  }
  function resume() {
    hideOverlay()
    last = performance.now()
    state = 'run'
  }

  function end(success: boolean) {
    if (state === 'end') return
    state = 'end'
    if (custom) {
      window.setTimeout(() => custom.onEnd(score, success), 500)
      return
    }
    const lv = level as Level
    const prev = save.stars[lv.n - 1] ?? 0
    const stars = success ? starsFor(score, game.goal) : 0
    if (success) {
      save.stars[lv.n - 1] = Math.max(prev, stars)
      for (const f of lv.facts) if (!save.cards.includes(f)) save.cards.push(f)
      persist()
      sfx('level')
    }
    const firstTime = success && prev === 0
    window.setTimeout(() => {
      if (success && lv.n === 13 && firstTime) {
        go('final')
        return
      }
      const box = success
        ? h(
            'div',
            { class: 'intro px-frame px-frame--gold', role: 'dialog', 'aria-labelledby': 'end-t' },
            h('div', { class: 'lvl' }, `Fase ${lv.n} concluída`),
            h('h2', { id: 'end-t' }, lv.title),
            h(
              'div',
              { class: 'stars', 'aria-label': `${stars} de 3 estrelas` },
              ...[0, 1, 2].map((k) => h('span', { class: k < stars ? '' : 'off' }, '★')),
            ),
            h('p', null, `${fmtInt(score)} pontos${firstTime ? ` · +${500 + stars * 166} XP` : ''}`),
            firstTime && [3, 6, 9].includes(levelsDone())
              ? h(
                  'p',
                  { class: 'small', style: 'color:var(--gold)' },
                  `Habilidade nova: ${SKILLS.find((s) => s.unlock === levelsDone())?.label ?? ''}`,
                )
              : null,
            h(
              'button',
              { class: 'btn btn--red btn--big', onclick: () => go('result', { level: lv.n }) },
              'Ver o fato ▶',
            ),
          )
        : h(
            'div',
            { class: 'intro px-frame px-frame--red', role: 'dialog', 'aria-labelledby': 'end-t' },
            h('div', { class: 'lvl' }, `Fase ${lv.n}`),
            h('h2', { id: 'end-t' }, 'Quase!'),
            h('p', null, 'As vidas acabaram. Tente de novo ou siga com uma estrela.'),
            h(
              'div',
              { class: 'stack' },
              h(
                'button',
                { class: 'btn btn--red btn--wide', onclick: () => go('play', params) },
                'Tentar de novo',
              ),
              h(
                'button',
                {
                  class: 'btn btn--wide',
                  onclick: () => {
                    save.stars[lv.n - 1] = Math.max(prev, 1)
                    for (const f of lv.facts) if (!save.cards.includes(f)) save.cards.push(f)
                    persist()
                    if (lv.n === 13 && prev === 0) go('final')
                    else go('result', { level: lv.n })
                  },
                },
                'Seguir com 1 estrela',
              ),
            ),
          )
      layer.replaceChildren()
      showOverlay(h('div', { class: 'overlay-center' }, box))
    }, 600)
  }

  intro()

  return () => {
    cancelAnimationFrame(raf)
    game.dispose?.()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    removeEventListener('keydown', kd)
    removeEventListener('keyup', ku)
    document.removeEventListener('visibilitychange', onVis)
    document.body.classList.remove('playing')
  }
})
