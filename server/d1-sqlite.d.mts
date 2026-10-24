import type { D1Like } from '../worker/src/index.ts'

export interface SqliteDb {
  exec(sql: string): void
  prepare(sql: string): {
    all(...params: unknown[]): Record<string, unknown>[]
    get(...params: unknown[]): Record<string, unknown> | undefined
    run(...params: unknown[]): unknown
  }
  close(): void
}

export function openD1(file?: string): { db: SqliteDb; D1: D1Like }
