// API do placar: Hono em Cloudflare Workers + D1. A mesma app roda em Node (server/dev-api.mjs).
// Sem dados pessoais: id aleatório do aparelho, apelido opcional, UF opcional.
// A escolha do movimento é guardada sob HMAC do id do aparelho, sem apelido (LGPD, art. 11).
// Rotas do Chuta Aí em ./viral.ts, página de preview /c/:n em ./og.ts.
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  type AppEnv,
  bad,
  type C,
  cleanName,
  creditRef,
  dayBR,
  type Env,
  getBody,
  ID,
  inPlayWindow,
  ipOk,
  movKey,
  readBody,
  str,
  validDate,
  validId,
} from './core.ts'
import { ogRoutes } from './og.ts'
import { viralRoutes } from './viral.ts'

export type { D1Like, D1Stmt, Env } from './core.ts'
export { addDays, cleanName, dailyNumber, dayBR } from './core.ts'

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
const STATS_PER_MIN = 120

const pickUf = (v: unknown) => (typeof v === 'string' && UFS.has(v) ? v : '')

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

export const app = new Hono<AppEnv>()

app.use('*', async (c, next) => {
  await next()
  // no-store em tudo, salvo rota que pediu cache público (Brasil chutou, /c/:n)
  if (!c.res.headers.has('cache-control')) c.header('cache-control', 'no-store')
  c.header('x-content-type-options', 'nosniff')
})

app.use(
  '/api/*',
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

// Limite por IP em toda escrita. Lê o corpo (até 2 KB) uma vez e guarda para a rota.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const limit = Number(c.env.RATE_PER_MIN) || 40
  if (!(await ipOk(c, 'ip', limit))) return c.json({ error: 'devagar' }, 429)
  const b = await readBody(c)
  if (!b) return c.json({ error: 'grande demais' }, 413)
  c.set('body', b)
  return next()
})

app.get('/api/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
  return c.json({ ok: row?.ok === 1, day: dayBR() })
})

app.post('/api/hello', async (c) => {
  const id = await upsertPlayer(c.env, getBody(c))
  return id ? c.json({ ok: true }) : bad(c)
})

app.post('/api/complete', async (c) => {
  const id = await upsertPlayer(c.env, getBody(c))
  if (!id) return bad(c)
  // Só a primeira conclusão de cada aparelho conta para a corrente de quem convidou.
  await creditRef(c.env, id)
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
    .bind(await movKey(c.env, b.id), pickUf(b.uf), escolha, Date.now())
    .run()
  return c.json({ ok: true })
})

app.post('/api/daily', async (c) => {
  const b = getBody(c)
  const date = b.date
  const score = typeof b.score === 'number' ? b.score : Number.NaN
  // aceita de 2 dias atrás (quem jogou sem rede) até amanhã (fuso); score de 0 a 5
  if (!validId(b.id) || !validDate(date) || !inPlayWindow(date) || !(score >= 0 && score <= 5)) return bad(c)
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

viralRoutes(app)
ogRoutes(app)

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'erro interno' }, 500)
})

// ---------- Expurgo (cron) ----------
export const PURGE_AT_DEFAULT = '2026-11-30T00:00:00-03:00'
export const TABLES = [
  'players',
  'movimento',
  'likes',
  'daily',
  'rate',
  'chute',
  'chute_hist',
  'duelo',
  'duelo_resp',
  'grupo',
  'grupo_membro',
  'ev',
] as const

/** Apaga todas as linhas de todas as tabelas. */
export async function purgeAll(env: Env) {
  for (const t of TABLES) await env.DB.prepare(`DELETE FROM ${t}`).run()
}

/** Cron diário (wrangler.toml [triggers]): a partir de 30/11/2026 apaga tudo; antes disso só limpa `rate`. */
export async function scheduled(env: Env, now = Date.now()) {
  const at = Date.parse(env.PURGE_AT || PURGE_AT_DEFAULT)
  if (Number.isFinite(at) && now >= at) {
    await purgeAll(env)
    return 'purged'
  }
  await env.DB.prepare('DELETE FROM rate WHERE day < ?').bind(dayBR()).run()
  return 'kept'
}

/** Handlers do Worker. O arquivo de entrada é ./worker.ts: o workerd trata todo export nomeado
 *  da entrada como entrypoint, então os exports deste módulo (app, utilitários) ficam fora dela. */
export const handlers = {
  fetch: app.fetch,
  scheduled: (event: { scheduledTime?: number }, env: Env) =>
    scheduled(env, event?.scheduledTime ?? Date.now()),
}
