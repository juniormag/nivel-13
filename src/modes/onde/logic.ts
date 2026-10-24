// Regras do Onde Foi? (docs/MODOS-NOVOS.md §2): semente, sorteio dos 6 pinos, pontos pela distância e
// textos de share no estilo MapTap. Funções puras: testadas em tests/onde.test.ts.
import type { Pin } from '../../content/onde'
import { hashStr, mulberry32, shuffle } from '../../lib/rng'
import { curve, haversineKm } from '../../lib/score'
import { dailyNumber } from '../../lib/time'
import type { Pt } from './geo'

export const PINS_PER_GAME = 6
/** Pesos das 6 rodadas: somam 10, então o máximo é 1.000 (como os pesos 2-2-3-3-3 do Chuta Aí). */
export const ONDE_WEIGHTS = [1, 1, 2, 2, 2, 2] as const
export const ONDE_MAX = 100 * ONDE_WEIGHTS.reduce((a, b) => a + b, 0)
/** Nota cheia até 25 km (a cidade); cai até o piso em 1.500 km. */
export const TOL_KM = 25
export const ZERO_KM = 1500

export const pinPt = (p: Pin): Pt => ({ lon: p.lng, lat: p.lat })

export const distanceKm = (a: Pt, b: Pt) => haversineKm(a, b)

/** 0..100 (piso 5) pela distância. */
export const pinPoints = (km: number) => curve((km - TOL_KM) / (ZERO_KM - TOL_KM))

export const weightOf = (i: number) => ONDE_WEIGHTS[i] ?? 1

export const ondeTotal = (s: number[]) => s.reduce((a, v, i) => a + v * weightOf(i), 0)

/** Pino publicável: revisado, com fonte e coordenada válida. */
export function playable(p: Pin) {
  return (
    p.review === 'ok' &&
    p.sources.length > 0 &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 40 &&
    p.lng < -30 &&
    p.lng > -80
  )
}

// ---------------------------------------------------------------- semente

const SEED_RE = /^[a-z0-9]{1,12}$/

export function normSeed(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const s = String(raw).trim().toLowerCase()
  return SEED_RE.test(s) ? s : null
}

/** Semente do dia: o número do dia (o mesmo #N do Chuta Aí). */
export const dailySeed = (date?: string) => String(dailyNumber(date))

const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'
export function randomSeed(rnd: () => number = Math.random) {
  let s = ''
  for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(rnd() * ALPHA.length)] ?? 'a'
  // nunca só algarismos: isso é semente do dia
  return /^\d+$/.test(s) ? `x${s.slice(1)}` : s
}

export const isDaily = (seed: string) => /^\d+$/.test(seed)

/** "#6" no dia, "#K7Q2P" numa partida avulsa. */
export const seedLabel = (seed: string) => `#${isDaily(seed) ? seed : seed.toUpperCase()}`

/**
 * Os 6 pinos da semente, alternando avanço e caso (começa no verde). Evita repetir UF enquanto der.
 * A mesma semente com o mesmo acervo dá sempre a mesma partida.
 */
export function pickPins(seed: string, pool: Pin[], n = PINS_PER_GAME): Pin[] {
  const rnd = mulberry32(hashStr(`onde:${seed}`))
  const sorted = pool.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const green = shuffle(
    sorted.filter((p) => p.side === 'avanco'),
    rnd,
  )
  const red = shuffle(
    sorted.filter((p) => p.side === 'caso'),
    rnd,
  )
  const used = new Set<string>()
  const ufs = new Set<string>()
  const take = (list: Pin[]) => {
    const fresh = list.find((p) => !used.has(p.id) && !ufs.has(p.uf))
    const any = fresh ?? list.find((p) => !used.has(p.id))
    if (any) {
      used.add(any.id)
      ufs.add(any.uf)
    }
    return any
  }
  const out: Pin[] = []
  for (let i = 0; i < n; i++) {
    const want = i % 2 === 0 ? green : red
    const other = i % 2 === 0 ? red : green
    const p = take(want) ?? take(other)
    if (!p) break
    out.push(p)
  }
  return out
}

// ---------------------------------------------------------------- textos

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
export const fmtInt = (n: number) => nf.format(Math.round(n))
export const fmtKm = (km: number) => `${fmtInt(Math.max(0, km))} km`

export const sideEmoji = (side: Pin['side']) => (side === 'avanco' ? '🟩' : '🟥')
export const sideLabel = (side: Pin['side']) => (side === 'avanco' ? 'Avanço' : 'Caso')

/** Linhas da grade: 3 pinos por linha, "🟩📍120 km". */
export function gridLines(sides: Pin['side'][], kms: number[]) {
  const cells = sides.map((s, i) => `${sideEmoji(s)}📍${fmtKm(kms[i] ?? 0)}`)
  const lines: string[] = []
  for (let i = 0; i < cells.length; i += 3) lines.push(cells.slice(i, i + 3).join(' '))
  return lines
}

export function ondeLink(base: string, seed: string, opts: { vs?: number; ref?: string; s?: string } = {}) {
  const q = new URLSearchParams()
  q.set('o', seed)
  if (opts.vs !== undefined) q.set('vs', String(Math.round(opts.vs)))
  if (opts.ref) q.set('r', opts.ref)
  if (opts.s) q.set('s', opts.s)
  return `${base.replace(/\/$/, '')}/?${q.toString()}`
}

/** Texto principal (grade estilo MapTap). URL sempre na última linha para gerar o preview. */
export function shareText(seed: string, sides: Pin['side'][], kms: number[], total: number, link: string) {
  return [
    `Onde Foi? ${seedLabel(seed)} · ${fmtInt(total)}/${fmtInt(ONDE_MAX)}`,
    ...gridLines(sides, kms),
    link,
  ].join('\n')
}

/** Desafio: mesma semente, mesmos 6 pinos. */
export function challengeText(seed: string, total: number, link: string) {
  return [
    `Onde Foi? ${seedLabel(seed)} · fiz ${fmtInt(total)} de ${fmtInt(ONDE_MAX)} 📍`,
    'Mesmo mapa, mesmos 6 pinos. Faz melhor que eu?',
    link,
  ].join('\n')
}

/** Frase curta do resultado da rodada. */
export function verdict(km: number) {
  if (km <= TOL_KM) return 'Na mosca!'
  if (km <= 150) return 'Pertinho!'
  if (km <= 450) return 'Perto'
  if (km <= 900) return 'Meio longe'
  return 'Longe'
}
