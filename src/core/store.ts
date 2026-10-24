import { CONFIG } from '../config'
import { hashStr } from './rng'

export type Avatar = 'coelho' | 'onca' | 'arara' | 'capivara'
export type Movimento = 'vou' | 'virei' | 'pensando'

export interface Save {
  v: 1
  id: string
  name: string
  avatar: Avatar
  uf: string
  ref: string | null
  onboarded: boolean
  /** Estrelas por fase (0 = não jogada). Índice 0 = fase 1. */
  stars: number[]
  xp: number
  cards: string[]
  liked: string[]
  daily: { last: string; streak: number; results: Record<string, string> }
  irMonthly: number | null
  movimento: Movimento | null
  muted: boolean
  finishedAt: number | null
  skillsUsed: number
}

const KEY = 'nivel13:v1'

function newId() {
  const a = new Uint8Array(9)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12)
}

function fresh(): Save {
  return {
    v: 1,
    id: newId(),
    name: '',
    avatar: 'coelho',
    uf: '',
    ref: null,
    onboarded: false,
    stars: Array(13).fill(0),
    xp: 0,
    cards: [],
    liked: [],
    daily: { last: '', streak: 0, results: {} },
    irMonthly: null,
    movimento: null,
    muted: false,
    finishedAt: null,
    skillsUsed: 0,
  }
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = { ...fresh(), ...(JSON.parse(raw) as Partial<Save>) } as Save
      if (!Array.isArray(s.stars) || s.stars.length !== 13) s.stars = Array(13).fill(0)
      return s
    }
  } catch {
    /* armazenamento indisponível: segue em memória */
  }
  return fresh()
}

export const save: Save = load()
const listeners = new Set<() => void>()

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    /* modo privado ou cota cheia */
  }
  for (const l of listeners) l()
}
export function onSave(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Indicação: ?r=<id> na primeira visita vira a corrente de quem convidou.
{
  const r = new URLSearchParams(location.search).get('r')
  if (r && /^[a-z0-9]{6,16}$/.test(r) && r !== save.id && !save.ref) {
    save.ref = r
    persist()
  }
}

export const levelsDone = () => save.stars.filter((s) => s > 0).length
export const currentLevel = () => Math.min(13, levelsDone() + 1)
export const XP_MAX = 13000
export const xpTotal = () =>
  Math.min(
    XP_MAX,
    save.stars.reduce((a, s) => a + (s > 0 ? 500 + s * 166 : 0), 0) +
      Object.keys(save.daily.results).length * 40,
  )

export interface Stats {
  fatos: number
  memoria: number
  coragem: number
  democracia: number
}

/** Atributos do HUD: crescem com fases, cartas e compromisso de voto. */
export function stats(): Stats {
  const done = levelsDone()
  const stars = save.stars.reduce((a, b) => a + b, 0)
  const cards = save.cards.length
  const cap = (n: number) => Math.max(8, Math.min(99, Math.round(n)))
  return {
    fatos: cap(12 + cards * 4.2 + Object.keys(save.daily.results).length * 3),
    memoria: cap(10 + done * 5 + (save.stars[8] ?? 0) * 4 + (save.stars[7] ?? 0) * 3),
    coragem: cap(14 + stars * 2.1 + (save.stars[12] ?? 0) * 6),
    democracia: cap(9 + done * 4 + (save.movimento ? 22 : 0) + (save.stars[6] ?? 0) * 3),
  }
}

export const shareLink = () => `${CONFIG.siteUrl}/?r=${save.id}`
export const seedFromId = () => hashStr(save.id)
