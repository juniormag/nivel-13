// Nível 13: o monumento se completa, a coroa desce e a conquista vira card.
import { api } from '../core/api'
import { playMusic, sfx } from '../core/audio'
import { h } from '../core/dom'
import { shareCard, shareText } from '../core/share'
import { persist, save } from '../core/store'
import { Scene } from '../scene/scene'
import { legal } from './common'
import { go, register } from './router'

register('final', (root) => {
  document.body.classList.remove('playing')
  Scene.start()
  Scene.setProgress(1, true)
  playMusic('title')
  const first = !save.finishedAt
  if (first) {
    save.finishedAt = Date.now()
    persist()
    void api.complete()
  }
  const t = window.setTimeout(() => {
    Scene.celebrate()
    sfx('fanfare')
  }, 1400)
  root.append(
    h(
      'div',
      { class: 'screen screen--clear', style: 'justify-content:space-between' },
      h(
        'div',
        { style: 'text-align:center;margin-top:8px' },
        h('div', { class: 'eyebrow' }, 'Você chegou ao'),
        h(
          'h1',
          {
            style:
              'font-family:var(--f-hud);font-weight:400;font-size:clamp(34px,8vw,64px);margin:0;letter-spacing:.06em;text-shadow:0 4px 0 #000,0 0 30px rgba(255,59,59,.6)',
          },
          'NÍVEL 13',
        ),
      ),
      h(
        'div',
        { class: 'sheet px-frame px-frame--gold stack', style: 'width:min(460px,100%)' },
        h(
          'p',
          null,
          'Você derrubou a Grande Fake com fatos. Agora a fase mais importante é fora do jogo: levar isso para quem você conhece e votar.',
        ),
        h(
          'button',
          {
            class: 'btn btn--red btn--wide',
            onclick: () =>
              shareCard({ kind: 'nivel', level: 13 }, 'Cheguei ao nível 13. Duvido você chegar:'),
          },
          'Compartilhar minha conquista',
        ),
        h(
          'button',
          {
            class: 'btn btn--wide',
            onclick: () =>
              shareText('Joguei o Nível 13: 13 fases curtas, tudo com fonte. Duvido você terminar:'),
          },
          'Desafiar amigos no WhatsApp',
        ),
        h('button', { class: 'btn btn--gold btn--wide', onclick: () => go('votar') }, 'Entrar no movimento'),
        h('button', { class: 'btn btn--ghost btn--wide', onclick: () => go('title') }, 'Início'),
      ),
      legal(),
    ),
  )
  return () => clearTimeout(t)
})
