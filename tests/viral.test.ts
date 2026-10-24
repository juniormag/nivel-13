// Chuta Aí! (docs/VIRAL-DESIGN.md §5.3 e §5.5): chute, Brasil chutou, duelo, grupo, apagar, eventos, /c/:n e expurgo.
// Toda resposta passa por noIds(): nenhum id de aparelho pode sair da API.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openD1 } from '../server/d1-sqlite.mjs'
import { total as scoreTotal } from '../src/lib/score'
import { addDays, app, dayBR, type Env, purgeAll, scheduled, TABLES } from '../worker/src/index.ts'

const A = 'devaaa111'
const B = 'devbbb222'
const C3 = 'devccc333'
const D = 'devddd444'
const IDS = [A, B, C3, D]
const S1 = [100, 80, 60, 40, 20] // 2·180 + 3·120 = 720
const S2 = [50, 50, 50, 50, 50] // 650
const S3 = [100, 100, 100, 100, 100] // 1300

let env: Env
let db: ReturnType<typeof openD1>['db']
let ipSeq = 0
let ip = ''

beforeEach(() => {
  const o = openD1(':memory:')
  db = o.db
  env = { DB: o.D1, SALT: 'test-salt', ALLOWED_ORIGIN: '*', RATE_PER_MIN: '1000' }
  ip = `10.1.0.${++ipSeq}`
})
afterEach(() => {
  db.close()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const headers = (h: Record<string, string> = {}) => ({ 'x-forwarded-for': ip, ...h })
const post = (path: string, body: unknown) =>
  app.request(
    path,
    {
      method: 'POST',
      headers: headers({ 'content-type': 'application/json' }),
      body: JSON.stringify(body),
    },
    env,
  )
const get = (path: string) => app.request(path, { headers: headers() }, env)

/** Lê o corpo e garante que nenhum id de aparelho aparece nele. */
async function read<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text()
  for (const id of IDS) expect(text, `id ${id} vazou em ${text}`).not.toContain(id)
  return (text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : text) as T
}
const rows = (sql: string) => db.prepare(sql).all()
const one = (sql: string) => db.prepare(sql).get()
const hello = (id: string, name: string, extra: Record<string, unknown> = {}) =>
  post('/api/hello', { id, name, ...extra })
const chute = (id: string, s: number[], extra: Record<string, unknown> = {}) =>
  post('/api/chute', { id, date: dayBR(), s, ...extra })

describe('POST /api/chute', () => {
  it('calcula o total no servidor (pesos 2-2-3-3-3) e ignora total do cliente', async () => {
    const res = await chute(A, S1, { total: 99999 })
    expect(res.status).toBe(200)
    const j = await read(res)
    expect(j).toEqual({ ok: true, pct: 0, plays: 1, total: 720 })
    expect(scoreTotal(S1)).toBe(720)
    expect(one('SELECT s, total, via FROM chute')).toEqual({ s: JSON.stringify(S1), total: 720, via: null })
  })

  it('1 por aparelho e dia: o segundo envio não muda a nota nem o histograma', async () => {
    await chute(A, S1, { b: [1, 2, 3, 4, 5] })
    const again = await read(await chute(A, S3, { b: [-1, -1, -1, -1, -1] }))
    expect(again).toMatchObject({ ok: true, total: 720, plays: 1 })
    expect(rows('SELECT * FROM chute')).toHaveLength(1)
    expect(one('SELECT SUM(n) AS n FROM chute_hist')).toEqual({ n: 5 })
  })

  it('percentil do dia: melhor que quantos % dos outros', async () => {
    await chute(A, S2) // 650
    await chute(B, S1) // 720
    const c = await read<{ pct: number; plays: number }>(await chute(C3, S3)) // 1300
    expect(c).toMatchObject({ pct: 100, plays: 3 })
    const a = await read<{ pct: number }>(await chute(A, S2))
    expect(a.pct).toBe(0)
    const b = await read<{ pct: number }>(await chute(B, S1))
    expect(b.pct).toBe(50)
  })

  it('aceita até 2 dias atrás e amanhã; rejeita fora disso', async () => {
    for (const d of [-2, -1, 0, 1]) {
      expect((await post('/api/chute', { id: A, date: dayBR(d), s: S1 })).status).toBe(200)
    }
    expect((await post('/api/chute', { id: A, date: dayBR(-3), s: S1 })).status).toBe(400)
    expect((await post('/api/chute', { id: A, date: dayBR(2), s: S1 })).status).toBe(400)
  })

  it.each([
    ['s com 4 notas', { s: [1, 2, 3, 4] }],
    ['nota acima de 100', { s: [101, 0, 0, 0, 0] }],
    ['nota fracionária', { s: [50.5, 0, 0, 0, 0] }],
    ['nota em texto', { s: ['50', 0, 0, 0, 0] }],
    ['faixa fora de −10..10', { s: S1, b: [11, 0, 0, 0, 0] }],
    ['faixas incompletas', { s: S1, b: [0, 0] }],
    ['data inexistente', { s: S1, date: '2026-02-31' }],
    ['data malformada', { s: S1, date: '24/10/2026' }],
    ['sem id', { s: S1, id: undefined }],
  ])('rejeita %s', async (_l, patch) => {
    const res = await post('/api/chute', { id: A, date: dayBR(), ...patch })
    expect(res.status).toBe(400)
    expect(rows('SELECT * FROM chute')).toEqual([])
  })

  it('guarda a origem (via) sem id e descarta campo inválido', async () => {
    await chute(A, S1, { via: { s: 'wa_grupo', d: 'k7q2px', g: 'xx', v: 'b', id: B } })
    expect(one('SELECT via FROM chute')).toEqual({ via: 's=wa_grupo&d=K7Q2PX&v=b' })
  })
})

describe('GET /api/chute/:date (Brasil chutou)', () => {
  it('histograma por rodada e faixa, totais por centena, cache público de 60 s', async () => {
    await chute(A, S1, { b: [-10, 0, 3, null, 10] })
    await chute(B, S2, { b: [-10, 1, 3, null, 10] })
    await chute(C3, S3)
    const res = await get(`/api/chute/${dayBR()}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=60')
    const j = await read<{ plays: number; hist: number[][]; totals: number[] }>(res)
    expect(j.plays).toBe(3)
    expect(j.hist).toHaveLength(5)
    for (const r of j.hist) expect(r).toHaveLength(21)
    expect(j.hist[0]?.[0]).toBe(2)
    expect(j.hist[1]?.[10]).toBe(1)
    expect(j.hist[1]?.[11]).toBe(1)
    expect(j.hist[2]?.[13]).toBe(2)
    expect(j.hist[3]?.reduce((a, b) => a + b, 0)).toBe(0)
    expect(j.hist[4]?.[20]).toBe(2)
    expect(j.totals).toHaveLength(14)
    expect(j.totals[6]).toBe(1) // 650
    expect(j.totals[7]).toBe(1) // 720
    expect(j.totals[13]).toBe(1) // 1300
  })

  it('dia sem partidas devolve zeros; data inválida dá 404', async () => {
    const j = await read<{ plays: number }>(await get('/api/chute/2026-10-20'))
    expect(j.plays).toBe(0)
    expect((await get('/api/chute/ontem')).status).toBe(404)
  })
})

describe('Tira-teima (duelo)', () => {
  async function criar(id = A, s = S1) {
    const res = await post('/api/duelo', { id, date: dayBR(), s })
    expect(res.status).toBe(200)
    const j = await read<{ code: string }>(res)
    expect(j.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
    return j.code
  }

  it('cria e lê pelo código, com apelido e avatar mas sem o id do dono', async () => {
    await hello(A, 'Júnior', { avatar: 'arara', uf: 'SP' })
    const code = await criar()
    const j = await read(await get(`/api/duelo/${code}`))
    expect(j).toEqual({
      date: dayBR(),
      n: Math.round((Date.parse(`${dayBR()}T12:00:00Z`) - Date.parse('2026-10-20T12:00:00Z')) / 864e5) + 1,
      s: S1,
      total: 720,
      name: 'Júnior',
      avatar: 'arara',
    })
    // código em minúsculas também vale
    expect((await get(`/api/duelo/${code.toLowerCase()}`)).status).toBe(200)
  })

  it('sem jogador cadastrado: apelido vazio e avatar padrão', async () => {
    const code = await criar()
    expect(await read(await get(`/api/duelo/${code}`))).toMatchObject({ name: '', avatar: 'coelho' })
  })

  it('código inexistente ou inválido dá 404', async () => {
    expect((await get('/api/duelo/AAAAAA')).status).toBe(404)
    expect((await get('/api/duelo/0OIL11')).status).toBe(404)
  })

  it('responder: compara, conta 1 aceite por aparelho e o dono não responde ao próprio', async () => {
    const code = await criar(A, S1)
    const r1 = await post(`/api/duelo/${code}/resp`, { id: B, s: S2 })
    expect(await read(r1)).toEqual({ ok: true, them: { s: S1, total: 720 }, me: { total: 650 } })
    // repetir não muda a nota nem soma aceite
    expect(await read(await post(`/api/duelo/${code}/resp`, { id: B, s: S3 }))).toMatchObject({
      me: { total: 650 },
    })
    await post(`/api/duelo/${code}/resp`, { id: C3, s: S3 })
    expect(one('SELECT accepts FROM duelo')).toEqual({ accepts: 2 })
    const own = await post(`/api/duelo/${code}/resp`, { id: A, s: S3 })
    expect(own.status).toBe(400)
    expect((await post('/api/duelo/ZZZZZZ/resp', { id: B, s: S2 })).status).toBe(404)
    expect((await post(`/api/duelo/${code}/resp`, { id: B, s: [1] })).status).toBe(400)
  })

  it('mine: só agregados (aceites e vitórias do dono)', async () => {
    const c1 = await criar(A, S1)
    const c2 = await criar(A, S2)
    await post(`/api/duelo/${c1}/resp`, { id: B, s: S2 }) // A vence
    await post(`/api/duelo/${c1}/resp`, { id: C3, s: S3 }) // A perde
    await post(`/api/duelo/${c1}/resp`, { id: D, s: [0, 0, 0, 0, 0] }) // A vence
    const j = await read<{ code: string; accepts: number; wins: number }[]>(
      await get(`/api/duelo/mine?id=${A}`),
    )
    expect(j).toHaveLength(2)
    expect(j.find((d) => d.code === c1)).toEqual({ code: c1, accepts: 3, wins: 2 })
    expect(j.find((d) => d.code === c2)).toEqual({ code: c2, accepts: 0, wins: 0 })
    expect(Object.keys(j[0] ?? {}).sort()).toEqual(['accepts', 'code', 'wins'])
    expect(await read(await get(`/api/duelo/mine?id=${B}`))).toEqual([])
    expect((await get('/api/duelo/mine?id=x')).status).toBe(400)
  })

  it('até 20 duelos por aparelho e dia', async () => {
    for (let i = 0; i < 20; i++)
      expect((await post('/api/duelo', { id: A, date: dayBR(), s: S1 })).status).toBe(200)
    expect((await post('/api/duelo', { id: A, date: dayBR(), s: S1 })).status).toBe(429)
    expect((await post('/api/duelo', { id: B, date: dayBR(), s: S1 })).status).toBe(200)
  })

  it('valida o corpo da criação', async () => {
    expect((await post('/api/duelo', { id: A, date: dayBR(), s: [1, 2] })).status).toBe(400)
    expect((await post('/api/duelo', { id: A, date: '2026-10-01', s: S1 })).status).toBe(400)
    expect((await post('/api/duelo', { id: A, date: dayBR(3), s: S1 })).status).toBe(400)
  })

  it('leitura por código: 60 por minuto por IP (anti-varredura)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T15:00:05Z'))
    const code = await criar()
    for (let i = 0; i < 60; i++) expect((await get(`/api/duelo/${code}`)).status).toBe(200)
    expect((await get(`/api/duelo/${code}`)).status).toBe(429)
    expect((await get('/api/grupo/AAAAAA')).status).toBe(429)
    vi.setSystemTime(new Date('2026-10-24T15:01:05Z'))
    expect((await get(`/api/duelo/${code}`)).status).toBe(200)
  })
})

describe('corrente via duelo e grupo', () => {
  it('primeira partida vinda de duelo conta 1 elo para o dono, uma vez só', async () => {
    await hello(A, 'Júnior')
    const { code } = await read<{ code: string }>(await post('/api/duelo', { id: A, date: dayBR(), s: S1 }))
    await chute(B, S2, { via: { d: code, s: 'wa' } })
    await post('/api/chute', { id: B, date: dayBR(-1), s: S2, via: { d: code } })
    await post('/api/complete', { id: B, ref: A })
    expect(one(`SELECT corrente FROM players WHERE id = '${A}'`)).toEqual({ corrente: 1 })
  })

  it('quem já tinha jogado antes não vira elo; o dono jogando o próprio link também não', async () => {
    await hello(A, 'Júnior')
    const { code } = await read<{ code: string }>(await post('/api/duelo', { id: A, date: dayBR(), s: S1 }))
    await post('/api/chute', { id: B, date: dayBR(-1), s: S2 })
    await chute(B, S2, { via: { d: code } })
    await post('/api/chute', { id: A, date: dayBR(1), s: S2, via: { d: code } })
    expect(one(`SELECT corrente FROM players WHERE id = '${A}'`)).toEqual({ corrente: 0 })
  })

  it('primeira partida vinda de grupo conta para quem criou o grupo', async () => {
    await hello(A, 'Tia Lu')
    const { code } = await read<{ code: string }>(await post('/api/grupo', { id: A }))
    await chute(B, S2, { via: { g: code } })
    expect(one(`SELECT corrente FROM players WHERE id = '${A}'`)).toEqual({ corrente: 1 })
  })
})

describe('Placar do Grupo', () => {
  async function grupo(id = A) {
    const res = await post('/api/grupo', { id })
    expect(res.status).toBe(200)
    return read<{ code: string; nome: string }>(res)
  }

  it('cria com nome gerado (bicho + 2 dígitos) e quem cria já é membro', async () => {
    const g = await grupo()
    expect(g.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
    expect(g.nome).toMatch(/^\p{Lu}[\p{L}-]+-[1-9]\d$/u)
    expect(rows('SELECT id FROM grupo_membro')).toEqual([{ id: A }])
  })

  it('entrar é idempotente; grupo inexistente dá 404', async () => {
    const g = await grupo()
    expect(await read(await post(`/api/grupo/${g.code}/entrar`, { id: B }))).toEqual({
      ok: true,
      nome: g.nome,
    })
    expect(await read(await post(`/api/grupo/${g.code}/entrar`, { id: B }))).toEqual({
      ok: true,
      nome: g.nome,
    })
    expect(one('SELECT COUNT(*) AS n FROM grupo_membro')).toEqual({ n: 2 })
    expect((await post('/api/grupo/ZZZZZZ/entrar', { id: B })).status).toBe(404)
  })

  it('no máximo 50 membros', async () => {
    const g = await grupo()
    for (let i = 0; i < 49; i++) db.exec(`INSERT INTO grupo_membro VALUES ('${g.code}', 'membro${i}x', ${i})`)
    const res = await post(`/api/grupo/${g.code}/entrar`, { id: B })
    expect(res.status).toBe(409)
    expect(await read(res)).toEqual({ ok: false, error: 'cheio' })
  })

  it('no máximo 10 grupos por aparelho', async () => {
    for (let i = 0; i < 10; i++) await grupo(A)
    expect((await post('/api/grupo', { id: A })).status).toBe(429)
    const outro = await grupo(B)
    expect((await post(`/api/grupo/${outro.code}/entrar`, { id: A })).status).toBe(429)
  })

  it('placar de hoje e da semana, com sequência, sem id, sem UF e sem movimento', async () => {
    const g = await grupo(A)
    await post(`/api/grupo/${g.code}/entrar`, { id: B })
    await post(`/api/grupo/${g.code}/entrar`, { id: C3 })
    await hello(A, 'Tia Lu', { uf: 'TO', avatar: 'onca' })
    await hello(B, 'Júnior', { uf: 'TO' })
    // C3 é membro mas sem apelido; D jogou mas não é membro
    const t = dayBR()
    const ins = (id: string, date: string, total: number) =>
      db.exec(`INSERT INTO chute (id, date, s, total) VALUES ('${id}', '${date}', '[]', ${total})`)
    ins(A, t, 900)
    ins(A, addDays(t, -1), 800)
    ins(A, addDays(t, -2), 700)
    ins(A, addDays(t, -8), 1300) // fora da semana, mas quebra a sequência antes
    ins(B, t, 1100)
    ins(B, addDays(t, -6), 1200)
    ins(C3, addDays(t, -1), 500) // não jogou hoje: sequência viva (1), fora do "hoje"
    ins(D, t, 1300)
    // o placar do grupo funciona mesmo sem a tabela de movimento: nunca a consulta
    db.exec('DROP TABLE movimento')

    const res = await get(`/api/grupo/${g.code}?id=${B}`)
    expect(res.status).toBe(200)
    const j = await read<Record<string, unknown>>(res)
    expect(JSON.stringify(j)).not.toMatch(/"uf"|"TO"|escolha|vou|virei/)
    expect(j).toEqual({
      nome: g.nome,
      date: t,
      n: expect.any(Number),
      membros: 3,
      hoje: [
        { name: 'Júnior', avatar: 'coelho', total: 1100, streak: 1, me: true },
        { name: 'Tia Lu', avatar: 'onca', total: 900, streak: 3, me: false },
      ],
      semana: [
        { name: 'Júnior', avatar: 'coelho', total: 2300, streak: 1, me: true },
        { name: 'Tia Lu', avatar: 'onca', total: 2400 - 0, streak: 3, me: false },
        { name: '', avatar: 'coelho', total: 500, streak: 1, me: false },
      ].sort((a, b) => b.total - a.total),
    })
  })

  it('"me" só marca quem é membro; data inválida dá 400', async () => {
    const g = await grupo(A)
    await chute(A, S1)
    const j = await read<{ hoje: { me: boolean }[] }>(await get(`/api/grupo/${g.code}?id=${D}`))
    expect(j.hoje.map((r) => r.me)).toEqual([false])
    expect((await get(`/api/grupo/${g.code}?date=amanha`)).status).toBe(400)
    expect((await get('/api/grupo/ZZZZZZ')).status).toBe(404)
  })

  it('sair tira do placar; o último a sair apaga o grupo', async () => {
    const g = await grupo(A)
    await post(`/api/grupo/${g.code}/entrar`, { id: B })
    await post(`/api/grupo/${g.code}/sair`, { id: B })
    expect(await read(await get(`/api/grupo/${g.code}`))).toMatchObject({ membros: 1 })
    expect(await read(await post(`/api/grupo/${g.code}/sair`, { id: A }))).toEqual({ ok: true })
    expect((await get(`/api/grupo/${g.code}`)).status).toBe(404)
  })
})

describe('POST /api/apagar (LGPD)', () => {
  it('apaga tudo do aparelho, inclusive o movimento sob HMAC, e mantém só agregados sem id', async () => {
    await hello(A, 'Ana', { uf: 'SP' })
    await hello(B, 'Bia', { ref: A })
    await post('/api/like', { id: A, fact: 'fome' })
    await post('/api/daily', { id: A, date: dayBR(), score: 3 })
    await post('/api/movimento', { id: A, uf: 'SP', escolha: 'vou' })
    await post('/api/movimento', { id: B, uf: 'RJ', escolha: 'virei' })
    await chute(A, S1, { b: [0, 0, 0, 0, 0] })
    const meu = await read<{ code: string }>(await post('/api/duelo', { id: A, date: dayBR(), s: S1 }))
    await post(`/api/duelo/${meu.code}/resp`, { id: B, s: S2 })
    const dela = await read<{ code: string }>(await post('/api/duelo', { id: B, date: dayBR(), s: S2 }))
    await post(`/api/duelo/${dela.code}/resp`, { id: A, s: S1 })
    const g = await read<{ code: string }>(await post('/api/grupo', { id: A }))
    await post(`/api/grupo/${g.code}/entrar`, { id: B })
    const g2 = await read<{ code: string }>(await post('/api/grupo', { id: A })) // só A: some junto

    const res = await post('/api/apagar', { id: A })
    expect(await read(res)).toEqual({ ok: true })

    for (const t of TABLES) {
      expect(JSON.stringify(rows(`SELECT * FROM ${t}`)), `tabela ${t}`).not.toContain(A)
    }
    expect(rows('SELECT escolha FROM movimento')).toEqual([{ escolha: 'virei' }])
    expect(one(`SELECT ref FROM players WHERE id = '${B}'`)).toEqual({ ref: null })
    expect(one(`SELECT accepts FROM duelo WHERE code = '${dela.code}'`)).toEqual({ accepts: 0 })
    expect(rows(`SELECT * FROM duelo WHERE code = '${meu.code}'`)).toEqual([])
    expect(rows(`SELECT code FROM grupo WHERE code = '${g2.code}'`)).toEqual([])
    expect(rows(`SELECT id FROM grupo_membro WHERE code = '${g.code}'`)).toEqual([{ id: B }])
    // agregado anônimo fica
    expect(one('SELECT SUM(n) AS n FROM chute_hist')).toEqual({ n: 5 })
  })

  it('rejeita id inválido', async () => {
    expect((await post('/api/apagar', { id: 'x' })).status).toBe(400)
  })
})

describe('POST /api/ev', () => {
  it('conta eventos da lista, por dia, evento e chave, sem id', async () => {
    await post('/api/ev', { e: 'round_start', k: 0 })
    await post('/api/ev', { e: 'round_start', k: 0 })
    await post('/api/ev', { e: 'round_start', k: 1 })
    await post('/api/ev', { e: 'share_done' })
    expect(rows('SELECT day, e, k, n FROM ev ORDER BY e, k')).toEqual([
      { day: dayBR(), e: 'round_start', k: '0', n: 2 },
      { day: dayBR(), e: 'round_start', k: '1', n: 1 },
      { day: dayBR(), e: 'share_done', k: '', n: 1 },
    ])
    const cols = (db.prepare('PRAGMA table_info(ev)').all() as { name: string }[]).map((c) => c.name)
    expect(cols).toEqual(['day', 'e', 'k', 'n'])
  })

  it.each([
    ['evento fora da lista', { e: 'voto' }],
    ['chave com espaço', { e: 'landing', k: 'tem espaço' }],
    ['chave longa', { e: 'landing', k: 'x'.repeat(25) }],
    ['chave objeto', { e: 'landing', k: { id: A } }],
  ])('rejeita %s', async (_l, body) => {
    expect((await post('/api/ev', body)).status).toBe(400)
    expect(rows('SELECT * FROM ev')).toEqual([])
  })
})

describe('GET /c/:n (preview do link)', () => {
  const page = async (path: string) => {
    const res = await get(path)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    return read<string>(res)
  }
  const meta = (html: string, prop: string) =>
    html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`))?.[1]

  it('OG padrão, identificação no description e redirecionamento para /?c=n', async () => {
    env.RESPONSAVEL = 'Fulano, CNPJ 00.000.000/0001-00'
    const res = await get('/c/5?s=wa&x=1')
    expect(res.headers.get('cache-control')).toBe('public, max-age=300')
    const html = await read<string>(res)
    expect(meta(html, 'og:title')).toBe('Chuta Aí #5: 5 números do Brasil. Quanto você chuta?')
    expect(meta(html, 'og:description')).toBe(
      'Propaganda eleitoral · Fulano, CNPJ 00.000.000/0001-00 · Conteúdo produzido com uso de inteligência artificial',
    )
    expect(meta(html, 'og:image')).toBe('/og.png')
    expect(html).toContain('location.replace("/?c=5&s=wa")')
  })

  it('duelo: título com apelido e nota de quem desafiou; d vai para o jogo', async () => {
    await hello(A, 'Júnior')
    const { code } = await read<{ code: string }>(
      await post('/api/duelo', { id: A, date: dayBR(), s: [100, 100, 100, 100, 70] }),
    )
    const html = await page(`/c/5?d=${code.toLowerCase()}&s=wa`)
    expect(meta(html, 'og:title')).toBe('Júnior fez 1.210 no Chuta Aí #5. Tira-teima?')
    expect(html).toContain(`location.replace("/?c=5&d=${code}&s=wa")`)
  })

  it('grupo: título com o nome do grupo', async () => {
    const g = await read<{ code: string; nome: string }>(await post('/api/grupo', { id: A }))
    const html = await page(`/c/5?g=${g.code}&s=wa_grupo`)
    expect(meta(html, 'og:title')).toBe(`Chuta Aí #5 · Placar do Grupo ${g.nome}`)
  })

  it('escapa HTML e descarta parâmetros inválidos', async () => {
    db.exec(
      `INSERT INTO players (id, name, created) VALUES ('${A}', '<img src=x onerror=alert(1)>"', 0);
       INSERT INTO duelo (code, owner, date, s, total, created) VALUES ('K7Q2PX', '${A}', '${dayBR()}', '[]', 1000, 0)`,
    )
    const html = await page('/c/5?d=K7Q2PX&s=<script>&r=</script>&v=z')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;')
    expect(html).not.toContain('<script>&')
    expect(html).toContain('location.replace("/?c=5&d=K7Q2PX")')
  })

  it('og:image específico quando o site tem /og/c-{n}.png, senão /og.png', async () => {
    env.SITE_URL = 'https://site-a.test/'
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/og/c-5.png')
        ? new Response(null, { status: 200, headers: { 'content-type': 'image/png' } })
        : new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const h5 = await page('/c/5')
    expect(meta(h5, 'og:image')).toBe('https://site-a.test/og/c-5.png')
    expect(h5).toContain('location.replace("https://site-a.test/?c=5")')
    const h4 = await page('/c/4')
    expect(meta(h4, 'og:image')).toBe('https://site-a.test/og.png')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://site-a.test/og/c-5.png',
      expect.objectContaining({ method: 'HEAD' }),
    )
  })

  it('número inválido ou ainda não publicado vai para a home', async () => {
    env.SITE_URL = 'https://site-b.test'
    for (const p of ['/c/0', '/c/abc', '/c/999']) {
      const res = await get(p)
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('https://site-b.test/')
    }
  })
})

describe('expurgo (cron)', () => {
  async function semear() {
    await hello(A, 'Ana')
    await chute(A, S1, { b: [0, 0, 0, 0, 0] })
    await post('/api/duelo', { id: A, date: dayBR(), s: S1 })
    await post('/api/grupo', { id: A })
    await post('/api/ev', { e: 'landing' })
    await post('/api/movimento', { id: A, escolha: 'vou' })
  }
  const count = () =>
    TABLES.reduce((a, t) => a + ((one(`SELECT COUNT(*) AS n FROM ${t}`) as { n: number }).n ?? 0), 0)

  it('antes de 30/11/2026 mantém os dados; a partir dele apaga tudo', async () => {
    await semear()
    const before = count()
    expect(before).toBeGreaterThan(5)
    expect(await scheduled(env, Date.parse('2026-11-29T23:59:00-03:00'))).toBe('kept')
    expect(count()).toBeGreaterThan(0)
    expect(await scheduled(env, Date.parse('2026-11-30T00:00:00-03:00'))).toBe('purged')
    expect(count()).toBe(0)
  })

  it('purgeAll limpa todas as tabelas do schema', async () => {
    await semear()
    await purgeAll(env)
    const all = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]
    ).map((r) => r.name)
    expect([...all].sort()).toEqual([...TABLES].sort())
    expect(count()).toBe(0)
  })

  it('wrangler.toml agenda o cron e aponta a data do expurgo', () => {
    const toml = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8')
    expect(toml).toMatch(/\[triggers\]\s*\ncrons = \["[^"]+"\]/)
    expect(toml).toContain('PURGE_AT = "2026-11-30T00:00:00-03:00"')
  })
})
