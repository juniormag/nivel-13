// Contexto de chegada do Chuta Aí (?c=, ?d=, ?g=, ?s=) e ajudas de estado.
// O contexto vive na sessão: ir ao Papo de Almoço e voltar não perde o duelo nem o grupo.
import { create } from 'zustand'
import { dailyNumber, todayBR } from '../lib/time'
import { getSave } from '../state/save'
import { viralApi } from './api'
import { type DuelInfo, decodeDuel, isDuelCode, isGroupCode } from './duel'
import { dateForNumber } from './rounds'

export interface Landing {
  /** número do Chuta Aí que vai ser jogado */
  n: number
  date: string
  duel: DuelInfo | null
  group: string | null
  surface: string | null
}

const KEY = 'nivel13:chuta-landing'

function readSession(): Partial<Record<'c' | 'd' | 'g' | 's', string>> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeSession(v: Partial<Record<'c' | 'd' | 'g' | 's', string>>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* sem sessionStorage: vale só nesta tela */
  }
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

interface LandingState {
  landing: Landing | null
  /** lê URL + params da navegação uma vez; resolve código de duelo do backend quando houver */
  init(params: Record<string, unknown>): Landing
  clearDuel(): void
}

function build(raw: Partial<Record<'c' | 'd' | 'g' | 's', string>>, duel: DuelInfo | null): Landing {
  const today = todayBR()
  const todayN = dailyNumber(today)
  // O duelo fixa o número (mesmo de outro dia). Sem duelo, sempre o de hoje: link velho cai no jogo atual.
  const n = duel && duel.n >= 1 && duel.n <= todayN ? duel.n : todayN
  return {
    n,
    date: n === todayN ? today : dateForNumber(n),
    duel: duel && duel.n === n ? duel : null,
    group: isGroupCode(raw.g) ? (raw.g ?? null) : null,
    surface: raw.s ?? null,
  }
}

export const useLanding = create<LandingState>((set, get) => ({
  landing: null,
  init(params) {
    const q = new URLSearchParams(location.search)
    const fromUrl = {
      c: str(params.c) ?? q.get('c') ?? undefined,
      d: str(params.d) ?? q.get('d') ?? undefined,
      g: str(params.g) ?? q.get('g') ?? undefined,
      s: str(params.s) ?? q.get('s') ?? undefined,
    }
    const fresh = !!(fromUrl.c || fromUrl.d || fromUrl.g)
    const raw = fresh ? fromUrl : readSession()
    if (fresh) {
      writeSession(raw)
      // a URL já foi lida: limpa para um recarregar não reabrir o duelo por cima de outra tela
      try {
        history.replaceState(history.state, '', location.pathname)
      } catch {
        /* ignora */
      }
    }
    const prev = get().landing
    if (prev && !fresh) return prev
    const duel = decodeDuel(raw.d)
    const landing = build(raw, duel)
    set({ landing })
    if (duel) {
      const s = getSave()
      if (!s.duels.got.includes(duel.raw)) s.patch({ duels: { ...s.duels, got: [...s.duels.got, duel.raw] } })
    } else if (isDuelCode(raw.d)) {
      // código do backend: resolve em segundo plano; sem resposta, segue sem duelo
      void viralApi.duelo(raw.d ?? '').then((r) => {
        if (!r) return
        const info: DuelInfo = { n: r.n, s: r.s, name: r.name ?? '', raw: raw.d ?? '', code: raw.d ?? '' }
        set({ landing: build(raw, info) })
        const s = getSave()
        if (!s.duels.got.includes(info.raw))
          s.patch({ duels: { ...s.duels, got: [...s.duels.got, info.raw] } })
      })
    }
    return landing
  },
  clearDuel() {
    const l = get().landing
    const s = readSession()
    writeSession({ ...s, d: undefined, c: undefined })
    if (l) set({ landing: { ...l, duel: null, n: dailyNumber(), date: todayBR() } })
  },
}))

/** Grava a partida: hoje passa por recordChute (mantém a sequência); dia passado vai direto, sem sequência. */
export function storeResult(date: string, s: number[], guesses: (number | null)[]) {
  const save = getSave()
  if (save.chute[date]) return
  if (date === todayBR()) save.recordChute(date, s, guesses)
  else save.patch({ chute: { ...save.chute, [date]: { s, guesses } } })
}
