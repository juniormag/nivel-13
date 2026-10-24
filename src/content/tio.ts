// Convence o Tio (docs/MODOS-NOVOS.md §1). Dono: fact-checker.
// Regra: a resposta boa traz fato com fonte e status exato; a armadilha erra no TOM, na FONTE ou no ASSUNTO,
// nunca traz número falso nem fake news. Parentes são fictícios.
// Checagem de 24/10/2026: cada mensagem traz, num comentário, o que foi conferido e onde. O WebFetch não abriu
// nenhum site deste ambiente (erro de DNS); a conferência foi feita por busca, com o trecho de cada veículo.
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

export const PARENTES: Parente[] = [
  {
    id: 'tio',
    name: 'Tio Zé',
    who: 'Motorista de aplicativo, opinião forte e coração mole.',
    worry: 'Gasolina e emprego',
    win: 'Tá bom, vou olhar o 13 com carinho.',
    lose: 'Vamos falar disso no almoço.',
  },
  {
    id: 'tia',
    name: 'Tia Cida',
    who: 'Vai à igreja todo domingo e cuida dos netos e da mãe.',
    worry: 'Família e fé',
    win: 'Vou orar e olhar o 13 com carinho.',
    lose: 'Depois do culto a gente conversa.',
  },
  {
    id: 'vo',
    name: 'Vô Lauro',
    who: 'Aposentado pelo INSS, toma remédio de pressão todo dia.',
    worry: 'Aposentadoria e remédio',
    win: 'Tá certo, meu neto. Vou pensar no 13.',
    lose: 'No meu tempo a gente conversava com mais calma.',
  },
  {
    id: 'prima',
    name: 'Prima Bia',
    who: 'Tem 19 anos, vive de vídeo curto e recebe muita corrente.',
    worry: 'Fake news e futuro',
    win: 'Ok, vou olhar o 13 com carinho. E vou checar antes de repassar.',
    lose: 'Me manda o link depois, agora tô ocupada.',
  },
  {
    id: 'mae',
    name: 'Mãe',
    who: 'Faz o mercado da semana e conta cada centavo.',
    worry: 'Preço do mercado',
    win: 'Tá bom, filho. Vou olhar o 13 com carinho.',
    lose: 'Vamos falar disso no almoço de domingo.',
  },
]

