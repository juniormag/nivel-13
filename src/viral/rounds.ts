// Rodadas do Chuta Aí (forma de docs/VIRAL-DESIGN.md §4.3).
// A fonte da verdade é src/content/rounds.ts (dono: fact-checker). Enquanto ele não existe, ou quando ele
// não fecha 5 rodadas publicáveis num dia, completamos com uma lista local feita só de rodadas cujo fato
// já está revisado em src/content (facts.ts ou statements.ts). Regra dura: só rodada com review === 'ok'
// vai para a tela. Rodadas de mapa ficam fora do MVP.
import type { Source } from '../content/facts'
import { CONFIG } from '../config'
import { dailyNumber } from '../lib/time'

interface RoundBase {
  id: string
  q: string
  reveal: string
  theme: string
  icon: string
  factId?: string
  statementId?: string
  sources: Source[]
  isNew?: boolean
  review: 'ok' | 'pendente'
}
export interface NumberRound extends RoundBase {
  kind: 'number'
  answer: number
  unit: string
  fmt: 'pct' | 'brl' | 'int' | 'year' | 'mi'
  min: number
  max: number
  step: number
  scale: 'lin' | 'log'
  tol: number
  zero: number
}
export interface MapRound extends RoundBase {
  kind: 'map'
  target: { lon: number; lat: number }
  label: string
  tolKm: number
  zeroKm: number
}
export interface ChoiceRound extends RoundBase {
  kind: 'choice'
  options: string[]
  correct: number
}
export type Round = NumberRound | MapRound | ChoiceRound
export type PlayRound = NumberRound | ChoiceRound

interface RoundsModule {
  ROUNDS?: Round[]
  DAYS?: Record<string, string[]>
  roundsFor?: (date: string) => Round[]
}

// O glob não quebra o build se o arquivo ainda não existir, e o HMR pega quando ele aparecer.
const mods = import.meta.glob<RoundsModule>('../content/rounds.ts', { eager: true })
const content: RoundsModule | undefined = Object.values(mods)[0]

const TSE_BOATO: Source = {
  name: 'TSE · Fato ou Boato',
  url: 'https://www.justicaeleitoral.jus.br/fato-ou-boato/',
  date: '2026',
}

