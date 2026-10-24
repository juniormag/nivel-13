import { describe, expect, it } from 'vitest'
import { FACTS } from '../src/content/facts'
import { CALENDAR, type NumberRound, ROUNDS, roundsFor } from '../src/content/rounds'
import { STATEMENTS } from '../src/content/statements'
import { roundScore } from '../src/lib/score'

const byId = new Map(ROUNDS.map((r) => [r.id, r]))
const numbers = ROUNDS.filter((r): r is NumberRound => r.kind === 'number')
const pos = (r: NumberRound) =>
  r.scale === 'log'
    ? Math.log(r.answer / r.min) / Math.log(r.max / r.min)
    : (r.answer - r.min) / (r.max - r.min)
/** escala natural (0 a 100% ou ano que não pode passar de hoje): dispensa a regra 20–80% */
const natural = (r: NumberRound) => (r.fmt === 'pct' && r.min === 0 && r.max === 100) || r.fmt === 'year'

describe('rounds: conteúdo', () => {
  it('ids únicos', () => {
    expect(new Set(ROUNDS.map((r) => r.id)).size).toBe(ROUNDS.length)
  })
  it('toda rodada tem ao menos 1 fonte com url e data', () => {
    for (const r of ROUNDS) {
      expect(r.sources.length, r.id).toBeGreaterThan(0)
      for (const s of r.sources) {
        expect(s.url, r.id).toMatch(/^https:\/\//)
        expect(s.date.trim(), r.id).not.toBe('')
        expect(s.name.trim(), r.id).not.toBe('')
      }
    }
  })
  it('factId e statementId existem', () => {
    for (const r of ROUNDS) {
      if (r.factId)
        expect(
          FACTS.some((f) => f.id === r.factId),
          r.id,
        ).toBe(true)
      if (r.statementId)
        expect(
          STATEMENTS.some((s) => s.id === r.statementId),
          r.id,
        ).toBe(true)
    }
  })
  it('revelação curta e sem travessão', () => {
    for (const r of ROUNDS) {
      expect(r.reveal.length, r.id).toBeLessThanOrEqual(110)
      for (const t of [r.q, r.reveal, r.theme]) expect(t, r.id).not.toMatch(/—/)
    }
  })
  it('número: min < resposta < max e slider coerente', () => {
    for (const r of numbers) {
      expect(r.min, r.id).toBeLessThan(r.answer)
      expect(r.answer, r.id).toBeLessThan(r.max)
      expect(r.step, r.id).toBeGreaterThan(0)
      if (r.scale === 'log') {
        expect(r.min, r.id).toBeGreaterThan(0)
        expect(r.tol, r.id).toBeGreaterThan(1)
      } else expect(r.tol, r.id).toBeGreaterThanOrEqual(0)
      expect(r.zero, r.id).toBeGreaterThan(r.tol)
      if (!natural(r)) {
        expect(pos(r), r.id).toBeGreaterThanOrEqual(0.2)
        expect(pos(r), r.id).toBeLessThanOrEqual(0.8)
      }
    }
  })
  it('número: acertar dá 100 e o pior chute dentro do slider não zera', () => {
    for (const r of numbers) {
      expect(roundScore(r, r.answer), r.id).toBe(100)
      expect(roundScore(r, r.min), r.id).toBeGreaterThanOrEqual(5)
      expect(roundScore(r, r.max), r.id).toBeGreaterThanOrEqual(5)
    }
  })
  it('escolha: índice correto dentro das opções', () => {
    for (const r of ROUNDS) {
      if (r.kind !== 'choice') continue
      expect(r.options.length, r.id).toBeGreaterThanOrEqual(2)
      expect(Number.isInteger(r.correct), r.id).toBe(true)
      expect(r.correct, r.id).toBeGreaterThanOrEqual(0)
      expect(r.correct, r.id).toBeLessThan(r.options.length)
    }
  })
  it('mapa: alvo dentro do Brasil e tolerância coerente', () => {
    for (const r of ROUNDS) {
      if (r.kind !== 'map') continue
      expect(r.target.lon, r.id).toBeGreaterThan(-74)
      expect(r.target.lon, r.id).toBeLessThan(-34)
      expect(r.target.lat, r.id).toBeGreaterThan(-34)
      expect(r.target.lat, r.id).toBeLessThan(6)
      expect(r.zeroKm, r.id).toBeGreaterThan(r.tolKm)
    }
  })
})

describe('rounds: calendário', () => {
  it('cada dia tem 5 ids existentes, distintos e só com review ok', () => {
    for (const [date, ids] of Object.entries(CALENDAR)) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(ids.length, date).toBe(5)
      expect(new Set(ids).size, date).toBe(5)
      for (const id of ids) {
        const r = byId.get(id)
        expect(r, `${date} ${id}`).toBeDefined()
        expect(r?.review, `${date} ${id}`).toBe('ok')
      }
    }
  })
  it('roundsFor devolve 5 rodadas ok e distintas para qualquer data', () => {
    const dates = [
      ...Object.keys(CALENDAR),
      '2026-10-20',
      '2026-11-01',
      '2026-12-31',
      '2027-02-29',
      'lixo',
      '',
    ]
    for (let d = 0; d < 60; d++) dates.push(new Date(Date.UTC(2026, 9, 26 + d)).toISOString().slice(0, 10))
    for (const date of dates) {
      const rs = roundsFor(date)
      expect(rs.length, date).toBe(5)
      expect(new Set(rs.map((r) => r.id)).size, date).toBe(5)
      for (const r of rs) expect(r.review, `${date} ${r.id}`).toBe('ok')
    }
  })
  it('fallback é determinístico e fecha com um Fato ou Fake', () => {
    const a = roundsFor('2026-11-15').map((r) => r.id)
    const b = roundsFor('2026-11-15').map((r) => r.id)
    expect(a).toEqual(b)
    expect(roundsFor('2026-11-15')[4]?.kind).toBe('choice')
  })
  it('calendário segue a ordem de jogo de CALENDAR', () => {
    for (const [date, ids] of Object.entries(CALENDAR)) expect(roundsFor(date).map((r) => r.id)).toEqual(ids)
  })
})
