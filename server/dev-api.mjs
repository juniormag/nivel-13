// Roda a API (a mesma app Hono do Worker) em Node com SQLite local (node:sqlite), na porta 8787.
// Uso: pnpm dev:api   (o Vite faz proxy de /api para cá)
// Variáveis: PORT (8787), DB_FILE (server/.data/dev.sqlite, ou ':memory:'), ALLOWED_ORIGIN ('*'), SALT,
// SITE_URL (http://localhost:4313, para /c/:n) e RESPONSAVEL.
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from '../worker/src/index.ts'
import { openD1 } from './d1-sqlite.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const file = process.env.DB_FILE ?? join(here, '.data', 'dev.sqlite')
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
const { D1 } = openD1(file)
const env = {
  DB: D1,
  SALT: process.env.SALT ?? 'dev-salt',
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN ?? '*',
  RATE_PER_MIN: process.env.RATE_PER_MIN,
  SITE_URL: process.env.SITE_URL ?? 'http://localhost:4313',
  RESPONSAVEL: process.env.RESPONSAVEL ?? process.env.VITE_RESPONSAVEL ?? '',
}

const port = Number(process.env.PORT ?? 8787)
createServer(async (req, res) => {
  try {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined && k !== 'x-forwarded-for' && k !== 'cf-connecting-ip')
        headers.set(k, Array.isArray(v) ? v.join(', ') : v)
    }
    // o IP vem do socket, nunca de um cabeçalho que o cliente possa forjar
    headers.set('x-forwarded-for', req.socket.remoteAddress ?? 'local')
    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    })
    const response = await app.fetch(request, env)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (err) {
    console.error(err)
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end('{"error":"erro interno"}')
  }
}).listen(port, () => console.log(`API do Nível 13 em http://localhost:${port}/api (SQLite: ${file})`))
