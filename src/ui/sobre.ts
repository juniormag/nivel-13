// Sobre: som, quem responde pela peça, aviso de IA, privacidade e todas as fontes.

import { CONFIG, responsavelText } from '../config'
import { FACTS } from '../content/facts'
import { setMuted } from '../core/audio'
import { h, toast } from '../core/dom'
import { persist, save } from '../core/store'
import { Scene } from '../scene/scene'
import { go, register } from './router'

register('sobre', (root) => {
  Scene.start()
  const sound = h(
    'button',
    { class: 'chip', 'aria-pressed': save.muted ? 'false' : 'true' },
    save.muted ? 'Som: desligado' : 'Som: ligado',
  )
  sound.addEventListener('click', () => {
    setMuted(!save.muted)
    persist()
    sound.textContent = save.muted ? 'Som: desligado' : 'Som: ligado'
    sound.setAttribute('aria-pressed', save.muted ? 'false' : 'true')
  })
  const sources = FACTS.flatMap((f) => f.sources.map((s) => ({ ...s, card: f.title })))
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
        h('div', { class: 'eyebrow' }, 'Nível 13 · A virada'),
        h('h2', null, 'Sobre o jogo'),
        h('div', { class: 'row', style: 'margin:6px 0 12px' }, sound),
        h(
          'p',
          null,
          'Um jogo curto sobre o Brasil de 2023 a 2026 e o histórico documentado da família Bolsonaro. Cada carta traz a data, o status jurídico exato e o link da fonte.',
        ),
        h('h3', null, 'Propaganda eleitoral'),
        h('p', null, `${CONFIG.aiLabel}. ${responsavelText()}.`),
        h('h3', null, 'Privacidade'),
        h(
          'p',
          null,
          'Sem cadastro, sem telefone, sem e-mail. Guardamos um código aleatório deste aparelho, o apelido e o estado se você informar, seus pontos e, se você declarar, sua escolha no movimento, que entra só na contagem agregada por estado. Nada é vendido nem cruzado com outros dados.',
        ),
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              try {
                localStorage.clear()
              } catch {
                /* sem armazenamento */
              }
              toast('Dados deste aparelho apagados')
              setTimeout(() => location.reload(), 600)
            },
          },
          'Apagar meus dados deste aparelho',
        ),
        h('h3', null, 'Todas as fontes'),
        h(
          'ul',
          { class: 'sources', style: 'list-style:none;padding:0;font-size:14px;line-height:1.6' },
          ...sources.map((s) =>
            h(
              'li',
              null,
              `${s.card}: `,
              h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.name),
              ` · ${s.date}`,
            ),
          ),
        ),
        h('h3', null, 'Créditos'),
        h(
          'p',
          { class: 'small muted' },
          'Arte em pixel, música e efeitos gerados por código. Fontes tipográficas Silkscreen e Pixelify Sans (OFL).',
        ),
      ),
    ),
  )
})
