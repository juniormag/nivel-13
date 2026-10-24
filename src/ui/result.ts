// Depois de cada fase: a carta (ou cartas) de fato conquistada.

import { factById } from '../content/facts'
import { LEVELS } from '../content/levels'
import { playMusic } from '../core/audio'
import { h } from '../core/dom'
import { shareCard } from '../core/share'
import { levelsDone, save } from '../core/store'
import { economiaIR } from '../games/ir'
import { Scene } from '../scene/scene'
import { factCard } from './factcard'
import { go, register } from './router'

register('result', (root, params) => {
  document.body.classList.remove('playing')
  Scene.start()
  Scene.setProgress(levelsDone() / 13, true)
  playMusic('title')
  const n = Number(params.level ?? 1)
  const lv = LEVELS[n - 1]
  if (!lv) {
    go('map')
    return
  }
  const facts = lv.facts.map(factById).filter((f) => !!f)
  let i = 0
  const wrap = h('div', { class: 'screen' })
  const render = () => {
    const f = facts[i]
    if (!f) return
    const isLast = i === facts.length - 1
    const nextBtn = isLast
      ? h(
          'button',
          { class: 'btn btn--red', onclick: () => (n < 13 ? go('play', { level: n + 1 }) : go('final')) },
          n < 13 ? `Fase ${n + 1} ▶` : 'Final ▶',
        )
      : h(
          'button',
          {
            class: 'btn btn--red',
            onclick: () => {
              i++
              render()
            },
          },
          'Próxima carta ▶',
        )
    const extra: HTMLElement[] = []
    const ir = save.irMonthly
    if (lv.kind === 'ir' && ir !== null && economiaIR(ir).ano > 0)
      extra.push(
        h(
          'button',
          {
            class: 'btn btn--gold',
            onclick: () =>
              shareCard(
                { kind: 'ir', perYear: economiaIR(ir).ano },
                'Fiz a conta: olha quanto a isenção do IR deixa no meu bolso. Faça a sua:',
              ),
          },
          'Compartilhar minha economia',
        ),
      )
    wrap.replaceChildren(
      h(
        'div',
        { class: 'stack', style: 'align-items:center;width:min(480px,100%)' },
        h('div', { class: 'eyebrow', style: 'text-align:center' }, `Carta conquistada · ${levelsDone()}/13`),
        factCard(f, extra),
        h(
          'div',
          { class: 'row row--center' },
          h('button', { class: 'btn btn--ghost', onclick: () => go('map') }, 'Mapa'),
          nextBtn,
        ),
      ),
    )
    wrap.querySelector<HTMLElement>('.btn--red')?.focus({ preventScroll: true })
  }
  render()
  root.append(wrap)
})
