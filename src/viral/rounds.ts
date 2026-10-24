// Rodadas do Chuta Aí: a fonte única é src/content/rounds.ts (dono: fact-checker).
// Aqui só filtramos para o MVP: nada com review !== 'ok' e nada de mapa (fica para depois).
// Quando o dia tem rodada de mapa, ela é trocada no mesmo lugar por outra rodada revisada do acervo.
import { CONFIG } from '../config'
import {
  type ChoiceRound,
  roundsFor as contentRoundsFor,
  type NumberRound,
  ROUNDS,
  type Round,
  roundById,
} from '../content/rounds'
import { hashStr } from '../lib/rng'

export type { ChoiceRound, NumberRound, Round }
export type PlayRound = NumberRound | ChoiceRound

const playable = (r: Round | undefined): r is PlayRound =>
  !!r && r.review === 'ok' && (r.kind === 'number' || r.kind === 'choice') && r.sources.length > 0

/** As 5 rodadas publicáveis do dia, na ordem dos pesos (2-2-3-3-3). */
export function roundsFor(date: string): PlayRound[] {
  let day: Round[] = []
  try {
    day = contentRoundsFor(date)
  } catch {
    day = []
  }
  const used = new Set(day.filter(playable).map((r) => r.id))
  const pool = ROUNDS.filter((r): r is PlayRound => playable(r) && !used.has(r.id))
  let k = hashStr(`chuta:${date}`) % Math.max(1, pool.length)
  const backfill = (wantChoice: boolean): PlayRound | undefined => {
    for (let tries = 0; tries < pool.length * 2; tries++) {
      const r = pool[k++ % pool.length]
      if (r && !used.has(r.id) && (tries >= pool.length || (r.kind === 'choice') === wantChoice)) {
        used.add(r.id)
        return r
      }
    }
    return undefined
  }
  const out: PlayRound[] = []
  for (let i = 0; i < 5; i++) {
    const r = day[i]
    const pick = playable(r) ? r : backfill(i === 4)
    if (pick) out.push(pick)
  }
  return out
}

/** Rodada publicável pelo id, só com review === 'ok' (o Papo de Almoço usa os mesmos fatos). */
export function verifiedRound(id: string): PlayRound | undefined {
  const r = roundById(id)
  return playable(r) ? r : undefined
}

/** Data (AAAA-MM-DD) do Chuta Aí número n. */
export function dateForNumber(n: number) {
  const t = Date.parse(`${CONFIG.dailyEpoch}T12:00:00Z`) + (n - 1) * 86400000
  return new Date(t).toISOString().slice(0, 10)
}
