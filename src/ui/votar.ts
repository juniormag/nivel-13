// Entrar no movimento: compromisso de votar, declaração anônima e o checklist do dia.

import { CONFIG } from '../config'
import { api } from '../core/api'
import { sfx } from '../core/audio'
import { h } from '../core/dom'
import { shareCard, shareText } from '../core/share'
import { type Movimento, persist, save } from '../core/store'
import { untilElection } from '../core/time'
import { Scene } from '../scene/scene'
import { go, register } from './router'

const OPTIONS: [Movimento, string, string][] = [
  ['vou', 'Vou votar 13', 'Já decidi e vou lá no domingo.'],
  ['virei', 'Virei meu voto para o 13', 'Mudei de ideia vendo os fatos.'],
  ['pensando', 'Ainda estou pensando', 'Quero ver mais fatos antes.'],
]

register('votar', (root) => {
  Scene.start()
  const box = h('div', { class: 'stack' })
  const c = untilElection()

  function render() {
    const choice = save.movimento
    box.replaceChildren(
      h('div', { class: 'eyebrow' }, c ? `Faltam ${c.label} para abrir as urnas` : 'Dia de votar'),
      h('h2', null, 'Entrar no movimento'),
      h('p', null, `Segundo turno: ${CONFIG.electionLabel}.`),
      h(
        'div',
        { class: 'stack', role: 'radiogroup', 'aria-label': 'Sua escolha' },
        ...OPTIONS.map(([k, label, sub]) =>
          h(
            'button',
            {
              class: `btn btn--wide vote-opt${choice === k ? ' btn--red' : ''}`,
              role: 'radio',
              'aria-checked': choice === k ? 'true' : 'false',
              onclick: () => {
                save.movimento = k
                persist()
                sfx('good')
                void api.movimento(k)
                render()
              },
            },
            h('span', null, label),
            h('small', null, sub),
          ),
        ),
      ),
      h(
        'p',
        { class: 'small muted' },
        'Sua escolha entra só na contagem por estado, sem nome. Você pode mudar quando quiser. Não vale prêmio nem ponto.',
      ),
      choice === 'pensando'
        ? h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn btn--red', onclick: () => go('map') }, 'Ver os fatos nas 13 fases'),
            h('button', { class: 'btn', onclick: () => go('colecao') }, 'Ler todas as cartas'),
          )
        : choice
          ? h(
              'div',
              { class: 'row' },
              h(
                'button',
                {
                  class: 'btn btn--red',
                  onclick: () =>
                    shareCard(
                      { kind: 'movimento' },
                      choice === 'virei'
                        ? 'Virei meu voto. Veja os fatos e decida também:'
                        : 'Domingo eu vou votar 13. E você?',
                    ),
                },
                'Gerar meu card',
              ),
              h(
                'button',
                {
                  class: 'btn',
                  onclick: () =>
                    shareText(
                      `Domingo é dia de votar. Bora junto? Antes, joga isso aqui: 13 fases, tudo com fonte.`,
                    ),
                },
                'Chamar alguém para votar',
              ),
            )
          : '',
      h('h3', null, 'Checklist do dia'),
      h(
        'ul',
        { class: 'list' },
        ...[
          [
            '🪪',
            'Documento oficial com foto (RG, CNH, carteira de trabalho, passaporte) ou o e-Título com foto.',
          ],
          ['🕗', 'Urnas abertas das 8h às 17h, horário de Brasília.'],
          ['📍', 'Confira seu local de votação no app e-Título ou no site do TSE.'],
          ['📵', 'Celular fica com o mesário: é proibido na cabine.'],
          ['📝', 'Pode levar a "cola" em papel com o número.'],
        ].map(([i, t]) =>
          h('li', { style: 'grid-template-columns:28px 1fr' }, h('span', null, i), h('span', null, t)),
        ),
      ),
      h(
        'p',
        { class: 'small' },
        h('a', { href: 'https://www.tse.jus.br/', target: '_blank', rel: 'noopener' }, 'Site do TSE'),
      ),
    )
  }
  render()
  root.append(
    h(
      'div',
      { class: 'screen' },
      h(
        'div',
        { class: 'sheet px-frame px-frame--red' },
        h(
          'button',
          { class: 'btn btn--ghost close', onclick: () => go('title'), 'aria-label': 'Fechar' },
          '✕',
        ),
        box,
      ),
    ),
  )
})
