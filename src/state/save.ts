// Progresso do jogador, persistido no aparelho (zustand + localStorage com tolerância a falhas).
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CONFIG } from '../config'
import { hashStr } from '../lib/rng'

export type Avatar = 'coelho' | 'onca' | 'arara' | 'capivara'
export type Movimento = 'vou' | 'virei' | 'pensando'

export interface SaveData {
  id: string
  name: string
  avatar: Avatar
  uf: string
  ref: string | null
  onboarded: boolean
  /** estrelas por fase (0 = não jogada); índice 0 = fase 1 */
  stars: number[]
  best: number[]
  cards: string[]
  liked: string[]
  daily: { last: string; streak: number; results: Record<string, string> }
  irMonthly: number | null
  movimento: Movimento | null
  muted: boolean
  finishedAt: number | null
  sharedMoments: string[]
}

interface SaveActions {
  patch(p: Partial<SaveData>): void
  completeLevel(n: number, stars: number, score: number, facts: string[]): { firstTime: boolean }
  like(fact: string): boolean
  recordDaily(date: string, grid: string): void
  reset(): void
}

function newId() {
  const a = new Uint8Array(9)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12)
}

const fresh = (): SaveData => ({
  id: newId(),
  name: '',
  avatar: 'coelho',
  uf: '',
  ref: null,
  onboarded: false,
  stars: Array(13).fill(0),
  best: Array(13).fill(0),
  cards: [],
  liked: [],
  daily: { last: '', streak: 0, results: {} },
  irMonthly: null,
  movimento: null,
  muted: false,
  finishedAt: null,
  sharedMoments: [],
})

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__n13'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const useSave = create<SaveData & SaveActions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      patch: (p) => set(p),
      completeLevel(n, stars, score, facts) {
        const s = get()
        const prev = s.stars[n - 1] ?? 0
        const nextStars = s.stars.slice()
        nextStars[n - 1] = Math.max(prev, stars)
        const best = s.best.slice()
        best[n - 1] = Math.max(best[n - 1] ?? 0, score)
        const cards = [...s.cards, ...facts.filter((f) => !s.cards.includes(f))]
        set({ stars: nextStars, best, cards })
        return { firstTime: prev === 0 && stars > 0 }
      },
      like(fact) {
        const s = get()
        if (s.liked.includes(fact)) return false
        set({ liked: [...s.liked, fact] })
        return true
      },
      recordDaily(date, grid) {
        const s = get()
        const y = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() - 86400000))
        set({
          daily: {
            last: date,
            streak: s.daily.last === y ? s.daily.streak + 1 : 1,
            results: { ...s.daily.results, [date]: grid },
          },
        })
      },
      reset: () => set(fresh()),
    }),
    { name: 'nivel13:v2', storage: safeStorage, version: 2 },
  ),
)

export const getSave = () => useSave.getState()

// Indicação: ?r=<id> na primeira visita registra quem convidou.
{
  const r = new URLSearchParams(location.search).get('r')
  const s = getSave()
  if (r && /^[a-z0-9]{6,16}$/.test(r) && r !== s.id && !s.ref) s.patch({ ref: r })
}

export const levelsDone = (s: SaveData = getSave()) => s.stars.filter((x) => x > 0).length
export const currentLevel = (s: SaveData = getSave()) => Math.min(13, levelsDone(s) + 1)
export const XP_MAX = 13000
export const xpTotal = (s: SaveData = getSave()) =>
  Math.min(XP_MAX, s.stars.reduce((a, x) => a + (x > 0 ? 500 + x * 166 : 0), 0) + Object.keys(s.daily.results).length * 40)

export interface Stats {
  fatos: number
  memoria: number
  coragem: number
  democracia: number
}
export function stats(s: SaveData = getSave()): Stats {
  const done = levelsDone(s)
  const stars = s.stars.reduce((a, b) => a + b, 0)
  const cap = (n: number) => Math.max(8, Math.min(99, Math.round(n)))
  return {
    fatos: cap(12 + s.cards.length * 4.2 + Object.keys(s.daily.results).length * 3),
    memoria: cap(10 + done * 5 + (s.stars[8] ?? 0) * 4 + (s.stars[7] ?? 0) * 3),
    coragem: cap(14 + stars * 2.1 + (s.stars[12] ?? 0) * 6),
    democracia: cap(9 + done * 4 + (s.movimento ? 22 : 0) + (s.stars[6] ?? 0) * 3),
  }
}

export const shareLink = (s: SaveData = getSave()) => `${CONFIG.siteUrl}/?r=${s.id}`
export const seedFromId = () => hashStr(getSave().id)
