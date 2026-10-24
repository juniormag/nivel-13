// Onde Foi? (docs/MODOS-NOVOS.md §2): sorteio pela semente, alternância verde/vermelho, pontos pela
// distância, grade de share e o acervo publicável (só review === 'ok').
import { describe, expect, it } from 'vitest'
import { inBrazil } from '../src/content/brazil'
import { PINS } from '../src/content/onde'
import { FIXTURE_PINS } from '../src/modes/onde/fixture'
import { fromXY, landGrid, toXY, UF_LIST, ufAt, ufNear } from '../src/modes/onde/geo'
import {
  challengeText,
  dailySeed,
  distanceKm,
  fmtKm,
  gridLines,
  isDaily,
  normSeed,
  ONDE_MAX,
  ONDE_WEIGHTS,
  ondeLink,
  ondeTotal,
  pickPins,
  pinPoints,
  pinPt,
  playable,
  randomSeed,
  seedLabel,
  shareText,
} from '../src/modes/onde/logic'
import { getPlay, ONDE_KEY, savePlay } from '../src/modes/onde/store'

const POOL = PINS.filter(playable)

describe('onde · acervo', () => {
  it('só entra pino revisado; o pendente fica de fora', () => {
    expect(POOL.every((p) => p.review === 'ok')).toBe(true)
    for (const p of PINS.filter((x) => x.review !== 'ok')) expect(POOL).not.toContain(p)
  })
  it('todo pino publicável tem fonte, status e coordenada no enquadramento', () => {
    for (const p of POOL) {
      expect(p.sources.length).toBeGreaterThan(0)
      expect(p.status.label.length).toBeGreaterThan(0)
      const [x, y] = toXY(pinPt(p), 100)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(100)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(100)
    }
  })
  it('lado vermelho se chama caso, nunca crime', () => {
    for (const p of [...PINS, ...FIXTURE_PINS]) expect(`${p.title} ${p.clue}`.toLowerCase()).not.toContain('crime')
  })
  it('exemplos de dev dizem que são exemplo', () => {
    for (const p of FIXTURE_PINS) {
      expect(p.clue).toMatch(/Exemplo/)
      expect(p.body).toMatch(/exemplo/i)
    }
  })
})

describe('onde · semente e sorteio', () => {
  it('mesma semente, mesma partida', () => {
    const a = pickPins('k7q2p', POOL).map((p) => p.id)
    const b = pickPins('k7q2p', POOL.slice().reverse()).map((p) => p.id)
    expect(a).toEqual(b)
    expect(pickPins('outra', POOL).map((p) => p.id)).not.toEqual(a)
  })
  it('6 pinos distintos, alternando avanço e caso, começando no verde', () => {
    for (const seed of ['1', '5', '6', 'abc', 'zz9', randomSeed()]) {
      const ps = pickPins(seed, POOL)
      expect(ps).toHaveLength(6)
      expect(new Set(ps.map((p) => p.id)).size).toBe(6)
      expect(ps.map((p) => p.side)).toEqual(['avanco', 'caso', 'avanco', 'caso', 'avanco', 'caso'])
      // com 15 pinos em 13 UFs dá para não repetir estado
      expect(new Set(ps.map((p) => p.uf)).size).toBe(6)
    }
  })
  it('acervo curto: completa com o outro lado e não quebra', () => {
    const ps = pickPins('1', FIXTURE_PINS)
    expect(ps).toHaveLength(4)
    expect(pickPins('1', [])).toEqual([])
  })
  it('normaliza a semente do link', () => {
    expect(normSeed('K7Q2P')).toBe('k7q2p')
    expect(normSeed(6)).toBe('6')
    expect(normSeed('')).toBeNull()
    expect(normSeed('a/b')).toBeNull()
    expect(normSeed('x'.repeat(13))).toBeNull()
    expect(normSeed(null)).toBeNull()
  })
  it('semente do dia é o número do dia; avulsa nunca é só algarismo', () => {
    expect(dailySeed('2026-10-20')).toBe('1')
    expect(dailySeed('2026-10-25')).toBe('6')
    expect(isDaily(dailySeed())).toBe(true)
    for (let i = 0; i < 50; i++) expect(isDaily(randomSeed())).toBe(false)
    expect(seedLabel('6')).toBe('#6')
    expect(seedLabel('k7q2p')).toBe('#K7Q2P')
  })
})

