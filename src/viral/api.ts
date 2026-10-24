// Adaptador do Chuta Aí sobre o cliente tipado de src/lib/api.ts (dono: backend). Tudo falha em silêncio:
// sem backend, o jogo segue inteiro no aparelho e as partes sociais só se escondem.
import {
  type ChuteVia,
  chute,
  duelo,
  type Evento,
  type GrupoLinha,
  type GrupoPlacar,
  grupo,
  ev as rawEv,
} from '../lib/api'

export type { ChuteVia }

const isNumArr = (a: unknown, len?: number): a is number[] =>
  Array.isArray(a) && (len === undefined || a.length === len) && a.every((x) => typeof x === 'number')

export interface ChuteStats {
  plays: number
  /** 5 rodadas × 21 faixas (−10..10) */
  hist: number[][]
  /** 14 faixas de 100 pontos (0..1.300) */
  totals: number[]
}

export type GroupRow = GrupoLinha
export interface GroupBoard extends Omit<GrupoPlacar, 'nome'> {
  /** já com "Grupo " na frente */
  nome: string
}

/** Percentil só aparece com gente suficiente para não ser "melhor que 0%" na primeira partida. */
const MIN_PLAYS = 10

const board = (b: GrupoPlacar | null): GroupBoard | null =>
  b && typeof b.nome === 'string'
    ? {
        ...b,
        nome: `Grupo ${b.nome}`,
        hoje: Array.isArray(b.hoje) ? b.hoje : [],
        semana: Array.isArray(b.semana) ? b.semana : [],
      }
    : null

export const viralApi = {
  /** Grava a partida (1 por aparelho e dia; o total é recalculado no servidor). Devolve o percentil. */
  async chute(date: string, s: number[], b: number[], via?: ChuteVia) {
    const r = await chute.post(date, s, b, via)
    return r?.ok && typeof r.pct === 'number' && (r.plays ?? 0) >= MIN_PLAYS ? { pct: r.pct } : null
  },

  async stats(date: string): Promise<ChuteStats | null> {
    const r = await chute.get(date)
    if (!r || typeof r.plays !== 'number') return null
    const hist = Array.isArray(r.hist) && r.hist.every((h) => isNumArr(h, 21)) ? r.hist : []
    return { plays: r.plays, hist, totals: isNumArr(r.totals) ? r.totals : [] }
  },

  async duelo(code: string) {
    const r = await duelo.get(code)
    return r && typeof r.n === 'number' && isNumArr(r.s, 5) ? r : null
  },

  /** Código de 6 letras do servidor para o seu resultado do dia (guardado no aparelho: 1 por dia). */
  async duelCode(date: string, s: number[]) {
    const key = `nivel13:duelo:${date}`
    try {
      const hit = localStorage.getItem(key)
      if (hit) return hit
    } catch {
      /* sem armazenamento */
    }
    const r = await duelo.create(date, s)
    if (!r?.code) return null
    try {
      localStorage.setItem(key, r.code)
    } catch {
      /* ignora */
    }
    return r.code
  },

  respond: (code: string, s: number[]) => duelo.resp(code, s),

  grupo: async (code: string, date?: string) => board(await grupo.board(code, date)),

  async criarGrupo() {
    const r = await grupo.create()
    return r && 'code' in r ? { code: r.code, nome: `Grupo ${r.nome}` } : r && 'error' in r ? { error: r.error } : null
  },

  async entrar(code: string) {
    const r = await grupo.join(code)
    return r && r.ok ? { ok: true as const, nome: `Grupo ${r.nome}` } : r && 'error' in r ? { error: r.error } : null
  },

  async sair(code: string) {
    return !!(await grupo.leave(code))?.ok
  },
}

/** Contador agregado sem id (§5.5). Dispara e esquece. */
export function ev(e: Evento, k?: string | number) {
  try {
    rawEv(e, k)
  } catch {
    /* nunca atrapalha o jogo */
  }
}

/** Percentil a partir das 14 faixas de total, quando a API não devolveu o do POST. */
export function pctFromTotals(totals: number[], total: number) {
  const all = totals.reduce((a, b) => a + b, 0)
  if (all < MIN_PLAYS) return null
  const k = Math.min(13, Math.floor(total / 100))
  let below = 0
  for (let i = 0; i < k; i++) below += totals[i] ?? 0
  return Math.round((below / all) * 100)
}

export const GROUP_ERROR: Record<string, string> = {
  cheio: 'Esse placar já tem 50 pessoas.',
  limite: 'Você já está em 10 placares. Saia de um para entrar neste.',
  'not found': 'Esse placar não existe mais.',
}
