// Convence o Tio (docs/MODOS-NOVOS.md §1). Dono: fact-checker.
// Regra: a resposta boa traz fato com fonte e status exato; a armadilha erra no TOM, na FONTE ou no ASSUNTO,
// nunca traz número falso nem fake news. Parentes são fictícios.
import type { Source } from './facts'

export type ParenteId = 'tio' | 'tia' | 'vo' | 'prima' | 'mae'
export type Topic = 'mercado' | 'emprego' | 'imposto' | 'saude' | 'educacao' | 'fome' | 'seguranca' | 'democracia' | 'fake' | 'casos'

export interface TioReply {
  text: string
  /** 'fato' = a boa; as outras são armadilhas e ensinam por quê */
  kind: 'fato' | 'tom' | 'fonte' | 'assunto'
  /** armadilha: a lição em 1 linha */
  why?: string
  /** boa: fonte curta exibida embaixo da bolha */
  source?: Source
  /** boa: id da carta em src/content/facts.ts, se houver */
  factId?: string
}

export interface TioMsg {
  id: string
  parente: ParenteId
  topic: Topic
  /** a dúvida, escrita como mensagem de família (curta, sem ofensa) */
  doubt: string
  good: TioReply
  trap: TioReply
  react: { good: string; bad: string }
  review: 'ok' | 'pendente'
}

export interface Parente {
  id: ParenteId
  name: string
  /** quem é, em 1 linha */
  who: string
  /** a preocupação principal */
  worry: string
  /** frase final quando convencido / quando não */
  win: string
  lose: string
}

export const PARENTES: Parente[] = []
export const TIO_MSGS: TioMsg[] = []
