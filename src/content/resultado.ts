// Resultado oficial da eleição presidencial de 2026 (1º turno em 4/10, 2º turno em 25/10).
// Números do TSE com 100% das seções totalizadas. Só entra aqui o que tem fonte.
import type { Source } from './facts'

export interface Turno {
  /** percentual dos votos válidos */
  lula: number
  flavio: number
}

export const RESULTADO = {
  turno1: { lula: 45.16, flavio: 47.03 } satisfies Turno,
  turno2: { lula: 51.79, flavio: 48.21 } satisfies Turno,
  votos2: { lula: 64_256_232, flavio: 59_826_041 },
  /** unidades da federação vencidas no 2º turno (26 estados + DF) */
  ufs2: { lula: 13, flavio: 14 },
  data2: '25/10/2026',
  sources: [
    {
      name: 'TSE · Presidente do TSE anuncia reeleição de Lula e faz balanço do 2º turno',
      url: 'https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/presidente-do-tse-anuncia-reeleicao-de-lula-e-faz-balanco-do-2o-turno-das-eleicoes-2026',
      date: '25/10/2026',
    },
    {
      name: 'TSE · Flávio Bolsonaro (PL) e Lula (PT) vão disputar o 2º turno',
      url: 'https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/flavio-bolsonaro-e-lula-vao-disputar-o-2o-turno-para-a-presidencia-da-republica',
      date: '04/10/2026',
    },
    {
      name: 'Metrópoles · No 2º turno, Lula ganhou em 13 UFs; Flávio Bolsonaro venceu em 14',
      url: 'https://www.metropoles.com/brasil/no-2o-turno-lula-ganhou-em-13-estados-flavio-bolsonaro-venceu-em-14',
      date: '25/10/2026',
    },
  ] satisfies Source[],
}

export const diferenca2 = RESULTADO.votos2.lula - RESULTADO.votos2.flavio

/** Pontos percentuais que Lula ganhou do 1º para o 2º turno. */
export const subida = Math.round((RESULTADO.turno2.lula - RESULTADO.turno1.lula) * 100) / 100

export const pct = (n: number) =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
