// Chuta Aí! (docs/VIRAL-DESIGN.md §5.3 e §5.5): chute do dia, Brasil chutou, Tira-teima (duelo),
// Placar do Grupo, apagar dados (LGPD) e contadores de eventos.
// Privacidade: nenhuma resposta leva id de aparelho; o placar do grupo nunca toca em `movimento`.
import type { Hono } from 'hono'
import { total } from '../../src/lib/score.ts'
import {
  type AppEnv,
  addDays,
  bad,
  creditRef,
  DAILY_EPOCH,
  dailyNumber,
  dayBR,
  deviceOk,
  type Env,
  getBody,
  inPlayWindow,
  ipOk,
  movKey,
  newCode,
  normCode,
  str,
  validBuckets,
  validDate,
  validId,
  validScores,
} from './core.ts'

/** Leituras por código (duelo, grupo): limite contra varredura. */
const CODE_READS_PER_MIN = 60
const READS_PER_MIN = 120
const DUELOS_PER_DAY = 20
const GRUPOS_POR_APARELHO = 10
const MEMBROS_POR_GRUPO = 50

/** Nomes gerados de grupo: bichos do Brasil, sem duplo sentido político nem ofensa. */
export const ANIMAIS = [
  'Capivara',
  'Arara',
  'Onça',
  'Tamanduá',
  'Tatu',
  'Sabiá',
  'Quati',
  'Mico',
  'Boto',
  'Peixe-boi',
  'Tartaruga',
  'Coruja',
  'Beija-flor',
  'Lobo-guará',
  'Ariranha',
  'Seriema',
  'Tuiuiú',
  'Pirarucu',
  'Saíra',
  'Bem-te-vi',
  'Jacaré',
  'Cutia',
  'Sagui',
  'Gralha',
]

/** Eventos aceitos em /api/ev (§5.5). */
export const EVENTS = new Set([
  'landing',
  'round_start',
  'round_lock',
  'source_open',
  'day_complete',
  'share_open',
  'share_done',
  'share_abort',
  'wa_text_click',
  'duel_create',
  'duel_land',
  'duel_complete',
  'group_create',
  'group_join',
  'group_post',
  'papo_open',
  'papo_concern',
  'papo_send',
  'plano_create',
  'streak_freeze',
  'jornada_from_daily',
  'fallback_shown',
  'save_click',
])
const EV_KEY = /^[a-z0-9_:.=+-]{0,24}$/
const SURFACE = /^[a-z0-9_]{1,16}$/

interface Via {
  s?: string
  d?: string
  g?: string
  v?: string
}
/** `via` é a origem da primeira partida ({ s, d, g, v } do link). Campos inválidos são ignorados. */
function parseVia(v: unknown): { via: Via; text: string | null } {
  const raw = (typeof v === 'string' ? { s: v } : v && typeof v === 'object' ? v : {}) as Record<
    string,
    unknown
  >
  const via: Via = {}
  const s = str(raw.s)
  if (SURFACE.test(s)) via.s = s
  const d = normCode(raw.d)
  if (d) via.d = d
  const g = normCode(raw.g)
  if (g) via.g = g
  if (raw.v === 'a' || raw.v === 'b') via.v = raw.v
  const text = Object.entries(via)
    .map(([k, x]) => `${k}=${x}`)
    .join('&')
  return { via, text: text || null }
}

const parseS = (s: string) => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? (v as number[]) : []
  } catch {
    return []
  }
}

/** Quem convidou: dono do duelo ou, no grupo, quem criou (primeiro membro). Nunca o próprio aparelho. */
async function inviter(env: Env, via: Via, id: string) {
  if (via.d) {
    const r = await env.DB.prepare('SELECT owner FROM duelo WHERE code = ?')
      .bind(via.d)
      .first<{ owner: string }>()
    if (r && r.owner !== id) return r.owner
  }
  if (via.g) {
    const r = await env.DB.prepare(
      'SELECT id FROM grupo_membro WHERE code = ? AND id != ? ORDER BY joined ASC LIMIT 1',
    )
      .bind(via.g, id)
      .first<{ id: string }>()
    if (r) return r.id
  }
  return null
}