/** Só rodadas cujo fato já está em src/content com fonte (VIRAL-DESIGN §4.1, coluna "Base"). */
const FALLBACK: PlayRound[] = [
  {
    id: 'r01',
    kind: 'number',
    q: 'Até quanto de salário por mês ficou sem Imposto de Renda em 2026?',
    answer: 5000,
    unit: 'R$/mês',
    fmt: 'brl',
    min: 1000,
    max: 15000,
    step: 100,
    scale: 'lin',
    tol: 250,
    zero: 5000,
    reveal: 'Até R$ 5 mil/mês, IR zero desde jan/2026, inclusive no 13º. Até R$ 7.350, imposto menor.',
    theme: 'o IR',
    icon: 'moeda',
    factId: 'ir',
    review: 'ok',
    sources: [
      {
        name: 'Câmara · Lei 15.270/2025',
        url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html',
        date: '26/11/2025',
      },
    ],
  },
  {
    id: 'r02',
    kind: 'number',
    q: 'Quantos brasileiros pagam menos ou nada de IR com a nova lei?',
    answer: 15_600_000,
    unit: 'pessoas',
    fmt: 'mi',
    min: 1_000_000,
    max: 100_000_000,
    step: 100_000,
    scale: 'log',
    tol: 1.15,
    zero: 5,
    reveal: 'Cerca de 15,6 milhões pagam menos ou nada de IR em 2026, estima o DIEESE.',
    theme: 'o IR',
    icon: 'moeda',
    factId: 'ir',
    review: 'ok',
    sources: [
      {
        name: 'DIEESE · Nota técnica 290',
        url: 'https://www.dieese.org.br/notatecnica/2026/notaTec290isencaoIR.pdf',
        date: '2026',
      },
    ],
  },
  {
    id: 'r04',
    kind: 'number',
    q: 'Quanto você acha que está o desemprego no Brasil?',
    answer: 5.3,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 25,
    step: 0.1,
    scale: 'lin',
    tol: 0.5,
    zero: 10,
    reveal: '5,3% no trimestre até agosto de 2026: o menor para o período desde 2012 (IBGE).',
    theme: 'o desemprego',
    icon: 'carteira',
    factId: 'emprego',
    review: 'ok',
    sources: [
      {
        name: 'DGABC · menor taxa para o trimestre até agosto',
        url: 'https://www.dgabc.com.br/Noticia/4349737/taxa-de-desemprego-no-brasil-e-a-menor-para-trimestre-ate-agosto-desde-2012-mostra-ibge',
        date: 'set/2026',
      },
    ],
  },
  {
    id: 'r06',
    kind: 'number',
    q: 'Em que ano a ONU tirou o Brasil do Mapa da Fome (de novo)?',
    answer: 2025,
    unit: 'ano',
    fmt: 'year',
    min: 2000,
    max: 2026,
    step: 1,
    scale: 'lin',
    tol: 0,
    zero: 10,
    reveal: 'Em 2025 a ONU tirou o Brasil do Mapa da Fome. Em 2026, o novo relatório confirmou.',
    theme: 'o Mapa da Fome',
    icon: 'prato',
    factId: 'fome',
    review: 'ok',
    sources: [
      {
        name: 'O Povo · Brasil sai do Mapa da Fome',
        url: 'https://www.opovo.com.br/noticias/brasil/2025/07/28/brasil-sai-do-mapa-da-fome-anuncia-onu.html',
        date: '28/07/2025',
      },
    ],
  },
  {
    id: 'r09',
    kind: 'number',
    q: 'Quanto o desmatamento na Amazônia caiu em 2025, em %?',
    answer: 11.08,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 50,
    step: 0.1,
    scale: 'lin',
    tol: 1.5,
    zero: 20,
    reveal: 'Caiu 11,08% em 2025: 5.796 km², a menor área em 11 anos (PRODES/INPE).',
    theme: 'a floresta',
    icon: 'arvore',
    factId: 'floresta',
    review: 'ok',
    sources: [
      {
        name: 'Olhar Digital · menor área em 11 anos',
        url: 'https://olhardigital.com.br/2025/10/30/ciencia-e-espaco/area-desmatada-na-amazonia-e-a-menor-em-11-anos-diz-inpe/',
        date: '30/10/2025',
      },
    ],
  },
  {
    id: 'r10',
    kind: 'number',
    q: 'Que % dos remédios do Farmácia Popular sai de graça?',
    answer: 95,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 100,
    step: 1,
    scale: 'lin',
    tol: 3,
    zero: 50,
    reveal: '95% dos itens são de graça desde jul/2024: diabetes, pressão, asma, fralda geriátrica.',
    theme: 'o Farmácia Popular',
    icon: 'remedio',
    factId: 'farmacia',
    review: 'ok',
    sources: [
      {
        name: 'Agência Gov · 95% gratuitos',
        url: 'https://agenciagov.ebc.com.br/noticias/202407/programa-farmacia-popular-passa-a-oferecer-95-dos-medicamentos-de-forma-gratuita',
        date: 'jul/2024',
      },
    ],
  },
  {
    id: 'r12',
    kind: 'number',
    q: 'Quantos alunos o Pé-de-Meia alcançou em 2024?',
    answer: 4_000_000,
    unit: 'alunos',
    fmt: 'mi',
    min: 100_000,
    max: 30_000_000,
    step: 10_000,
    scale: 'log',
    tol: 1.15,
    zero: 5,
    reveal: 'Quase 4 milhões de alunos em 2024. O dinheiro cai com frequência e aprovação.',
    theme: 'o Pé-de-Meia',
    icon: 'livro',
    factId: 'pedemeia',
    review: 'ok',
    sources: [
      {
        name: 'O Povo · quase 4 milhões',
        url: 'https://www.opovo.com.br/noticias/brasil/2024/08/08/pe-de-meia-alcancara-quase-4-milhoes-de-estudantes-ate-setembro.html',
        date: '08/08/2024',
      },
    ],
  },
  {
    id: 'r27',
    kind: 'number',
    q: 'Desde que ano o Brasil usa urna eletrônica sem fraude comprovada?',
    answer: 1996,
    unit: 'ano',
    fmt: 'year',
    min: 1980,
    max: 2022,
    step: 1,
    scale: 'lin',
    tol: 0,
    zero: 12,
    reveal: 'Desde 1996. Nenhuma auditoria achou fraude, nem a das Forças Armadas em 2022.',
    theme: 'a urna',
    icon: 'cofre',
    statementId: 's08',
    review: 'ok',
    sources: [TSE_BOATO],
  },
  {
    id: 'r28',
    kind: 'number',
    q: 'Até que idade o voto é obrigatório?',
    answer: 70,
    unit: 'anos',
    fmt: 'int',
    min: 50,
    max: 90,
    step: 1,
    scale: 'lin',
    tol: 0,
    zero: 15,
    reveal: 'De 18 a 70 anos. Quem não votar justifica, inclusive pelo app e-Título.',
    theme: 'o voto',
    icon: 'livro',
    statementId: 's26',
    review: 'ok',
    sources: [TSE_BOATO],
  },
  {
    id: 'r29',
    kind: 'choice',
    q: 'Fato ou Fake: quem não votou no 1º turno não pode votar no 2º.',
    options: ['Fato', 'Fake'],
    correct: 1,
    reveal: 'Fake. Cada turno é uma eleição: quem faltou no 1º pode e deve votar no 2º.',
    theme: 'o 2º turno',
    icon: 'fake',
    statementId: 's27',
    review: 'ok',
    sources: [TSE_BOATO],
  },
  {
    id: 'r30',
    kind: 'choice',
    q: 'Fato ou Fake: dá para votar só com documento oficial com foto, sem o título.',
    options: ['Fato', 'Fake'],
    correct: 0,
    reveal: 'Fato. RG, CNH, passaporte, carteira de trabalho ou e-Título com foto.',
    theme: 'o documento',
    icon: 'fake',
    statementId: 's16',
    review: 'ok',
    sources: [TSE_BOATO],
  },
]

