// Desafio do Dia: 5 mensagens iguais para o Brasil inteiro, uma tentativa por dia, resultado em emoji.

import { STATEMENTS, type Statement } from '../content/statements'
import { api } from '../core/api'
import { h } from '../core/dom'
import { hashStr, mulberry32, shuffle } from '../core/rng'
import { shareCard, shareText } from '../core/share'
import { persist, save, shareLink } from '../core/store'
import { dailyNumber, msToNextDay, todayBR } from '../core/time'
import { swipeGame } from '../games/swipe'
import { Scene } from '../scene/scene'
import { go, register } from './router'

export function dailyStatements(date = todayBR()): Statement[] {
  return shuffle(STATEMENTS, mulberry32(hashStr(`nivel13:${date}`))).slice(0, 5)
}

const emoji = (grid: string) => [...grid].map((c) => (c === '1' ? '🟩' : '🟥')).join('')

register('daily', (root) => {
  document.body.classList.remove('playing')
  Scene.start()
  const date = todayBR()
  const n = dailyNumber(date)
  const res = save.daily.results[date]
  const list = dailyStatements(date)

  if (!res) {
    root.append(
      h(
        'div',
        { class: 'screen' },
        h(
          'div',
          { class: 'sheet px-frame px-frame--red stack' },
          h('div', { class: 'eyebrow' }, `Desafio do dia #${n}`),
          h('h2', null, 'Fato ou fake?'),
          h(
            'p',
            null,
            '5 mensagens, as mesmas para o Brasil inteiro. Uma tentativa por dia. Depois, compare com seus amigos.',
          ),
          save.daily.streak > 0
            ? h(
                'p',
                { class: 'small', style: 'color:var(--ember)' },
                `Sequência atual: ${save.daily.streak} dia(s)`,
              )
            : null,
          h(
            'div',
            { class: 'row row--end' },
            h('button', { class: 'btn btn--ghost', onclick: () => go('title') }, 'Voltar'),
            h(
              'button',
              {
                class: 'btn btn--red btn--big',
                autofocus: true,
                onclick: () => {
                  const marks: boolean[] = []
                  go('play', {
                    custom: {
                      title: 'Fato ou Fake',
                      sub: `Desafio #${n}`,
                      intro: 'Arraste a mensagem: esquerda é fake, direita é fato. Tem 12 segundos cada.',
                      how: ['← Fake', 'Fato →'],
                      hearts: null,
                      game: swipeGame({
                        statements: list,
                        perCard: 12,
                        onAnswer: (_s, ok) => marks.push(ok),
                      }),
                      onEnd: () => {
                        const grid = list.map((_, i) => (marks[i] ? '1' : '0')).join('')
                        const yesterday = todayBR(new Date(Date.now() - 86400000))
                        save.daily.streak = save.daily.last === yesterday ? save.daily.streak + 1 : 1
                        save.daily.last = date
                        save.daily.results[date] = grid
                        persist()
                        void api.daily(date, marks.filter(Boolean).length)
                        go('daily')
                      },
                    },
                  })
                },
              },
              'Jogar ▶',
            ),
          ),
        ),
      ),
    )
    return
  }

  const hits = [...res].filter((c) => c === '1').length
  const textShare = `Nível 13 · Desafio #${n}\n${emoji(res)} ${hits}/5${save.daily.streak > 1 ? ` · 🔥 ${save.daily.streak} dias` : ''}`
  const ms = msToNextDay()
  const avg = h('p', { class: 'small muted' }, '')
  void api.stats().then((s) => {
    if (s?.daily && s.daily.plays > 0)
      avg.textContent = `Hoje: ${s.daily.plays.toLocaleString('pt-BR')} jogaram, média ${s.daily.avg.toFixed(1)}/5.`
  })
  root.append(
    h(
      'div',
      { class: 'screen' },
      h(
        'div',
        { class: 'sheet px-frame px-frame--gold stack' },
        h('div', { class: 'eyebrow' }, `Desafio do dia #${n}`),
        h('div', { class: 'emoji-grid', role: 'img', 'aria-label': `${hits} de 5 acertos` }, emoji(res)),
        h('h2', { style: 'text-align:center' }, `${hits}/5 fatos`),
        save.daily.streak > 1
          ? h('p', { style: 'text-align:center;color:var(--ember)' }, `🔥 ${save.daily.streak} dias seguidos`)
          : null,
        avg,
        h(
          'button',
          { class: 'btn btn--red btn--wide', onclick: () => shareText(textShare) },
          'Mandar resultado no WhatsApp',
        ),
        h(
          'button',
          {
            class: 'btn btn--wide',
            onclick: () =>
              shareCard(
                { kind: 'daily', n, grid: [...res].map((c) => c === '1'), streak: save.daily.streak },
                textShare,
              ),
          },
          'Card para o story',
        ),
        h('h3', null, 'As mensagens de hoje'),
        h(
          'ul',
          { class: 'list' },
          ...list.map((s, i) =>
            h(
              'li',
              { style: 'grid-template-columns:24px 1fr' },
              h('span', null, res[i] === '1' ? '🟩' : '🟥'),
              h(
                'div',
                null,
                h('div', null, s.text),
                h('div', { class: 'small muted' }, `${s.fato ? 'FATO' : 'FAKE'}: ${s.exp}`),
              ),
            ),
          ),
        ),
        h(
          'p',
          { class: 'small muted' },
          `Próximo desafio em ${Math.floor(ms / 3600000)}h${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}. Link: ${shareLink().replace(/^https?:\/\//, '')}`,
        ),
        h('button', { class: 'btn btn--ghost', onclick: () => go('title') }, '← Início'),
      ),
    ),
  )
})
