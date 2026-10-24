// Fixture de DESENVOLVIMENTO do Convence o Tio: só entra quando TIO_MSGS está vazio e import.meta.env.DEV.
// Tudo marcado como exemplo, sem número e sem afirmação factual: serve para ver a interface, nunca vai ao ar.
import type { Parente, TioMsg } from '../../content/tio'

const SRC = { name: 'Exemplo de fonte (fixture de desenvolvimento)', url: 'https://example.com/', date: 'exemplo' }

export const FIX_PARENTES: Parente[] = [
  {
    id: 'tio',
    name: 'Tio Exemplo',
    who: 'Parente de exemplo para testar a tela.',
    worry: 'Exemplo de preocupação',
    win: '[exemplo] Tá bom, vou olhar com carinho.',
    lose: '[exemplo] Vamos falar disso no almoço.',
  },
]

const msg = (i: number, kind: 'tom' | 'fonte' | 'assunto'): TioMsg => ({
  id: `exemplo-${i}`,
  parente: 'tio',
  topic: 'fake',
  doubt: `[exemplo ${i}] Uma dúvida comum de família, curta e sem ofensa.`,
  good: {
    kind: 'fato',
    text: `[exemplo ${i}] Resposta boa: fato curto, tom gentil e a fonte embaixo.`,
    source: SRC,
  },
  trap: {
    kind,
    text: `[exemplo ${i}] Resposta armadilha (${kind}).`,
    why: `[exemplo] A lição da armadilha de ${kind} em 1 linha.`,
  },
  react: { good: '[exemplo] Hmm, isso eu não sabia 🤔', bad: '[exemplo] Lá vem você...' },
  review: 'pendente',
})

export const FIX_MSGS: TioMsg[] = [msg(1, 'tom'), msg(2, 'fonte'), msg(3, 'assunto')]
