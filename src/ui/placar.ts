// Placar da Virada: movimento por estado (anônimo), corrente de convites e os fatos que mais convencem.

import { FACTS } from '../content/facts'
import { api, type Stats } from '../core/api'
import { h } from '../core/dom'
import { copyLink, shareText } from '../core/share'
import { save } from '../core/store'
import { Scene } from '../scene/scene'
import { go, register } from './router'

type Tab = 'virada' | 'corrente' | 'fatos'

register('placar', (root, params) => {
  Scene.start()
  let tab: Tab = (params.tab as Tab) ?? 'virada'
  let stats: Stats | null | undefined
  const body = h('div', { 'aria-live': 'polite' })
  const tabs = h('div', { class: 'tabs', role: 'tablist' })

  const renderTabs = () =>
    tabs.replaceChildren(
      ...(
        [
          ['virada', 'Virada'],
          ['corrente', 'Corrente'],
          ['fatos', 'Fatos'],
        ] as [Tab, string][]
      ).map(([k, l]) =>
        h(
          'button',
          {
            class: 'chip',
            role: 'tab',
            'aria-selected': k === tab ? 'true' : 'false',
            onclick: () => {
              tab = k
              render()
            },
          },
          l,
        ),
      ),
    )

  function render() {
    renderTabs()
    if (stats === undefined) {
      body.replaceChildren(h('p', { class: 'muted' }, 'Carregando o placar…'))
      return
    }
    if (stats === null) {
      body.replaceChildren(
        h('p', null, 'O placar ao vivo está fora do ar agora. Seu progresso continua salvo neste aparelho.'),
        h('button', { class: 'btn', onclick: () => load() }, 'Tentar de novo'),
      )
      return
    }
    const s = stats
    if (tab === 'virada') {
      const max = Math.max(1, ...s.byUf.map((u) => u.vou + u.virei))
      body.replaceChildren(
        h(
          'div',
          { class: 'bigstat' },
          h(
            'div',
            null,
            h('b', null, s.movimento.vou.toLocaleString('pt-BR')),
            h('span', null, 'Vão votar 13'),
          ),
          h(
            'div',
            null,
            h('b', null, s.movimento.virei.toLocaleString('pt-BR')),
            h('span', null, 'Viraram o voto'),
          ),
          h('div', null, h('b', null, s.players.toLocaleString('pt-BR')), h('span', null, 'Jogadores')),
        ),
        h('h3', null, 'Estados com mais gente no movimento'),
        s.byUf.length
          ? h(
              'ol',
              { class: 'list' },
              ...s.byUf
                .slice(0, 27)
                .map((u, i) =>
                  h(
                    'li',
                    null,
                    h('span', { class: 'pos' }, `${i + 1}º`),
                    h(
                      'div',
                      null,
                      h('div', null, `${u.uf} · ${u.virei.toLocaleString('pt-BR')} viradas`),
                      h(
                        'div',
                        { class: 'bar' },
                        h('i', { style: `width:${((u.vou + u.virei) / max) * 100}%` }),
                      ),
                    ),
                    h('span', { class: 'val' }, (u.vou + u.virei).toLocaleString('pt-BR')),
                  ),
                ),
            )
          : h('p', { class: 'muted' }, 'Ninguém declarou ainda. Seja o primeiro.'),
        h(
          'p',
          { class: 'small muted' },
          'Declaração anônima e voluntária: só o estado entra na conta, sem nome. Não vale prêmio nem ponto.',
        ),
        h(
          'button',
          { class: 'btn btn--red', onclick: () => go('votar') },
          save.movimento ? 'Ver meu compromisso' : 'Entrar no movimento',
        ),
      )
    } else if (tab === 'corrente') {
      body.replaceChildren(
        h('p', null, 'Sua corrente conta quantas pessoas terminaram as 13 fases pelo seu link.'),
        h(
          'div',
          { class: 'bigstat', style: 'grid-template-columns:1fr 1fr' },
          h('div', null, h('b', null, String(s.me?.corrente ?? 0)), h('span', null, 'Na sua corrente')),
          h('div', null, h('b', null, s.me?.rank ? `${s.me.rank}º` : '–'), h('span', null, 'Sua posição')),
        ),
        h(
          'div',
          { class: 'row' },
          h(
            'button',
            {
              class: 'btn btn--red',
              onclick: () =>
                shareText(
                  'Joga comigo? 13 fases curtas sobre o Brasil, tudo com fonte. Cada amigo que termina entra na minha corrente:',
                ),
            },
            'Convidar no WhatsApp',
          ),
          h('button', { class: 'btn', onclick: () => copyLink() }, 'Copiar meu link'),
        ),
        h('h3', null, 'Maiores correntes'),
        s.corrente.length
          ? h(
              'ol',
              { class: 'list' },
              ...s.corrente.map((p, i) =>
                h(
                  'li',
                  { class: p.me ? 'me' : '' },
                  h('span', { class: 'pos' }, `${i + 1}º`),
                  h('span', null, `${p.name || 'Anônimo'}${p.uf ? ` · ${p.uf}` : ''}`),
                  h('span', { class: 'val' }, String(p.count)),
                ),
              ),
            )
          : h('p', { class: 'muted' }, 'Ainda não há correntes. Mande seu link e abra a primeira.'),
      )
    } else {
      const max = Math.max(1, ...s.facts.map((f) => f.likes))
      body.replaceChildren(
        h(
          'p',
          null,
          'Os fatos que mais convenceram quem jogou. Use os mais fortes na conversa com a família.',
        ),
        h(
          'ol',
          { class: 'list' },
          ...s.facts
            .map((f) => ({ f, fact: FACTS.find((x) => x.id === f.fact) }))
            .filter((x) => x.fact)
            .map(({ f, fact }, i) =>
              h(
                'li',
                null,
                h('span', { class: 'pos' }, `${i + 1}º`),
                h(
                  'div',
                  null,
                  h('div', null, fact?.title ?? ''),
                  h('div', { class: 'bar' }, h('i', { style: `width:${(f.likes / max) * 100}%` })),
                ),
                h('span', { class: 'val' }, `👍 ${f.likes}`),
              ),
            ),
        ),
        s.facts.length
          ? ''
          : h('p', { class: 'muted' }, 'Sem votos ainda. Toque em "Esse me convenceu" nas cartas.'),
      )
    }
  }

  async function load() {
    stats = undefined
    render()
    stats = await api.stats()
    render()
  }

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
        h('div', { class: 'eyebrow' }, 'Ao vivo'),
        h('h2', null, 'Placar da virada'),
        tabs,
        body,
      ),
    ),
  )
  void load()
})
