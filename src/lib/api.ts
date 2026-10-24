// Cliente do placar (API em worker/src/index.ts). Se o backend não responder, o jogo segue funcionando só no aparelho.
// Toda chamada devolve null em caso de falha, sem lançar erro.
import { CONFIG } from '../config'
import { getSave, type Movimento } from '../state/save'

export interface Stats {
  players: number
  completions: number
  movimento: { vou: number; virei: number; pensando: number }
  byUf: { uf: string; vou: number; virei: number }[]
  corrente: { name: string; uf: string; count: number; me?: boolean }[]
  facts: { fact: string; likes: number }[]
  daily: { date: string; plays: number; avg: number } | null
  me: { corrente: number; rank: number | null } | null
}

async function req<T>(path: string, body?: unknown): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    const res = await fetch(`${CONFIG.apiBase}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const who = () => {
  const s = getSave()
  return { id: s.id, name: s.name, uf: s.uf, avatar: s.avatar, ref: s.ref }
}

export const api = {
  hello: () => req<{ ok: boolean }>('/hello', who()),
  complete: () => req<{ ok: boolean }>('/complete', who()),
  /** Devolve o total de curtidas do fato depois da sua. */
  like: (fact: string) => req<{ ok: boolean; likes: number }>('/like', { id: getSave().id, fact }),
  /** Anônimo: só id do aparelho (vira HMAC no servidor), UF e escolha. O apelido não vai junto. */
  movimento: (escolha: Movimento) =>
    req<{ ok: boolean }>('/movimento', { id: getSave().id, uf: getSave().uf, escolha }),
  daily: (date: string, score: number) => req<{ ok: boolean }>('/daily', { id: getSave().id, date, score }),
  stats: () => req<Stats>(`/stats?id=${encodeURIComponent(getSave().id)}`),
}
