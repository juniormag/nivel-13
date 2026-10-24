import { describe, expect, it } from 'vitest'
import { clamp, hashStr, lerp, mulberry32, shuffle } from '../src/lib/rng'

const take = (rnd: () => number, n: number) => Array.from({ length: n }, rnd)

describe('mulberry32', () => {
  it('é determinístico pela semente', () => {
    expect(take(mulberry32(42), 5)).toEqual(take(mulberry32(42), 5))
    expect(take(mulberry32(42), 5)).not.toEqual(take(mulberry32(43), 5))
  })

  it('fica em [0, 1) e espalha bem', () => {
    const xs = take(mulberry32(2026), 10000)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThan(1)
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    expect(mean).toBeGreaterThan(0.48)
    expect(mean).toBeLessThan(0.52)
  })

  it('valor de referência estável (não muda o Desafio do Dia entre versões)', () => {
    expect(mulberry32(1)()).toBeCloseTo(0.6270739405881613, 12)
  })

  it('aceita semente negativa ou fracionária como uint32', () => {
    expect(take(mulberry32(-1), 3)).toEqual(take(mulberry32(0xffffffff), 3))
  })
})

describe('hashStr', () => {
  it('é estável e devolve uint32', () => {
    expect(hashStr('2026-10-24')).toBe(hashStr('2026-10-24'))
    expect(hashStr('a')).not.toBe(hashStr('b'))
    const h = hashStr('nivel13')
    expect(Number.isInteger(h) && h >= 0 && h <= 0xffffffff).toBe(true)
    expect(hashStr('')).toBe(2166136261)
  })
})

describe('shuffle', () => {
  const base = Array.from({ length: 20 }, (_, i) => i)

  it('é uma permutação e não altera o original', () => {
    const copy = base.slice()
    const out = shuffle(base, mulberry32(7))
    expect(base).toEqual(copy)
    expect(out).not.toBe(base)
    expect(out.slice().sort((a, b) => a - b)).toEqual(base)
    expect(out).not.toEqual(base)
  })

  it('mesma semente, mesma ordem', () => {
    expect(shuffle(base, mulberry32(99))).toEqual(shuffle(base, mulberry32(99)))
    expect(shuffle(base, mulberry32(99))).not.toEqual(shuffle(base, mulberry32(100)))
  })

  it('lida com vazio e um item', () => {
    expect(shuffle([], mulberry32(1))).toEqual([])
    expect(shuffle(['x'], mulberry32(1))).toEqual(['x'])
  })
})

describe('clamp e lerp', () => {
  it('funcionam nos limites', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
})
