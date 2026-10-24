// Adaptador mínimo com a forma da API do Cloudflare D1, sobre node:sqlite.
// Usado pelo servidor local (server/dev-api.mjs) e pelos testes (tests/api.test.ts).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const schemaFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'worker', 'schema.sql')

/** Abre (ou cria) o banco, aplica worker/schema.sql e devolve { db, D1 }. Use ':memory:' nos testes. */
export function openD1(file = ':memory:') {
  const db = new DatabaseSync(file)
  db.exec(readFileSync(schemaFile, 'utf8'))
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
  return { db, D1 }
}