// ── Fontes ──────────────────────────────────────────────────
const S_EMPREGO: Source = {
  name: 'DGABC/IBGE · menor desemprego para o trimestre até agosto',
  url: 'https://www.dgabc.com.br/Noticia/4349737/taxa-de-desemprego-no-brasil-e-a-menor-para-trimestre-ate-agosto-desde-2012-mostra-ibge',
  date: 'set/2026',
}
const S_CAGED: Source = {
  name: 'Agência Brasil · Caged de agosto',
  url: 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/brasil-cria-1658-mil-postos-de-trabalho-em-agosto-aponta-caged',
  date: 'set/2026',
}
const S_GASOLINA: Source = {
  name: 'Safra · governo zera tributos federais da gasolina',
  url: 'https://oespecialista.safra.com.br/governo-zera-tributos-gasolina-subsidios-etanol-diesel/',
  date: 'out/2026',
}
const S_IR: Source = {
  name: 'Câmara · Lei 15.270/2025',
  url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html',
  date: '26/11/2025',
}
const S_FBSP: Source = {
  name: 'JB · Anuário FBSP: menor taxa desde 2012',
  url: 'https://www.jb.com.br/brasil/2026/07/1060384-brasil-tem-menor-taxa-de-mortes-violentas-intencionais-desde-2012.html',
  date: '23/07/2026',
}
const S_IGREJA: Source = {
  name: 'CNN Brasil · TSE manda apagar post sobre fechar igrejas',
  url: 'https://www.cnnbrasil.com.br/eleicoes/estela-aranha-manda-flavio-apagar-post-que-sugere-que-lula-fecharia-igrejas/',
  date: '16/10/2026',
}
const S_PEDEMEIA: Source = {
  name: 'SBT News/Comprova · Pé-de-Meia paga até R$ 9,2 mil',
  url: 'https://sbtnews.sbt.com.br/noticia/comprova/explica-pe-de-meia-vai-pagar-r-9-2-mil-a-aluno-de-baixa-renda-que-concluir-o-ensino-medio-e-realizar-o-enem',
  date: '29/02/2024',
}
const S_STF_JAIR: Source = {
  name: 'Itatiaia · STF condena Bolsonaro a 27 anos e 3 meses',
  url: 'https://www.itatiaia.com.br/politica/stf-condena-bolsonaro-a-27-anos-e-3-meses-pela-trama-golpista/',
  date: '11/09/2025',
}
const S_RACHADINHA: Source = {
  name: 'InfoMoney · Gilmar mantém arquivado o caso das rachadinhas',
  url: 'https://www.infomoney.com.br/politica/gilmar-nega-recursos-e-mantem-arquivado-caso-das-rachadinhas-de-flavio-bolsonaro/',
  date: 'fev/2025',
}
const S_FARMACIA: Source = {
  name: 'Ministério da Saúde · 100% de gratuidade no Farmácia Popular',
  url: 'https://www.gov.br/saude/pt-br/assuntos/noticias/2025/fevereiro/ministerio-da-saude-anuncia-100-de-gratuidade-no-farmacia-popular-e-abre-credenciamento-a-todos-os-municipios-do-pais',
  date: 'fev/2025',
}
const S_FARMACIA_41: Source = {
  name: 'Mercado & Consumo · 41 itens gratuitos, inclusive fralda geriátrica',
  url: 'https://mercadoeconsumo.com.br/14/02/2025/noticias-varejo/farmacia-popular-tera-100-de-gratuidade-em-41-remedios-confira-a-lista/',
  date: '14/02/2025',
}
const S_INSS: Source = {
  name: 'Agência Gov · R$ 2,84 bi devolvidos a 4,1 mi de aposentados',
  url: 'https://agenciagov.ebc.com.br/noticias/202601/governo-federal-ja-devolveu-mais-de-r-2-8-bilhoes-a-quatro-milhoes-de-aposentados-e-pensionistas-vitimas-de-fraudes',
  date: '08/01/2026',
}
const S_MINIMO: Source = {
  name: 'Bahia Notícias · mínimo de R$ 1.621, reajuste de 6,79%',
  url: 'https://www.bahianoticias.com.br/noticia/311858-salario-minimo-para-2026-e-fixado-em-r-1621-com-reajuste-de-679',
  date: '24/12/2025',
}
const S_PFIZER: Source = {
  name: 'Poder360 · Pfizer diz à CPI que o Brasil recusou ofertas de vacina',
  url: 'https://www.poder360.com.br/congresso/diretor-da-pfizer-diz-a-cpi-que-brasil-recusou-6-ofertas-de-vacina/',
  date: '13/05/2021',
}
const S_PIX: Source = {
  name: 'O Povo/Agência Brasil · Receita revoga norma do Pix',
  url: 'https://www.opovo.com.br/noticias/economia/2025/01/15/receita-revoga-ato-normativo-que-previa-fiscalizacao-do-pix.html',
  date: '15/01/2025',
}
const S_IA: Source = {
  name: 'Conjur · deepfakes nas eleições brasileiras',
  url: 'https://www.conjur.com.br/2026-jul-14/deepfakes-passado-presente-e-futuro-nas-eleicoes-brasileiras/',
  date: '14/07/2026',
}
const S_URNA: Source = {
  name: 'Poder360 · relatório da Defesa sem fraude, diz TSE',
  url: 'https://www.poder360.com.br/eleicoes/relatorio-da-defesa-destaca-ausencia-de-fraude-na-eleicao-diz-tse/',
  date: 'nov/2022',
}
const S_PRODES_2026: Source = {
  name: 'INPE · PRODES 2026: queda na Amazônia e no Cerrado',
  url: 'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias/dados-do-prodes-apontam-reducao-no-desmatamento-na-amazonia-e-no-cerrado-brasileiros-1',
  date: '16/10/2026',
}
const S_8JAN: Source = {
  name: 'Aos Fatos · não há indício de infiltrados de esquerda no 8/1',
  url: 'https://www.aosfatos.org/noticias/ex-assessor-moraes-nao-disse-havia-infiltrados-esquerda-8-janeiro/',
  date: '2025',
}
const S_IPCA: Source = {
  name: 'Agência IBGE · IPCA de 2025: 4,26%',
  url: 'https://agenciadenoticias.ibge.gov.br/agencia-noticias/45613-ipca-em-dezembro-vai-a-0-33-e-acumula-4-26-em-2025.html',
  date: '09/01/2026',
}
const S_PENSSAN: Source = {
  name: 'CFN · Rede PENSSAN: fome atinge 33,1 milhões',
  url: 'https://cfn.org.br/pesquisa-revela-que-a-fome-avanca-no-brasil-e-atinge-331-milhoes-de-pessoas/',
  date: 'jun/2022',
}
const S_BOLSA: Source = {
  name: 'Agência Brasil · Bolsa Família reajustado a partir de outubro',
  url: 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/bolsa-familia-e-reajustado-em-15-medida-vale-partir-de-outubro',
  date: 'set/2026',
}
const S_GAS: Source = {
  name: 'Itatiaia · as regras do Gás do Povo',
  url: 'https://www.itatiaia.com.br/brasil/governo-publica-regras-do-programa-gas-do-povo-para-distribuicao-gratuita-de-botijoes',
  date: '2025',
}
const S_FALTOU: Source = {
  name: 'Agência Brasil · quem faltou ao 1º turno pode votar no 2º',
  url: 'https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/eleitor-que-faltou-no-primeiro-turno-pode-votar-no-segundo',
  date: 'out/2026',
}

