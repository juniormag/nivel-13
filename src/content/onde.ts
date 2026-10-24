// Onde Foi? (docs/MODOS-NOVOS.md §2). Dono: fact-checker.
// Pino verde = avanço com dado oficial; pino vermelho = caso do bolsonarismo com status jurídico EXATO
// (Condenado só com condenação; indiciado, denunciado, investigado e arquivado são coisas diferentes).
import type { Fact, Source } from './facts'

export interface Pin {
  id: string
  side: 'avanco' | 'caso'
  /** a pista, 1 frase, sem dizer o lugar */
  clue: string
  /** nome do lugar revelado */
  place: string
  uf: string
  lat: number
  lng: number
  title: string
  /** 2 linhas no máximo */
  body: string
  status: { label: string; kind: 'good' | 'legal' }
  who: Fact['who']
  sources: Source[]
  review: 'ok' | 'pendente'
}

export const PINS: Pin[] = []
