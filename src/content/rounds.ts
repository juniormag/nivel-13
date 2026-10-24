// Rodadas do "Chuta Aí!" (docs/VIRAL-DESIGN.md §4). Dono: fact-checker.
// Regra: toda rodada tem fonte com URL e data. Rodada NOVA (isNew) só vai ao ar com review === 'ok'.
// Revelação: até ~100 caracteres, no passado, sem adjetivo que o fato não sustente, status jurídico exato.
// Checagem de 24/10/2026: cada rodada traz, num comentário, o que foi conferido e onde.
import type { Source } from './facts'

export interface RoundBase {
  id: string
  q: string
  /** até ~100 caracteres */
  reveal: string
  /** usado na linha-gancho do share: "Errei {theme} feio" */
  theme: string
  /** nome de sprite em src/lib/sprites.ts */
  icon: string
  factId?: string
  statementId?: string
  sources: Source[]
  /** fato que não está em facts.ts: só publica com review === 'ok' */
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
  /** lin: na unidade; log: razão (1,15 = ±15%) */
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

// ── Fontes reutilizadas ─────────────────────────────────────
const LEI_IR: Source = {
  name: 'Câmara · Lei 15.270/2025',
  url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html',
  date: '26/11/2025',
}
const DIEESE_IR: Source = {
  name: 'DIEESE · Nota técnica 290',
  url: 'https://www.dieese.org.br/notatecnica/2026/notaTec290isencaoIR.pdf',
  date: '2026',
}
const FOME: Source = {
  name: 'O Povo · Brasil sai do Mapa da Fome',
  url: 'https://www.opovo.com.br/noticias/brasil/2025/07/28/brasil-sai-do-mapa-da-fome-anuncia-onu.html',
  date: '28/07/2025',
}
const FOME_2026: Source = {
  name: 'Jornal de Brasília · Brasil segue fora do Mapa da Fome',
  url: 'https://jornaldebrasilia.com.br/noticias/brasil/brasil-segue-fora-do-mapa-da-fome-em-relatorio-da-fao/',
  date: 'jul/2026',
}
const PRODES_OL: Source = {
  name: 'O Liberal · PRODES 2025',
  url: 'https://www.oliberal.com/variedades/desmatamento-na-amazonia-em-2025-caiu-11-08-em-relacao-a-2024-afirma-prodes-inpe-1.1084212',
  date: 'out/2025',
}
const PRODES_OD: Source = {
  name: 'Olhar Digital · menor área em 11 anos',
  url: 'https://olhardigital.com.br/2025/10/30/ciencia-e-espaco/area-desmatada-na-amazonia-e-a-menor-em-11-anos-diz-inpe/',
  date: '30/10/2025',
}
const FARMACIA_100: Source = {
  name: 'Ministério da Saúde · 100% de gratuidade no Farmácia Popular',
  url: 'https://www.gov.br/saude/pt-br/assuntos/noticias/2025/fevereiro/ministerio-da-saude-anuncia-100-de-gratuidade-no-farmacia-popular-e-abre-credenciamento-a-todos-os-municipios-do-pais',
  date: 'fev/2025',
}
const FARMACIA_41: Source = {
  name: 'Mercado & Consumo · 100% de gratuidade em 41 remédios',
  url: 'https://mercadoeconsumo.com.br/14/02/2025/noticias-varejo/farmacia-popular-tera-100-de-gratuidade-em-41-remedios-confira-a-lista/',
  date: '14/02/2025',
}
const PEDEMEIA_MEC: Source = {
  name: 'MEC · Pé-de-Meia',
  url: 'https://www.gov.br/mec/pt-br/pe-de-meia',
  date: '2026',
}
const STF_JAIR: Source = {
  name: 'Itatiaia · 27 anos e 3 meses',
  url: 'https://www.itatiaia.com.br/politica/stf-condena-bolsonaro-a-27-anos-e-3-meses-pela-trama-golpista/',
  date: '11/09/2025',
}
const TSE_BOATO: Source = {
  name: 'TSE · Fato ou Boato',
  url: 'https://www.justicaeleitoral.jus.br/fato-ou-boato/',
  date: '2026',
}
const AB_FALTOU: Source = {
  name: 'Agência Brasil · quem faltou ao 1º turno pode votar no 2º',
  url: 'https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/eleitor-que-faltou-no-primeiro-turno-pode-votar-no-segundo',
  date: 'out/2026',
}
const AB_ABSTENCAO: Source = {
  name: 'Agência Brasil · TSE quer reduzir abstenção no 2º turno',
  url: 'https://agenciabrasil.ebc.com.br/justica/noticia/2026-10/tse-vai-trabalhar-para-diminuir-abstencao-no-segundo-turno',
  date: 'out/2026',
}

export const ROUNDS: Round[] = [
  // ── Bolso: IR ──────────────────────────────────────────────
  // Consistente com facts.ts `ir` e s01. Sem mudança de número.
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
    statementId: 's01',
    review: 'ok',
    sources: [LEI_IR],
  },
  // Consistente com facts.ts `ir` (estimativa do DIEESE). Faixa ampliada para o meio do slider não pontuar alto.
  {
    id: 'r02',
    kind: 'number',
    q: 'Quantos brasileiros pagam menos ou nada de IR com a nova lei?',
    answer: 15_600_000,
    unit: 'pessoas',
    fmt: 'mi',
    min: 500_000,
    max: 100_000_000,
    step: 100_000,
    scale: 'log',
    tol: 1.15,
    zero: 5,
    reveal: 'Cerca de 15,6 milhões passaram a pagar menos ou nada de IR em 2026, estimou o DIEESE.',
    theme: 'o IR',
    icon: 'moeda',
    factId: 'ir',
    review: 'ok',
    sources: [DIEESE_IR, LEI_IR],
  },
  // Consistente com facts.ts `ir` e s24. Faixa 100 mil a 50 mi: antes o meio do slider caía dentro da tolerância.
  {
    id: 'r03',
    kind: 'number',
    q: 'Acima de quanto por ano a pessoa passou a pagar um imposto mínimo?',
    answer: 600_000,
    unit: 'R$/ano',
    fmt: 'brl',
    min: 100_000,
    max: 50_000_000,
    step: 10_000,
    scale: 'log',
    tol: 1.2,
    zero: 8,
    reveal: 'Quem ganha mais de R$ 600 mil por ano passou a ter imposto mínimo. É o que paga a isenção.',
    theme: 'o imposto dos ricos',
    icon: 'cofre',
    factId: 'ir',
    statementId: 's24',
    review: 'ok',
    sources: [LEI_IR],
  },
  // ── Emprego ────────────────────────────────────────────────
  // Consistente com facts.ts `emprego` (5,3% no trimestre até agosto de 2026). Chute pessimista de 12% dá ~22.
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
    statementId: 's05',
    review: 'ok',
    sources: [
      {
        name: 'DGABC · menor taxa para o trimestre até agosto',
        url: 'https://www.dgabc.com.br/Noticia/4349737/taxa-de-desemprego-no-brasil-e-a-menor-para-trimestre-ate-agosto-desde-2012-mostra-ibge',
        date: 'set/2026',
      },
      { name: 'IBGE · Desemprego', url: 'https://www.ibge.gov.br/explica/desemprego.php', date: '2026' },
    ],
  },
  // NOVO, verificado: PNAD Contínua do 2º tri/2026 divulgada em 14/08/2026 (Agência Brasil): SC 2,1%, a menor;
  // MT 2,2% e ES 2,3% logo atrás; média 5,4%. tolKm 200: SC tem ~450 km de leste a oeste.
  {
    id: 'r05',
    kind: 'map',
    q: 'Toque no estado com o MENOR desemprego do Brasil.',
    target: { lon: -50.4, lat: -27.3 },
    label: 'Santa Catarina',
    tolKm: 200,
    zeroKm: 1500,
    reveal: 'Santa Catarina: 2,1%. A média do Brasil foi 5,4% no 2º trimestre de 2026 (IBGE).',
    theme: 'o mapa do emprego',
    icon: 'carteira',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'Brasil de Fato/Agência Brasil · 11 estados abaixo da média',
        url: 'https://www.brasildefato.com.br/2026/08/14/em-11-estados-desemprego-esta-abaixo-da-media-do-pais-veja-quais/',
        date: '14/08/2026',
      },
      {
        name: 'Mercado & Consumo · desemprego abaixo da média em 11 estados',
        url: 'https://mercadoeconsumo.com.br/14/08/2026/economia/em-11-estados-desemprego-esta-abaixo-da-media-do-pais-veja-quais/',
        date: '14/08/2026',
      },
    ],
  },
  // ── Fome ───────────────────────────────────────────────────
  // Consistente com facts.ts `fome` e s02/s30.
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
    statementId: 's02',
    review: 'ok',
    sources: [FOME, FOME_2026],
  },
  // Consistente com facts.ts `fome`. Faixa 0 a 12 para a resposta não ficar colada na ponta.
  {
    id: 'r07',
    kind: 'number',
    q: 'Um país sai do Mapa da Fome quando a subnutrição fica abaixo de quantos %?',
    answer: 2.5,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 12,
    step: 0.5,
    scale: 'lin',
    tol: 0.5,
    zero: 10,
    reveal: 'A linha é 2,5% da população subnutrida. O Brasil ficou abaixo dela em 2025.',
    theme: 'o Mapa da Fome',
    icon: 'prato',
    factId: 'fome',
    review: 'ok',
    sources: [FOME],
  },
  // ── Floresta ───────────────────────────────────────────────
  // Consistente com facts.ts `floresta` e s04 (quedas em 2022, 2023, 2024 e 2025). Faixa 0 a 12.
  {
    id: 'r08',
    kind: 'number',
    q: 'Quantos anos seguidos o desmatamento na Amazônia caiu?',
    answer: 4,
    unit: 'anos',
    fmt: 'int',
    min: 0,
    max: 12,
    step: 1,
    scale: 'lin',
    tol: 0,
    zero: 4,
    reveal: 'Quatro anos seguidos de queda. 2025 teve a menor área desmatada em 11 anos (INPE).',
    theme: 'a floresta',
    icon: 'arvore',
    factId: 'floresta',
    statementId: 's04',
    review: 'ok',
    sources: [PRODES_OL, PRODES_OD],
  },
  // Consistente com facts.ts `floresta`.
  {
    id: 'r09',
    kind: 'number',
    q: 'Quanto o desmatamento na Amazônia caiu em 2025, em %?',
    answer: 11.08,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 50,
    step: 0.5,
    scale: 'lin',
    tol: 1.5,
    zero: 20,
    reveal: 'Caiu 11,08% em 2025: 5.796 km², a menor área em 11 anos (PRODES/INPE).',
    theme: 'a floresta',
    icon: 'arvore',
    factId: 'floresta',
    review: 'ok',
    sources: [PRODES_OD, PRODES_OL],
  },
  // ── Saúde ──────────────────────────────────────────────────
  // CORRIGIDO: "95% de graça" era a regra de jul/2024. Desde 14/02/2025 os 41 itens do programa são 100% gratuitos
  // (Ministério da Saúde; Mercado & Consumo 14/02/2025; gov.br set/2026 repete "100%"). Como 100% é a ponta do slider,
  // a rodada virou escolha. ATENÇÃO: facts.ts `farmacia` e statements.ts s11 ainda dizem 95% (dono deles deve corrigir).
  {
    id: 'r10',
    kind: 'choice',
    q: 'Quanto dos remédios e itens do Farmácia Popular sai de graça hoje?',
    options: ['Uns 25%', 'Metade', 'Uns 75%', 'Todos'],
    correct: 3,
    reveal: 'Todos: desde fev/2025, os 41 itens saem de graça, de remédio de pressão a fralda geriátrica.',
    theme: 'o Farmácia Popular',
    icon: 'remedio',
    factId: 'farmacia',
    review: 'ok',
    sources: [FARMACIA_100, FARMACIA_41],
  },
  // NOVO, verificado na fonte primária: nota do Ministério da Saúde (set/2026), fala do ministro Padilha: "atendeu,
  // em 2025, mais de 27 milhões de brasileiros" (série: 21,9 mi em 2023, 24,7 mi em 2024, 27,3 mi em 2025).
  // Dado administrativo do próprio governo, sem auditoria independente.
  {
    id: 'r11',
    kind: 'number',
    q: 'Quantas pessoas pegaram remédio no Farmácia Popular em 2025?',
    answer: 27_000_000,
    unit: 'pessoas',
    fmt: 'mi',
    min: 1_000_000,
    max: 100_000_000,
    step: 100_000,
    scale: 'log',
    tol: 1.15,
    zero: 6,
    reveal:
      'Mais de 27 milhões de pessoas foram atendidas pelo Farmácia Popular em 2025 (Ministério da Saúde).',
    theme: 'o Farmácia Popular',
    icon: 'remedio',
    factId: 'farmacia',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'Ministério da Saúde · economia de até R$ 8,8 mil por ano',
        url: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/setembro/programa-farmacia-popular-pode-gerar-economia-de-ate-r-8-8-mil-por-ano-para-familias-brasileiras',
        date: 'set/2026',
      },
    ],
  },
  // ── Educação ───────────────────────────────────────────────
  // CORRIGIDO: o "quase 4 milhões" de O Povo (08/08/2024) era previsão ("alcançará"). Balanço da Agência Gov (dez/2024):
  // 3,9 milhões de estudantes. Resposta 3,9 mi.
  {
    id: 'r12',
    kind: 'number',
    q: 'Quantos alunos o Pé-de-Meia alcançou em 2024?',
    answer: 3_900_000,
    unit: 'alunos',
    fmt: 'mi',
    min: 100_000,
    max: 30_000_000,
    step: 100_000,
    scale: 'log',
    tol: 1.15,
    zero: 6,
    reveal: 'Cerca de 3,9 milhões de alunos em 2024. O dinheiro cai conforme frequência e aprovação.',
    theme: 'o Pé-de-Meia',
    icon: 'livro',
    factId: 'pedemeia',
    statementId: 's12',
    review: 'ok',
    sources: [
      {
        name: 'Agência Gov · Pé-de-Meia chega a 3,9 milhões de estudantes',
        url: 'https://agenciagov.ebc.com.br/noticias/202412/pe-de-meia-87-7-mil-estudantes-sao-beneficiados-no-rn',
        date: 'dez/2024',
      },
      PEDEMEIA_MEC,
    ],
  },
  // NOVO, verificado: Comprova (republicado pelo SBT News, 29/02/2024): até R$ 9,2 mil = matrícula R$ 200/ano +
  // frequência R$ 200 x 9/ano + R$ 1.000 por ano concluído + R$ 200 do Enem. Agência Brasil (ago/2026) confirma a
  // parcela de R$ 200 em 2026. Vale para o ensino médio regular (na EJA a parcela é R$ 225).
  {
    id: 'r13',
    kind: 'number',
    q: 'Quanto um aluno pode juntar no Pé-de-Meia nos 3 anos do ensino médio?',
    answer: 9200,
    unit: 'R$',
    fmt: 'brl',
    min: 0,
    max: 30_000,
    step: 100,
    scale: 'lin',
    tol: 500,
    zero: 12_000,
    reveal: 'Até R$ 9.200 nos 3 anos do ensino médio regular, somando parcelas, prêmios anuais e o Enem.',
    theme: 'o Pé-de-Meia',
    icon: 'livro',
    factId: 'pedemeia',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'SBT News/Comprova · Pé-de-Meia paga até R$ 9,2 mil',
        url: 'https://sbtnews.sbt.com.br/noticia/comprova/explica-pe-de-meia-vai-pagar-r-9-2-mil-a-aluno-de-baixa-renda-que-concluir-o-ensino-medio-e-realizar-o-enem',
        date: '29/02/2024',
      },
      {
        name: 'Agência Brasil · parcela de R$ 200 em 2026',
        url: 'https://agenciabrasil.ebc.com.br/educacao/noticia/2026-08/pe-de-meia-nascidos-em-novembro-e-dezembro-recebem-parcela-de-r-200',
        date: 'ago/2026',
      },
      PEDEMEIA_MEC,
    ],
  },
  // ── Renda e preços ─────────────────────────────────────────
  // NOVO, verificado: Decreto 12.797, DOU de 24/12/2025: R$ 1.621 desde 01/01/2026, +R$ 103 (6,79%) sobre R$ 1.518.
  // A comparação é com o IPCA de 2025 (4,26%, ver r15); o reajuste em si usou o INPC até novembro (4,18%) + 2,5%.
  {
    id: 'r14',
    kind: 'number',
    q: 'Quanto é o salário mínimo em 2026?',
    answer: 1621,
    unit: 'R$',
    fmt: 'brl',
    min: 1000,
    max: 3000,
    step: 10,
    scale: 'lin',
    tol: 20,
    zero: 400,
    reveal: 'R$ 1.621 desde jan/2026: alta de 6,79%, acima da inflação de 2025 (4,26%).',
    theme: 'o salário mínimo',
    icon: 'carteira',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'Band · decreto fixa o mínimo em R$ 1.621',
        url: 'https://www.band.com.br/economia/noticias/decreto-do-governo-estabelece-valor-do-salario-minimo-a-partir-de-1-de-janeiro-em-r-162100-202512241121',
        date: '24/12/2025',
      },
      {
        name: 'Bahia Notícias · reajuste de 6,79%',
        url: 'https://www.bahianoticias.com.br/noticia/311858-salario-minimo-para-2026-e-fixado-em-r-1621-com-reajuste-de-679',
        date: '24/12/2025',
      },
    ],
  },
  // NOVO, verificado na fonte primária: IBGE, 09/01/2026: IPCA de 2025 = 4,26%, menor desde 2018 (3,75%);
  // alimentação no domicílio passou de 8,23% (2024) para 1,43% (2025).
  {
    id: 'r15',
    kind: 'number',
    q: 'Quanto foi a inflação oficial de 2025?',
    answer: 4.26,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 20,
    step: 0.1,
    scale: 'lin',
    tol: 0.4,
    zero: 8,
    reveal: '4,26% em 2025, a menor desde 2018. Comida em casa subiu 1,43%: subiu menos, não caiu.',
    theme: 'a inflação',
    icon: 'prato',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'Agência IBGE · IPCA acumula 4,26% em 2025',
        url: 'https://agenciadenoticias.ibge.gov.br/agencia-noticias/45613-ipca-em-dezembro-vai-a-0-33-e-acumula-4-26-em-2025.html',
        date: '09/01/2026',
      },
      {
        name: 'Itatiaia · IPCA 2025',
        url: 'https://www.itatiaia.com.br/economia/inflacao-fecha-2025-em-4-26-dentro-da-meta-e-abaixo-do-esperado-pelo-mercado/',
        date: '09/01/2026',
      },
    ],
  },
  // NOVO, verificado: PNAD Contínua do 1º tri/2026 (IBGE, 30/04/2026): rendimento médio real R$ 3.722, recorde da série
  // (desde 2012), +5,5% real sobre o 1º tri/2025. Pergunta datada para não envelhecer. A URL do JB do rascunho não foi
  // encontrada; troquei por Itatiaia e SBT News. O "R$ 3.765" citado no rascunho não apareceu em nenhuma fonte.
  {
    id: 'r16',
    kind: 'number',
    q: 'Qual foi o salário médio do trabalhador no 1º trimestre de 2026?',
    answer: 3722,
    unit: 'R$/mês',
    fmt: 'brl',
    min: 1000,
    max: 10_000,
    step: 50,
    scale: 'lin',
    tol: 150,
    zero: 2500,
    reveal: 'R$ 3.722 no 1º tri de 2026: recorde da série do IBGE, alta real de 5,5% em um ano.',
    theme: 'o salário médio',
    icon: 'carteira',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'Itatiaia · salário médio chega a R$ 3.722',
        url: 'https://www.itatiaia.com.br/economia/salario-medio-do-trabalhador-cresce-55-no-ano-e-chega-a-r-3-722/',
        date: 'abr/2026',
      },
      {
        name: 'SBT News · salário médio bate recorde',
        url: 'https://sbtnews.sbt.com.br/noticia/economia/salario-medio-do-brasileiro-bate-recorde-e-chega-a-r-3-722-afirma-ibge',
        date: 'abr/2026',
      },
    ],
  },
  // ── Segurança ──────────────────────────────────────────────
  // NOVO, verificado: Anuário FBSP, 20ª edição, 23/07/2026: mortes violentas intencionais -8,2% em 2025 (40.775 contra
  // 44.127; taxa 19,1 por 100 mil), menor desde 2012; feminicídios +4% (1.571) e mortes por intervenção policial
  // subiram. Não atribuir a governo: segurança é sobretudo estadual.
  {
    id: 'r17',
    kind: 'choice',
    q: 'Em 2025, as mortes violentas no Brasil...',
    options: ['Subiram uns 8%', 'Ficaram iguais', 'Caíram uns 8%', 'Caíram uns 30%'],
    correct: 2,
    reveal: 'Caíram 8,2%: a menor taxa desde 2012. Feminicídios e mortes por policiais subiram.',
    theme: 'a segurança',
    icon: 'heart',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'JB · Anuário FBSP: menor taxa desde 2012',
        url: 'https://www.jb.com.br/brasil/2026/07/1060384-brasil-tem-menor-taxa-de-mortes-violentas-intencionais-desde-2012.html',
        date: '23/07/2026',
      },
      {
        name: 'Diario de Pernambuco · mortes violentas caem 8,2%, feminicídios sobem',
        url: 'https://diariodepernambuco.com.br/brasil/2026/07/11719408-mortes-violentas-caem-82-no-pais-em-2025-feminicidios-aumentam-4.html',
        date: 'jul/2026',
      },
    ],
  },
  // ── Economia ───────────────────────────────────────────────
  // URL NOVA verificada: Poder360, 03/03/2026 (IBGE: 2,3% em 2025; série cita 3,4% em 2024). Consistente com s29.
  // Faixa -10 a 10: antes o meio do slider (2,5) pontuava 81.
  {
    id: 'r18',
    kind: 'number',
    q: 'Quanto o PIB do Brasil cresceu em 2024?',
    answer: 3.4,
    unit: '%',
    fmt: 'pct',
    min: -10,
    max: 10,
    step: 0.1,
    scale: 'lin',
    tol: 0.4,
    zero: 5,
    reveal: 'Cresceu 3,4% em 2024 e 2,3% em 2025, segundo o IBGE.',
    theme: 'o PIB',
    icon: 'cofre',
    statementId: 's29',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'Poder360 · PIB cresce 2,3% em 2025',
        url: 'https://www.poder360.com.br/poder-economia/pib-do-brasil-cresce-23-em-2025/',
        date: '03/03/2026',
      },
      {
        name: 'SBT News · PIB 2025',
        url: 'https://sbtnews.sbt.com.br/noticia/economia/pib-economia-do-brasil-cresce-2-3-em-2025',
        date: '03/03/2026',
      },
    ],
  },
  // ── Eleição ────────────────────────────────────────────────
  // NOVO, verificado: TSE via Agência Brasil (out/2026): abstenção de 21,08%, 33,4 mi de 158,7 mi aptos, a maior
  // desde 1998 (21,5%). Diferença: Flávio 56.104.503 x Lula 53.879.538 = 2.224.965 (Exame, dados do TSE).
  // O portal do TSE não abriu deste ambiente; os números batem em 4 veículos.
  {
    id: 'r19',
    kind: 'number',
    q: 'Quantos eleitores NÃO votaram no 1º turno de 2026?',
    answer: 33_400_000,
    unit: 'eleitores',
    fmt: 'mi',
    min: 1_000_000,
    max: 100_000_000,
    step: 100_000,
    scale: 'log',
    tol: 1.1,
    zero: 5,
    reveal:
      '33,4 milhões não votaram (21,08%), a maior abstenção desde 1998. Os 2 primeiros ficaram a 2,2 mi.',
    theme: 'a abstenção',
    icon: 'minuta',
    isNew: true,
    review: 'ok',
    sources: [
      AB_ABSTENCAO,
      {
        name: 'Agência Brasil · abstenção soma 33 milhões',
        url: 'https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/eleicoes-abstencao-cresce-216-e-soma-33-milhoes-de-brasileiros',
        date: 'out/2026',
      },
      {
        name: 'Exame · votos de Lula e Flávio no 1º turno',
        url: 'https://exame.com/brasil/lula-teve-33-milhoes-de-votos-a-menos-no-1o-turno-de-2026-do-que-em-2022/',
        date: 'out/2026',
      },
      {
        name: 'DGABC · maior abstenção desde 1998',
        url: 'https://www.dgabc.com.br/Noticia/4350968/primeiro-turno-de-2026-tem-maior-abstencao-desde-1998-com-mais-de-33-milhoes-ausentes',
        date: 'out/2026',
      },
    ],
  },
  // NOVO, verificado: TSE, 100% das seções: Lula 60.345.999 (50,90%) x Jair Bolsonaro 58.206.354 (49,10%);
  // diferença 2.139.645, 1,8% dos 118.552.353 válidos.
  {
    id: 'r20',
    kind: 'number',
    q: 'Por quantos votos foi decidido o 2º turno de 2022?',
    answer: 2_139_645,
    unit: 'votos',
    fmt: 'mi',
    min: 10_000,
    max: 20_000_000,
    step: 10_000,
    scale: 'log',
    tol: 1.15,
    zero: 8,
    reveal: 'Lula 50,9% x Bolsonaro 49,1%: 2,1 milhões de votos, menos de 2 em cada 100.',
    theme: 'o 2º turno',
    icon: 'minuta',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'TSE · 100% das seções totalizadas',
        url: 'https://www.tse.jus.br/comunicacao/noticias/2022/Outubro/100-das-secoes-totalizadas-confira-como-ficou-o-quadro-eleitoral-apos-o-2o-turno',
        date: 'out/2022',
      },
      {
        name: 'CNN Brasil · a eleição mais acirrada da história',
        url: 'https://www.cnnbrasil.com.br/politica/disputa-entre-lula-e-bolsonaro-e-a-eleicao-para-presidente-mais-acirrada-da-historia/',
        date: 'out/2022',
      },
    ],
  },
  // ── Justiça e memória ──────────────────────────────────────
  // Consistente com facts.ts `julgamento` e s03/s25 (condenado, 1ª Turma, 4 a 1, inelegível). Faixa 0 a 80:
  // antes o meio do slider (25) pontuava 83.
  {
    id: 'r21',
    kind: 'number',
    q: 'A quantos anos de prisão o STF condenou Jair Bolsonaro?',
    answer: 27.25,
    unit: 'anos',
    fmt: 'int',
    min: 0,
    max: 80,
    step: 0.25,
    scale: 'lin',
    tol: 1,
    zero: 15,
    reveal: '27 anos e 3 meses, por 4 a 1 na 1ª Turma do STF, em 11/09/2025. Está inelegível.',
    theme: 'o julgamento',
    icon: 'minuta',
    factId: 'julgamento',
    statementId: 's03',
    review: 'ok',
    sources: [
      STF_JAIR,
      {
        name: 'Bloomberg Línea · os crimes da condenação',
        url: 'https://www.bloomberglinea.com.br/brasil/jair-bolsonaro-e-considerado-culpado-pelo-stf-por-golpe-de-estado-e-mais-quatro-crimes/',
        date: '11/09/2025',
      },
    ],
  },
  // Consistente com facts.ts `rachadinha` e s06 (denunciado em 2020, provas anuladas, arquivado, nunca réu).
  // Acrescentei que ele nega, como manda a regra do checador.
  {
    id: 'r22',
    kind: 'choice',
    q: 'Fato ou Fake: Flávio Bolsonaro foi condenado no caso das rachadinhas.',
    options: ['Fato', 'Fake'],
    correct: 1,
    reveal:
      'Fake. Foi denunciado em 2020, o STJ anulou provas e o caso foi arquivado. Nunca virou réu e nega.',
    theme: 'as rachadinhas',
    icon: 'fake',
    factId: 'rachadinha',
    statementId: 's06',
    review: 'ok',
    sources: [
      {
        name: 'Congresso em Foco · STJ e as rachadinhas',
        url: 'https://congressoemfoco.com.br/noticia/22183/stj-nega-flavio-bolsonaro-rachadinhas',
        date: '2021',
      },
      {
        name: 'InfoMoney · Flávio e a rachadinha',
        url: 'https://www.infomoney.com.br/?p=3282175',
        date: '2025',
      },
    ],
  },
  // Consistente com facts.ts `joias` e s10. CORRIGIDO o status: "o caso segue aberto" só está confirmado até
  // 18/03/2026 (Moraes pediu novo parecer à PGR); não achei notícia posterior. O texto agora diz só o que está
  // datado: indiciado pela PF em 2024, defesa nega, PGR pediu arquivamento (05/03/2026).
  {
    id: 'r23',
    kind: 'map',
    q: 'Toque onde a Receita apreendeu as joias sauditas, em 2021.',
    target: { lon: -46.47, lat: -23.43 },
    label: 'Aeroporto de Guarulhos (SP)',
    tolKm: 60,
    zeroKm: 1500,
    reveal:
      'Guarulhos (SP), 2021. A PF indiciou Jair Bolsonaro em 2024; a defesa nega. A PGR pediu arquivamento.',
    theme: 'as joias',
    icon: 'joia',
    factId: 'joias',
    statementId: 's10',
    review: 'ok',
    sources: [
      {
        name: 'Agência Brasil · PGR pede arquivamento',
        url: 'https://agenciabrasil.ebc.com.br/justica/noticia/2026-03/pgr-pede-arquivamento-de-inquerito-sobre-desvio-de-joias-por-bolsonaro',
        date: 'mar/2026',
      },
      {
        name: 'Band · Moraes pede novo parecer da PGR',
        url: 'https://www.band.com.br/noticias/stf-pede-novo-parecer-da-pgr-sobre-caso-das-joias-sauditas-202603191800',
        date: '19/03/2026',
      },
    ],
  },
  // Consistente com facts.ts `mansao` e s21 (em investigação, PF; Flávio nega).
  {
    id: 'r24',
    kind: 'number',
    q: 'Quanto custou a casa de Flávio Bolsonaro em Brasília?',
    answer: 6_000_000,
    unit: 'R$',
    fmt: 'mi',
    min: 100_000,
    max: 50_000_000,
    step: 100_000,
    scale: 'log',
    tol: 1.15,
    zero: 8,
    reveal: 'Cerca de R$ 6 mi, R$ 3,1 mi pelo BRB. A PF apura o financiamento; Flávio nega irregularidade.',
    theme: 'a casa de Brasília',
    icon: 'casa',
    factId: 'mansao',
    statementId: 's21',
    review: 'ok',
    sources: [
      {
        name: 'Diario de Pernambuco · PF apura financiamento',
        url: 'https://www.diariodepernambuco.com.br/politica/2026/10/11725606-pf-apura-condicoes-de-financiamento-do-brb-a-flavio-bolsonaro-para-mansao-de-rs-6-milhoes.html',
        date: 'out/2026',
      },
      {
        name: 'Poder360 · MP investiga empréstimo do BRB',
        url: 'https://www.poder360.com.br/congresso/mp-investiga-emprestimo-do-brb-para-flavio-bolsonaro-comprar-mansao/',
        date: '2021',
      },
    ],
  },
  // Consistente com facts.ts `oitodejaneiro` e s17/s18.
  {
    id: 'r25',
    kind: 'map',
    q: 'Toque onde golpistas invadiram os Três Poderes em 8/1/2023.',
    target: { lon: -47.86, lat: -15.8 },
    label: 'Praça dos Três Poderes, Brasília',
    tolKm: 60,
    zeroKm: 1500,
    reveal: 'Praça dos Três Poderes, Brasília. Dias depois a PF achou a "minuta do golpe".',
    theme: 'o 8 de janeiro',
    icon: 'golpe',
    factId: 'oitodejaneiro',
    statementId: 's17',
    review: 'ok',
    sources: [STF_JAIR],
  },
  // Consistente com facts.ts `soberania` e s19. CORRIGIDO: anúncio de 09/07/2025; o decreto de 30/07 deixou 694
  // produtos de fora, então a pergunta fala em "anunciou" e a revelação cita as exceções. "Sanções ao Brasil" virou
  // só "sanções" (facts.ts: contra autoridades brasileiras). Fonte do tarifaço acrescentada. Faixa 0 a 150: com
  // 0 a 100 o meio do slider era a própria resposta.
  {
    id: 'r26',
    kind: 'number',
    q: 'De quanto foi a tarifa que os EUA anunciaram sobre produtos do Brasil em 2025?',
    answer: 50,
    unit: '%',
    fmt: 'pct',
    min: 0,
    max: 150,
    step: 1,
    scale: 'lin',
    tol: 3,
    zero: 50,
    reveal:
      '50%, anunciada em jul/2025, com centenas de exceções. Eduardo Bolsonaro atuou nos EUA por sanções.',
    theme: 'o tarifaço',
    icon: 'tarifa',
    factId: 'soberania',
    statementId: 's19',
    review: 'ok',
    sources: [
      {
        name: 'Diário do Comércio · Trump anuncia tarifa de 50%',
        url: 'https://diariodocomercio.com.br/internacional/trump-anuncia-que-eua-irao-cobrar-tarifa-de-50-do-brasil/',
        date: 'jul/2025',
      },
      {
        name: 'STF · condenação de Eduardo Bolsonaro',
        url: 'https://noticias.stf.jus.br/postsnoticias/stf-condena-eduardo-bolsonaro-por-coacao-no-curso-do-processo-sobre-tentativa-de-golpe/',
        date: '16/06/2026',
      },
    ],
  },
  // ── Votar ──────────────────────────────────────────────────
  // Consistente com s08. Faixa 1985 a 2025 para o meio do slider não ficar perto da resposta.
  {
    id: 'r27',
    kind: 'number',
    q: 'Desde que ano o Brasil usa urna eletrônica sem fraude comprovada?',
    answer: 1996,
    unit: 'ano',
    fmt: 'year',
    min: 1985,
    max: 2025,
    step: 1,
    scale: 'lin',
    tol: 0,
    zero: 15,
    reveal: 'Desde 1996. Nenhuma auditoria achou fraude, nem a das Forças Armadas em 2022.',
    theme: 'a urna',
    icon: 'minuta',
    statementId: 's08',
    review: 'ok',
    sources: [TSE_BOATO],
  },
  // Consistente com s26. Faixa 16 a 100: com 50 a 90 o meio do slider era a própria resposta.
  {
    id: 'r28',
    kind: 'number',
    q: 'Até que idade o voto é obrigatório?',
    answer: 70,
    unit: 'anos',
    fmt: 'int',
    min: 16,
    max: 100,
    step: 1,
    scale: 'lin',
    tol: 0,
    zero: 20,
    reveal: 'De 18 a 70 anos. Quem não votar justifica, inclusive pelo app e-Título.',
    theme: 'o voto',
    icon: 'minuta',
    statementId: 's26',
    review: 'ok',
    sources: [TSE_BOATO],
  },
  // Consistente com s27. Agência Brasil (out/2026): cada turno é uma eleição; pode votar mesmo sem ter justificado.
  {
    id: 'r29',
    kind: 'choice',
    q: 'Fato ou Fake: quem não votou no 1º turno não pode votar no 2º.',
    options: ['Fato', 'Fake'],
    correct: 1,
    reveal: 'Fake. Cada turno é uma eleição: quem faltou no 1º pode votar no 2º, mesmo sem ter justificado.',
    theme: 'o 2º turno',
    icon: 'fake',
    statementId: 's27',
    review: 'ok',
    sources: [AB_FALTOU, TSE_BOATO],
  },
  // Consistente com s16. Agência Brasil (out/2026) repete: documento oficial com foto.
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
    sources: [TSE_BOATO, AB_FALTOU],
  },
  // NOVO, verificado com URL específica do TSE (set/2026): horário unificado de Brasília, 8h às 17h, em todo o país
  // (Res. TSE 23.751/2026); no Acre, 6h às 15h locais; quem está na fila às 17h vota. Igual a CONFIG.electionLabel.
  {
    id: 'r31',
    kind: 'choice',
    q: 'Até que horas (de Brasília) dá para votar no domingo?',
    options: ['15h', '16h', '17h', '18h'],
    correct: 2,
    reveal: 'Das 8h às 17h, horário de Brasília, no Brasil todo. Quem estiver na fila às 17h ainda vota.',
    theme: 'o horário',
    icon: 'minuta',
    isNew: true,
    review: 'ok',
    sources: [
      {
        name: 'TSE · votação começa e termina no mesmo horário em todo o país',
        url: 'https://www.tse.jus.br/comunicacao/noticias/2026/Setembro/faltam-26-dias-votacao-comeca-e-termina-no-mesmo-horario-em-todo-o-pais',
        date: 'set/2026',
      },
      {
        name: 'SBT News · que horas começa e termina a votação',
        url: 'https://sbtnews.sbt.com.br/noticia/eleicoes/eleicoes-2026-que-horas-comeca-e-termina-a-votacao',
        date: '2026',
      },
    ],
  },
]

