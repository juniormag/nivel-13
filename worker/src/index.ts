// API do placar: Hono em Cloudflare Workers + D1. A mesma app roda em Node (server/dev-api.mjs).
// Sem dados pessoais: id aleatório do aparelho, apelido opcional, UF opcional.
// A escolha do movimento é guardada sob HMAC do id do aparelho, sem apelido (LGPD, art. 11).
import { type Context, Hono } from 'hono'
import { cors } from 'hono/cors'

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
  /** Pedidos por minuto por IP. Padrão 40. */
  RATE_PER_MIN?: string
}

type AppEnv = { Bindings: Env; Variables: { body: Record<string, unknown> } }
type C = Context<AppEnv>

export const UFS = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '),
)
export const FACTS = new Set([
  'fome',
  'checagem',
  'ir',
  'floresta',
  'emprego',
  'pedemeia',
  'oitodejaneiro',
  'julgamento',
  'rachadinha',
  'mansao',
  'joias',
  'soberania',
  'farmacia',
  'virada',
])
const AVATARS = new Set(['coelho', 'onca', 'arara', 'capivara'])
const ESCOLHAS = new Set(['vou', 'virei', 'pensando'])
const ID = /^[a-z0-9]{6,16}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const BLOCK = /(bolsominion|gado|petralha|ladr[aã]o|merda|porra|caralho|puta|fdp|viado|nazi)/i
const MAX_BODY = 2048
/** Cada corrente ganha no máximo isto de elos por dia. */
const REF_PER_DAY = 300
const STATS_PER_MIN = 120

const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
/** Data em Brasília (AAAA-MM-DD), com deslocamento opcional em dias. */
export const dayBR = (offsetDays = 0) => fmtDay.format(new Date(Date.now() + offsetDays * 86400000))

