// Ações do save (zustand). Em Node, tests/setup.ts fornece location e um localStorage em memória.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { currentLevel, getSave, levelsDone, useSave, xpTotal } from '../src/state/save'

const br = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)

beforeEach(() => getSave().reset())
afterEach(() => vi.useRealTimers())

describe('estado inicial', () => {
  it('cria id válido para a API e 13 fases zeradas', () => {
    const s = getSave()
    expect(s.id).toMatch(/^[a-z0-9]{6,16}$/)
    expect(s.stars).toHaveLength(13)
    expect(levelsDone()).toBe(0)
    expect(currentLevel()).toBe(1)
  })
})

describe('completeLevel', () => {
  it('marca primeira vez, guarda estrelas e cartas sem repetir', () => {
    const r1 = getSave().completeLevel(1, 2, 900, ['fome'])
    expect(r1).toEqual({ firstTime: true })
    let s = getSave()
    expect(s.stars[0]).toBe(2)
    expect(s.best[0]).toBe(900)
    expect(s.cards).toEqual(['fome'])
    expect(currentLevel()).toBe(2)

    const r2 = getSave().completeLevel(1, 1, 500, ['fome', 'checagem'])
    expect(r2).toEqual({ firstTime: false })
    s = getSave()
    expect(s.stars[0]).toBe(2)
    expect(s.best[0]).toBe(900)
    expect(s.cards).toEqual(['fome', 'checagem'])

    getSave().completeLevel(1, 3, 1200, [])
    expect(getSave().stars[0]).toBe(3)
    expect(getSave().best[0]).toBe(1200)
  })

  it('zero estrela não conta como concluída', () => {
    expect(getSave().completeLevel(3, 0, 100, [])).toEqual({ firstTime: false })
    expect(levelsDone()).toBe(0)
  })

  it('XP sobe com as fases e tem teto', () => {
    getSave().completeLevel(1, 3, 0, [])
    expect(xpTotal()).toBe(500 + 3 * 166)
    for (let n = 1; n <= 13; n++) getSave().completeLevel(n, 3, 0, [])
    expect(currentLevel()).toBe(13)
    expect(xpTotal()).toBeLessThanOrEqual(13000)
  })
})

describe('recordDaily', () => {
  it('começa a sequência em 1, soma no dia seguinte e zera depois de pular um dia', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const d1 = new Date('2026-10-21T15:00:00Z')
    vi.setSystemTime(d1)
    getSave().recordDaily(br(d1), '🟩🟩🟥🟩🟩')
    expect(getSave().daily).toEqual({
      last: '2026-10-21',
      streak: 1,
      results: { '2026-10-21': '🟩🟩🟥🟩🟩' },
    })

    const d2 = new Date('2026-10-22T15:00:00Z')
    vi.setSystemTime(d2)
    getSave().recordDaily(br(d2), '🟩🟩🟩🟩🟩')
    expect(getSave().daily.streak).toBe(2)

    const d3 = new Date('2026-10-23T15:00:00Z')
    vi.setSystemTime(d3)
    getSave().recordDaily(br(d3), '🟥🟩🟩🟩🟩')
    expect(getSave().daily.streak).toBe(3)

    const d5 = new Date('2026-10-25T15:00:00Z')
    vi.setSystemTime(d5)
    getSave().recordDaily(br(d5), '🟩🟩🟩🟩🟩')
    expect(getSave().daily.streak).toBe(1)
    expect(Object.keys(getSave().daily.results)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-25',
    ])
  })

  it('usa o dia de Brasília: 23h30 em Brasília ainda é o mesmo dia', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    useSave.setState({ daily: { last: '2026-10-21', streak: 4, results: {} } })
    // 02:30Z do dia 23 = 23:30 do dia 22 em Brasília; ontem (BR) = 21
    vi.setSystemTime(new Date('2026-10-23T02:30:00Z'))
    getSave().recordDaily('2026-10-22', 'x')
    expect(getSave().daily.streak).toBe(5)
  })
})

describe('like', () => {
  it('curte uma vez por fato', () => {
    expect(getSave().like('ir')).toBe(true)
    expect(getSave().like('ir')).toBe(false)
    expect(getSave().liked).toEqual(['ir'])
  })
})