export const TIO_MSGS: TioMsg[] = [
  // ── Tio Zé: gasolina e emprego ─────────────────────────────
  // Conferido: = facts.ts `emprego` e r04 (IBGE, 5,3% no trimestre até ago/2026, menor para o período desde 2012).
  {
    id: 'tio-1',
    parente: 'tio',
    topic: 'emprego',
    doubt: 'Tá todo mundo desempregado, né? Ninguém contrata mais.',
    good: {
      kind: 'fato',
      text: 'Tá melhor do que parece, tio: o desemprego ficou em 5,3% no trimestre até agosto, o menor para o período desde 2012 (IBGE). Se alguém da família procura vaga, a hora é boa.',
      source: S_EMPREGO,
      factId: 'emprego',
    },
    trap: {
      kind: 'tom',
      text: 'Isso é desculpa de quem não quer trabalhar, tio.',
      why: 'Culpar a pessoa fecha a conversa. Dado com fonte abre.',
    },
    react: { good: 'Menor desde 2012? Isso eu não sabia 🤔', bad: 'Lá vem você me dando lição...' },
    review: 'ok',
  },
  // Conferido: Novo Caged (MTE) de ago/2026, divulgado em set/2026: 1.134.033 vagas formais de jan a ago/2026 e
  // estoque de 48.244.696 vínculos com carteira (Agência Brasil; Jornal do Comércio repete os números).
  // Honestidade: o saldo de 2026 é 25,2% menor que o de 2025; por isso o texto não diz "recorde".
  {
    id: 'tio-2',
    parente: 'tio',
    topic: 'emprego',
    doubt: 'Até tem vaga, mas é tudo sem carteira.',
    good: {
      kind: 'fato',
      text: 'De janeiro a agosto, o país abriu 1,13 milhão de vagas com carteira, tio, e já são 48,2 milhões de trabalhadores registrados (Caged, Ministério do Trabalho).',
      source: S_CAGED,
    },
    trap: {
      kind: 'fonte',
      text: 'Todo mundo sabe que o emprego voltou, tio. É só olhar em volta.',
      why: '"Todo mundo sabe" não convence ninguém. Mostre o número e de onde ele vem.',
    },
    react: {
      good: 'Mais de um milhão com carteira? Vou contar pro meu filho que tá procurando.',
      bad: 'Olhar em volta? Em volta de mim tá todo mundo apertado.',
    },
    review: 'ok',
  },
  // Conferido: Decreto 13.134/2026, anunciado em 09/10: PIS/Pasep, Cofins e Cide da gasolina zerados de 10/10 a
  // 09/11/2026, desoneração total de R$ 0,89/litro (R$ 0,79 de PIS/Cofins + R$ 0,10 de Cide). Safra, BiodieselBR
  // e Carta Capital trazem os mesmos valores. Reportagens locais (Natal, Campo Grande) mostram repasse incompleto
  // nas bombas, por isso o texto diz "vale reparar" e não promete queda no posto.
  {
    id: 'tio-3',
    parente: 'tio',
    topic: 'mercado',
    doubt: 'Gasolina tá um absurdo, e o governo não faz nada.',
    good: {
      kind: 'fato',
      text: 'Fez sim, tio: de 10/10 a 9/11, o governo zerou PIS, Cofins e Cide da gasolina, R$ 0,89 por litro de imposto federal (Decreto 13.134). Vale reparar se o posto baixou.',
      source: S_GASOLINA,
    },
    trap: {
      kind: 'assunto',
      text: 'Gasolina é o de menos, tio. Pensa na democracia!',
      why: 'Fugir da preocupação dele mostra que você não ouviu. Responda o que ele perguntou.',
    },
    react: { good: 'Zerou imposto? Vou ficar de olho na bomba.', bad: 'Pra você é fácil, não é você que abastece.' },
    review: 'ok',
  },
  // Conferido: = facts.ts `ir`, r01 e r03 (Lei 15.270/2025: IR zero até R$ 5 mil desde jan/2026, inclusive no 13º;
  // imposto mínimo acima de R$ 600 mil/ano).
  {
    id: 'tio-4',
    parente: 'tio',
    topic: 'imposto',
    doubt: 'Esse governo só sabe aumentar imposto.',
    good: {
      kind: 'fato',
      text: 'No IR foi o contrário, tio: desde janeiro, quem ganha até R$ 5 mil por mês não paga nada, inclusive no 13º (Lei 15.270). Quem ganha mais de R$ 600 mil por ano passou a pagar um mínimo.',
      source: S_IR,
      factId: 'ir',
    },
    trap: {
      kind: 'tom',
      text: 'Você nem entende de imposto, tio. Para de repetir o que vê no grupo.',
      why: 'Chamar de desinformado faz a pessoa se defender, não ouvir.',
    },
    react: { good: 'Peraí, então é por isso que veio mais no salário?', bad: 'Agora eu sou burro, é isso?' },
    review: 'ok',
  },
  // Conferido: = r17 (Anuário FBSP, 23/07/2026: mortes violentas intencionais -8,2% em 2025, taxa 19,1, menor desde
  // 2012; feminicídios +4%; mortes por intervenção policial em recorde). Não atribui a queda a governo nenhum.
  {
    id: 'tio-5',
    parente: 'tio',
    topic: 'seguranca',
    doubt: 'Tá perigoso sair de casa, bandido tá solto.',
    good: {
      kind: 'fato',
      text: 'Tem razão de se preocupar, tio. Em 2025 as mortes violentas caíram 8,2%, a menor taxa desde 2012 (Fórum de Segurança Pública). Mas o feminicídio subiu: ainda tem muito a fazer.',
      source: S_FBSP,
    },
    trap: {
      kind: 'tom',
      text: 'Isso é medo de quem só assiste programa policial, tio.',
      why: 'Desdenhar do medo dele fecha a conversa. Reconheça e traga o dado.',
    },
    react: { good: 'Caiu? Pelo menos é um começo.', bad: 'Medo eu tenho, e com razão.' },
    review: 'ok',
  },

  // ── Tia Cida: família e fé ─────────────────────────────────
  // Conferido: boato antigo (Aos Fatos, 2022: tuítes atribuídos a Lula sobre fechar igrejas são falsos). Em 2026,
  // o Coletivo Bereia (checagem de conteúdo religioso, 09/10/2026) classificou como falso, e em 16/10/2026 a
  // ministra Estela Aranha (TSE), em liminar, mandou apagar um post com "Lula não feche minha igreja" por falta de
  // fatos (CNN Brasil, Carta Capital). EC 132/2023 (reforma tributária) ampliou a imunidade do art. 150, VI, "b"
  // a "entidades religiosas e templos de qualquer culto, inclusive suas organizações assistenciais e beneficentes".
  // O texto não diz quem fez o post (decisão liminar, cabe recurso).
  {
    id: 'tia-1',
    parente: 'tia',
    topic: 'fake',
    doubt: 'Disseram no grupo da igreja que o Lula vai fechar igreja. É verdade?',
    good: {
      kind: 'fato',
      text: 'É boato antigo, tia. Checadores mostraram que é falso, e em 16/10 o TSE mandou apagar um post assim por falta de fatos. A reforma tributária de 2023 até ampliou a imunidade das igrejas.',
      source: S_IGREJA,
    },
    trap: {
      kind: 'tom',
      text: 'Tia, só quem é muito inocente acredita nisso.',
      why: 'Chamar de inocente humilha. Mostre quem checou e deixe ela concluir.',
    },
    react: { good: 'O TSE mandou tirar? Vou avisar as irmãs.', bad: 'Inocente não, eu só perguntei.' },
    review: 'ok',
  },
  // Conferido: = facts.ts `pedemeia`, r12 e r13 (3,9 mi de alunos em 2024; até R$ 9.200 no ensino médio regular).
  {
    id: 'tia-2',
    parente: 'tia',
    topic: 'educacao',
    doubt: 'Meu neto quer largar a escola pra trabalhar.',
    good: {
      kind: 'fato',
      text: 'Conta pra ele do Pé-de-Meia, tia: aluno de baixa renda do ensino médio público recebe por frequência e aprovação, até R$ 9.200 nos 3 anos. Em 2024 foram 3,9 milhões de alunos.',
      source: S_PEDEMEIA,
      factId: 'pedemeia',
    },
    trap: {
      kind: 'assunto',
      text: 'Escola é com o governo do estado, tia. Vamos falar da eleição?',
      why: 'Mudar de assunto mostra que você não ouviu a preocupação dela.',
    },
    react: { good: 'Até R$ 9 mil? Vou mostrar pra ele hoje.', bad: 'Eu falando do meu neto e você da eleição.' },
    review: 'ok',
  },
  // Conferido: = facts.ts `julgamento` e r21 (1ª Turma, 4 a 1, 27 anos e 3 meses, 11/09/2025). Pena em execução desde
  // 25/11/2025 (AP 2668); em 2026 Moraes concedeu e depois manteve prisão domiciliar humanitária (STF, jul/2026;
  // O Tempo, 23/10/2026, ainda o descreve em domiciliar). A defesa nega os crimes. NÃO repeti a "revisão criminal"
  // de facts.ts: não achei fonte para ela (ver relatório).
  {
    id: 'tia-3',
    parente: 'tia',
    topic: 'democracia',
    doubt: 'O Bolsonaro tá preso só por perseguição, né?',
    good: {
      kind: 'fato',
      text: 'Ele foi julgado pela 1ª Turma do STF, com direito a defesa, e condenado por 4 a 1 a 27 anos e 3 meses por tentativa de golpe. A defesa nega. Hoje cumpre a pena em prisão domiciliar.',
      source: S_STF_JAIR,
      factId: 'julgamento',
    },
    trap: {
      kind: 'tom',
      text: 'Ai, tia, nem vou discutir isso com você.',
      why: 'Encerrar a conversa com desdém não convence. O fato com o status exato convence.',
    },
    react: { good: 'Com direito a defesa e 4 a 1... vou ler com calma.', bad: 'Então tá, não discuto mais.' },
    review: 'ok',
  },
  // Conferido: = facts.ts `rachadinha` e r22 (denunciado em 2020; STJ anulou a quebra de sigilo; arquivado em 2022
  // pelo Órgão Especial do TJ-RJ; em fev/2025 Gilmar Mendes negou recursos do MP-RJ e manteve o arquivamento,
  // InfoMoney). Nunca foi réu e nega. É a resposta que corrige o exagero contra o outro lado (VIRAL §3.1).
  // Atenção jurídica: em 15 e 20/10/2026 o TSE manteve a remoção de posts que ligavam Flávio a rachadinha e a crime
  // organizado. Este texto diz o contrário (que ele NÃO foi condenado), mas cita o caso: ver relatório.
  {
    id: 'tia-4',
    parente: 'tia',
    topic: 'casos',
    doubt: 'No grupo dizem que o Flávio foi condenado na rachadinha. Foi?',
    good: {
      kind: 'fato',
      text: 'Não foi, tia. Ele foi denunciado em 2020, mas o STJ anulou as provas e o caso foi arquivado. Nunca virou réu e nega. Melhor espalhar só o que dá para checar.',
      source: S_RACHADINHA,
      factId: 'rachadinha',
    },
    trap: {
      kind: 'fonte',
      text: 'Ah, tia, esses políticos são todos iguais.',
      why: 'Generalizar não informa. Corrigir até o exagero contra o outro lado dá credibilidade.',
    },
    react: {
      good: 'Gostei que você não inventou. Assim dá pra confiar no que você manda.',
      bad: 'Então você também não sabe responder.',
    },
    review: 'ok',
  },
  // Conferido: = facts.ts `farmacia` e r10 (desde 14/02/2025, os 41 itens são 100% gratuitos, incluindo fraldas
  // geriátricas). Retirada com receita e documento com CPF. Não citei faixa de idade: as fontes divergem.
  {
    id: 'tia-5',
    parente: 'tia',
    topic: 'saude',
    doubt: 'A fralda da minha mãe acamada pesa demais no bolso.',
    good: {
      kind: 'fato',
      text: 'Tia, fralda geriátrica é um dos 41 itens do Farmácia Popular, e desde fevereiro de 2025 todos saem de graça. Leva a receita médica e um documento com CPF.',
      source: S_FARMACIA_41,
      factId: 'farmacia',
    },
    trap: {
      kind: 'fonte',
      text: 'Procura no grupo do bairro, tia, sempre tem alguém doando.',
      why: 'Conselho vago não resolve. Diga o programa, a regra e a fonte.',
    },
    react: { good: 'De graça? Amanhã mesmo eu vou na farmácia.', bad: 'Eu preciso todo mês, não dá pra depender de doação.' },
    review: 'ok',
  },

  // ── Vô Lauro: aposentadoria e remédio ──────────────────────
  // Conferido: = facts.ts `farmacia`, r10 e r11 (41 itens 100% grátis desde fev/2025; 27,3 mi atendidos em 2025,
  // dado do Ministério da Saúde de set/2026).
  {
    id: 'vo-1',
    parente: 'vo',
    topic: 'saude',
    doubt: 'Remédio de pressão tá caro demais.',
    good: {
      kind: 'fato',
      text: 'Vô, no Farmácia Popular o remédio de pressão sai de graça: desde fevereiro de 2025, os 41 itens são 100% gratuitos, com receita. Em 2025, mais de 27 milhões de pessoas foram atendidas.',
      source: S_FARMACIA,
      factId: 'farmacia',
    },
    trap: {
      kind: 'fonte',
      text: 'Vô, é só procurar que tem remédio barato por aí.',
      why: 'Conselho vago não ajuda. Diga o programa, a regra e a fonte.',
    },
    react: { good: 'De graça? Vou levar a receita amanhã mesmo.', bad: 'Procurar onde, menino?' },
    review: 'ok',
  },
  // Conferido: Operação Sem Desconto (PF e CGU, 23/04/2025): descontos associativos não autorizados de 2019 a 2024,
  // cerca de R$ 6,3 bi estimados (Jovem Pan, JB). Agência Gov, 08/01/2026: R$ 2,84 bi devolvidos a 4,1 mi de
  // aposentados e pensionistas, na conta do benefício, corrigidos pelo IPCA. Há números maiores depois (R$ 3,2 bi a
  // 4,7 mi até jun/2026, citados em reportagem sobre a MP 1.378), mas sem nota oficial que eu tenha achado: fiquei
  // com o de janeiro. O texto reconhece o problema e não atribui culpa a governo.
  {
    id: 'vo-2',
    parente: 'vo',
    topic: 'casos',
    doubt: 'E aquela roubalheira no INSS? Mexeram no dinheiro dos aposentados.',
    good: {
      kind: 'fato',
      text: 'Foi grave, vô. Os descontos sem autorização vinham desde 2019. A PF e a CGU desmontaram o esquema em 2025, e até janeiro o governo devolveu R$ 2,84 bilhões a 4,1 milhões de aposentados, na conta.',
      source: S_INSS,
    },
    trap: {
      kind: 'assunto',
      text: 'Ah, vô, esquece o INSS e olha o resto.',
      why: 'Desconversar sobre o que doeu nele soa como esconder. Reconheça e mostre o que foi feito.',
    },
    react: { good: 'Devolveram na conta? Vou olhar meu extrato.', bad: 'Esquecer? Mexeram no meu dinheiro!' },
    review: 'ok',
  },
  // Conferido: = r14 e r15 (Decreto 12.797: R$ 1.621 desde 01/01/2026, +6,79%; IPCA de 2025: 4,26%, IBGE).
  {
    id: 'vo-3',
    parente: 'vo',
    topic: 'mercado',
    doubt: 'Minha aposentadoria é um salário mínimo e não dá pra nada.',
    good: {
      kind: 'fato',
      text: 'Não é muito, vô, mas subiu acima da inflação: o mínimo foi a R$ 1.621 em janeiro, alta de 6,79%, e a inflação de 2025 foi 4,26% (IBGE).',
      source: S_MINIMO,
    },
    trap: {
      kind: 'tom',
      text: 'Vô, o senhor reclama de barriga cheia.',
      why: 'Desdenhar da dificuldade dele fecha a conversa. Reconheça e traga o número.',
    },
    react: { good: 'Acima da inflação? Pelo menos isso.', bad: 'Barriga cheia? Vem viver com um mínimo.' },
    review: 'ok',
  },
  // Conferido (o que piorou): na CPI da Covid (13/05/2021), Carlos Murillo, da Pfizer, disse que as ofertas de
  // agosto de 2020 (30 ou 70 milhões de doses) ficaram sem resposta; o contrato só saiu após a oferta de 08/03/2021
  // (Poder360, Correio Braziliense). O então ministro Pazuello alegou cláusulas "leoninas": registrado como "o
  // governo alegou cláusulas duras". Mortes: o Brasil passou de 700 mil em 28/03/2023 (Ministério da Saúde,
  // Diario de Pernambuco). "Disse" fica com a Pfizer: é o depoimento dela, não conclusão judicial.
  {
    id: 'vo-4',
    parente: 'vo',
    topic: 'saude',
    doubt: 'Na pandemia o governo fez o que pôde, né?',
    good: {
      kind: 'fato',
      text: 'Vô, na CPI a Pfizer disse que ofereceu vacina em agosto de 2020 e ficou sem resposta; o governo alegou cláusulas duras. O contrato só saiu em março de 2021. Foram mais de 700 mil mortes.',
      source: S_PFIZER,
    },
    trap: {
      kind: 'tom',
      text: 'Vô, quem defende aquilo não tem coração.',
      why: 'Atacar o caráter dele encerra a conversa. Lembre um fato com data.',
    },
    react: { good: 'Agosto de 2020... e a minha dose só veio em 2021.', bad: 'Agora eu não tenho coração?' },
    review: 'ok',
  },
  // Conferido: Lei 15.270/2025 reduz o imposto mensal sobre rendimentos tributáveis, o que inclui aposentadoria e
  // pensão (Santander, Estado de Minas e Senior repetem); zero até R$ 5 mil, desconto até R$ 7.350, também no 13º.
  {
    id: 'vo-5',
    parente: 'vo',
    topic: 'imposto',
    doubt: 'Aposentado paga imposto em tudo.',
    good: {
      kind: 'fato',
      text: 'No IR mudou, vô: desde janeiro, aposentadoria de até R$ 5 mil por mês não paga nada, e até R$ 7.350 paga menos (Lei 15.270). Vale também no 13º.',
      source: S_IR,
      factId: 'ir',
    },
    trap: {
      kind: 'assunto',
      text: 'Imposto é chato, vô. O que importa é a democracia.',
      why: 'Trocar o assunto dele pelo seu mostra que você não ouviu.',
    },
    react: {
      good: 'Até R$ 5 mil? Vou pedir pro meu neto conferir o extrato.',
      bad: 'Pra mim importa é o que sobra no fim do mês.',
    },
    review: 'ok',
  },

  // ── Prima Bia: vídeo curto e fake ──────────────────────────
  // Conferido: = s07. Receita revogou em 15/01/2025 a IN 2.219/2024 (era só monitoramento acima de R$ 5 mil, sem
  // imposto), após onda de boatos (Agência Brasil via O Povo; InfoMoney). A Receita diz que não existe tributação
  // sobre Pix e que a Constituição não permite imposto sobre movimentação financeira (reiterado em dez/2025).
  {
    id: 'prima-1',
    parente: 'prima',
    topic: 'fake',
    doubt: 'Vi um vídeo dizendo que vão taxar o Pix. É real?',
    good: {
      kind: 'fato',
      text: 'É fake, Bia. A Receita diz que não existe imposto sobre Pix. A norma que gerou a confusão só mandava os bancos informarem valores e foi revogada em 15/01/2025.',
      source: S_PIX,
    },
    trap: {
      kind: 'tom',
      text: 'Bia, para de acreditar em tudo que aparece no seu celular.',
      why: 'Bronca não ensina. Mostre quem checou e como checar.',
    },
    react: { good: 'Revogada em janeiro? Vou mandar isso no grupo da sala.', bad: 'Ninguém aqui acredita em tudo, tá?' },
    review: 'ok',
  },
  // Conferido: Res. TSE 23.610, art. 9º-B (aviso obrigatório de conteúdo feito com IA) e 9º-C (vedação de deepfake
  // para favorecer ou prejudicar candidatura), atualizada para 2026 (Conjur, 14/07/2026; InvestNews). Igual a s28.
  {
    id: 'prima-2',
    parente: 'prima',
    topic: 'fake',
    doubt: 'Apareceu um vídeo de candidato falando um absurdo. Repasso?',
    good: {
      kind: 'fato',
      text: 'Segura, Bia. Conteúdo com IA tem que avisar que é IA, e deepfake de candidato em propaganda é proibido pelo TSE. Procura a fala no perfil oficial ou num checador antes.',
      source: S_IA,
    },
    trap: {
      kind: 'tom',
      text: 'Credo, Bia, você é muito ingênua.',
      why: 'Chamar de ingênua afasta. Ensine o caminho: perfil oficial e checador.',
    },
    react: { good: 'Vou checar antes. Não quero passar vergonha.', bad: 'Nossa, que grosso.' },
    review: 'ok',
  },
  // Conferido: = s08 e r27. Nota oficial do TSE (nov/2022): o relatório do Ministério da Defesa, como os das demais
  // entidades fiscalizadoras, não apontou fraude nem inconsistência; o próprio relatório reconheceu que boletins de
  // urna e resultados do TSE eram idênticos (Jornal Opção). Ressalva: a Defesa disse depois que "não descarta" a
  // possibilidade; o texto não diz que a Defesa atestou nada, só que não achou fraude.
  {
    id: 'prima-3',
    parente: 'prima',
    topic: 'fake',
    doubt: 'Tão falando que a urna é fraudada. Vale a pena votar?',
    good: {
      kind: 'fato',
      text: 'Vale, Bia. Desde 1996 nenhuma auditoria achou fraude, nem a das Forças Armadas em 2022, e os boletins das urnas bateram com o resultado do TSE. Teu voto conta.',
      source: S_URNA,
    },
    trap: {
      kind: 'fonte',
      text: 'Confia, Bia. Todo mundo sabe que a urna é segura.',
      why: '"Todo mundo sabe" parece propaganda. Diga quem auditou e o que achou.',
    },
    react: { good: 'Até as Forças Armadas? Então domingo eu vou.', bad: 'Todo mundo quem? Eu não sei.' },
    review: 'ok',
  },
  // Conferido (o que piorou e o que melhorou): PRODES 2021 consolidado: 13.038 km², +20,15% sobre 2020 (nota técnica
  // do INPE), a maior taxa desde 2006. PRODES 2026 (estimativa, 16/10/2026): 3.335 km², a menor da série iniciada em
  // 1988, -41,8% sobre os 5.731 km² consolidados de 2025 (INPE; MMA; InfoAmazonia). É estimativa: o INPE consolida
  // no ano seguinte. ATENÇÃO: facts.ts `floresta`, r08 e r09 ainda falam em 2025 (5.796 km², "quarto ano").
  {
    id: 'prima-4',
    parente: 'prima',
    topic: 'fake',
    doubt: 'Vi vídeo dizendo que a Amazônia nunca foi tão desmatada. É isso?',
    good: {
      kind: 'fato',
      text: 'Hoje não, Bia: em 2026 foram 3.335 km², a menor taxa desde 1988, pela estimativa do INPE. O pico recente foi em 2021, com 13.038 km², quase quatro vezes mais.',
      source: S_PRODES_2026,
      factId: 'floresta',
    },
    trap: {
      kind: 'assunto',
      text: 'Floresta é pauta de gringo, Bia. Pensa no seu emprego.',
      why: 'Desvalorizar o que ela gosta fecha a conversa. Comece pelo que importa pra ela.',
    },
    react: { good: 'Menor desde 1988? Isso vale um vídeo.', bad: 'Eu ligo pra floresta, sim.' },
    review: 'ok',
  },
  // Conferido: Aos Fatos checou peças sobre "infiltrados de esquerda" no 8/1 e concluiu que "não há indícios de que
  // os atos de vandalismo foram cometidos por infiltrados de esquerda" (também: fotos de presos de El Salvador e
  // vídeo do acervo do Poder360 apresentados como prova eram falsos). Balanço do gabinete de Moraes, 29/04/2026:
  // 1.402 condenados nos processos dos atos antidemocráticos, 552 acordos (ANPP), 144 arquivados (Imirante,
  // Portal Em Tempo, 04/05/2026). O texto não repete o boato por extenso.
  {
    id: 'prima-5',
    parente: 'prima',
    topic: 'democracia',
    doubt: 'Vi vídeo dizendo que o 8 de janeiro foi armação. Foi?',
    good: {
      kind: 'fato',
      text: 'O Aos Fatos checou: não há indício de infiltrados de esquerda no 8 de Janeiro. Até abril de 2026, o STF condenou 1.402 pessoas pelos atos, todas com direito a defesa.',
      source: S_8JAN,
      factId: 'oitodejaneiro',
    },
    trap: {
      kind: 'fonte',
      text: 'Claro que não, Bia. Isso é óbvio.',
      why: '"É óbvio" não é argumento. Mostre quem checou e o que a Justiça decidiu.',
    },
    react: { good: 'Aos Fatos checou? Vou ver antes de repassar.', bad: 'Óbvio pra você.' },
    review: 'ok',
  },

  // ── Mãe: preço do mercado ──────────────────────────────────
  // Conferido: = r15 (IBGE, 09/01/2026: alimentação no domicílio +1,43% em 2025, contra 8,23% em 2024). IPCA de
  // set/2026 (IBGE): alimentação no domicílio +0,96% no mês, puxada por tomate, batata e cebola, depois de três
  // meses de queda do grupo. Frase empática de VIRAL §3.3: "subiu menos, não caiu".
  {
    id: 'mae-1',
    parente: 'mae',
    topic: 'mercado',
    doubt: 'Tudo caro no mercado, não sei mais o que cortar.',
    good: {
      kind: 'fato',
      text: 'Tá caro mesmo, mãe, não é impressão. Em 2025 a comida em casa subiu 1,43%, bem menos que os 8,23% de 2024 (IBGE). Subiu menos, não caiu, e em setembro voltou a subir.',
      source: S_IPCA,
    },
    trap: {
      kind: 'tom',
      text: 'Mãe, a inflação tá baixa. Você que gasta demais.',
      why: 'Duvidar do que ela vive no caixa fecha a conversa. Concorde e traga o dado.',
    },
    react: { good: 'Pelo menos subiu menos. Mas o tomate tá um absurdo.', bad: 'Eu gasto demais? Quem faz o mercado sou eu.' },
    review: 'ok',
  },
  // Conferido (o que piorou e o que melhorou): II VIGISAN da Rede PENSSAN (campo nov/2021 a abr/2022, divulgado em
  // jun/2022): 33,1 milhões em insegurança alimentar grave (CFN, Idec). = facts.ts `fome`, r06 e s30 (SOFI 2025
  // tirou o Brasil do Mapa da Fome; SOFI 2026 confirmou). São medidas diferentes (PENSSAN x FAO): o texto só conta a
  // linha do tempo, não calcula queda entre elas.
  {
    id: 'mae-2',
    parente: 'mae',
    topic: 'fome',
    doubt: 'Na TV falaram de gente passando fome de novo.',
    good: {
      kind: 'fato',
      text: 'Teve muita, mãe: em 2022, a Rede PENSSAN contou 33,1 milhões de pessoas com fome. Em 2025, a ONU tirou o Brasil do Mapa da Fome, e em 2026 confirmou. Ainda tem quem precise.',
      source: S_PENSSAN,
      factId: 'fome',
    },
    trap: {
      kind: 'tom',
      text: 'Ai, mãe, você e esses programas de TV.',
      why: 'Zombar do que ela assiste não ajuda. Mostre quem mediu e quando.',
    },
    react: { good: '33 milhões... que bom que melhorou.', bad: 'Pode rir, mas eu vejo gente pedindo comida no farol.' },
    review: 'ok',
  },
  // Conferido: Decreto 13.120, de 17/09/2026 (reajuste pelo INPC de mar/2023 a ago/2026): piso de R$ 600 para R$ 691;
  // Benefício Primeira Infância de R$ 150 para R$ 173 por criança até 7 anos incompletos, a partir de out/2026
  // (Agência Brasil, set/2026). Folha de out/2026: 19,3 mi de famílias, média R$ 782,92 (Agência Brasil, out/2026).
  {
    id: 'mae-3',
    parente: 'mae',
    topic: 'fome',
    doubt: 'A vizinha disse que o Bolsa Família nunca aumenta.',
    good: {
      kind: 'fato',
      text: 'Aumentou agora, mãe: desde outubro o piso é R$ 691 por família, mais R$ 173 por criança até 7 anos. São 19,3 milhões de famílias no programa.',
      source: S_BOLSA,
    },
    trap: {
      kind: 'fonte',
      text: 'Aumentou sim, mãe. Pode falar pra ela que eu garanto.',
      why: '"Eu garanto" não é fonte. Diga o valor e onde ele foi publicado.',
    },
    react: { good: 'R$ 691? Vou contar pra vizinha.', bad: 'Você garante? Você nem sabe o preço do arroz.' },
    review: 'ok',
  },
  // Conferido: Gás do Povo (MP 1.313/2025, aprovada no Senado em 03/02/2026, Rádio Senado): família no CadÚnico
  // atualizado, renda de até meio salário mínimo por pessoa e pelo menos 2 pessoas; 4 recargas por ano (2 ou 3
  // pessoas) ou 6 (4 ou mais), retiradas de graça em revenda credenciada (Itatiaia; Fast Company; Seu Dinheiro).
  // A conversão da MP em lei não foi confirmada; o programa seguia pagando em set/2026 (governo da Bahia).
  {
    id: 'mae-4',
    parente: 'mae',
    topic: 'mercado',
    doubt: 'O botijão tá pesando no orçamento.',
    good: {
      kind: 'fato',
      text: 'Olha o Gás do Povo, mãe: família de 2 ou mais pessoas no CadÚnico, com renda de até meio mínimo por pessoa, pega o botijão de graça na revenda, de 4 a 6 vezes por ano.',
      source: S_GAS,
    },
    trap: {
      kind: 'assunto',
      text: 'Gás é detalhe, mãe. O importante é quem vai governar.',
      why: 'Pra quem cozinha todo dia, gás não é detalhe. Responda a preocupação dela.',
    },
    react: { good: 'De graça? Vou ver se a gente entra.', bad: 'Detalhe pra você, que não cozinha.' },
    review: 'ok',
  },
  // Conferido: = s27, r29 e r31 (cada turno é uma eleição; quem faltou no 1º pode votar no 2º mesmo sem ter
  // justificado; votação das 8h às 17h de Brasília; documento oficial com foto basta, r30).
  {
    id: 'mae-5',
    parente: 'mae',
    topic: 'fake',
    doubt: 'Não votei no 1º turno. Agora não posso mais, né?',
    good: {
      kind: 'fato',
      text: 'Pode sim, mãe! Cada turno é uma eleição: quem faltou no 1º vota no 2º, mesmo sem ter justificado. Domingo, das 8h às 17h de Brasília, com documento com foto.',
      source: S_FALTOU,
    },
    trap: {
      kind: 'tom',
      text: 'Mãe, como você não sabe disso?',
      why: 'Fazer a pessoa se sentir burra afasta da urna. Explique com carinho.',
    },
    react: { good: 'Então domingo eu vou.', bad: 'Não sei e pronto, me deixa.' },
    review: 'ok',
  },
]
