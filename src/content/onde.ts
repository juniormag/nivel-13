// Onde Foi? (docs/MODOS-NOVOS.md §2). Dono: fact-checker.
// Pino verde = avanço com dado oficial; pino vermelho = caso do bolsonarismo com status jurídico EXATO
// (Condenado só com condenação; indiciado, denunciado, investigado e arquivado são coisas diferentes).
// Checagem de 24/10/2026: cada pino traz, num comentário, o que foi conferido e onde, e por que o ponto é aquele.
// O WebFetch não abriu nenhum site deste ambiente (erro de DNS); a conferência foi feita por busca, com o trecho
// de cada veículo. Coordenadas: centro da cidade ou do local, em graus decimais (lng negativa = oeste).
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

// ── Fontes reutilizadas ─────────────────────────────────────
const PRODES_2026_INPE: Source = {
  name: 'INPE · PRODES 2026: queda na Amazônia e no Cerrado',
  url: 'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias/dados-do-prodes-apontam-reducao-no-desmatamento-na-amazonia-e-no-cerrado-brasileiros-1',
  date: '16/10/2026',
}
const PRODES_2026_MMA: Source = {
  name: 'MMA/INPE · apresentação PRODES 2026',
  url: 'https://www.gov.br/mma/pt-br/noticias-defeso-eleitoral/apresentacao-coletiva-prodes-2026_inpe.pdf',
  date: '16/10/2026',
}
const STF_JAIR: Source = {
  name: 'Itatiaia · STF condena Bolsonaro a 27 anos e 3 meses',
  url: 'https://www.itatiaia.com.br/politica/stf-condena-bolsonaro-a-27-anos-e-3-meses-pela-trama-golpista/',
  date: '11/09/2025',
}

