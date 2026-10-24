// Cliente do placar (API em worker/src/index.ts). Se o backend não responder, o jogo segue funcionando só no aparelho.
// Toda chamada devolve null em caso de falha, sem lançar erro.
import { CONFIG } from '../config'
import { type Avatar, getSave, type Movimento } from '../state/save'

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

/** `errors`: devolve também o corpo JSON de respostas 4xx (por exemplo `{ ok: false, error: 'cheio' }`). */
async function req<T>(path: string, body?: unknown, opts: { errors?: boolean } = {}): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    const res = await fetch(`${CONFIG.apiBase}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    if (!res.ok && !(opts.errors && res.status < 500)) return null
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

// ===================== Chuta Aí! (docs/VIRAL-DESIGN.md §5.3) =====================

/** 5 notas de 0 a 100, na ordem dos pesos 2-2-3-3-3. O total é recalculado no servidor. */
export type Notas = number[]
/** Origem da primeira partida (parâmetros do link). */
export interface ChuteVia {
  s?: string
  d?: string
  g?: string
  v?: 'a' | 'b'
}
export interface ChuteResult {
  ok: boolean
  /** melhor que pct% de quem jogou o mesmo dia (0 quando é a primeira partida do dia) */
  pct: number
  plays: number
  total: number
}
export interface ChuteDia {
  plays: number
  /** hist[rodada][faixa + 10]: quantos chutaram em cada faixa de erro (−10..10) */
  hist: number[][]
  /** totals[f]: quantos fizeram de f×100 a f×100+99 pontos (f = 0..13) */
  totals: number[]
}
export interface Duelo {
  date: string
  /** número do Chuta Aí daquele dia */
  n: number
  s: Notas
  total: number
  /** apelido de quem desafiou ('' se não tem) */
  name: string
  avatar: Avatar
}
export interface DueloResposta {
  ok: boolean
  them: { s: Notas; total: number }
  me: { total: number }
}
export interface MeuDuelo {
  code: string
  accepts: number
  /** quantas respostas o dono venceu */
  wins: number
}
export interface GrupoLinha {
  name: string
  avatar: Avatar
  total: number
  streak: number
  me: boolean
}
export interface GrupoPlacar {
  /** nome gerado, por exemplo "Capivara-47" (a tela escreve "Grupo Capivara-47") */
  nome: string
  date: string
  n: number
  /** só quem jogou no dia, do maior para o menor */
  hoje: GrupoLinha[]
  /** soma dos últimos 7 dias (até `date`) */
  semana: GrupoLinha[]
  membros: number
}
export type GrupoErro = { ok: false; error: 'cheio' | 'limite' | 'not found' }
export type Evento =
  | 'landing'
  | 'round_start'
  | 'round_lock'
  | 'source_open'
  | 'day_complete'
  | 'share_open'
  | 'share_done'
  | 'share_abort'
  | 'wa_text_click'
  | 'duel_create'
  | 'duel_land'
  | 'duel_complete'
  | 'group_create'
  | 'group_join'
  | 'group_post'
  | 'papo_open'
  | 'papo_concern'
  | 'papo_send'
  | 'plano_create'
  | 'streak_freeze'
  | 'jornada_from_daily'
  | 'install'

const myId = () => getSave().id
/** Duelo e grupo mostram o apelido guardado no servidor: sincroniza antes. */
const withHello = async <T>(p: () => Promise<T>) => {
  await req('/hello', who())
  return p()
}
const enc = encodeURIComponent

export const chute = {
  /** Envia a partida do dia (1 por aparelho e dia; repetir devolve a primeira). `b`: faixa de erro por rodada, ou null. */
  post: (date: string, s: Notas, b?: (number | null)[], via?: ChuteVia) =>
    req<ChuteResult>('/chute', { id: myId(), date, s, b, via }),
  /** "Brasil chutou" do dia (cache público de 60 s). */
  get: (date: string) => req<ChuteDia>(`/chute/${enc(date)}`),
}

export const duelo = {
  /** Cria o Tira-teima com as suas notas do dia e devolve o código de 6 letras. */
  create: (date: string, s: Notas) =>
    withHello(() => req<{ code: string }>('/duelo', { id: myId(), date, s })),
  get: (code: string) => req<Duelo>(`/duelo/${enc(code)}`),
  /** Responde ao duelo (1 vez por aparelho; o dono não responde ao próprio). */
  resp: (code: string, s: Notas) => req<DueloResposta>(`/duelo/${enc(code)}/resp`, { id: myId(), s }),
  /** Seus duelos: aceites e vitórias. */
  mine: () => req<MeuDuelo[]>(`/duelo/mine?id=${enc(myId())}`),
}

export const grupo = {
  /** Cria o placar do grupo (nome gerado) e já entra nele. */
  create: () =>
    withHello(() =>
      req<{ code: string; nome: string } | GrupoErro>('/grupo', { id: myId() }, { errors: true }),
    ),
  /** Só depois de toque explícito em "Entrar no placar". Erros: 'cheio' (50), 'limite' (10 grupos), 'not found'. */
  join: (code: string) =>
    withHello(() =>
      req<{ ok: true; nome: string } | GrupoErro>(
        `/grupo/${enc(code)}/entrar`,
        { id: myId() },
        { errors: true },
      ),
    ),
  leave: (code: string) => req<{ ok: boolean }>(`/grupo/${enc(code)}/sair`, { id: myId() }),
  /** Placar de hoje e da semana. `date` padrão: hoje no servidor. */
  board: (code: string, date?: string) =>
    req<GrupoPlacar>(`/grupo/${enc(code)}?id=${enc(myId())}${date ? `&date=${enc(date)}` : ''}`),
}

/** LGPD: apaga no servidor tudo o que é deste aparelho. Depois, zere o save local (`getSave().reset()`). */
export const apagar = () => req<{ ok: boolean }>('/apagar', { id: myId() })

/** Contador de evento, sem id. Não espera resposta (sendBeacon quando existe). */
export function ev(e: Evento, k?: string | number) {
  const body = JSON.stringify(k === undefined ? { e } : { e, k })
  try {
    // text/plain não dispara preflight de CORS; o servidor lê o JSON do texto
    if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(`${CONFIG.apiBase}/ev`, body)) return
  } catch {}
  void req('/ev', JSON.parse(body))
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
  chute,
  duelo,
  grupo,
  apagar,
  ev,
}