export function cleanName(v: unknown) {
  const s = String(v ?? '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 16)
  return BLOCK.test(s) ? '' : s
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const validId = (v: unknown): v is string => typeof v === 'string' && ID.test(v)
const pickUf = (v: unknown) => (typeof v === 'string' && UFS.has(v) ? v : '')

const keys = new Map<string, Promise<CryptoKey>>()
async function hmac(env: Env, s: string) {
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

async function bump(env: Env, key: string, limit: number) {
  const day = dayBR()
  const row = await env.DB.prepare(
    'INSERT INTO rate (k, n, day) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n',
  )
    .bind(key, day)
    .first<{ n: number }>()
  if (Math.random() < 0.01) await env.DB.prepare('DELETE FROM rate WHERE day < ?').bind(day).run()
  return (row?.n ?? 0) <= limit
}

function clientIp(c: C) {
  return c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
}

/** Limite por IP e por minuto. O IP nunca é gravado: a chave é um HMAC dele. */
async function ipOk(c: C, bucket: string, limit: number) {
  const minute = Math.floor(Date.now() / 60000)
  return bump(c.env, `${bucket}:${await hmac(c.env, `ip:${clientIp(c)}`)}:${minute}`, limit)
}

async function body(c: C): Promise<Record<string, unknown> | null> {
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

async function upsertPlayer(env: Env, b: Record<string, unknown>) {
  const id = b.id
  if (!validId(id)) return null
  const avatar = typeof b.avatar === 'string' && AVATARS.has(b.avatar) ? b.avatar : 'coelho'
  const ref = validId(b.ref) && b.ref !== id ? b.ref : null
  await env.DB.prepare(
    `INSERT INTO players (id, name, uf, avatar, ref, created) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, uf = excluded.uf, avatar = excluded.avatar,
       ref = COALESCE(players.ref, excluded.ref)`,
  )
    .bind(id, cleanName(b.name), pickUf(b.uf), avatar, ref, Date.now())
    .run()
  return id
}

const bad = (c: C) => c.json({ ok: false }, 400)

export const app = new Hono<AppEnv>()

app.use('*', async (c, next) => {
  await next()
  c.header('cache-control', 'no-store')
  c.header('x-content-type-options', 'nosniff')
})

app.use(
  '*',
  cors({
    origin: (origin, c: C) => {
      const list = (c.env.ALLOWED_ORIGIN ?? '')
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean)
      if (!list.length || list.includes('*')) return '*'
      return list.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['content-type'],
    maxAge: 86400,
  }),
)

// Limite por IP em toda escrita. Lê o corpo uma vez e guarda para a rota.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const limit = Number(c.env.RATE_PER_MIN) || 40
  if (!(await ipOk(c, 'ip', limit))) return c.json({ error: 'devagar' }, 429)
  const b = await body(c)
  if (!b) return c.json({ error: 'grande demais' }, 413)
  c.set('body', b)
  return next()
})

const getBody = (c: C) => c.get('body') ?? {}

app.get('/api/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
  return c.json({ ok: row?.ok === 1, day: dayBR() })
})

app.post('/api/hello', async (c) => {
  const id = await upsertPlayer(c.env, getBody(c))
  return id ? c.json({ ok: true }) : bad(c)
})

app.post('/api/complete', async (c) => {
  const env = c.env
  const id = await upsertPlayer(env, getBody(c))
  if (!id) return bad(c)
  // Só a primeira conclusão de cada aparelho conta para a corrente de quem convidou.
  const p = await env.DB.prepare(
    'UPDATE players SET completed = 1 WHERE id = ? AND completed = 0 RETURNING ref',
  )
    .bind(id)
    .first<{ ref: string | null }>()
  if (p?.ref && (await bump(env, `ref:${p.ref}:${dayBR()}`, REF_PER_DAY))) {
    await env.DB.prepare('UPDATE players SET corrente = corrente + 1 WHERE id = ?').bind(p.ref).run()
  }
  return c.json({ ok: true })
})

app.post('/api/like', async (c) => {
  const b = getBody(c)
  const fact = str(b.fact)
  if (!validId(b.id) || !FACTS.has(fact)) return bad(c)
  await c.env.DB.prepare('INSERT OR IGNORE INTO likes (id, fact) VALUES (?, ?)').bind(b.id, fact).run()
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE fact = ?')
    .bind(fact)
    .first<{ n: number }>()
  return c.json({ ok: true, likes: row?.n ?? 0 })
})

app.post('/api/movimento', async (c) => {
  const b = getBody(c)
  const escolha = str(b.escolha)
  if (!validId(b.id) || !ESCOLHAS.has(escolha)) return bad(c)
  await c.env.DB.prepare(
    `INSERT INTO movimento (k, uf, escolha, updated) VALUES (?, ?, ?, ?)
     ON CONFLICT(k) DO UPDATE SET uf = excluded.uf, escolha = excluded.escolha, updated = excluded.updated`,
  )
    .bind(await hmac(c.env, `mov:${b.id}`), pickUf(b.uf), escolha, Date.now())
    .run()
  return c.json({ ok: true })
})

app.post('/api/daily', async (c) => {
  const b = getBody(c)
  const date = str(b.date)
  const score = typeof b.score === 'number' ? b.score : Number.NaN
  // aceita ontem, hoje e amanhã (fuso do aparelho); score de 0 a 5
  const days = [dayBR(-1), dayBR(), dayBR(1)]
  if (!validId(b.id) || !DATE.test(date) || !days.includes(date) || !(score >= 0 && score <= 5)) return bad(c)
  await c.env.DB.prepare('INSERT OR IGNORE INTO daily (id, date, score) VALUES (?, ?, ?)')
    .bind(b.id, date, Math.round(score))
    .run()
  return c.json({ ok: true })
})

app.get('/api/stats', async (c) => {
  if (!(await ipOk(c, 'stats', STATS_PER_MIN))) return c.json({ error: 'devagar' }, 429)
  const db = c.env.DB
  const me = c.req.query('id') ?? ''
  const players = await db
    .prepare('SELECT COUNT(*) AS n, SUM(completed) AS c FROM players')
    .first<{ n: number; c: number | null }>()
  const mov = await db
    .prepare('SELECT escolha, COUNT(*) AS n FROM movimento GROUP BY escolha')
    .all<{ escolha: string; n: number }>()
  const byUf = await db
    .prepare(
      `SELECT uf, SUM(escolha = 'vou') AS vou, SUM(escolha = 'virei') AS virei FROM movimento
       WHERE uf != '' AND escolha != 'pensando' GROUP BY uf ORDER BY (vou + virei) DESC, virei DESC`,
    )
    .all<{ uf: string; vou: number; virei: number }>()
  const corrente = await db
    .prepare(
      'SELECT id, name, uf, corrente AS count FROM players WHERE corrente > 0 ORDER BY corrente DESC, created ASC LIMIT 20',
    )
    .all<{ id: string; name: string; uf: string; count: number }>()
  const facts = await db
    .prepare('SELECT fact, COUNT(*) AS likes FROM likes GROUP BY fact ORDER BY likes DESC')
    .all<{ fact: string; likes: number }>()
  const d = dayBR()
  const daily = await db
    .prepare('SELECT COUNT(*) AS plays, AVG(score) AS avg FROM daily WHERE date = ?')
    .bind(d)
    .first<{ plays: number; avg: number | null }>()

  let mine: { corrente: number; rank: number | null } | null = null
  if (ID.test(me)) {
    const row = await db
      .prepare('SELECT corrente FROM players WHERE id = ?')
      .bind(me)
      .first<{ corrente: number }>()
    const n = row?.corrente ?? 0
    const above =
      n > 0
        ? await db
            .prepare('SELECT COUNT(*) AS n FROM players WHERE corrente > ?')
            .bind(n)
            .first<{ n: number }>()
        : null
    mine = { corrente: n, rank: n > 0 ? (above?.n ?? 0) + 1 : null }
  }
  const m = { vou: 0, virei: 0, pensando: 0 }
  for (const r of mov.results) if (r.escolha in m) m[r.escolha as keyof typeof m] = r.n

  return c.json({
    players: players?.n ?? 0,
    completions: players?.c ?? 0,
    movimento: m,
    byUf: byUf.results,
    // o id nunca sai da API: só apelido, UF, contagem e se é você
    corrente: corrente.results.map((r) => ({ name: r.name, uf: r.uf, count: r.count, me: r.id === me })),
    facts: facts.results,
    daily: { date: d, plays: daily?.plays ?? 0, avg: daily?.avg ?? 0 },
    me: mine,
  })
})

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'erro interno' }, 500)
})

export default app
