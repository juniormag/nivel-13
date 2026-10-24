// Progresso do Convence o Tio, só no aparelho (chave 'nivel13:tio'). Nada disso vai ao servidor:
// nem o parente escolhido, nem as respostas (docs/MODOS-NOVOS.md §3).
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ParenteId } from '../../content/tio'

interface TioState {
  /** parentes já convencidos (selo na escolha) */
  convinced: ParenteId[]
  /** melhor número de respostas boas por parente */
  best: Partial<Record<ParenteId, number>>
  record(id: ParenteId, good: number, win: boolean): void
}

const safe = createJSONStorage(() => {
  try {
    const k = '__nivel13_tio_probe'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const m = new Map<string, string>()
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    }
  }
})

export const useTio = create<TioState>()(
  persist(
    (set, get) => ({
      convinced: [],
      best: {},
      record(id, good, win) {
        const s = get()
        set({
          convinced: win && !s.convinced.includes(id) ? [...s.convinced, id] : s.convinced,
          best: { ...s.best, [id]: Math.max(s.best[id] ?? 0, good) },
        })
      },
    }),
    {
      name: 'nivel13:tio',
      storage: safe,
      version: 1,
      partialize: (s) => ({ convinced: s.convinced, best: s.best }),
    },
  ),
)