async function insertWithCode(env: Env, sql: string, rest: unknown[]) {
  for (let i = 0; i < 6; i++) {
    const code = newCode()
    const r = await env.DB.prepare(sql)
      .bind(code, ...rest)
      .first<{ code: string }>()
    if (r) return r.code
  }
  throw new Error('sem código livre')
}

const nomeGrupo = () => {
  const a = new Uint32Array(2)
  crypto.getRandomValues(a)
  return `${ANIMAIS[(a[0] as number) % ANIMAIS.length]}-${10 + ((a[1] as number) % 90)}`
}

/** Sequência: dias seguidos com partida até `date` (ou até a véspera, se ainda não jogou hoje). */
function streakOf(days: Set<string>, date: string) {
  let d = days.has(date) ? date : addDays(date, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function viralRoutes(app: Hono<AppEnv>) {
  // ---------- Chuta Aí ----------
  app.post('/api/chute', async (c) => {
    const env = c.env
    const b = getBody(c)
    const s = validScores(b.s)
    const bk = validBuckets(b.b)
    const date = b.date
    if (!validId(b.id) || !validDate(date) || !inPlayWindow(date) || !s || !bk) return bad(c)
    const id = b.id
    const { via, text } = parseVia(b.via)
    const t = total(s)

    const before = await env.DB.prepare('SELECT 1 AS x FROM chute WHERE id = ? LIMIT 1').bind(id).first()
    const ins = await env.DB.prepare(
      'INSERT INTO chute (id, date, s, total, via) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id, date) DO NOTHING RETURNING total',
    )
      .bind(id, date, JSON.stringify(s), t, text)
      .first<{ total: number }>()

    let mine = t
    if (ins) {
      for (const [round, bucket] of bk.entries()) {
        if (bucket === null) continue
        await env.DB.prepare(
          `INSERT INTO chute_hist (date, round, bucket, n) VALUES (?, ?, ?, 1)
           ON CONFLICT(date, round, bucket) DO UPDATE SET n = n + 1`,
        )
          .bind(date, round, bucket)
          .run()
      }
      // primeira partida do aparelho, vinda de duelo ou grupo: conta como elo para quem convidou
      if (!before && (via.d || via.g)) {
        const ref = await inviter(env, via, id)
        if (ref) {
          await env.DB.prepare(
            `INSERT INTO players (id, ref, created) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET ref = COALESCE(players.ref, excluded.ref)`,
          )
            .bind(id, ref, Date.now())
            .run()
          await creditRef(env, id)
        }
      }
    } else {
      const row = await env.DB.prepare('SELECT total FROM chute WHERE id = ? AND date = ?')
        .bind(id, date)
        .first<{ total: number }>()
      mine = row?.total ?? t
    }

    const agg = await env.DB.prepare(
      'SELECT COUNT(*) AS n, SUM(total < ?) AS below FROM chute WHERE date = ?',
    )
      .bind(mine, date)
      .first<{ n: number; below: number | null }>()
    const plays = agg?.n ?? 1
    const pct = plays > 1 ? Math.round((100 * (agg?.below ?? 0)) / (plays - 1)) : 0
    return c.json({ ok: true, pct, plays, total: mine })
  })

  app.get('/api/chute/:date', async (c) => {
    const date = c.req.param('date')
    if (!validDate(date)) return c.json({ error: 'not found' }, 404)
    if (!(await ipOk(c, 'read', READS_PER_MIN))) return c.json({ error: 'devagar' }, 429)
    const db = c.env.DB
    const hist = Array.from({ length: 5 }, () => Array<number>(21).fill(0))
    const h = await db
      .prepare('SELECT round, bucket, n FROM chute_hist WHERE date = ?')
      .bind(date)
      .all<{ round: number; bucket: number; n: number }>()
    for (const r of h.results) {
      const row = hist[r.round]
      if (row && r.bucket >= -10 && r.bucket <= 10) row[r.bucket + 10] = r.n
    }
    const totals = Array<number>(14).fill(0)
    const t = await db
      .prepare('SELECT MIN(total / 100, 13) AS f, COUNT(*) AS n FROM chute WHERE date = ? GROUP BY f')
      .bind(date)
      .all<{ f: number; n: number }>()
    let plays = 0
    for (const r of t.results) {
      totals[r.f] = r.n
      plays += r.n
    }
    c.header('cache-control', 'public, max-age=60')
    return c.json({ plays, hist, totals })
  })

  // ---------- Tira-teima (duelo) ----------
  app.post('/api/duelo', async (c) => {
    const env = c.env
    const b = getBody(c)
    const s = validScores(b.s)
    const date = b.date
    if (!validId(b.id) || !validDate(date) || !s || date < DAILY_EPOCH || date > dayBR(1)) return bad(c)
    if (!(await deviceOk(env, 'duelo', b.id, DUELOS_PER_DAY)))
      return c.json({ ok: false, error: 'limite' }, 429)
    const code = await insertWithCode(
      env,
      `INSERT INTO duelo (code, owner, date, s, total, created) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO NOTHING RETURNING code`,
      [b.id, date, JSON.stringify(s), total(s), Date.now()],
    )
    return c.json({ code })
  })

  // antes de /:code, para "mine" não virar código
  app.get('/api/duelo/mine', async (c) => {
    const id = c.req.query('id')
    if (!validId(id)) return bad(c)
    if (!(await ipOk(c, 'code', CODE_READS_PER_MIN))) return c.json({ error: 'devagar' }, 429)
    const rows = await c.env.DB.prepare(
      `SELECT d.code AS code, d.accepts AS accepts, COALESCE(SUM(r.total < d.total), 0) AS wins
       FROM duelo d LEFT JOIN duelo_resp r ON r.code = d.code
       WHERE d.owner = ? GROUP BY d.code ORDER BY d.created DESC LIMIT 50`,
    )
      .bind(id)
      .all<{ code: string; accepts: number; wins: number }>()
    return c.json(rows.results.map((r) => ({ code: r.code, accepts: r.accepts, wins: r.wins })))
  })

  app.get('/api/duelo/:code', async (c) => {
    if (!(await ipOk(c, 'code', CODE_READS_PER_MIN))) return c.json({ error: 'devagar' }, 429)
    const code = normCode(c.req.param('code'))
    if (!code) return c.json({ error: 'not found' }, 404)
    const d = await c.env.DB.prepare(
      `SELECT d.date AS date, d.s AS s, d.total AS total, p.name AS name, p.avatar AS avatar
       FROM duelo d LEFT JOIN players p ON p.id = d.owner WHERE d.code = ?`,
    )
      .bind(code)
      .first<{ date: string; s: string; total: number; name: string | null; avatar: string | null }>()
    if (!d) return c.json({ error: 'not found' }, 404)
    return c.json({
      date: d.date,
      n: dailyNumber(d.date),
      s: parseS(d.s),
      total: d.total,
      name: d.name ?? '',
      avatar: d.avatar ?? 'coelho',
    })
  })

  app.post('/api/duelo/:code/resp', async (c) => {
    const env = c.env
    const b = getBody(c)
    const code = normCode(c.req.param('code'))
    const s = validScores(b.s)
    if (!validId(b.id) || !s) return bad(c)
    const d = code
      ? await env.DB.prepare('SELECT owner, s, total FROM duelo WHERE code = ?')
          .bind(code)
          .first<{ owner: string; s: string; total: number }>()
      : null
    if (!d) return c.json({ ok: false, error: 'not found' }, 404)
    if (d.owner === b.id) return bad(c, 'proprio')
    const ins = await env.DB.prepare(
      'INSERT INTO duelo_resp (code, id, s, total) VALUES (?, ?, ?, ?) ON CONFLICT(code, id) DO NOTHING RETURNING total',
    )
      .bind(code, b.id, JSON.stringify(s), total(s))
      .first<{ total: number }>()
    let mine = ins?.total
    if (ins) {
      await env.DB.prepare('UPDATE duelo SET accepts = accepts + 1 WHERE code = ?').bind(code).run()
    } else {
      const r = await env.DB.prepare('SELECT total FROM duelo_resp WHERE code = ? AND id = ?')
        .bind(code, b.id)
        .first<{ total: number }>()
      mine = r?.total
    }
    return c.json({ ok: true, them: { s: parseS(d.s), total: d.total }, me: { total: mine ?? total(s) } })
  })

  // ---------- Placar do Grupo ----------
  const memberships = async (env: Env, id: string) =>
    (
      await env.DB.prepare('SELECT COUNT(*) AS n FROM grupo_membro WHERE id = ?')
        .bind(id)
        .first<{ n: number }>()
    )?.n ?? 0

  app.post('/api/grupo', async (c) => {
    const env = c.env
    const b = getBody(c)
    if (!validId(b.id)) return bad(c)
    if (
      (await memberships(env, b.id)) >= GRUPOS_POR_APARELHO ||
      !(await deviceOk(env, 'grupo', b.id, GRUPOS_POR_APARELHO))
    )
      return c.json({ ok: false, error: 'limite' }, 429)
    const nome = nomeGrupo()
    const now = Date.now()
    const code = await insertWithCode(
      env,
      'INSERT INTO grupo (code, nome, created) VALUES (?, ?, ?) ON CONFLICT(code) DO NOTHING RETURNING code',
      [nome, now],
    )
    // quem cria entra (foi um toque explícito em "Criar placar do grupo")
    await env.DB.prepare('INSERT INTO grupo_membro (code, id, joined) VALUES (?, ?, ?)')
      .bind(code, b.id, now)
      .run()
    return c.json({ code, nome })
  })

  app.post('/api/grupo/:code/entrar', async (c) => {
    const env = c.env
    const b = getBody(c)
    const code = normCode(c.req.param('code'))
    if (!validId(b.id)) return bad(c)
    const g = code
      ? await env.DB.prepare('SELECT nome FROM grupo WHERE code = ?').bind(code).first<{ nome: string }>()
      : null
    if (!g) return c.json({ ok: false, error: 'not found' }, 404)
    const already = await env.DB.prepare('SELECT 1 AS x FROM grupo_membro WHERE code = ? AND id = ?')
      .bind(code, b.id)
      .first()
    if (already) return c.json({ ok: true, nome: g.nome })
    if ((await memberships(env, b.id)) >= GRUPOS_POR_APARELHO)
      return c.json({ ok: false, error: 'limite' }, 429)
    // um só comando: conta e insere juntos, para não passar de 50
    const ins = await env.DB.prepare(
      `INSERT INTO grupo_membro (code, id, joined)
       SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM grupo_membro WHERE code = ?) < ?
       ON CONFLICT(code, id) DO NOTHING RETURNING id`,
    )
      .bind(code, b.id, Date.now(), code, MEMBROS_POR_GRUPO)
      .first()
    if (!ins) return c.json({ ok: false, error: 'cheio' }, 409)
    return c.json({ ok: true, nome: g.nome })
  })

  app.post('/api/grupo/:code/sair', async (c) => {
    const env = c.env
    const b = getBody(c)
    const code = normCode(c.req.param('code'))
    if (!validId(b.id) || !code) return bad(c)
    await env.DB.prepare('DELETE FROM grupo_membro WHERE code = ? AND id = ?').bind(code, b.id).run()
    await env.DB.prepare(
      'DELETE FROM grupo WHERE code = ? AND NOT EXISTS (SELECT 1 FROM grupo_membro WHERE code = ?)',
    )
      .bind(code, code)
      .run()
    return c.json({ ok: true })
  })

  app.get('/api/grupo/:code', async (c) => {
    if (!(await ipOk(c, 'code', CODE_READS_PER_MIN))) return c.json({ error: 'devagar' }, 429)
    const db = c.env.DB
    const code = normCode(c.req.param('code'))
    const date = c.req.query('date') ?? dayBR()
    if (!validDate(date)) return bad(c)
    const g = code
      ? await db.prepare('SELECT nome FROM grupo WHERE code = ?').bind(code).first<{ nome: string }>()
      : null
    if (!g) return c.json({ error: 'not found' }, 404)

    // Só grupo_membro × players × chute. Nunca `movimento`, nunca UF.
    const members = await db
      .prepare(
        `SELECT m.id AS id, m.joined AS joined, p.name AS name, p.avatar AS avatar
         FROM grupo_membro m LEFT JOIN players p ON p.id = m.id WHERE m.code = ? ORDER BY m.joined ASC`,
      )
      .bind(code)
      .all<{ id: string; joined: number; name: string | null; avatar: string | null }>()
    const plays = await db
      .prepare(
        `SELECT c.id AS id, c.date AS date, c.total AS total
         FROM chute c JOIN grupo_membro m ON m.id = c.id AND m.code = ?
         WHERE c.date BETWEEN ? AND ?`,
      )
      .bind(code, addDays(date, -59), date)
      .all<{ id: string; date: string; total: number }>()

    const q = c.req.query('id')
    const meId = validId(q) && members.results.some((m) => m.id === q) ? q : null
    const weekFrom = addDays(date, -6)
    const byId = new Map<string, { days: Set<string>; hoje: number | null; semana: number; jogos: number }>()
    for (const m of members.results) byId.set(m.id, { days: new Set(), hoje: null, semana: 0, jogos: 0 })
    for (const p of plays.results) {
      const e = byId.get(p.id)
      if (!e) continue
      e.days.add(p.date)
      if (p.date === date) e.hoje = p.total
      if (p.date >= weekFrom) {
        e.semana += p.total
        e.jogos++
      }
    }
    const rows = members.results.map((m) => {
      const e = byId.get(m.id) as { days: Set<string>; hoje: number | null; semana: number; jogos: number }
      return {
        joined: m.joined,
        base: {
          name: m.name ?? '',
          avatar: m.avatar ?? 'coelho',
          streak: streakOf(e.days, date),
          me: m.id === meId,
        },
        hoje: e.hoje,
        semana: e.jogos ? e.semana : null,
      }
    })
    const rank = (k: 'hoje' | 'semana') =>
      rows
        .filter((r) => r[k] !== null)
        .sort((a, b) => (b[k] as number) - (a[k] as number) || a.joined - b.joined)
        .map((r) => ({
          name: r.base.name,
          avatar: r.base.avatar,
          total: r[k] as number,
          streak: r.base.streak,
          me: r.base.me,
        }))

    return c.json({
      nome: g.nome,
      date,
      n: dailyNumber(date),
      hoje: rank('hoje'),
      semana: rank('semana'),
      membros: rows.length,
    })
  })

  // ---------- LGPD: apagar tudo do aparelho ----------
  app.post('/api/apagar', async (c) => {
    const env = c.env
    const b = getBody(c)
    if (!validId(b.id)) return bad(c)
    const id = b.id
    const run = (sql: string, ...v: unknown[]) =>
      env.DB.prepare(sql)
        .bind(...v)
        .run()
    // recontagem dos duelos de outras pessoas que este aparelho respondeu
    const answered = await env.DB.prepare('SELECT code FROM duelo_resp WHERE id = ?')
      .bind(id)
      .all<{ code: string }>()
    await run('DELETE FROM duelo_resp WHERE id = ?', id)
    for (const r of answered.results) {
      await run(
        'UPDATE duelo SET accepts = (SELECT COUNT(*) FROM duelo_resp WHERE code = ?) WHERE code = ?',
        r.code,
        r.code,
      )
    }
    await run('DELETE FROM duelo_resp WHERE code IN (SELECT code FROM duelo WHERE owner = ?)', id)
    await run('DELETE FROM duelo WHERE owner = ?', id)
    await run('DELETE FROM grupo_membro WHERE id = ?', id)
    await run('DELETE FROM grupo WHERE NOT EXISTS (SELECT 1 FROM grupo_membro m WHERE m.code = grupo.code)')
    await run('DELETE FROM chute WHERE id = ?', id)
    await run('DELETE FROM likes WHERE id = ?', id)
    await run('DELETE FROM daily WHERE id = ?', id)
    await run('DELETE FROM movimento WHERE k = ?', await movKey(env, id))
    await run('UPDATE players SET ref = NULL WHERE ref = ?', id)
    await run('DELETE FROM players WHERE id = ?', id)
    return c.json({ ok: true })
  })

  // ---------- Eventos (contadores sem id) ----------
  app.post('/api/ev', async (c) => {
    const b = getBody(c)
    const e = str(b.e)
    const k = typeof b.k === 'number' && Number.isInteger(b.k) ? String(b.k) : (b.k ?? '')
    if (!EVENTS.has(e) || typeof k !== 'string' || !EV_KEY.test(k)) return bad(c)
    await c.env.DB.prepare(
      'INSERT INTO ev (day, e, k, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, e, k) DO UPDATE SET n = n + 1',
    )
      .bind(dayBR(), e, k)
      .run()
    return c.json({ ok: true })
  })
}
