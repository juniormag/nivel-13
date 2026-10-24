// Coleção de cartas. "Modo leitura" mostra todas, para quem prefere ler a jogar.

import { FACTS } from '../content/facts'
import { h } from '../core/dom'
import { save } from '../core/store'
import { Scene } from '../scene/scene'
import { personCanvas } from './common'
import { factCard } from './factcard'
import { go, register } from './router'

register('colecao', (root) => {
  Scene.start()
  let all = false
  const grid = h('div', { class: 'cards-grid' })
  const modal = h('div')
  const open = (i: number) => {
    const f = FACTS[i]
    if (!f) return
    const close = h('button', { class: 'btn btn--ghost', onclick: () => modal.replaceChildren() }, 'Fechar')
    modal.replaceChildren(
      h(
        'div',
        {
          class: 'screen',
          style: 'z-index:5',
          onclick: (e: Event) => e.target === e.currentTarget && modal.replaceChildren(),
        },
        h('div', { class: 'stack', style: 'align-items:center;width:min(480px,100%)' }, factCard(f), close),
      ),
    )
    close.focus()
  }
  const render = () =>
    grid.replaceChildren(
      ...FACTS.map((f, i) => {
        const have = save.cards.includes(f.id)
        const show = have || all
        return h(
          'button',
          {
            class: show ? '' : 'locked',
            disabled: !show,
            onclick: () => open(i),
            'aria-label': show ? `Carta: ${f.title}` : 'Carta bloqueada',
          },
          personCanvas(f.who, f.icon),
          show ? f.title : '???',
          h('span', { style: 'color:var(--dim);font-size:9px' }, f.kicker.split(' · ')[0] ?? ''),
        )
      }),
    )
  render()
  const toggle = h('button', { class: 'chip', 'aria-pressed': 'false' }, 'Modo leitura: mostrar todas')
  toggle.addEventListener('click', () => {
    all = !all
    toggle.setAttribute('aria-pressed', String(all))
    render()
  })
  root.append(
    h(
      'div',
      { class: 'screen' },
      h(
        'div',
        { class: 'sheet sheet--wide px-frame' },
        h(
          'button',
          { class: 'btn btn--ghost close', onclick: () => go('title'), 'aria-label': 'Fechar' },
          '✕',
        ),
        h('div', { class: 'eyebrow' }, `${save.cards.length} de ${FACTS.length}`),
        h('h2', null, 'Coleção de fatos'),
        h('div', { class: 'row', style: 'margin:8px 0 14px' }, toggle),
        grid,
      ),
      modal,
    ),
  )
})
