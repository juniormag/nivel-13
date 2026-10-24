// Textos do instalar (PT-BR curto, verbo nos botões, sem travessão).
import type { Variant } from './timeline'

export interface StepCopy {
  /** o que fazer; o ícone entra no lugar de {i} */
  text: string
  hint: string
  icon?: 'share' | 'add' | 'kebab' | 'meatball' | 'compass'
}

export interface SheetCopy {
  eyebrow: string
  title: string
  lede: string
  steps: [StepCopy, StepCopy, StepCopy]
}

const DONE_HINT = 'O 13 aparece entre os seus apps.'

export const COPY: Record<Variant, SheetCopy> = {
  ios: {
    eyebrow: 'Jogue como app',
    title: 'Instale o Nível 13',
    lede: 'Três toques e o jogo abre da tela inicial, em tela cheia.',
    steps: [
      { text: 'Toque em Compartilhar', icon: 'share', hint: 'Na barra do navegador, embaixo ou no alto.' },
      { text: 'Toque em Adicionar à Tela de Início', icon: 'add', hint: 'Role a lista se não aparecer.' },
      { text: 'Toque em Adicionar', hint: DONE_HINT },
    ],
  },
  ios26: {
    eyebrow: 'Jogue como app',
    title: 'Instale o Nível 13',
    lede: 'Três toques e o jogo abre da tela inicial, em tela cheia.',
    steps: [
      { text: 'Toque em ⋯ e em Compartilhar', icon: 'share', hint: 'O ⋯ fica ao lado do endereço.' },
      { text: 'Toque em Adicionar à Tela de Início', icon: 'add', hint: 'Role a lista se não aparecer.' },
      { text: 'Toque em Adicionar', hint: 'Deixe Abrir como App Web ligado.' },
    ],
  },
  android: {
    eyebrow: 'Jogue como app',
    title: 'Instale o Nível 13',
    lede: 'Três toques e o jogo abre da tela inicial, em tela cheia.',
    steps: [
      { text: 'Toque no menu do navegador', icon: 'kebab', hint: 'Os três pontinhos, no alto à direita.' },
      { text: 'Toque em Instalar app', icon: 'add', hint: 'Ou em Adicionar à tela inicial.' },
      { text: 'Toque em Instalar', hint: DONE_HINT },
    ],
  },
  'inapp-ios': {
    eyebrow: 'Primeiro passo',
    title: 'Abra no Safari',
    lede: 'Dentro do WhatsApp ou do Instagram não dá para instalar.',
    steps: [
      { text: 'Toque no menu do app', icon: 'meatball', hint: 'Os três pontinhos, no alto.' },
      { text: 'Toque em Abrir no Safari', icon: 'compass', hint: 'Ou em Abrir no navegador.' },
      { text: 'No Safari, toque em Instalar', hint: 'O jogo mostra o caminho.' },
    ],
  },
  'inapp-android': {
    eyebrow: 'Primeiro passo',
    title: 'Abra no Chrome',
    lede: 'Dentro do WhatsApp ou do Instagram não dá para instalar.',
    steps: [
      { text: 'Toque no menu do app', icon: 'kebab', hint: 'Os três pontinhos, no alto.' },
      { text: 'Toque em Abrir no Chrome', icon: 'compass', hint: 'Ou em Abrir no navegador.' },
      { text: 'No Chrome, toque em Instalar', hint: 'O jogo mostra o botão.' },
    ],
  },
}

export const BANNER = {
  title: 'Jogue como app',
  sub: 'O 13 na sua tela inicial, em tela cheia.',
  subInApp: 'Abra no navegador para instalar.',
  install: 'Instalar o app',
  how: 'Ver como',
  later: 'Agora não',
}
