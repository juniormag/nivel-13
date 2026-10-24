// Carta de fato: título, texto, status jurídico exato, fontes com link e "esse me convenceu".

import type { Fact } from '../content/facts'
import { api } from '../core/api'
import { sfx } from '../core/audio'
import { h } from '../core/dom'
import { persist, save } from '../core/store'
import { personCanvas } from './common'

export function factCard(f: Fact, extra: HTMLElement[] = []) {
  const liked = save.liked.includes(f.id)
  const like = h(
    'button',
    { class: `btn${liked ? ' like on' : ''}`, 'aria-pressed': liked ? 'true' : 'false' },
    liked ? '👍 Me convenceu' : '👍 Esse me convenceu',
  )
  like.addEventListener('click', () => {
    if (save.liked.includes(f.id)) return
    save.liked.push(f.id)
    persist()
    like.classList.add('like', 'on')
    like.setAttribute('aria-pressed', 'true')
    like.textContent = '👍 Me convenceu'
    sfx('good')
    void api.like(f.id)
  })
  return h(
    'article',
    { class: 'factcard px-frame px-frame--gold', 'aria-labelledby': `f-${f.id}` },
    h(
      'div',
      { class: 'head' },
      personCanvas(f.who, f.icon),
      h('div', null, h('div', { class: 'kicker' }, f.kicker), h('h3', { id: `f-${f.id}` }, f.title)),
    ),
    h('span', { class: `status${f.status.kind === 'good' ? ' good' : ''}` }, f.status.label),
    h('p', { class: 'body' }, f.body),
    h(
      'ul',
      { class: 'sources' },
      ...f.sources.map((s) =>
        h(
          'li',
          null,
          '📎 ',
          h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.name),
          ` · ${s.date}`,
        ),
      ),
    ),
    h('div', { class: 'row' }, like, ...extra),
  )
}