export const PINS: Pin[] = [
  // ── 1. Avanço · Amazônia ───────────────────────────────────
  // Conferido: PRODES 2026 (estimativa, ago/2025 a jul/2026, divulgada em 16/10/2026): 3.335 km², a menor taxa da
  // série iniciada em 1988, 41,8% abaixo dos 5.731 km² consolidados de 2025 (INPE; MMA; InfoAmazonia). O Pará segue
  // o que mais desmata (1.130 km², 33,9%). Por que Belém: capital do estado que mais desmata e sede da COP30
  // (nov/2025). É estimativa: o INPE consolida o número no ano seguinte.
  {
    id: 'floresta',
    side: 'avanco',
    clue: 'Esta capital recebeu a conferência do clima da ONU em 2025, na porta da maior floresta tropical do mundo.',
    place: 'Belém',
    uf: 'PA',
    lat: -1.4558,
    lng: -48.4902,
    title: 'Floresta em pé',
    body: 'Em 2026, o desmatamento na Amazônia caiu para 3.335 km², o menor desde 1988 (INPE). O Pará, cuja capital sediou a COP30, ainda é o que mais desmata.',
    status: { label: 'Dado oficial · INPE', kind: 'good' },
    who: 'brasil',
    sources: [
      PRODES_2026_INPE,
      PRODES_2026_MMA,
      {
        name: 'InfoAmazonia · menor taxa já registrada pelo INPE',
        url: 'https://infoamazonia.org/2026/10/16/amazonia-tem-a-menor-taxa-de-desmatamento-ja-registrada-pelo-inpe/',
        date: '16/10/2026',
      },
    ],
    review: 'ok',
  },
  // ── 2. Caso · 8 de Janeiro ─────────────────────────────────
  // Conferido: = facts.ts `oitodejaneiro` e `julgamento`, r21 e r25. Balanço do gabinete de Moraes de 29/04/2026:
  // 1.402 condenados nos processos dos atos antidemocráticos, 29 deles dos núcleos da trama golpista (Imirante,
  // Portal Em Tempo, 04/05/2026). Jair Bolsonaro: 27 anos e 3 meses, 1ª Turma, 4 a 1, pena em execução desde
  // 25/11/2025, hoje em prisão domiciliar humanitária (STF, jul/2026). A defesa nega.
  {
    id: 'oitodejaneiro',
    side: 'caso',
    clue: 'Num domingo de janeiro de 2023, os prédios onde se fazem as leis, se governa e se julga foram depredados.',
    place: 'Praça dos Três Poderes, Brasília',
    uf: 'DF',
    lat: -15.7998,
    lng: -47.8645,
    title: '8 de Janeiro',
    body: 'Em 8/1/2023, golpistas invadiram Congresso, STF e Planalto. Até abr/2026, o STF condenou 1.402 pessoas pelos atos; Bolsonaro, pela trama golpista.',
    status: { label: 'Condenados · STF', kind: 'legal' },
    who: 'jair',
    sources: [
      STF_JAIR,
      {
        name: 'Imirante · STF: 1.402 condenados e 190 presos pelo 8 de Janeiro',
        url: 'https://m.imirante.com/noticias/brasil/2026/05/04/ipolitica-stf-diz-que-190-seguem-presos-por-atos-de-8-de-janeiro',
        date: '04/05/2026',
      },
    ],
    review: 'ok',
  },
  // ── 3. Avanço · Transposição do São Francisco ──────────────
  // Conferido: em 04/04/2024, Lula inaugurou em Arcoverde (PE) a Estação Elevatória de Água Bruta Ipojuca e o
  // trecho Belo Jardim-Caruaru da Adutora do Agreste: abastecimento de 190 mil para 615 mil pessoas (Correio
  // Braziliense; Poder360). O Ramal do Agreste, que traz a água do Eixo Leste de Sertânia a Arcoverde, foi concluído
  // em out/2021, no governo anterior (Movimento Econômico): o texto registra isso. Por que Arcoverde: é onde o
  // ramal chega e onde fica a estação inaugurada.
  {
    id: 'transposicao',
    side: 'avanco',
    clue: 'No sertão, um ramal de canal termina nesta cidade e a água de um grande rio segue dali para o Agreste.',
    place: 'Arcoverde',
    uf: 'PE',
    lat: -8.4189,
    lng: -37.0538,
    title: 'Água do São Francisco',
    body: 'O Ramal do Agreste ficou pronto em 2021. Em abr/2024, a estação aberta aqui levou a água do São Francisco de 190 mil para 615 mil pessoas no Agreste.',
    status: { label: 'Obra federal', kind: 'good' },
    who: 'lula',
    sources: [
      {
        name: 'Correio Braziliense · Lula inaugura estação d’água em Pernambuco',
        url: 'https://www.correiobraziliense.com.br/politica/2024/04/6831540-lula-participa-da-inauguracao-de-estacao-dagua-em-pernambuco.html',
        date: '04/04/2024',
      },
      {
        name: 'Poder360 · Estação Elevatória Ipojuca',
        url: 'https://www.poder360.com.br/anuncios-do-governo/ao-vivo-lula-vai-a-inauguracao-da-estacao-elevatoria-de-agua-bruta-ipojuca/',
        date: '04/04/2024',
      },
      {
        name: 'Movimento Econômico · Ramal do Agreste concluído em 2021',
        url: 'https://movimentoeconomico.com.br/geral/infraestrutura/2023/12/11/a-agua-da-transposicao-do-sao-francisco-chega-a-caruaru/',
        date: '11/12/2023',
      },
    ],
    review: 'ok',
  },
  // ── 4. Caso · Joias sauditas ───────────────────────────────
  // Conferido: = facts.ts `joias` e r23. Apreensão em Guarulhos (out/2021); PF indiciou Bolsonaro e mais 11 em
  // 2024; PGR pediu arquivamento em 03/03/2026 ("lacuna legislativa"); em 18 e 19/03/2026 Moraes pediu novo parecer
  // sobre a parte de Frederick Wassef. Depois disso só achei a transferência das joias à Receita e a intimação de
  // Bolsonaro num procedimento FISCAL (out/2026). Nenhuma decisão de arquivamento do inquérito penal encontrada.
  // A defesa nega irregularidades.
  {
    id: 'joias',
    side: 'caso',
    clue: 'No desembarque deste aeroporto, a Receita achou diamantes na bagagem de uma comitiva oficial.',
    place: 'Aeroporto Internacional de Guarulhos',
    uf: 'SP',
    lat: -23.4356,
    lng: -46.4731,
    title: 'As joias sauditas',
    body: 'Em 2021, a Receita apreendeu aqui joias sauditas de uma comitiva do governo. A PF indiciou Bolsonaro em 2024; a PGR pediu arquivamento; a defesa nega.',
    status: { label: 'Indiciado · PF · PGR pediu arquivamento', kind: 'legal' },
    who: 'jair',
    sources: [
      {
        name: 'Agência Brasil · PGR pede arquivamento',
        url: 'https://agenciabrasil.ebc.com.br/justica/noticia/2026-03/pgr-pede-arquivamento-de-inquerito-sobre-desvio-de-joias-por-bolsonaro',
        date: 'mar/2026',
      },
      {
        name: 'Agência Brasil · STF pede novo parecer da PGR',
        url: 'https://agenciabrasil.ebc.com.br/justica/noticia/2026-03/stf-pede-novo-parecer-da-pgr-sobre-caso-das-joias-saudita',
        date: 'mar/2026',
      },
    ],
    review: 'ok',
  },
  // ── 5. Avanço · Transnordestina ────────────────────────────
  // Conferido: em 19/12/2025, a primeira viagem com carga da Transnordestina levou cerca de 1.000 t de milho de Bela
  // Vista do Piauí ao Terminal Logístico de Iguatu (CE): 585 km em 12h46, em fase de testes (transporte
  // comissionado autorizado pela ANTT; licença de operação do Ibama em 11/12/2025) (Poder360; Movimento Econômico).
  // Por que Iguatu: é o terminal de chegada da viagem de estreia.
  {
    id: 'transnordestina',
    side: 'avanco',
    clue: 'No centro-sul de um estado nordestino, este terminal recebeu o primeiro trem de uma ferrovia esperada há quase 20 anos.',
    place: 'Iguatu',
    uf: 'CE',
    lat: -6.3594,
    lng: -39.2986,
    title: 'O trem chegou',
    body: 'Em 19/12/2025, o primeiro trem da Transnordestina trouxe mil toneladas de milho do Piauí até o terminal daqui: 585 km, ainda em fase de testes.',
    status: { label: 'Obra com recurso federal', kind: 'good' },
    who: 'brasil',
    sources: [
      {
        name: 'Poder360 · trem percorre 585 km na estreia da Transnordestina',
        url: 'https://www.poder360.com.br/poder-infra/trem-percorre-585-km-em-viagem-de-estreia-da-transnordestina/',
        date: 'dez/2025',
      },
      {
        name: 'Movimento Econômico · mil toneladas em 12 horas',
        url: 'https://movimentoeconomico.com.br/geral/infraestrutura/transnordestina/2025/12/19/com-mil-toneladas-1a-viagem-da-transnordestina-percorre-585-km-em-12h/',
        date: '19/12/2025',
      },
    ],
    review: 'ok',
  },
  // ── 6. Caso · Crise do oxigênio ────────────────────────────
  // Conferido: em 14/01/2021, hospitais públicos de Manaus (28 de Agosto, Getúlio Vargas, Platão Araújo e SPAs)
  // ficaram sem oxigênio no pico da covid, e pacientes morreram asfixiados (Amazônia Real, 15/01/2021; o Simeam
  // estimou de 20 a 40 mortes, número sem confirmação oficial, por isso fora do texto). Fato histórico: não cito
  // responsabilidade penal de ninguém (não há condenação).
  {
    id: 'oxigenio',
    side: 'caso',
    clue: 'Em janeiro de 2021, no pico da covid, os hospitais desta capital ficaram sem oxigênio.',
    place: 'Manaus',
    uf: 'AM',
    lat: -3.119,
    lng: -60.0217,
    title: 'Sem oxigênio',
    body: 'Em 14/1/2021, o oxigênio acabou em hospitais daqui no pico da covid, e pacientes morreram asfixiados. O Brasil passaria de 700 mil mortes.',
    status: { label: 'Fato histórico', kind: 'legal' },
    who: 'brasil',
    sources: [
      {
        name: 'Amazônia Real · sem oxigênio, pacientes morrem asfixiados',
        url: 'https://amazoniareal.com.br/caos-na-pandemia-sem-oxigenio-pacientes-morrem-asfixiados-em-manaus/',
        date: '15/01/2021',
      },
      {
        name: 'Diario de Pernambuco · Brasil chega a 700 mil mortes',
        url: 'https://www.diariodepernambuco.com.br/noticia/brasil/2023/03/brasil-chega-a-700-mil-mortes-por-covid-19-e-ministerio-reforca-vacina.html',
        date: '28/03/2023',
      },
    ],
    review: 'ok',
  },
  // ── 7. Avanço · Bolsa Família ──────────────────────────────
  // Conferido: a Bahia é o estado com mais famílias no Bolsa Família: 2,38 mi em jun/2026, à frente de São Paulo,
  // 2,31 mi (Correio, jun/2026; 2,33 mi em mar/2026). Decreto 13.120/2026: piso de R$ 691 e R$ 173 por criança até
  // 7 anos a partir de out/2026 (Agência Brasil). Por que Salvador: capital do estado com mais famílias atendidas.
  {
    id: 'bolsafamilia',
    side: 'avanco',
    clue: 'Este é o estado com mais famílias no maior programa de renda do país; o pino está na capital.',
    place: 'Salvador',
    uf: 'BA',
    lat: -12.9714,
    lng: -38.5014,
    title: 'Bolsa Família',
    body: 'A Bahia tem mais famílias no Bolsa Família que qualquer estado: 2,38 milhões em jun/2026. Desde outubro, o piso é R$ 691, mais R$ 173 por criança.',
    status: { label: 'Programa federal', kind: 'good' },
    who: 'lula',
    sources: [
      {
        name: 'Correio · Bahia lidera número de beneficiários do Bolsa Família',
        url: 'https://www.correio24horas.com.br/minha-bahia/bahia-lidera-numero-de-beneficiarios-do-bolsa-familia-pagamentos-de-junho-comecam-nesta-quarta-feira-17-0626',
        date: 'jun/2026',
      },
      {
        name: 'Agência Brasil · Bolsa Família reajustado a partir de outubro',
        url: 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/bolsa-familia-e-reajustado-em-15-medida-vale-partir-de-outubro',
        date: 'set/2026',
      },
    ],
    review: 'ok',
  },
  // ── 8. Caso · Crise Yanomami ───────────────────────────────
  // Conferido: de 2019 a 2022, 570 crianças yanomami de até 5 anos morreram de causas evitáveis (pneumonia, diarreia,
  // malária, desnutrição): dados do Ministério da Saúde obtidos pela Sumaúma (20/01/2023) e citados em Cadernos de
  // Saúde Pública (Fiocruz, dez/2023), que ligam as mortes ao garimpo ilegal e à desestruturação da saúde. Em
  // 20/01/2023, o Ministério da Saúde declarou Emergência em Saúde Pública de Importância Nacional. Por que
  // Surucucu: polo-base de saúde no centro da Terra Indígena (coordenada aproximada, cerca de 5 km).
  {
    id: 'yanomami',
    side: 'caso',
    clue: 'Nesta terra indígena na fronteira norte, o garimpo ilegal cercou as aldeias e as crianças adoeceram.',
    place: 'Terra Indígena Yanomami (Surucucu)',
    uf: 'RR',
    lat: 2.84,
    lng: -63.65,
    title: 'Crise Yanomami',
    body: 'De 2019 a 2022, 570 crianças yanomami de até 5 anos morreram de causas evitáveis, como desnutrição e malária. Em jan/2023, foi declarada emergência.',
    status: { label: 'Dado oficial · Ministério da Saúde', kind: 'legal' },
    who: 'brasil',
    sources: [
      {
        name: 'Cadernos de Saúde Pública · emergência nutricional yanomami',
        url: 'https://www.scielo.br/j/csp/a/nmKbsnyDTHCNfnKnmgZFjMr/abstract/?lang=pt',
        date: 'dez/2023',
      },
      {
        name: 'Jornal de Brasília · a crise que levou à emergência',
        url: 'https://jornaldebrasilia.com.br/noticias/politica-e-poder/entenda-a-crise-de-saude-yanomami-que-levou-o-governo-a-decretar-emergencia/',
        date: 'jan/2023',
      },
    ],
    review: 'ok',
  },
  // ── 9. Avanço · Pé-de-Meia ─────────────────────────────────
  // Conferido: = facts.ts `pedemeia`, r12 e r13. Agência Gov (dez/2024): 87,7 mil estudantes no RN, 3,9 mi no país;
  // até R$ 9.200 no ensino médio regular (Comprova). Por que Natal: o balanço estadual oficial que encontrei com
  // fonte do governo é o do RN. Não é o estado com mais alunos (a Bahia tem 406 mil, segundo o MEC).
  {
    id: 'pedemeia',
    side: 'avanco',
    clue: 'Nesta capital nordestina das dunas, estudantes do ensino médio passaram a ganhar para não largar a escola.',
    place: 'Natal',
    uf: 'RN',
    lat: -5.7945,
    lng: -35.211,
    title: 'Escola que paga',
    body: 'No RN, 87,7 mil alunos entraram no Pé-de-Meia, que paga por frequência e aprovação, até R$ 9.200 em 3 anos. No Brasil, foram 3,9 milhões em 2024.',
    status: { label: 'Programa federal', kind: 'good' },
    who: 'lula',
    sources: [
      {
        name: 'Agência Gov · Pé-de-Meia: 87,7 mil estudantes no RN',
        url: 'https://agenciagov.ebc.com.br/noticias/202412/pe-de-meia-87-7-mil-estudantes-sao-beneficiados-no-rn',
        date: 'dez/2024',
      },
      {
        name: 'SBT News/Comprova · até R$ 9,2 mil',
        url: 'https://sbtnews.sbt.com.br/noticia/comprova/explica-pe-de-meia-vai-pagar-r-9-2-mil-a-aluno-de-baixa-renda-que-concluir-o-ensino-medio-e-realizar-o-enem',
        date: '29/02/2024',
      },
    ],
    review: 'ok',
  },
  // ── 10. Caso · Blitze da PRF no 2º turno de 2022 ───────────
  // Conferido: dados da PRF obtidos pelo O Globo via LAI (republicados pela Folha de Pernambuco): no 2º turno de
  // 2022, um em cada três veículos parados foi no Nordeste; a Bahia teve mais (1.082) e só em Feira de Santana foram
  // 351 abordagens. Na véspera, o TSE mandou suspender operações que afetassem o transporte de eleitores. Em
  // 16/12/2025, a 1ª Turma do STF condenou o ex-diretor-geral Silvinei Vasques a 24 anos e 6 meses (núcleo 2 da trama
  // golpista), por unanimidade; ele foi preso no Paraguai ao tentar fugir (Diário do Poder; Metrópoles). Um
  // ex-diretor de operações negou viés político ao STF (SBT News, mai/2025). Por que Feira: o município com mais
  // abordagens citado nos dados.
  {
    id: 'prf',
    side: 'caso',
    clue: 'No dia do 2º turno de 2022, as estradas em volta desta cidade tiveram centenas de abordagens a veículos.',
    place: 'Feira de Santana',
    uf: 'BA',
    lat: -12.2664,
    lng: -38.9663,
    title: 'Blitze no dia da eleição',
    body: 'Só aqui a PRF fez 351 abordagens no 2º turno de 2022, apesar da ordem do TSE. O então diretor Silvinei Vasques foi condenado no STF a 24 anos e 6 meses.',
    status: { label: 'Condenado · STF', kind: 'legal' },
    who: 'brasil',
    sources: [
      {
        name: 'Folha de Pernambuco/O Globo · um terço das blitze no Nordeste',
        url: 'https://www.folhape.com.br/politica/sob-comando-de-bolsonaro-um-terco-das-blitzes-da-prf-no-segundo-turno/278554/',
        // data exata não confirmada: a página não abriu deste ambiente
        date: '2023',
      },
      {
        name: 'Diário do Poder · STF condena Silvinei Vasques a 24 anos e 6 meses',
        url: 'https://diariodopoder.com.br/brasil-e-regioes/stf-condena-silvinei-vasques-a-24-anos-e-6-meses-de-prisao',
        date: '16/12/2025',
      },
    ],
    review: 'ok',
  },
  // ── 11. Avanço · Reconstrução do RS ────────────────────────
  // Conferido: Auxílio Reconstrução (MP 1.219/2024): R$ 5.100 em parcela única por família desalojada ou desabrigada
  // nas cheias de 2024 (Agência Gov, mai/2024); nota federal de 28/08/2024: 368 mil famílias habilitadas e 351 mil
  // cadastros enviados à Caixa (Brasil 61). "Habilitadas" não é "pagas": o texto diz habilitadas. Por que Porto
  // Alegre: capital que teve o centro tomado pela água.
  {
    id: 'reconstrucao',
    side: 'avanco',
    clue: 'Em maio de 2024, a enchente tomou o centro e o aeroporto desta capital do Sul.',
    place: 'Porto Alegre',
    uf: 'RS',
    lat: -30.0346,
    lng: -51.2177,
    title: 'Auxílio na enchente',
    body: 'Na enchente de 2024, o governo federal criou um auxílio de R$ 5.100 em parcela única para quem perdeu a casa: 368 mil famílias habilitadas até ago/2024.',
    status: { label: 'Programa federal', kind: 'good' },
    who: 'lula',
    sources: [
      {
        name: 'Agência Gov · Auxílio Reconstrução de R$ 5.100',
        url: 'https://agenciagov.ebc.com.br/noticias/202405/auxilio-reconstrucao-mais-de-34-mil-familias-ja-confirmaram-seus-dados-para-receber-os-r-5.100',
        date: 'mai/2024',
      },
      {
        name: 'Brasil 61 · mais de 368 mil famílias aprovadas',
        url: 'https://brasil61.com/n/mais-de-368-mil-familias-aprovadas-no-auxilio-reconstrucao-pmdr242664',
        date: 'ago/2024',
      },
    ],
    review: 'ok',
  },
  // ── 12. Caso · Cartão de vacina ────────────────────────────
  // Conferido: a PF diz que dados falsos de vacinação de Bolsonaro e de outros foram inseridos no SI-PNI em dez/2022
  // com a senha do então secretário de Governo de Duque de Caxias (A Gazeta; Brasil de Fato; O Povo, jul/2024).
  // A PF indiciou Bolsonaro em mar/2024; a PGR pediu arquivamento por falta de prova além da delação de Mauro Cid, e
  // Moraes arquivou a investigação contra ele em mar/2025 (Pet 10.405); a parte dos demais foi à Justiça Federal
  // do DF (Agência Brasil; Congresso em Foco). Bolsonaro nega a fraude e diz que não se vacinou.
  {
    id: 'vacina',
    side: 'caso',
    clue: 'Segundo a PF, foi com a senha de um servidor desta prefeitura da Baixada que surgiram registros falsos de vacina.',
    place: 'Duque de Caxias',
    uf: 'RJ',
    lat: -22.7856,
    lng: -43.3117,
    title: 'O cartão de vacina',
    body: 'Para a PF, saíram daqui dados falsos de vacina de Bolsonaro, que nega. Ele foi indiciado em 2024; a pedido da PGR, o STF arquivou o caso dele em 2025.',
    status: { label: 'Indiciado · PF · arquivado no STF', kind: 'legal' },
    who: 'jair',
    sources: [
      {
        name: 'Agência Brasil · Moraes arquiva investigação contra Bolsonaro',
        url: 'https://agenciabrasil.ebc.com.br/justica/noticia/2025-03/cartao-de-vacina-moraes-arquiva-investigacao-contra-bolsonaro',
        date: 'mar/2025',
      },
      {
        name: 'A Gazeta · como ocorreu a fraude, segundo a PF',
        url: 'https://www.agazeta.com.br/brasil/entenda-como-ocorreu-fraude-no-cartao-de-vacina-de-bolsonaro-segundo-a-pf-0523',
        date: 'mai/2023',
      },
    ],
    review: 'ok',
  },
  // ── 13. Avanço · Cerrado ───────────────────────────────────
  // Conferido: PRODES Cerrado 2026 (16/10/2026): 5.516,69 km², a menor taxa da série iniciada em 2001, 23,8% abaixo
  // dos 7.235 km² de 2025; Maranhão lidera (1.718,59 km²) e o Matopiba (MA, TO, PI, BA) concentra 74,3% (INPE; MMA).
  // Por que Balsas: polo da soja no sul do Maranhão, no coração do Matopiba.
  {
    id: 'cerrado',
    side: 'avanco',
    clue: 'Esta cidade do sul de um estado nordestino é polo da soja na fronteira agrícola do Cerrado.',
    place: 'Balsas',
    uf: 'MA',
    lat: -7.5325,
    lng: -46.0356,
    title: 'Cerrado respira',
    body: 'O Cerrado teve 5.517 km² desmatados em 2026, o menor da série (INPE), 23,8% a menos. Aqui no Matopiba fica 74% do desmate do bioma.',
    status: { label: 'Dado oficial · INPE', kind: 'good' },
    who: 'brasil',
    sources: [PRODES_2026_INPE, PRODES_2026_MMA],
    review: 'ok',
  },
  // ── 14. Caso · Abin paralela ───────────────────────────────
  // Conferido: em jun/2025, a PF concluiu que a Abin usou o software First Mile para localizar celulares sem ordem
  // judicial e indiciou mais de 30 pessoas, entre elas Carlos Bolsonaro e Alexandre Ramagem (Istoé; Folha PE). Jair
  // Bolsonaro não foi indiciado nesse inquérito. Em 20/07/2026, Moraes encerrou a apuração contra Bolsonaro e
  // Ramagem (já julgados pelos mesmos fatos na trama golpista) e mandou o caso de Carlos e de outros 27 à 1ª
  // instância da Justiça Federal no DF, onde o MPF decide se denuncia (CNN Brasil; Metrópoles). Não há denúncia nem
  // réu neste caso. Não achei manifestação de Carlos para registrar a negativa: conferir antes de publicar.
  // Coordenada: sede da Abin no Setor Policial Sul, aproximada (cerca de 2 km).
  {
    id: 'abin',
    side: 'caso',
    clue: 'Num prédio do serviço de inteligência do governo, um programa localizou celulares sem ordem da Justiça.',
    place: 'Sede da Abin, Brasília',
    uf: 'DF',
    lat: -15.8,
    lng: -47.93,
    title: 'Abin paralela',
    body: 'A PF diz que a Abin rastreou celulares sem ordem judicial e indiciou Carlos Bolsonaro e outros em 2025. Em 2026, o caso foi à 1ª instância.',
    status: { label: 'Indiciados · PF', kind: 'legal' },
    who: 'brasil',
    sources: [
      {
        name: 'Istoé · PF indicia Carlos Bolsonaro e Ramagem',
        url: 'https://istoe.com.br/pf-indicia-carlos-bolsonaro-e-ramagem-por-abin-paralela',
        date: 'jun/2025',
      },
      {
        name: 'CNN Brasil · investigação contra Carlos segue na 1ª instância',
        url: 'https://www.cnnbrasil.com.br/politica/investigacao-contra-carlos-e-antiga-cupula-da-abin-segue-na-1a-instancia/',
        date: 'jul/2026',
      },
    ],
    review: 'ok',
  },
  // ── 15. Avanço · Emprego ───────────────────────────────────
  // Conferido: = r05 (PNAD Contínua do 2º tri/2026, IBGE, 14/08/2026: SC 2,1%, a menor; média 5,4%, a menor para o
  // período desde 2012, IstoÉ). Dado de mercado de trabalho, não de programa: não atribui a governo. Por que
  // Florianópolis: capital do estado com o menor desemprego.
  {
    id: 'emprego-sc',
    side: 'avanco',
    clue: 'Este estado do Sul teve o menor desemprego do país em 2026; o pino está na capital, numa ilha.',
    place: 'Florianópolis',
    uf: 'SC',
    lat: -27.5954,
    lng: -48.548,
    title: 'Menor desemprego do país',
    body: 'Santa Catarina teve 2,1% de desemprego no 2º tri de 2026, o menor do país. A média do Brasil foi 5,4%, a menor para o período desde 2012 (IBGE).',
    status: { label: 'Dado oficial · IBGE', kind: 'good' },
    who: 'brasil',
    sources: [
      {
        name: 'Brasil de Fato/Agência Brasil · 11 estados abaixo da média',
        url: 'https://www.brasildefato.com.br/2026/08/14/em-11-estados-desemprego-esta-abaixo-da-media-do-pais-veja-quais/',
        date: '14/08/2026',
      },
      {
        name: 'IstoÉ · desemprego de 5,4%, o menor para o período',
        url: 'https://istoe.com.br/desemprego-brasil-atinge-5-4-menor-periodo-2026',
        date: 'ago/2026',
      },
    ],
    review: 'ok',
  },
  // ── 16. Caso · Rachadinhas ─────────────────────────────────
  // PENDENTE (revisão jurídica, não de fato). Os fatos batem com facts.ts `rachadinha` e r22: Coaf (2018), denúncia
  // do MP-RJ (2020), quebra de sigilo anulada pelo STJ, arquivamento em 2022 (Órgão Especial do TJ-RJ), recursos do
  // MP-RJ negados por Gilmar Mendes em fev/2025 (InfoMoney). Nunca foi réu e nega. Mas em 15 e 20/10/2026 o plenário
  // do TSE, por unanimidade, manteve a remoção de posts que associavam Flávio a "rachadinha", milícia e crime
  // organizado (Metrópoles; Revista Oeste; TSE). Um pino VERMELHO de "caso" num mapa de casos do bolsonarismo, a um
  // dia do 2º turno, pode ser lido como a mesma associação, ainda que o texto diga "arquivado". Status mais
  // conservador mantido. Decisão do advogado: publicar assim, publicar como pino de credibilidade (Fato ou Fake) ou
  // tirar.
  {
    id: 'rachadinha',
    side: 'caso',
    clue: 'Neste palácio legislativo, um relatório do Coaf pôs um ex-assessor no centro de uma investigação em 2018.',
    place: 'Palácio Tiradentes (antiga sede da Alerj), Rio de Janeiro',
    uf: 'RJ',
    lat: -22.9036,
    lng: -43.1739,
    title: 'O caso das rachadinhas',
    body: 'O Coaf viu R$ 1,2 mi atípico com um ex-assessor de Flávio na Alerj. Denunciado em 2020, teve as provas anuladas e o caso arquivado. Nunca foi réu e nega.',
    status: { label: 'Denúncia arquivada · nunca foi réu', kind: 'legal' },
    who: 'flavio',
    sources: [
      {
        name: 'InfoMoney · Gilmar mantém arquivado o caso das rachadinhas',
        url: 'https://www.infomoney.com.br/politica/gilmar-nega-recursos-e-mantem-arquivado-caso-das-rachadinhas-de-flavio-bolsonaro/',
        date: 'fev/2025',
      },
      {
        name: 'Congresso em Foco · STJ e as rachadinhas',
        url: 'https://congressoemfoco.com.br/noticia/22183/stj-nega-flavio-bolsonaro-rachadinhas',
        date: '2021',
      },
    ],
    review: 'pendente',
  },
]
