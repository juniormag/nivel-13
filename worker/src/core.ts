// Tipos, validação e utilitários compartilhados pelas rotas da API.
import type { Context } from 'hono'

export interface D1Stmt {
  bind(...v: unknown[]): D1Stmt
  run(): Promise<unknown>
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}
/** Só o pedaço do D1 que a API usa; o adaptador de `server/d1-sqlite.mjs` tem a mesma forma. */
export interface D1Like {
  prepare(sql: string): D1Stmt
}
export interface Env {
  DB: D1Like
  /** Segredo do HMAC (wrangler secret put SALT). */
  SALT?: string
  /** Origem do site, ou lista separada por vírgula. Vazio ou "*" libera qualquer origem (só em dev). */
  ALLOWED_ORIGIN?: string
  /** Pedidos de escrita por minuto por IP. Padrão 40. */
  RATE_PER_MIN?: string
  /** URL pública do site, sem barra no fim. Usada por /c/:n (redirecionamento e og:image). */
  SITE_URL?: string
  /** Responsável legal pela peça, repetido no og:description de /c/:n. */
  RESPONSAVEL?: string
  /** Quando o cron apaga tudo (ISO 8601). Padrão 2026-11-30T00:00:00-03:00. */
  PURGE_AT?: string
}

export type AppEnv = { Bindings: Env; Variables: { body: Record<string, unknown> } }
export type C = Context<AppEnv>

export const ID = /^[a-z0-9]{6,16}$/
export const DATE = /^\d{4}-\d{2}-\d{2}$/
/** Alfabeto dos códigos de duelo e grupo: sem 0/O, 1/I/L. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/
export const MAX_BODY = 2048
const BLOCK = /(bolsominion|gado|petralha|ladr[aã]o|merda|porra|caralho|puta|fdp|viado|nazi)/i

export const str = (v: unknown) => (typeof v === 'string' ? v : '')
export const validId = (v: unknown): v is string => typeof v === 'string' && ID.test(v)
export const bad = (c: C, error?: string) => c.json(error ? { ok: false, error } : { ok: false }, 400)
export const getBody = (c: C) => c.get('body') ?? {}

export function cleanName(v: unknown) {
  const s = String(v ?? '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 16)
  return BLOCK.test(s) ? '' : s
}

/** Normaliza um código (maiúsculas) e devolve '' se não for válido. */
export const normCode = (v: unknown) => {
  const s = str(v).toUpperCase()
  return CODE.test(s) ? s : ''
}

/** Código aleatório de 6 caracteres, sem viés de módulo. */
export function newCode() {
  const out: string[] = []
  const buf = new Uint8Array(16)
  while (out.length < 6) {
    crypto.getRandomValues(buf)
    for (const b of buf) {
      // 248 = 31 × 8: descarta o resto para a distribuição ficar uniforme
      if (b < 248 && out.length < 6) out.push(CODE_ALPHABET[b % 31] as string)
    }
  }
  return out.join('')
}

const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
/** Data em Brasília (AAAA-MM-DD), com deslocamento opcional em dias. */
export const dayBR = (offsetDays = 0) => fmtDay.format(new Date(Date.now() + offsetDays * 86400000))

