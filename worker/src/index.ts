// API do placar: Cloudflare Worker + D1. Também roda em Node para desenvolvimento (server/dev-api.mjs).
// Sem dados pessoais: id aleatório do aparelho, apelido opcional, UF opcional.

interface D1Stmt {
  bind(...v: unknown[]): D1Stmt
  run(): Promise<unknown>
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}
export interface Env {
  DB: { prepare(sql: string): D1Stmt }
  SALT?: string
  ALLOWED_ORIGIN?: string
}

const UFS = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '),
)
const FACTS = new Set([
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
const BLOCK = /(bolsominion|gado|petralha|ladr[aã]o|merda|porra|caralho|puta|fdp|viado|nazi)/i

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

function cleanName(v: unknown) {
  const s = String(v ?? '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 16)
  return BLOCK.test(s) ? '' : s
}

async function hmac(env: Env, s: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.SALT ?? 'dev-salt'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(s))
  return Array.from(new Uint8Array(sig).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function rateOk(env: Env, key: string, limit: number) {
  const day = today()
  const row = await env.DB.prepare(
    'INSERT INTO rate (k, n, day) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n',
  )
    .bind(key, day)
    .first<{ n: number }>()
  if (Math.random() < 0.01) await env.DB.prepare('DELETE FROM rate WHERE day < ?').bind(day).run()
  return (row?.n ?? 0) <= limit
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
    },
  })
}

async function upsertPlayer(env: Env, b: Record<string, unknown>) {
  const id = String(b.id ?? '')
  if (!ID.test(id)) return null
  const uf = UFS.has(String(b.uf)) ? String(b.uf) : ''
  const avatar = AVATARS.has(String(b.avatar)) ? String(b.avatar) : 'coelho'
  const ref = ID.test(String(b.ref ?? '')) && b.ref !== id ? String(b.ref) : null
  await env.DB.prepare(
    `INSERT INTO players (id, name, uf, avatar, ref, created) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, uf = excluded.uf, avatar = excluded.avatar, ref = COALESCE(players.ref, excluded.ref)`,
  )
    .bind(id, cleanName(b.name), uf, avatar, ref, Date.now())
    .run()
  return id
}

export async function handle(req: Request, env: Env): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN ?? '*'
  if (req.method === 'OPTIONS') return json({}, 204, origin)
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '')
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'local'

  try {
    if (req.method === 'GET' && path === '/stats') {
      const me = url.searchParams.get('id') ?? ''
      const players = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(completed) AS c FROM players').first<{
        n: number
        c: number | null
      }>()
      const mov = await env.DB.prepare('SELECT escolha, COUNT(*) AS n FROM movimento GROUP BY escolha').all<{
        escolha: string
        n: number
      }>()
      const byUf = await env.DB.prepare(
        `SELECT uf, SUM(escolha = 'vou') AS vou, SUM(escolha = 'virei') AS virei FROM movimento
         WHERE uf != '' AND escolha != 'pensando' GROUP BY uf ORDER BY (vou + virei) DESC, virei DESC`,
      ).all<{ uf: string; vou: number; virei: number }>()
      const corrente = await env.DB.prepare(
        'SELECT id, name, uf, corrente AS count FROM players WHERE corrente > 0 ORDER BY corrente DESC, created ASC LIMIT 20',
      ).all<{
        id: string
        name: string
        uf: string
        count: number
      }>()
      const facts = await env.DB.prepare(
        'SELECT fact, COUNT(*) AS likes FROM likes GROUP BY fact ORDER BY likes DESC',
      ).all<{ fact: string; likes: number }>()
      const d = today()
      const daily = await env.DB.prepare(
        'SELECT COUNT(*) AS plays, AVG(score) AS avg FROM daily WHERE date = ?',
      )
        .bind(d)
        .first<{ plays: number; avg: number | null }>()
      let mine: { corrente: number; rank: number | null } | null = null
      if (ID.test(me)) {
        const row = await env.DB.prepare('SELECT corrente FROM players WHERE id = ?')
          .bind(me)
          .first<{ corrente: number }>()
        const c = row?.corrente ?? 0
        const above =
          c > 0
            ? await env.DB.prepare('SELECT COUNT(*) AS n FROM players WHERE corrente > ?')
                .bind(c)
                .first<{ n: number }>()
            : null
        mine = { corrente: c, rank: c > 0 ? (above?.n ?? 0) + 1 : null }
      }
      const m = { vou: 0, virei: 0, pensando: 0 } as Record<string, number>
      for (const r of mov.results) m[r.escolha] = r.n
      return json(
        {
          players: players?.n ?? 0,
          completions: players?.c ?? 0,
          movimento: m,
          byUf: byUf.results,
          corrente: corrente.results.map((r) => ({
            name: r.name,
            uf: r.uf,
            count: r.count,
            me: r.id === me,
          })),
          facts: facts.results,
          daily: { date: d, plays: daily?.plays ?? 0, avg: daily?.avg ?? 0 },
          me: mine,
        },
        200,
        origin,
      )
    }

    if (req.method !== 'POST') return json({ error: 'not found' }, 404, origin)
    if (!(await rateOk(env, `ip:${await hmac(env, ip)}:${Math.floor(Date.now() / 60000)}`, 40)))
      return json({ error: 'devagar' }, 429, origin)
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>

    if (path === '/hello') {
      const id = await upsertPlayer(env, b)
      return json({ ok: !!id }, id ? 200 : 400, origin)
    }

    if (path === '/complete') {
      const id = await upsertPlayer(env, b)
      if (!id) return json({ ok: false }, 400, origin)
      const p = await env.DB.prepare(
        'UPDATE players SET completed = 1 WHERE id = ? AND completed = 0 RETURNING ref',
      )
        .bind(id)
        .first<{ ref: string | null }>()
      // só a primeira conclusão conta, e cada corrente ganha no máximo 300 elos por dia
      if (p?.ref && (await rateOk(env, `ref:${p.ref}:${today()}`, 300))) {
        await env.DB.prepare('UPDATE players SET corrente = corrente + 1 WHERE id = ?').bind(p.ref).run()
      }
      return json({ ok: true }, 200, origin)
    }

    if (path === '/like') {
      const id = String(b.id ?? '')
      const fact = String(b.fact ?? '')
      if (!ID.test(id) || !FACTS.has(fact)) return json({ ok: false }, 400, origin)
      await env.DB.prepare('INSERT OR IGNORE INTO likes (id, fact) VALUES (?, ?)').bind(id, fact).run()
      return json({ ok: true }, 200, origin)
    }

    if (path === '/movimento') {
      const id = String(b.id ?? '')
      const escolha = String(b.escolha ?? '')
      if (!ID.test(id) || !ESCOLHAS.has(escolha)) return json({ ok: false }, 400, origin)
      const uf = UFS.has(String(b.uf)) ? String(b.uf) : ''
      await env.DB.prepare(
        'INSERT INTO movimento (k, uf, escolha, updated) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET uf = excluded.uf, escolha = excluded.escolha, updated = excluded.updated',
      )
        .bind(await hmac(env, `mov:${id}`), uf, escolha, Date.now())
        .run()
      return json({ ok: true }, 200, origin)
    }

    if (path === '/daily') {
      const id = String(b.id ?? '')
      const date = String(b.date ?? '')
      const score = Number(b.score)
      if (!ID.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(score >= 0 && score <= 5))
        return json({ ok: false }, 400, origin)
      await env.DB.prepare('INSERT OR IGNORE INTO daily (id, date, score) VALUES (?, ?, ?)')
        .bind(id, date, Math.round(score))
        .run()
      return json({ ok: true }, 200, origin)
    }

    return json({ error: 'not found' }, 404, origin)
  } catch (err) {
    console.error(err)
    return json({ error: 'erro interno' }, 500, origin)
  }
}

export default { fetch: handle }