/** Calendário local (§4.2), trocando as rodadas ainda pendentes por rodadas revisadas. */
const FALLBACK_DAYS: Record<string, string[]> = {
  '2026-10-24': ['r01', 'r04', 'r10', 'r06', 'r29'],
  '2026-10-25': ['r30', 'r28', 'r02', 'r09', 'r27'],
}

const playable = (r: Round | undefined): r is PlayRound =>
  !!r && r.review === 'ok' && (r.kind === 'number' || r.kind === 'choice') && r.sources.length > 0

const byId = (id: string): PlayRound | undefined => {
  const fromContent = content?.ROUNDS?.find((r) => r.id === id)
  if (fromContent) return playable(fromContent) ? fromContent : undefined
  return FALLBACK.find((r) => r.id === id)
}

function fromContent(date: string): PlayRound[] {
  if (!content) return []
  try {
    const list = content.roundsFor
      ? content.roundsFor(date)
      : (content.DAYS?.[date] ?? []).map((id) => content.ROUNDS?.find((r) => r.id === id))
    return list.filter(playable)
  } catch {
    return []
  }
}

/** As 5 rodadas publicáveis do dia, na ordem dos pesos. */
export function roundsFor(date: string): PlayRound[] {
  const out = fromContent(date).slice(0, 5)
  const have = new Set(out.map((r) => r.id))
  const add = (r: PlayRound | undefined) => {
    if (out.length < 5 && r && !have.has(r.id)) {
      out.push(r)
      have.add(r.id)
    }
  }
  const n = dailyNumber(date)
  // conteúdo do fact-checker sem 5 rodadas jogáveis (ex.: sorteou mapa): completa com o acervo revisado dele
  const pool = (content?.ROUNDS ?? []).filter(playable)
  for (let k = 0; out.length < 5 && k < pool.length; k++) add(pool[(n * 7 + k) % pool.length])
  // sem conteúdo: calendário local e rodízio determinístico da lista local
  for (const id of FALLBACK_DAYS[date] ?? []) add(byId(id))
  for (let k = 0; out.length < 5 && k < FALLBACK.length; k++) add(byId(FALLBACK[(n * 3 + k) % FALLBACK.length]?.id ?? ''))
  return out
}

/** Data (AAAA-MM-DD) do Chuta Aí número n. */
export function dateForNumber(n: number) {
  const t = Date.parse(`${CONFIG.dailyEpoch}T12:00:00Z`) + (n - 1) * 86400000
  return new Date(t).toISOString().slice(0, 10)
}
