// Cliente (src/lib/api.ts) falando com a app de verdade: o fetch do teste entrega cada pedido ao Hono em memória.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openD1 } from '../server/d1-sqlite.mjs'
import { apagar, api, chute, duelo, ev, grupo } from '../src/lib/api'
import { getSave } from '../src/state/save'
import { app, dayBR, type Env } from '../worker/src/index.ts'

let env: Env
let db: ReturnType<typeof openD1>['db']
const sent: { url: string; body: unknown }[] = []

beforeEach(() => {
  const o = openD1(':memory:')
  db = o.db
  env = { DB: o.D1, SALT: 'test-salt', RATE_PER_MIN: '1000' }
  sent.length = 0
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    return app.request(url, { ...init, signal: undefined }, env)
  })
  getSave().reset()
  getSave().patch({ name: 'Tia Lu', uf: 'MG', avatar: 'arara' })
})
afterEach(() => {
  db.close()
  vi.unstubAllGlobals()
})

const S = [100, 80, 60, 40, 20]

describe('cliente da API', () => {
  it('as rotas antigas seguem com a mesma forma', async () => {
    expect(await api.hello()).toEqual({ ok: true })
    expect(await api.like('fome')).toEqual({ ok: true, likes: 1 })
    expect(await api.movimento('vou')).toEqual({ ok: true })
    // o movimento não leva apelido nem avatar
    expect(sent.at(-1)?.body).toEqual({ id: getSave().id, uf: 'MG', escolha: 'vou' })
    const st = await api.stats()
    expect(st?.movimento).toEqual({ vou: 1, virei: 0, pensando: 0 })
  })

  it('chute.post e chute.get', async () => {
    const r = await chute.post(dayBR(), S, [1, 0, -1, null, 2], { s: 'wa' })
    expect(r).toEqual({ ok: true, pct: 0, plays: 1, total: 720 })
    const d = await api.chute.get(dayBR())
    expect(d?.plays).toBe(1)
    expect(d?.hist[0]?.[11]).toBe(1)
  })

  it('duelo: create (sincroniza o apelido), get, resp e mine', async () => {
    const made = await duelo.create(dayBR(), S)
    expect(made?.code).toMatch(/^[A-Z2-9]{6}$/)
    const code = made?.code as string
    expect(await duelo.get(code)).toMatchObject({ name: 'Tia Lu', avatar: 'arara', total: 720 })
    // o próprio dono não responde: o cliente devolve null
    expect(await duelo.resp(code, S)).toBeNull()
    const owner = getSave().id
    getSave().reset()
    expect(await duelo.resp(code, [0, 0, 0, 0, 0])).toEqual({
      ok: true,
      them: { s: S, total: 720 },
      me: { total: 0 },
    })
    getSave().patch({ id: owner })
    expect(await duelo.mine()).toEqual([{ code, accepts: 1, wins: 1 }])
  })

  it('grupo: create, join com erro legível, board, leave', async () => {
    const g = await grupo.create()
    expect(g && 'code' in g).toBe(true)
    const code = (g as { code: string }).code
    await chute.post(dayBR(), S)
    const b = await grupo.board(code)
    expect(b?.hoje).toEqual([{ name: 'Tia Lu', avatar: 'arara', total: 720, streak: 1, me: true }])
    expect(await grupo.join('ZZZZZZ')).toEqual({ ok: false, error: 'not found' })
    expect(await grupo.leave(code)).toEqual({ ok: true })
  })

  it('apagar e ev', async () => {
    await api.hello()
    expect(await apagar()).toEqual({ ok: true })
    expect(db.prepare('SELECT COUNT(*) AS n FROM players').get()).toEqual({ n: 0 })
    ev('round_start', 2)
    await new Promise((r) => setTimeout(r, 10))
    expect(db.prepare('SELECT e, k, n FROM ev').all()).toEqual([{ e: 'round_start', k: '2', n: 1 }])
    expect(JSON.stringify(sent.at(-1)?.body)).not.toContain(getSave().id)
  })

  it('ev usa sendBeacon quando existe', () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    ev('share_done')
    expect(beacon).toHaveBeenCalledWith('/api/ev', '{"e":"share_done"}')
  })
})