describe('onde · pontos', () => {
  it('perto vale mais; nota cheia na cidade; piso 5', () => {
    expect(pinPoints(0)).toBe(100)
    expect(pinPoints(20)).toBe(100)
    expect(pinPoints(100)).toBeGreaterThan(pinPoints(400))
    expect(pinPoints(400)).toBeGreaterThan(pinPoints(1000))
    expect(pinPoints(5000)).toBe(5)
  })
  it('pesos somam 10: máximo 1.000', () => {
    expect(ONDE_WEIGHTS.reduce((a, b) => a + b, 0)).toBe(10)
    expect(ONDE_MAX).toBe(1000)
    expect(ondeTotal([100, 100, 100, 100, 100, 100])).toBe(1000)
    expect(ondeTotal([5, 5, 5, 5, 5, 5])).toBe(50)
  })
  it('distância real: Brasília a Manaus ~1.930 km', () => {
    const km = distanceKm({ lon: -47.88, lat: -15.79 }, { lon: -60.02, lat: -3.12 })
    expect(km).toBeGreaterThan(1850)
    expect(km).toBeLessThan(2000)
  })
})

describe('onde · share', () => {
  const sides = ['avanco', 'caso', 'avanco', 'caso', 'avanco', 'caso'] as const
  const kms = [120, 30, 8, 1240, 95.4, 12]
  it('grade estilo MapTap, 3 por linha', () => {
    expect(gridLines([...sides], kms)).toEqual([
      '🟩📍120 km 🟥📍30 km 🟩📍8 km',
      '🟥📍1.240 km 🟩📍95 km 🟥📍12 km',
    ])
    expect(fmtKm(0.4)).toBe('0 km')
  })
  it('texto com total e link na última linha, sem travessão', () => {
    const link = ondeLink('https://jogo.com.br/', '6', { vs: 812, ref: 'abc', s: 'wa' })
    expect(link).toBe('https://jogo.com.br/?o=6&vs=812&r=abc&s=wa')
    const t = shareText('6', [...sides], kms, 812, link)
    const lines = t.split('\n')
    expect(lines[0]).toBe('Onde Foi? #6 · 812/1.000')
    expect(lines.at(-1)).toBe(link)
    expect(t).not.toContain('—')
    const c = challengeText('6', 812, link)
    expect(c.split('\n').at(-1)).toBe(link)
    expect(c).not.toContain('—')
  })
})

describe('onde · geografia', () => {
  it('ida e volta grau ↔ pixel', () => {
    const p = { lon: -43.2, lat: -22.9 }
    const [x, y] = toXY(p, 128)
    const q = fromXY(x, y, 128)
    expect(q.lon).toBeCloseTo(p.lon, 6)
    expect(q.lat).toBeCloseTo(p.lat, 6)
  })
  it('o centro de cada UF cai na própria UF', () => {
    for (const u of UF_LIST) expect(ufNear(u.center), u.uf).toBe(u.uf)
  })
  it('cidades conhecidas caem no estado certo', () => {
    const cases: [number, number, string][] = [
      [-46.63, -23.55, 'SP'],
      [-43.94, -19.92, 'MG'],
      [-49.27, -25.43, 'PR'],
      [-34.88, -8.05, 'PE'],
      [-38.54, -3.72, 'CE'],
      [-60.02, -3.12, 'AM'],
      [-47.88, -15.79, 'DF'],
      [-49.25, -16.68, 'GO'],
      [-56.1, -15.6, 'MT'],
      [-54.62, -20.45, 'MS'],
      [-42.8, -5.09, 'PI'],
      [-44.3, -2.53, 'MA'],
      [-48.33, -10.18, 'TO'],
      [-63.9, -8.76, 'RO'],
      [-67.81, -9.97, 'AC'],
      [-60.67, 2.82, 'RR'],
      [-51.07, 0.03, 'AP'],
    ]
    for (const [lon, lat, uf] of cases) expect(ufNear({ lon, lat }), uf).toBe(uf)
  })
  it('pinos dentro do contorno caem na UF que o conteúdo diz', () => {
    for (const p of POOL) {
      if (!inBrazil(p.lng, p.lat)) continue
      expect(ufAt(pinPt(p)), p.id).toBe(p.uf)
    }
  })
  it('grade do mapa: terra no meio, mar no canto', () => {
    const L = 120
    const g = landGrid(L)
    const [cx, cy] = toXY({ lon: -50, lat: -12 }, L).map(Math.floor) as [number, number]
    expect(g[cy * L + cx]).toBeGreaterThan(0)
    expect(g[0]).toBe(0)
  })
})

describe('onde · store', () => {
  it('guarda e lê a partida pela semente', () => {
    localStorage.removeItem(ONDE_KEY)
    expect(getPlay('6')).toBeNull()
    savePlay('6', { ids: ['a'], s: [90], km: [40], g: [[-47.123456, -15.987654]] })
    const p = getPlay('6')
    expect(p?.s).toEqual([90])
    expect(p?.g[0]).toEqual([-47.12, -15.99])
  })
})
