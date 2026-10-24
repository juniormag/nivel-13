// Pontuação do Chuta Aí (docs/VIRAL-DESIGN.md §2): nota por proximidade, 0–100 por rodada, pesos 2-2-3-3-3.
export const WEIGHTS = [2, 2, 3, 3, 3] as const
export const MAX_TOTAL = 100 * WEIGHTS.reduce((a, b) => a + b, 0)

export interface ScoreSpec {
  kind: 'number' | 'map' | 'choice'
  answer?: number
  scale?: 'lin' | 'log'
  /** lin: na unidade; log: razão (1,15 = ±15%) */
  tol?: number
  zero?: number
  target?: { lon: number; lat: number }
  tolKm?: number
  zeroKm?: number
  correct?: number
}

/** x: 0 = dentro da tolerância, 1 = longe demais. Piso de 5 para ninguém zerar. */
export const curve = (x: number) => (x <= 0 ? 100 : Math.max(5, Math.round(95 * (1 - Math.min(1, x)) ** 1.4)))

export function haversineKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const R = 6371
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLon = toR(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function roundScore(r: ScoreSpec, guess: number | { lon: number; lat: number } | null): number {
  if (guess === null) return 5
  switch (r.kind) {
    case 'number': {
      const g = guess as number
      const ans = r.answer ?? 0
      const tol = r.tol ?? 0
      const zero = r.zero ?? 1
      if (r.scale === 'log') {
        if (g <= 0 || ans <= 0) return 5
        const e = Math.abs(Math.log(g / ans))
        const lt = Math.log(Math.max(1.000001, tol))
        const lz = Math.log(Math.max(tol + 0.01, zero))
        return curve((e - lt) / (lz - lt))
      }
      const e = Math.abs(g - ans)
      return curve((e - tol) / Math.max(1e-9, zero - tol))
    }
    case 'map': {
      if (!r.target) return 5
      const km = haversineKm(guess as { lon: number; lat: number }, r.target)
      const tk = r.tolKm ?? 0
      return curve((km - tk) / Math.max(1, (r.zeroKm ?? 1000) - tk))
    }
    case 'choice':
      return guess === r.correct ? 100 : 5
  }
}

export const total = (s: number[]) => s.reduce((a, v, i) => a + v * (WEIGHTS[i] ?? 0), 0)
export const emoji = (s: number) => (s === 100 ? '🎯' : s >= 70 ? '🟩' : s >= 35 ? '🟨' : '🟥')
/** direção do erro para o "Brasil chutou": −10..10 (faixas de 10% do intervalo) */
export const bucket = (guess: number, answer: number, min: number, max: number) =>
  Math.max(-10, Math.min(10, Math.round(((guess - answer) / Math.max(1e-9, max - min)) * 20)))
