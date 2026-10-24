// Roda a API do Worker em Node com SQLite local (node:sqlite), na porta 8787.
// Uso: pnpm --filter @projects/nivel-13 dev:api   (o Vite faz proxy de /api para cá)
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { handle } from '../worker/src/index.ts'

const here = dirname(fileURLToPath(import.meta.url))
const file = process.env.DB_FILE ?? join(here, '.data', 'dev.sqlite')
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
const db = new DatabaseSync(file)
db.exec(readFileSync(join(here, '..', 'worker', 'schema.sql'), 'utf8'))

// Adaptador mínimo com a mesma forma da API do D1
const D1 = {
  prepare(sql) {
    let params = []
    const stmt = {
      bind(...p) {
        params = p
        return stmt
      },
      async run() {
        return db.prepare(sql).run(...params)
      },
      async first() {
        return db.prepare(sql).get(...params) ?? null
      },
      async all() {
        return { results: db.prepare(sql).all(...params) }
      },
    }
    return stmt
  },
}
const env = { DB: D1, SALT: 'dev-salt', ALLOWED_ORIGIN: '*' }

const port = Number(process.env.PORT ?? 8787)
createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: { ...req.headers, 'x-forwarded-for': req.socket.remoteAddress ?? 'local' },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  })
  const response = await handle(request, env)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
}).listen(port, () => console.log(`API do Nível 13 em http://localhost:${port}/api (SQLite: ${file})`))
