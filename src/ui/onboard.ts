// Primeira vez: personagem, apelido e estado. Tudo opcional, em menos de 15 segundos.

import { UFS } from '../content/brazil'
import { api } from '../core/api'
import { unlockAudio } from '../core/audio'
import { h } from '../core/dom'
import { type Avatar, persist, save } from '../core/store'
import { avatarTile } from './common'
import { go, register } from './router'

const BLOCK = /(bolsominion|gado|petralha|lula ?ladr|ladr[aã]o|merda|porra|caralho|puta|fdp|viado|nazi)/i

export function cleanName(s: string) {
  const t = s
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 16)
  return BLOCK.test(t) ? '' : t
}

register('onboard', (root) => {
  unlockAudio()
  let pick: Avatar = save.avatar
  const grid = h('div', { class: 'avatars', role: 'group', 'aria-label': 'Personagem' })
  const renderTiles = () =>
    grid.replaceChildren(
      ...(['coelho', 'onca', 'arara', 'capivara'] as Avatar[]).map((a) =>
        avatarTile(a, a === pick, () => {
          pick = a
          renderTiles()
        }),
      ),
    )
  renderTiles()
  const name = h('input', {
    class: 'input',
    id: 'nick',
    maxlength: 16,
    placeholder: 'Ex.: Coelho do Sertão',
    autocomplete: 'nickname',
    value: save.name,
  })
  const uf = h(
    'select',
    { class: 'input', id: 'uf' },
    h('option', { value: '' }, 'Prefiro não dizer'),
    ...UFS.map((u) => h('option', { value: u, selected: u === save.uf }, u)),
  )
  const start = () => {
    save.avatar = pick
    save.name = cleanName(name.value)
    save.uf = uf.value
    save.onboarded = true
    persist()
    void api.hello()
    go('map')
  }
  root.append(
    h(
      'div',
      { class: 'screen' },
      h(
        'form',
        {
          class: 'sheet px-frame stack',
          onsubmit: (e: Event) => {
            e.preventDefault()
            start()
          },
        },
        h('div', { class: 'eyebrow' }, 'Antes de começar'),
        h('h2', null, 'Escolha seu personagem'),
        grid,
        h('div', { class: 'field' }, h('label', { for: 'nick' }, 'Apelido no placar (opcional)'), name),
        h('div', { class: 'field' }, h('label', { for: 'uf' }, 'Seu estado (opcional)'), uf),
        h(
          'p',
          { class: 'small muted' },
          'Sem cadastro e sem telefone. O apelido aparece no placar; o estado entra só na contagem por estado.',
        ),
        h(
          'div',
          { class: 'row row--end' },
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => go('title') }, 'Voltar'),
          h('button', { class: 'btn btn--red btn--big', type: 'submit' }, 'Começar ▶'),
        ),
      ),
    ),
  )
})