export const roundById = (id: string) => ROUNDS.find((r) => r.id === id)

/** data (AAAA-MM-DD, America/Sao_Paulo) → 5 ids na ordem de jogo (pesos 2-2-3-3-3). §4.2 */
export const CALENDAR: Record<string, string[]> = {
  // #5 · sáb 24/10 (MVP): bolso → surpresa → saúde → comparecimento → vacina contra boato
  '2026-10-24': ['r01', 'r04', 'r10', 'r19', 'r29'],
  // #6 · dom 25/10 (Modo Dia de Votar): conteúdo cívico, publicado no deploy de 24/10
  '2026-10-25': ['r31', 'r30', 'r28', 'r20', 'r27'],
  // #7 a #10 · laço pós (têm rodadas de mapa)
  '2026-10-26': ['r25', 'r15', 'r14', 'r05', 'r22'],
  '2026-10-27': ['r06', 'r16', 'r12', 'r23', 'r17'],
  '2026-10-28': ['r08', 'r02', 'r18', 'r24', 'r21'],
  '2026-10-29': ['r07', 'r03', 'r13', 'r11', 'r26'],
}
/** apelido com o nome do rascunho em §4.3 */
export const DAYS = CALENDAR

/** rodadas "de bolso", mais fáceis: vão nas posições 1 e 2 do sorteio */
const POCKET = ['r01', 'r04', 'r14', 'r16', 'r15', 'r12', 'r13', 'r06', 'r28', 'r02']
/** presas ao 2º turno de 25/10/2026: fora do sorteio */
const DATED = ['r29', 'r31']

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 5 rodadas do dia: a do calendário ou, sem calendário, um sorteio determinístico pela data, só com review === 'ok':
 * 2 de bolso (número), 2 de número ou mapa e um Fato ou Fake/escolha no fim.
 */
export function roundsFor(date: string): Round[] {
  const fixed = CALENDAR[date]
  if (fixed) {
    const rs = fixed.map(roundById).filter((r): r is Round => !!r && r.review === 'ok')
    if (rs.length === 5) return rs
  }
  const rnd = mulberry(hash(date))
  const ok = ROUNDS.filter((r) => r.review === 'ok' && !DATED.includes(r.id))
  const used = new Set<string>()
  const pick = (pool: Round[]): Round => {
    const free = pool.filter((r) => !used.has(r.id))
    const from = free.length ? free : ok.filter((r) => !used.has(r.id))
    const r = from[Math.floor(rnd() * from.length)] as Round
    used.add(r.id)
    return r
  }
  const notChoice = ok.filter((r) => r.kind !== 'choice')
  const pocket = notChoice.filter((r) => POCKET.includes(r.id))
  const r1 = pick(pocket)
  const r2 = pick(pocket)
  const r3 = pick(notChoice)
  const r4 = pick(notChoice)
  const r5 = pick(ok.filter((r) => r.kind === 'choice'))
  return [r1, r2, r3, r4, r5]
}
