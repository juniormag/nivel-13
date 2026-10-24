// As 13 fases: Nordeste → Norte → Brasília → Sudeste → Sul → Brasília.
export type GameKind =
  | 'mapa'
  | 'swipe'
  | 'ir'
  | 'fogo'
  | 'whack'
  | 'ritmo'
  | 'defesa'
  | 'linha'
  | 'memoria'
  | 'raiox'
  | 'escudo'
  | 'pegar'
  | 'chefe'

export interface Level {
  n: number
  title: string
  where: string
  lon: number
  lat: number
  kind: GameKind
  intro: string
  how: string[]
  facts: string[]
  theme: { top: string; mid: string; ground: string }
}

export const LEVELS: Level[] = [
  {
    n: 1,
    title: 'Mapa da Fome',
    where: 'Sertão de Pernambuco',
    lon: -38.6,
    lat: -8.4,
    kind: 'mapa',
    intro: 'O mapa está vermelho. Leve comida a cada canto do Brasil antes do tempo acabar.',
    how: ['Toque no vermelho', 'Pinte 85% do mapa'],
    facts: ['fome'],
    theme: { top: '#120a10', mid: '#4a1814', ground: '#3a2418' },
  },
  {
    n: 2,
    title: 'Fato ou Fake',
    where: 'Fortaleza',
    lon: -38.5,
    lat: -3.8,
    kind: 'swipe',
    intro: 'Mensagens chegam como meteoros. Diga se é fato ou fake antes que caiam.',
    how: ['Arraste ou toque', '← Fake · Fato →'],
    facts: ['checagem'],
    theme: { top: '#0a0a14', mid: '#1a1430', ground: '#141020' },
  },
  {
    n: 3,
    title: 'Seu Imposto',
    where: 'São Luís',
    lon: -44.3,
    lat: -2.6,
    kind: 'ir',
    intro: 'Quanto a isenção do IR deixa no seu bolso? Faça a conta com o seu salário.',
    how: ['Arraste o salário', 'Veja o que você economiza'],
    facts: ['ir'],
    theme: { top: '#0c0a10', mid: '#2a2210', ground: '#1a1408' },
  },
  {
    n: 4,
    title: 'Floresta em Pé',
    where: 'Pará',
    lon: -52.5,
    lat: -4.8,
    kind: 'fogo',
    intro: 'Focos de queimada surgem na mata. Apague antes que se espalhem.',
    how: ['Toque no fogo', 'Replante os tocos'],
    facts: ['floresta'],
    theme: { top: '#0a0c0a', mid: '#3a1a10', ground: '#10200e' },
  },
  {
    n: 5,
    title: 'Carteira Assinada',
    where: 'Manaus',
    lon: -60.0,
    lat: -3.1,
    kind: 'whack',
    intro: 'Vagas aparecem nas janelas. Pegue as carteiras e fuja do golpe do emprego falso.',
    how: ['Toque nas carteiras azuis', 'Evite os vermelhos'],
    facts: ['emprego'],
    theme: { top: '#0a0a12', mid: '#1c1a2e', ground: '#121018' },
  },
  {
    n: 6,
    title: 'Escola que Paga',
    where: 'Porto Velho',
    lon: -63.9,
    lat: -8.8,
    kind: 'ritmo',
    intro: 'Cada presença enche o Pé-de-Meia. Bata no ritmo do sinal da escola.',
    how: ['Toque no lado da nota', '← esquerda · direita →'],
    facts: ['pedemeia'],
    theme: { top: '#0c0a12', mid: '#2a1430', ground: '#140c18' },
  },
  {
    n: 7,
    title: '8 de Janeiro',
    where: 'Brasília',
    lon: -47.9,
    lat: -15.8,
    kind: 'defesa',
    intro: 'Minutas do golpe voam contra a Praça dos Três Poderes. Rasgue todas.',
    how: ['Toque nas minutas', 'Proteja os prédios'],
    facts: ['oitodejaneiro'],
    theme: { top: '#0a0810', mid: '#3a1418', ground: '#1a1214' },
  },
  {
    n: 8,
    title: 'O Julgamento',
    where: 'STF, Brasília',
    lon: -47.2,
    lat: -16.6,
    kind: 'linha',
    intro: 'Monte a linha do tempo da trama golpista, do resultado das urnas à condenação.',
    how: ['Toque na ordem certa', 'Do mais antigo ao mais novo'],
    facts: ['julgamento'],
    theme: { top: '#0a0a0e', mid: '#20141a', ground: '#141014' },
  },
  {
    n: 9,
    title: 'Siga o Dinheiro',
    where: 'Alerj, Rio de Janeiro',
    lon: -43.2,
    lat: -22.9,
    kind: 'memoria',
    intro: 'Jogo da memória: ligue cada pista ao fato. Tudo com fonte.',
    how: ['Vire duas cartas', 'Ano + fato = par'],
    facts: ['rachadinha', 'mansao'],
    theme: { top: '#0a0a10', mid: '#2a1016', ground: '#160c10' },
  },
  {
    n: 10,
    title: 'Raio-X',
    where: 'Aeroporto de Guarulhos',
    lon: -46.5,
    lat: -23.4,
    kind: 'raiox',
    intro: 'As malas passam pelo raio-X. Segure só as que trazem joias.',
    how: ['Toque na mala com joia', 'Deixe as outras passarem'],
    facts: ['joias'],
    theme: { top: '#08101a', mid: '#0e2030', ground: '#0a141c' },
  },
  {
    n: 11,
    title: 'Soberania',
    where: 'Porto de Santos',
    lon: -46.3,
    lat: -24.0,
    kind: 'escudo',
    intro: 'Tarifas e sanções contra o Brasil. Gire o escudo e proteja o país.',
    how: ['Arraste em volta', 'Gire com o dedo'],
    facts: ['soberania'],
    theme: { top: '#0a0a12', mid: '#14203a', ground: '#0c1220' },
  },
  {
    n: 12,
    title: 'Farmácia Popular',
    where: 'Porto Alegre',
    lon: -51.2,
    lat: -30.0,
    kind: 'pegar',
    intro: 'Remédios de graça caindo. Pegue todos e deixe o boato no chão.',
    how: ['Arraste a cesta', 'Deixe o boato cair'],
    facts: ['farmacia'],
    theme: { top: '#0a0c10', mid: '#1a2a20', ground: '#101a14' },
  },
  {
    n: 13,
    title: 'A Grande Fake',
    where: 'Esplanada, Brasília',
    lon: -47.9,
    lat: -15.0,
    kind: 'chefe',
    intro: 'O chefão é feito de boatos. Cada cabeça só cai com o fato certo.',
    how: ['Leia a mentira', 'Escolha o fato'],
    facts: ['virada'],
    theme: { top: '#070508', mid: '#3a0a10', ground: '#140608' },
  },
]
