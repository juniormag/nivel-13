import { describe, expect, it } from 'vitest'
import { curve, emoji, haversineKm, MAX_TOTAL, roundScore, total } from '../src/lib/score'

describe('score', () => {
  it('curva: dentro da tolerância é 100, longe demais é o piso 5', () => {
    expect(curve(0)).toBe(100)
    expect(curve(-1)).toBe(100)
    expect(curve(1)).toBe(5)
    expect(curve(5)).toBe(5)
  })
  it('linear: IR até R$ 5 mil', () => {
    const r = { kind: 'number' as const, answer: 5000, scale: 'lin' as const, tol: 250, zero: 5000 }
    expect(roundScore(r, 5100)).toBe(100)
    expect(roundScore(r, 2500)).toBeGreaterThan(20)
    expect(roundScore(r, 2500)).toBeLessThan(70)
    expect(roundScore(r, 15000)).toBe(5)
  })
  it('log: abstenção de 33,4 mi com ±10%', () => {
    const r = { kind: 'number' as const, answer: 33_400_000, scale: 'log' as const, tol: 1.1, zero: 4 }
    expect(roundScore(r, 31_000_000)).toBe(100)
    expect(roundScore(r, 10_000_000)).toBeLessThan(40)
    expect(roundScore(r, 0)).toBe(5)
  })
  it('escolha e sem resposta', () => {
    expect(roundScore({ kind: 'choice', correct: 1 }, 1)).toBe(100)
    expect(roundScore({ kind: 'choice', correct: 1 }, 0)).toBe(5)
    expect(roundScore({ kind: 'choice', correct: 1 }, null)).toBe(5)
  })
  it('mapa: Brasília–São Paulo ~870 km', () => {
    const km = haversineKm({ lon: -47.9, lat: -15.8 }, { lon: -46.6, lat: -23.5 })
    expect(km).toBeGreaterThan(820)
    expect(km).toBeLessThan(900)
  })
  it('total e emoji', () => {
    expect(MAX_TOTAL).toBe(1300)
    expect(total([100, 100, 100, 100, 100])).toBe(1300)
    expect(emoji(100)).toBe('🎯')
    expect(emoji(70)).toBe('🟩')
    expect(emoji(35)).toBe('🟨')
    expect(emoji(10)).toBe('🟥')
  })
})
