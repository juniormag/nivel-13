// Preferências de conforto (docs/research/x-craft.md §2, regras 7 e 13). Ficam no aparelho em
// localStorage 'nivel13:prefs' e o motor pode ler com getPrefs() ou usePrefs.
import { create } from 'zustand'

export interface Prefs {
  /** tremor de tela: 0 desliga, 1 é o normal */
  shake: number
  /** clarões de tela inteira */
  flashes: boolean
  /** vibração (navigator.vibrate) */
  haptics: boolean
}

const KEY = 'nivel13:prefs'
const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function load(): Prefs {
  const base: Prefs = { shake: reduced() ? 0 : 1, flashes: !reduced(), haptics: true }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Prefs>
    return {
      shake: typeof p.shake === 'number' ? Math.max(0, Math.min(1, p.shake)) : base.shake,
      flashes: typeof p.flashes === 'boolean' ? p.flashes : base.flashes,
      haptics: typeof p.haptics === 'boolean' ? p.haptics : base.haptics,
    }
  } catch {
    return base
  }
}

export const usePrefs = create<Prefs>(() => load())

export const getPrefs = () => usePrefs.getState()

export function setPrefs(p: Partial<Prefs>) {
  usePrefs.setState(p)
  try {
    localStorage.setItem(KEY, JSON.stringify(usePrefs.getState()))
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

/** Padrões de vibração (Android/Chrome). Nunca passam de 100 ms em eventos de interface. */
export const HAPTICS = {
  move: 8,
  confirm: 12,
  success: [15, 40, 25],
  error: [30, 50, 30],
  levelup: [20, 40, 20, 40, 60],
  damage: [40],
} as const satisfies Record<string, number | readonly number[]>

export type Haptic = keyof typeof HAPTICS

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function haptic(kind: Haptic) {
  if (!getPrefs().haptics || !canVibrate()) return
  try {
    const p = HAPTICS[kind]
    navigator.vibrate(typeof p === 'number' ? p : [...p])
  } catch {
    /* alguns navegadores bloqueiam sem gesto */
  }
}
