// Cartas de fato. Regra: toda afirmação tem fonte, data e o status jurídico exato.
// "Condenado" só para quem tem condenação; "denunciado", "indiciado" e "investigado" são coisas diferentes.
// Antes de publicar, revise cada carta com o jurídico (ver README, seção "Antes de publicar").

export interface Source {
  name: string
  url: string
  date: string
}

export interface Fact {
  id: string
  kicker: string
  title: string
  body: string
  /** rótulo curto do status; "good" para avanço, "legal" para processo */
  status: { label: string; kind: 'good' | 'legal' }
  who: 'lula' | 'jair' | 'flavio' | 'eduardo' | 'brasil'
  icon: string
  sources: Source[]
}

export const FACTS: Fact[] = [
  {
    id: 'fome',
    kicker: 'Fase 1 · Avanço',
    title: 'Fora do Mapa da Fome',
    body: 'O relatório SOFI da ONU (FAO), de julho de 2025, mostrou o Brasil abaixo de 2,5% da população em subnutrição: fora do Mapa da Fome. O país tinha voltado ao mapa no triênio 2018–2020. Em 2026, o novo relatório confirmou: segue fora.',
    status: { label: 'Dado oficial · ONU/FAO', kind: 'good' },
    who: 'brasil',
    icon: 'prato',
    sources: [
      {
        name: 'O Povo · Brasil sai do Mapa da Fome',
        url: 'https://www.opovo.com.br/noticias/brasil/2025/07/28/brasil-sai-do-mapa-da-fome-anuncia-onu.html',
        date: '28/07/2025',
      },
      {
        name: 'Jornal de Brasília · Brasil segue fora do Mapa da Fome',
        url: 'https://jornaldebrasilia.com.br/noticias/brasil/brasil-segue-fora-do-mapa-da-fome-em-relatorio-da-fao/',
        date: 'jul/2026',
      },
    ],
  },
  {
    id: 'checagem',
    kicker: 'Fase 2 · Checagem',
    title: 'Fato tem fonte',
    body: 'Antes de repassar, pergunte: quem disse, quando e onde está o documento? Toda carta deste jogo traz o link. Se uma mensagem não tem fonte, ela ainda não é fato.',
    status: { label: 'Método', kind: 'good' },
    who: 'brasil',
    icon: 'fake',
    sources: [
      {
        name: 'TSE · Fato ou Boato',
        url: 'https://www.justicaeleitoral.jus.br/fato-ou-boato/',
        date: '2026',
      },
    ],
  },
  {
    id: 'ir',
    kicker: 'Fase 3 · Avanço',
    title: 'Até R$ 5 mil, zero de IR',
    body: 'A Lei 15.270, de 26/11/2025, zerou o Imposto de Renda de quem ganha até R$ 5 mil por mês e reduziu o imposto de quem ganha até R$ 7.350. Vale desde janeiro de 2026, inclusive no 13º. Para compensar, criou um imposto mínimo para quem ganha mais de R$ 600 mil por ano. O DIEESE estima cerca de 15,6 milhões de beneficiados.',
    status: { label: 'Lei em vigor', kind: 'good' },
    who: 'lula',
    icon: 'moeda',
    sources: [
      {
        name: 'Câmara · Lei 15.270/2025',
        url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html',
        date: '26/11/2025',
      },
      {
        name: 'DIEESE · Nota técnica 290',
        url: 'https://www.dieese.org.br/notatecnica/2026/notaTec290isencaoIR.pdf',
        date: '2026',
      },
    ],
  },
  {
    id: 'floresta',
    kicker: 'Fase 4 · Avanço',
    title: 'Floresta em pé',
    body: 'O desmatamento na Amazônia caiu pelo quarto ano seguido: 5.796 km² em 2025 (PRODES/INPE), 11,08% menos que em 2024 e a menor área em 11 anos.',
    status: { label: 'Dado oficial · INPE', kind: 'good' },
    who: 'brasil',
    icon: 'arvore',
    sources: [
      {
        name: 'O Liberal · PRODES 2025',
        url: 'https://www.oliberal.com/variedades/desmatamento-na-amazonia-em-2025-caiu-11-08-em-relacao-a-2024-afirma-prodes-inpe-1.1084212',
        date: 'out/2025',
      },
      {
        name: 'Olhar Digital · menor área em 11 anos',
        url: 'https://olhardigital.com.br/2025/10/30/ciencia-e-espaco/area-desmatada-na-amazonia-e-a-menor-em-11-anos-diz-inpe/',
        date: '30/10/2025',
      },
    ],
  },
  {
    id: 'emprego',
    kicker: 'Fase 5 · Avanço',
    title: 'Desemprego no menor nível',
    body: 'A taxa de desocupação chegou a 5,1% no último trimestre de 2025, a menor da série da PNAD Contínua do IBGE, iniciada em 2012. Em 2026 seguiu perto do piso: 5,3% no trimestre até agosto, a menor para o período.',
    status: { label: 'Dado oficial · IBGE', kind: 'good' },
    who: 'brasil',
    icon: 'carteira',
    sources: [
      {
        name: 'DGABC · menor taxa para o trimestre até agosto',
        url: 'https://www.dgabc.com.br/Noticia/4349737/taxa-de-desemprego-no-brasil-e-a-menor-para-trimestre-ate-agosto-desde-2012-mostra-ibge',
        date: 'set/2026',
      },
      { name: 'IBGE · Desemprego', url: 'https://www.ibge.gov.br/explica/desemprego.php', date: '2026' },
    ],
  },
  {
    id: 'pedemeia',
    kicker: 'Fase 6 · Avanço',
    title: 'Escola que paga',
    body: 'O Pé-de-Meia é uma poupança para estudantes de baixa renda do ensino médio público: o dinheiro cai conforme o aluno frequenta as aulas e é aprovado. Em 2024, o programa chegou a 3,9 milhões de estudantes.',
    status: { label: 'Programa federal', kind: 'good' },
    who: 'lula',
    icon: 'livro',
    sources: [
      { name: 'MEC · Pé-de-Meia', url: 'https://www.gov.br/mec/pt-br/pe-de-meia', date: '2026' },
      {
        name: 'Agência Gov · Pé-de-Meia chega a 3,9 milhões de estudantes',
        url: 'https://agenciagov.ebc.com.br/noticias/202412/pe-de-meia-87-7-mil-estudantes-sao-beneficiados-no-rn',
        date: 'dez/2024',
      },
    ],
  },
  {
    id: 'oitodejaneiro',
    kicker: 'Fase 7 · Democracia',
    title: '8 de janeiro',
    body: 'Em 8 de janeiro de 2023, golpistas invadiram e depredaram o Congresso, o STF e o Palácio do Planalto. Dias depois, a PF encontrou na casa do ex-ministro da Justiça Anderson Torres uma minuta de decreto para mudar o resultado da eleição: a "minuta do golpe".',
    status: { label: 'Fato histórico', kind: 'legal' },
    who: 'brasil',
    icon: 'minuta',
    sources: [
      {
        name: 'Itatiaia · STF condena Bolsonaro pela trama golpista',
        url: 'https://www.itatiaia.com.br/politica/stf-condena-bolsonaro-a-27-anos-e-3-meses-pela-trama-golpista/',
        date: '11/09/2025',
      },
    ],
  },
  {
    id: 'julgamento',
    kicker: 'Fase 8 · Justiça',
    title: 'Condenado pelo STF',
    body: 'Em 11 de setembro de 2025, a 1ª Turma do STF condenou Jair Bolsonaro a 27 anos e 3 meses de prisão por tentativa de golpe de Estado, organização criminosa armada, abolição violenta do Estado Democrático de Direito, dano qualificado e deterioração de patrimônio tombado. O placar foi 4 a 1. Ele está inelegível e começou a cumprir pena em novembro de 2025; a defesa pediu revisão criminal em 2026.',
    status: { label: 'Condenado · STF', kind: 'legal' },
    who: 'jair',
    icon: 'minuta',
    sources: [
      {
        name: 'Itatiaia · 27 anos e 3 meses',
        url: 'https://www.itatiaia.com.br/politica/stf-condena-bolsonaro-a-27-anos-e-3-meses-pela-trama-golpista/',
        date: '11/09/2025',
      },
      {
        name: 'Bloomberg Línea · os crimes da condenação',
        url: 'https://www.bloomberglinea.com.br/brasil/jair-bolsonaro-e-considerado-culpado-pelo-stf-por-golpe-de-estado-e-mais-quatro-crimes/',
        date: '11/09/2025',
      },
    ],
  },
  {
    id: 'rachadinha',
    kicker: 'Fase 9 · Memória',
    title: 'O caso das rachadinhas',
    body: 'Em 2018, o Coaf apontou movimentação atípica de R$ 1,2 milhão na conta de Fabrício Queiroz, ex-assessor de Flávio Bolsonaro na Alerj. Em 2020, o MP-RJ denunciou Flávio por peculato, lavagem e organização criminosa. Em 2021, o STJ anulou a quebra de sigilo e, sem essas provas, o MP pediu o arquivamento. Flávio nunca virou réu nesse caso e nega irregularidades. Em 2005, como deputado estadual, ele deu a Medalha Tiradentes ao ex-PM Adriano da Nóbrega, então preso; a mulher e a mãe de Adriano trabalharam no gabinete dele.',
    status: { label: 'Denúncia arquivada · nunca foi réu', kind: 'legal' },
    who: 'flavio',
    icon: 'moeda',
    sources: [
      {
        name: 'InfoMoney · Flávio e a rachadinha',
        url: 'https://www.infomoney.com.br/?p=3282175',
        date: '2025',
      },
      {
        name: 'Congresso em Foco · STJ e as rachadinhas',
        url: 'https://congressoemfoco.com.br/noticia/22183/stj-nega-flavio-bolsonaro-rachadinhas',
        date: '2021',
      },
      {
        name: 'Poder360 · a homenagem a Adriano',
        url: 'https://www.poder360.com.br/governo/bolsonaro-diz-que-adriano-da-nobrega-era-1-heroi-quando-foi-homenageado/',
        date: 'fev/2020',
      },
    ],
  },
  {
    id: 'mansao',
    kicker: 'Fase 9 · Memória',
    title: 'A casa de R$ 6 milhões',
    body: 'Em 2021, Flávio comprou uma casa de cerca de R$ 6 milhões em Brasília, com R$ 3,1 milhões financiados pelo BRB a juros abaixo da média do banco. Em outubro de 2026, a PF abriu uma linha de investigação sobre as condições do financiamento. Flávio nega irregularidades e diz que a operação seguiu a renda da família.',
    status: { label: 'Em investigação · PF', kind: 'legal' },
    who: 'flavio',
    icon: 'casa',
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
  {
    id: 'joias',
    kicker: 'Fase 10 · Justiça',
    title: 'As joias sauditas',
    body: 'Em outubro de 2021, a Receita Federal apreendeu em Guarulhos joias de diamantes trazidas da Arábia Saudita por uma comitiva do governo Bolsonaro. Em 2024, a PF indiciou Jair Bolsonaro e mais 11 pessoas por peculato, associação criminosa e lavagem. Em março de 2026, a PGR pediu o arquivamento alegando lacuna na lei, e o STF pediu um novo parecer. A defesa nega irregularidades.',
    status: { label: 'Indiciado · PF · PGR pediu arquivamento', kind: 'legal' },
    who: 'jair',
    icon: 'joia',
    sources: [
      {
        name: 'Band · PGR pede arquivamento',
        url: 'https://www.band.com.br/noticias/pgr-pede-arquivamento-de-inquerito-sobre-desvio-de-joias-por-bolsonaro-202603051112',
        date: '05/03/2026',
      },
      {
        name: 'Diario de Pernambuco · STF pede novo parecer',
        url: 'https://www.diariodepernambuco.com.br/politica/2026/03/11710329-stf-pede-novo-parecer-da-pgr-sobre-caso-das-joias-sauditas.html',
        date: 'mar/2026',
      },
    ],
  },
  {
    id: 'soberania',
    kicker: 'Fase 11 · Soberania',
    title: 'Coação contra o Brasil',
    body: 'Em 2025, Eduardo Bolsonaro se mudou para os EUA e atuou por sanções contra autoridades brasileiras, no ano do tarifaço de 50% sobre produtos do Brasil. Em junho de 2026, a 1ª Turma do STF o condenou por 4 a 0 a 4 anos e 2 meses, em regime semiaberto, por coação no curso do processo do pai. Cabe recurso. Ele já tinha perdido o mandato de deputado por faltas, em dezembro de 2025.',
    status: { label: 'Condenado · STF · cabe recurso', kind: 'legal' },
    who: 'eduardo',
    icon: 'tarifa',
    sources: [
      {
        name: 'STF · condenação de Eduardo Bolsonaro',
        url: 'https://noticias.stf.jus.br/postsnoticias/stf-condena-eduardo-bolsonaro-por-coacao-no-curso-do-processo-sobre-tentativa-de-golpe/',
        date: '16/06/2026',
      },
      {
        name: 'Poder360 · 4 anos e 2 meses',
        url: 'https://www.poder360.com.br/poder-justica/stf-condena-eduardo-a-4-anos-e-2-meses/',
        date: 'jun/2026',
      },
      {
        name: 'Estado de Minas · perda do mandato',
        url: 'https://www.em.com.br/politica/2026/05/7416874-como-eduardo-bolsonaro-perdeu-o-mandato-e-virou-reu-no-stf.html',
        date: 'mai/2026',
      },
    ],
  },
  {
    id: 'farmacia',
    kicker: 'Fase 12 · Avanço',
    title: 'Remédio de graça',
    body: 'Desde fevereiro de 2025, todos os 41 itens do Farmácia Popular são 100% gratuitos, incluindo remédios para diabetes, hipertensão, asma, colesterol, Parkinson e glaucoma, além de fraldas geriátricas e absorventes para quem precisa. Em julho de 2024 já eram 95%.',
    status: { label: 'Programa federal', kind: 'good' },
    who: 'lula',
    icon: 'remedio',
    sources: [
      {
        name: 'Ministério da Saúde · 100% de gratuidade no Farmácia Popular',
        url: 'https://www.gov.br/saude/pt-br/assuntos/noticias/2025/fevereiro/ministerio-da-saude-anuncia-100-de-gratuidade-no-farmacia-popular-e-abre-credenciamento-a-todos-os-municipios-do-pais',
        date: 'fev/2025',
      },
      {
        name: 'Mercado & Consumo · 100% de gratuidade em 41 remédios',
        url: 'https://mercadoeconsumo.com.br/14/02/2025/noticias-varejo/farmacia-popular-tera-100-de-gratuidade-em-41-remedios-confira-a-lista/',
        date: '14/02/2025',
      },
    ],
  },
  {
    id: 'virada',
    kicker: 'Fase 13 · Chefão',
    title: 'Mentira não resiste a fonte',
    body: 'Você derrubou a Grande Fake com fatos que têm data, número e documento. Esse é o poder que dá para levar ao grupo da família: mandar o link, não o boato.',
    status: { label: 'Nível 13', kind: 'good' },
    who: 'brasil',
    icon: 'fake',
    sources: [
      {
        name: 'TSE · Fato ou Boato',
        url: 'https://www.justicaeleitoral.jus.br/fato-ou-boato/',
        date: '2026',
      },
    ],
  },
]

export const factById = (id: string) => FACTS.find((f) => f.id === id)
