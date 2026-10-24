// Partidas do Onde Foi? guardadas só no aparelho (chave 'nivel13:onde'). Nada vai para o servidor.
export const ONDE_KEY = 'nivel13:onde'
const KEEP = 30

export interface OndePlay {
  ids: string[]
  /** nota 0..100 de cada pino */
  s: number[]
  km: number[]
  /** palpite [lon, lat] de cada pino, 2 casas */
  g: [number, number][]
  at: number
}

interface OndeData {
  v: 1
  plays: Record<string, OndePlay>
}

function load(): OndeData {
  try {
    const raw = localStorage.getItem(ONDE_KEY)
    if (!raw) return { v: 1, plays: {} }
    const d = JSON.parse(raw) as Partial<OndeData>
    return { v: 1, plays: d && typeof d.plays === 'object' && d.plays ? d.plays : {} }
  } catch {
    return { v: 1, plays: {} }
  }
}

const valid = (p: unknown): p is OndePlay => {
  const o = p as OndePlay
  return (
    !!o &&
    Array.isArray(o.ids) &&
    Array.isArray(o.s) &&
    Array.isArray(o.km) &&
    Array.isArray(o.g) &&
    o.ids.length === o.s.length &&
    o.s.length === o.km.length &&
    o.km.length === o.g.length
  )
}

export function getPlay(seed: string): OndePlay | null {
  const p = load().plays[seed]
  return valid(p) ? p : null
}

export function savePlay(seed: string, play: Omit<OndePlay, 'at'>) {
  const d = load()
  d.plays[seed] = {
    ...play,
    g: play.g.map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100]),
    at: Date.now(),
  }
  const keys = Object.keys(d.plays).sort((a, b) => (d.plays[b]?.at ?? 0) - (d.plays[a]?.at ?? 0))
  for (const k of keys.slice(KEEP)) delete d.plays[k]
  try {
    localStorage.setItem(ONDE_KEY, JSON.stringify(d))
  } catch {
    /* sem armazenamento: a partida segue, só não fica guardada */
  }
}