/** Soma dias a uma data AAAA-MM-DD (calendário puro, sem fuso). */
export function addDays(date: string, n: number) {
  const t = Date.parse(`${date}T12:00:00Z`) + n * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

/** Data válida no calendário (rejeita 2026-02-31). */
export const validDate = (v: unknown): v is string =>
  typeof v === 'string' &&
  DATE.test(v) &&
  Number.isFinite(Date.parse(`${v}T12:00:00Z`)) &&
  addDays(v, 0) === v

/** Janela aceita para resultados do dia: até 2 dias atrás (quem jogou sem rede) e amanhã (fuso). */
export const inPlayWindow = (date: string) => [-2, -1, 0, 1].some((d) => dayBR(d) === date)

/** Número do Chuta Aí / Desafio do Dia: 2026-10-20 é o nº 1 (mesma conta de `src/lib/time.ts`). */
export const DAILY_EPOCH = '2026-10-20'
export function dailyNumber(date: string) {
  const a = Date.parse(`${DAILY_EPOCH}T12:00:00Z`)
  const b = Date.parse(`${date}T12:00:00Z`)
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}
export const dateOfNumber = (n: number) => addDays(DAILY_EPOCH, n - 1)

const keys = new Map<string, Promise<CryptoKey>>()
export async function hmac(env: Env, s: string) {
  const salt = env.SALT || 'dev-salt'
  let key = keys.get(salt)
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(salt),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    keys.set(salt, key)
  }
  const sig = await crypto.subtle.sign('HMAC', await key, new TextEncoder().encode(s))
  return Array.from(new Uint8Array(sig).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Chave do movimento: HMAC do id do aparelho (nunca o id em claro). */
export const movKey = (env: Env, id: string) => hmac(env, `mov:${id}`)

/** Contador com limite, guardado na tabela `rate` (limpa sozinha a cada dia). */
export async function bump(env: Env, key: string, limit: number) {
  const day = dayBR()
  const row = await env.DB.prepare(
    'INSERT INTO rate (k, n, day) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n',
  )
    .bind(key, day)
    .first<{ n: number }>()
  if (Math.random() < 0.01) await env.DB.prepare('DELETE FROM rate WHERE day < ?').bind(day).run()
  return (row?.n ?? 0) <= limit
}

export function clientIp(c: C) {
  return c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
}

/** Limite por IP e por minuto. O IP nunca é gravado: a chave é um HMAC dele. */
export async function ipOk(c: C, bucket: string, limit: number) {
  const minute = Math.floor(Date.now() / 60000)
  return bump(c.env, `${bucket}:${await hmac(c.env, `ip:${clientIp(c)}`)}:${minute}`, limit)
}

/** Limite por aparelho e por dia (o id entra só como HMAC na chave). */
export async function deviceOk(env: Env, bucket: string, id: string, limit: number) {
  return bump(env, `${bucket}:${await hmac(env, `dev:${id}`)}:${dayBR()}`, limit)
}

export async function readBody(c: C): Promise<Record<string, unknown> | null> {
  const len = Number(c.req.header('content-length') ?? 0)
  if (len > MAX_BODY) return null
  const text = await c.req.text().catch(() => '')
  if (text.length > MAX_BODY) return null
  try {
    const v: unknown = text ? JSON.parse(text) : {}
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** 5 notas inteiras de 0 a 100 (ordem dos pesos 2-2-3-3-3). */
export function validScores(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length !== 5) return null
  for (const x of v) if (!Number.isInteger(x) || x < 0 || x > 100) return null
  return v as number[]
}

/** 5 faixas inteiras de −10 a 10, ou null na rodada sem faixa (mapa, escolha). */
export function validBuckets(v: unknown): (number | null)[] | null {
  if (v === undefined || v === null) return [null, null, null, null, null]
  if (!Array.isArray(v) || v.length !== 5) return null
  for (const x of v) if (x !== null && (!Number.isInteger(x) || x < -10 || x > 10)) return null
  return v as (number | null)[]
}

/** Credita a corrente de quem convidou: só na primeira conclusão do aparelho e até 300 por dia por corrente. */
export async function creditRef(env: Env, id: string) {
  const p = await env.DB.prepare(
    'UPDATE players SET completed = 1 WHERE id = ? AND completed = 0 RETURNING ref',
  )
    .bind(id)
    .first<{ ref: string | null }>()
  if (p?.ref && (await bump(env, `ref:${p.ref}:${dayBR()}`, 300))) {
    await env.DB.prepare('UPDATE players SET corrente = corrente + 1 WHERE id = ?').bind(p.ref).run()
  }
}

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  )
