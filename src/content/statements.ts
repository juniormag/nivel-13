// Banco do Fato ou Fake (fase 2, chefão e Desafio do Dia).
// Inclui checagens que corrigem exageros contra o outro lado: credibilidade vem de acertar sempre.
export interface Statement {
  id: string
  text: string
  fato: boolean
  exp: string
  src: string
}

export const STATEMENTS: Statement[] = [
  {
    id: 's01',
    text: 'Quem ganha até R$ 5 mil por mês não paga mais Imposto de Renda.',
    fato: true,
    exp: 'Lei 15.270/2025, em vigor desde janeiro de 2026.',
    src: 'Câmara dos Deputados',
  },
  {
    id: 's02',
    text: 'O Brasil voltou ao Mapa da Fome em 2025.',
    fato: false,
    exp: 'É o contrário: a ONU tirou o Brasil do Mapa da Fome em julho de 2025.',
    src: 'FAO/ONU, SOFI 2025',
  },
  {
    id: 's03',
    text: 'Jair Bolsonaro foi absolvido pelo STF no caso da trama golpista.',
    fato: false,
    exp: 'Foi condenado a 27 anos e 3 meses em 11/09/2025, por 4 a 1.',
    src: 'STF',
  },
  {
    id: 's04',
    text: 'O desmatamento na Amazônia caiu quatro anos seguidos.',
    fato: true,
    exp: 'PRODES/INPE: 5.796 km² em 2025, a menor área em 11 anos.',
    src: 'INPE',
  },
  {
    id: 's05',
    text: 'O desemprego no Brasil está no pior nível da história.',
    fato: false,
    exp: 'Chegou a 5,1% no fim de 2025, o menor da série do IBGE, iniciada em 2012.',
    src: 'IBGE, PNAD Contínua',
  },
  {
    id: 's06',
    text: 'Flávio Bolsonaro foi condenado no caso das rachadinhas.',
    fato: false,
    exp: 'Ele foi denunciado em 2020, mas o STJ anulou provas e o caso foi arquivado. Nunca virou réu.',
    src: 'STJ, MP-RJ',
  },
  {
    id: 's07',
    text: 'O governo vai taxar o Pix de pessoas físicas.',
    fato: false,
    exp: 'Boato de 2025. Não existe imposto sobre Pix; a Receita revogou a norma que gerou a confusão.',
    src: 'Receita Federal',
  },
  {
    id: 's08',
    text: 'A urna eletrônica nunca teve fraude comprovada desde 1996.',
    fato: true,
    exp: 'Nenhuma auditoria, inclusive a das Forças Armadas em 2022, encontrou fraude.',
    src: 'TSE',
  },
  {
    id: 's09',
    text: 'Eduardo Bolsonaro foi condenado pelo STF por coação.',
    fato: true,
    exp: 'Em junho de 2026, por 4 a 0: 4 anos e 2 meses em regime semiaberto. Cabe recurso.',
    src: 'STF',
  },
  {
    id: 's10',
    text: 'A Receita Federal apreendeu joias de diamantes trazidas da Arábia Saudita por uma comitiva do governo Bolsonaro.',
    fato: true,
    exp: 'Em outubro de 2021, no aeroporto de Guarulhos.',
    src: 'Receita Federal, PF',
  },
  {
    id: 's11',
    text: 'Quase todos os remédios do Farmácia Popular são de graça.',
    fato: true,
    exp: 'Desde julho de 2024, 95% dos itens são gratuitos.',
    src: 'Ministério da Saúde',
  },
  {
    id: 's12',
    text: 'O Pé-de-Meia paga estudantes do ensino médio que frequentam a escola.',
    fato: true,
    exp: 'Poupança para alunos de baixa renda da rede pública, ligada a frequência e aprovação.',
    src: 'MEC',
  },
  {
    id: 's13',
    text: 'Quem ganha R$ 6 mil não tem nenhuma redução no IR.',
    fato: false,
    exp: 'Entre R$ 5 mil e R$ 7.350 há redução parcial, que diminui conforme a renda sobe.',
    src: 'Lei 15.270/2025',
  },
  {
    id: 's14',
    text: 'O voto é secreto: ninguém pode saber em quem você votou.',
    fato: true,
    exp: 'A urna não liga o voto ao eleitor. Celular na cabine é proibido justamente para proteger isso.',
    src: 'TSE',
  },
  {
    id: 's15',
    text: 'Pode levar o celular para a cabine para fotografar o voto.',
    fato: false,
    exp: 'É proibido. Deixe o celular com o mesário antes de votar.',
    src: 'TSE',
  },
  {
    id: 's16',
    text: 'Dá para votar só com um documento oficial com foto, mesmo sem o título.',
    fato: true,
    exp: 'RG, CNH, passaporte, carteira de trabalho ou o e-Título com foto.',
    src: 'TSE',
  },
  {
    id: 's17',
    text: 'Em 8 de janeiro de 2023, golpistas invadiram as sedes dos Três Poderes.',
    fato: true,
    exp: 'Congresso, STF e Palácio do Planalto foram depredados.',
    src: 'STF, PF',
  },
  {
    id: 's18',
    text: 'A "minuta do golpe" foi achada pela PF na casa de um ex-ministro de Bolsonaro.',
    fato: true,
    exp: 'Na casa de Anderson Torres, ex-ministro da Justiça, em janeiro de 2023.',
    src: 'PF',
  },
  {
    id: 's19',
    text: 'Os EUA anunciaram tarifa de 50% sobre produtos brasileiros em 2025.',
    fato: true,
    exp: 'Anúncio em julho de 2025. Eduardo Bolsonaro atuou nos EUA por sanções ao Brasil.',
    src: 'STF, imprensa',
  },
  {
    id: 's20',
    text: 'Eduardo Bolsonaro ainda é deputado federal.',
    fato: false,
    exp: 'Perdeu o mandato por faltas em dezembro de 2025.',
    src: 'Câmara dos Deputados',
  },
  {
    id: 's21',
    text: 'A PF investiga o financiamento da casa de R$ 6 milhões de Flávio em Brasília.',
    fato: true,
    exp: 'Linha de investigação aberta em outubro de 2026. Flávio nega irregularidades.',
    src: 'PF, imprensa',
  },
  {
    id: 's22',
    text: 'Flávio Bolsonaro deu uma medalha a um ex-PM que estava preso.',
    fato: true,
    exp: 'Em 2005, a Medalha Tiradentes ao ex-PM Adriano da Nóbrega, então preso preventivamente.',
    src: 'Alerj, imprensa',
  },
  {
    id: 's23',
    text: 'O 13º salário também ficou sem IR para quem ganha até R$ 5 mil.',
    fato: true,
    exp: 'A Receita aplica a mesma redução no imposto do 13º.',
    src: 'Receita Federal',
  },
  {
    id: 's24',
    text: 'Para compensar a isenção, quem ganha mais de R$ 600 mil por ano passa a pagar um imposto mínimo.',
    fato: true,
    exp: 'A mesma lei criou o imposto mínimo para altas rendas.',
    src: 'Lei 15.270/2025',
  },
  {
    id: 's25',
    text: 'Jair Bolsonaro pode ser candidato em 2026.',
    fato: false,
    exp: 'Está inelegível e foi condenado pelo STF.',
    src: 'TSE, STF',
  },
  {
    id: 's26',
    text: 'Votar no segundo turno é obrigatório para quem tem de 18 a 70 anos.',
    fato: true,
    exp: 'Quem não votar precisa justificar, inclusive pelo app e-Título.',
    src: 'TSE',
  },
  {
    id: 's27',
    text: 'Se você não votou no primeiro turno, não pode votar no segundo.',
    fato: false,
    exp: 'Cada turno é uma eleição. Você pode e deve votar no segundo.',
    src: 'TSE',
  },
  {
    id: 's28',
    text: 'Conteúdo político feito com inteligência artificial precisa avisar que usou IA.',
    fato: true,
    exp: 'Regra do TSE para a propaganda eleitoral. Este jogo avisa no rodapé e nos cards.',
    src: 'TSE, Res. 23.610',
  },
  {
    id: 's29',
    text: 'O PIB do Brasil encolheu em 2024.',
    fato: false,
    exp: 'Cresceu 3,4% em 2024, segundo o IBGE.',
    src: 'IBGE',
  },
  {
    id: 's30',
    text: 'Em 2026, o Brasil seguiu fora do Mapa da Fome, com insegurança alimentar grave em 0,6%.',
    fato: true,
    exp: 'Relatório SOFI 2026, o menor patamar da série.',
    src: 'FAO/ONU, SOFI 2026',
  },
]

export const LEVEL2_IDS = ['s02', 's05', 's06', 's07', 's04', 's08']
