// Tela título: o HUD da referência sobre o monumento.

import { FACTS } from '../content/facts'
import { playMusic } from '../core/audio'
import { fmtInt, h } from '../core/dom'
import { currentLevel, levelsDone, save, stats, XP_MAX, xpTotal } from '../core/store'
import { dailyNumber, todayBR, untilElection } from '../core/time'
import { Scene } from '../scene/scene'
import { avatarCanvas, drawMinimap, hearts, legal, SKILLS, skillButton } from './common'
import { go, register } from './router'

register('title', (root) => {
  document.body.classList.remove('playing')
  Scene.start()
  Scene.setProgress(levelsDone() / 13)
  playMusic('title')

  const lvl = currentLevel()
  const xp = xpTotal()
  const st = stats()
  const statRow = (label: string, v: number) => [
    h('span', null, label),
    h(
      'div',
      { class: 'segbar', 'aria-hidden': 'true' },
      ...Array.from({ length: 10 }, (_, i) => h('i', { class: i < Math.round(v / 10) ? 'on' : '' })),
    ),
    h('span', { class: 'num' }, v),
  ]

  const done = levelsDone()
  const playedToday = !!save.daily.results[todayBR()]
  const countdown = untilElection()
  const items: [string, string, () => void][] = [
    [
      done === 0 ? 'Jogar' : done < 13 ? 'Continuar' : 'Rejogar',
      done < 13 ? `fase ${lvl} de 13` : 'nível 13 ✓',
      () => go(save.onboarded ? 'map' : 'onboard'),
    ],
    ['Desafio do dia', `#${dailyNumber()}${playedToday ? ' ✓' : ''}`, () => go('daily')],
    ['Placar da virada', '', () => go('placar')],
    ['Coleção', `${save.cards.length}/${FACTS.length}`, () => go('colecao')],
    ['Vou votar', countdown ? `faltam ${countdown.label}` : '', () => go('votar')],
  ]
  const menuBtns = items.map(([label, small, fn], i) =>
    h(
      'button',
      { class: `menu-item${i === 0 ? ' active' : ''}`, onclick: fn },
      label,
      small ? h('small', null, small) : null,
    ),
  )
  for (const b of menuBtns)
    b.addEventListener('pointerenter', () => {
      for (const o of menuBtns) o.classList.toggle('active', o === b)
    })

  const mini = h('canvas', { 'aria-hidden': 'true' })
  drawMinimap(mini, 72, Math.min(12, done))

  const hud = h(
    'div',
    { class: 'hud' },
    h(
      'div',
      { class: 'hud-player' },
      h('div', { class: 'px-frame', style: 'padding:3px' }, avatarCanvas()),
      h(
        'div',
        null,
        h('div', { class: 'hud-level' }, 'NÍVEL ', h('b', null, lvl)),
        h(
          'div',
          {
            class: 'xpbar',
            role: 'progressbar',
            'aria-valuemin': '0',
            'aria-valuemax': String(XP_MAX),
            'aria-valuenow': String(xp),
            'aria-label': 'Experiência',
          },
          h('i', { style: `width:calc(${(xp / XP_MAX) * 100}% - 4px)` }),
        ),
        h('div', { class: 'hud-xp' }, `${fmtInt(xp)} / ${fmtInt(XP_MAX)} XP`),
      ),
    ),
    h(
      'div',
      { class: 'hud-top-right' },
      hearts(3),
      h(
        'button',
        { class: 'btn btn--ghost dots', 'aria-label': 'Sobre, fontes e som', onclick: () => go('sobre') },
        '···',
      ),
    ),
    h(
      'div',
      { class: 'hud-stats', 'aria-label': 'Atributos' },
      ...statRow('Fatos', st.fatos),
      ...statRow('Memória', st.memoria),
      ...statRow('Coragem', st.coragem),
      ...statRow('Democracia', st.democracia),
    ),
    h(
      'div',
      { class: 'title-logo' },
      h('div', { class: 't1' }, 'NÍVEL 13'),
      h('div', { class: 't2' }, 'A VIRADA'),
    ),
    h(
      'nav',
      { class: 'menu', 'aria-label': 'Menu principal' },
      h('div', { class: 'menu-head' }, h('b', null, 'Nível 13'), h('span', null, 'A virada')),
      ...menuBtns,
    ),
    h('div', { class: 'skills', 'aria-label': 'Habilidades' }, ...SKILLS.map((s) => skillButton(s.kind))),
    h('div', { class: 'minimap px-frame', 'aria-hidden': 'true' }, mini),
    legal(),
  )
  root.append(hud)

  const onKey = (e: KeyboardEvent) => {
    const i = menuBtns.findIndex((b) => b.classList.contains('active'))
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + menuBtns.length) % menuBtns.length
      menuBtns.forEach((b, k) => {
        b.classList.toggle('active', k === n)
      })
      menuBtns[n]?.focus()
    }
  }
  addEventListener('keydown', onKey)
  return () => removeEventListener('keydown', onKey)
})
