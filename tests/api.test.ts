// Testes da API (app Hono do Worker) contra SQLite em memória, pelo mesmo adaptador do servidor local.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openD1 } from '../server/d1-sqlite.mjs'
import { app, dayBR, type Env } from '../worker/src/index.ts'

let env: Env
let db: ReturnType<typeof openD1>['db']
let ipSeq = 0
let ip = ''

beforeEach(() => {
  const o = openD1(':memory:')
  db = o.db
  env = { DB: o.D1, SALT: 'test-salt', ALLOWED_ORIGIN: '*', RATE_PER_MIN: '1000' }
  ip = `10.0.0.${++ipSeq}`
})
afterEach(() => {
  db.close()
  vi.useRealTimers()
})

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(
    `/api${path}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    env,
  )
}
const get = (path: string, headers: Record<string, string> = {}) =>
  app.request(`/api${path}`, { headers: { 'x-forwarded-for': ip, ...headers } }, env)

async function stats(id = '') {
  const res = await get(`/stats${id ? `?id=${id}` : ''}`)
  expect(res.status).toBe(200)
  return (await res.json()) as {
    players: number
    completions: number
    movimento: { vou: number; virei: number; pensando: number }
    byUf: { uf: string; vou: number; virei: number }[]
    corrente: { name: string; uf: string; count: number; me: boolean }[]
    facts: { fact: string; likes: number }[]
    daily: { date: string; plays: number; avg: number }
    me: { corrente: number; rank: number | null } | null
  }
}
const rows = (sql: string) => db.prepare(sql).all()

describe('health e cabeçalhos', () => {
  it('GET /api/health responde ok com no-store', async () => {
    const res = await get('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, day: dayBR() })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('rota desconhecida dá 404 em JSON, e GET numa rota de escrita também', async () => {
    const a = await get('/nada')
    expect(a.status).toBe(404)
    expect(await a.json()).toEqual({ error: 'not found' })
    expect((await get('/hello')).status).toBe(404)
  })

  it('erro do banco vira 500 sem vazar detalhes', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    env.DB = {
      prepare() {
        throw new Error('boom')
      },
    }
    const res = await get('/health')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'erro interno' })
    expect(spy).toHaveBeenCalled()
  })
})

describe('CORS', () => {
  it('sem ALLOWED_ORIGIN (dev) libera qualquer origem', async () => {
    env.ALLOWED_ORIGIN = undefined
    const res = await get('/health', { origin: 'http://qualquer.test' })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('com ALLOWED_ORIGIN só ecoa a origem do site', async () => {
    env.ALLOWED_ORIGIN = 'https://site.test, https://www.site.test/'
    const ok = await get('/health', { origin: 'https://www.site.test' })
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://www.site.test')
    const no = await get('/health', { origin: 'https://outro.test' })
    expect(no.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('preflight OPTIONS responde 204 com métodos e cabeçalhos', async () => {
    env.ALLOWED_ORIGIN = 'https://site.test'
    const res = await app.request(
      '/api/hello',
      {
        method: 'OPTIONS',
        headers: { origin: 'https://site.test', 'access-control-request-method': 'POST' },
      },
      env,
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://site.test')
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
    expect(res.headers.get('access-control-allow-headers')).toBe('content-type')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('/hello', () => {
  it('cria e atualiza o jogador', async () => {
    expect(
      await (await post('/hello', { id: 'abc123', name: 'Ana', uf: 'SP', avatar: 'onca' })).json(),
    ).toEqual({
      ok: true,
    })
    await post('/hello', { id: 'abc123', name: 'Ana B', uf: 'RJ', avatar: 'arara' })
    expect(rows('SELECT id, name, uf, avatar FROM players')).toEqual([
      { id: 'abc123', name: 'Ana B', uf: 'RJ', avatar: 'arara' },
    ])
    expect((await stats()).players).toBe(1)
  })

  it('limpa apelido, bloqueia ofensa e ignora UF ou avatar inválidos', async () => {
    await post('/hello', {
      id: 'aaaaaa',
      name: '<b>Zé</b>!!! da Silva Sauro Rex',
      uf: 'XX',
      avatar: 'dragao',
    })
    await post('/hello', { id: 'bbbbbb', name: 'gado', uf: 'BA' })
    expect(rows('SELECT id, name, uf, avatar FROM players ORDER BY id')).toEqual([
      { id: 'aaaaaa', name: 'bZéb da Silva Sa', uf: '', avatar: 'coelho' },
      { id: 'bbbbbb', name: '', uf: 'BA', avatar: 'coelho' },
    ])
  })

  it.each([
    ['sem id', {}],
    ['id curto', { id: 'abc' }],
    ['id com maiúscula', { id: 'ABCdef' }],
    ['id longo', { id: 'a'.repeat(17) }],
    ['id número', { id: 123456 }],
  ])('rejeita %s com 400', async (_label, body) => {
    const res = await post('/hello', body)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false })
  })

  it('JSON inválido, array e corpo grande demais', async () => {
    expect((await post('/hello', '{nao é json')).status).toBe(400)
    expect((await post('/hello', '[1,2]')).status).toBe(400)
    const big = await post('/hello', { id: 'abc123', name: 'x'.repeat(3000) })
    expect(big.status).toBe(413)
    expect(rows('SELECT * FROM players')).toEqual([])
  })
})

describe('/complete e corrente', () => {
  it('conta a corrente só na primeira conclusão de cada aparelho', async () => {
    await post('/hello', { id: 'mariaa', name: 'Maria', uf: 'PE' })
    await post('/hello', { id: 'joaooo', ref: 'mariaa' })
    expect((await post('/complete', { id: 'joaooo', ref: 'mariaa' })).status).toBe(200)
    await post('/complete', { id: 'joaooo', ref: 'mariaa' })
    await post('/complete', { id: 'joaooo' })
    const s = await stats('mariaa')
    expect(s.completions).toBe(1)
    expect(s.corrente).toEqual([{ name: 'Maria', uf: 'PE', count: 1, me: true }])
    expect(s.me).toEqual({ corrente: 1, rank: 1 })
  })

  it('o primeiro ref fica; trocar de ref depois não muda quem ganha', async () => {
    await post('/hello', { id: 'aaaaaa', name: 'A' })
    await post('/hello', { id: 'bbbbbb', name: 'B' })
    await post('/hello', { id: 'cccccc', ref: 'aaaaaa' })
    await post('/complete', { id: 'cccccc', ref: 'bbbbbb' })
    const s = await stats()
    expect(s.corrente.map((r) => r.name)).toEqual(['A'])
  })

  it('ignora autoindicação', async () => {
    await post('/complete', { id: 'aaaaaa', ref: 'aaaaaa' })
    expect(rows('SELECT ref, completed, corrente FROM players')).toEqual([
      { ref: null, completed: 1, corrente: 0 },
    ])
  })

  it('ranking ordena e nunca expõe o id', async () => {
    await post('/hello', { id: 'aaaaaa', name: 'A', uf: 'SP' })
    await post('/hello', { id: 'bbbbbb', name: 'B', uf: 'MG' })
    for (const [i, ref] of ['aaaaaa', 'bbbbbb', 'bbbbbb'].entries()) {
      await post('/complete', { id: `amigo${i}`, ref })
    }
    const s = await stats('aaaaaa')
    expect(s.corrente).toEqual([
      { name: 'B', uf: 'MG', count: 2, me: false },
      { name: 'A', uf: 'SP', count: 1, me: true },
    ])
    expect(JSON.stringify(s)).not.toContain('bbbbbb')
    expect(s.me).toEqual({ corrente: 1, rank: 2 })
    expect((await stats('zzzzzz')).me).toEqual({ corrente: 0, rank: null })
    expect((await stats()).me).toBeNull()
  })

  it('rejeita id inválido', async () => {
    expect((await post('/complete', { id: 'x' })).status).toBe(400)
  })
})

describe('/like', () => {
  it('conta uma vez por aparelho e devolve o total do fato', async () => {
    expect(await (await post('/like', { id: 'aaaaaa', fact: 'fome' })).json()).toEqual({ ok: true, likes: 1 })
    expect(await (await post('/like', { id: 'aaaaaa', fact: 'fome' })).json()).toEqual({ ok: true, likes: 1 })
    expect(await (await post('/like', { id: 'bbbbbb', fact: 'fome' })).json()).toEqual({ ok: true, likes: 2 })
    await post('/like', { id: 'bbbbbb', fact: 'ir' })
    expect((await stats()).facts).toEqual([
      { fact: 'fome', likes: 2 },
      { fact: 'ir', likes: 1 },
    ])
  })

  it('rejeita fato desconhecido ou id inválido', async () => {
    expect((await post('/like', { id: 'aaaaaa', fact: 'inventado' })).status).toBe(400)
    expect((await post('/like', { id: '!!', fact: 'fome' })).status).toBe(400)
  })
})

describe('/movimento', () => {
  it('guarda sob HMAC, sem id nem apelido, e conta uma vez por aparelho', async () => {
    await post('/movimento', { id: 'aaaaaa', name: 'Ana', uf: 'SP', escolha: 'vou' })
    await post('/movimento', { id: 'aaaaaa', name: 'Ana', uf: 'SP', escolha: 'virei' })
    await post('/movimento', { id: 'bbbbbb', uf: 'SP', escolha: 'vou' })
    await post('/movimento', { id: 'cccccc', uf: 'BA', escolha: 'vou' })
    await post('/movimento', { id: 'dddddd', uf: 'RJ', escolha: 'pensando' })
    await post('/movimento', { id: 'eeeeee', escolha: 'virei' })
    const raw = rows('SELECT * FROM movimento')
    expect(raw).toHaveLength(5)
    const dump = JSON.stringify(raw)
    expect(dump).not.toContain('aaaaaa')
    expect(dump).not.toContain('Ana')
    for (const r of raw) expect(r.k).toMatch(/^[0-9a-f]{24}$/)
    // o movimento não cria jogador
    expect(rows('SELECT * FROM players')).toEqual([])

    const s = await stats()
    expect(s.movimento).toEqual({ vou: 2, virei: 2, pensando: 1 })
    expect(s.byUf).toEqual([
      { uf: 'SP', vou: 1, virei: 1 },
      { uf: 'BA', vou: 1, virei: 0 },
    ])
  })

  it('a chave depende do SALT', async () => {
    await post('/movimento', { id: 'aaaaaa', escolha: 'vou' })
    env.SALT = 'outro-salt'
    await post('/movimento', { id: 'aaaaaa', escolha: 'vou' })
    expect(rows('SELECT k FROM movimento')).toHaveLength(2)
  })

  it('rejeita escolha inválida', async () => {
    expect((await post('/movimento', { id: 'aaaaaa', escolha: 'talvez' })).status).toBe(400)
    expect((await post('/movimento', { id: 'aaaaaa' })).status).toBe(400)
  })
})

describe('/daily', () => {
  it('aceita o dia corrente, uma vez por aparelho, e soma na média do dia', async () => {
    const d = dayBR()
    await post('/daily', { id: 'aaaaaa', date: d, score: 5 })
    await post('/daily', { id: 'aaaaaa', date: d, score: 0 })
    await post('/daily', { id: 'bbbbbb', date: d, score: 2.4 })
    expect((await stats()).daily).toEqual({ date: d, plays: 2, avg: 3.5 })
  })

  it('aceita até 2 dias atrás (sem rede) e amanhã (fuso), rejeita fora da janela', async () => {
    expect((await post('/daily', { id: 'aaaaaa', date: dayBR(-2), score: 3 })).status).toBe(200)
    expect((await post('/daily', { id: 'aaaaaa', date: dayBR(-1), score: 3 })).status).toBe(200)
    expect((await post('/daily', { id: 'aaaaaa', date: dayBR(1), score: 3 })).status).toBe(200)
    expect((await post('/daily', { id: 'aaaaaa', date: dayBR(-3), score: 3 })).status).toBe(400)
    expect((await post('/daily', { id: 'aaaaaa', date: dayBR(2), score: 3 })).status).toBe(400)
    expect((await post('/daily', { id: 'aaaaaa', date: '2026-02-31', score: 3 })).status).toBe(400)
    expect((await post('/daily', { id: 'aaaaaa', date: '2026-13-99', score: 3 })).status).toBe(400)
  })

  it.each([6, -1, '3', null, Number.NaN])('rejeita score %s', async (score) => {
    expect((await post('/daily', { id: 'aaaaaa', date: dayBR(), score })).status).toBe(400)
  })
})

describe('limite por IP', () => {
  it('bloqueia com 429 depois do limite por minuto, por IP', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T12:00:05Z'))
    env.RATE_PER_MIN = '3'
    for (let i = 0; i < 3; i++) expect((await post('/hello', { id: 'aaaaaa' })).status).toBe(200)
    const blocked = await post('/hello', { id: 'aaaaaa' })
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ error: 'devagar' })
    // outro IP segue livre
    expect((await post('/hello', { id: 'aaaaaa' }, { 'x-forwarded-for': '10.9.9.9' })).status).toBe(200)
    // cf-connecting-ip tem prioridade sobre x-forwarded-for
    expect((await post('/hello', { id: 'aaaaaa' }, { 'cf-connecting-ip': '10.8.8.8' })).status).toBe(200)
    // no minuto seguinte libera
    vi.setSystemTime(new Date('2026-10-24T12:01:05Z'))
    expect((await post('/hello', { id: 'aaaaaa' })).status).toBe(200)
  })

  it('não grava o IP em claro', async () => {
    await post('/hello', { id: 'aaaaaa' })
    expect(JSON.stringify(rows('SELECT k FROM rate'))).not.toContain(ip)
  })

  it('a corrente ganha no máximo 300 elos por dia', async () => {
    await post('/hello', { id: 'mariaa', name: 'Maria' })
    db.exec(`INSERT INTO rate (k, n, day) VALUES ('ref:mariaa:${dayBR()}', 300, '${dayBR()}')`)
    await post('/complete', { id: 'joaooo', ref: 'mariaa' })
    expect(rows("SELECT corrente FROM players WHERE id = 'mariaa'")).toEqual([{ corrente: 0 }])
  })
})
