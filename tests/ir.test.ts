// Conta do IR (Lei 15.270/2025). O módulo src/games/ir.ts é portado em paralelo por outro agente:
// enquanto ele não exportar economiaIR, reducao e tabela, estes testes ficam marcados como pulados.
import { describe, expect, it } from 'vitest'

type IR = {
  economiaIR(s: number): { antes: number; agora: number; mes: number; ano: number }
  reducao(r: number): number
  tabela(b: number): number
}

const path = '../src/games/ir'
let mod: Partial<IR> | null = null
let why = ''
try {
  mod = (await import(/* @vite-ignore */ path)) as Partial<IR>
} catch (err) {
  why = String(err).split('\n')[0] ?? ''
}
const ready = !!(mod?.economiaIR && mod.reducao && mod.tabela)
// arquivo ausente: pula; arquivo presente que quebra ao importar em Node: falha (a conta deve ser importável sem DOM)
const missing = !mod && /cannot find|failed to load|does not exist|not found/i.test(why)
const ir = mod as IR

it.skipIf(ready || missing)('src/games/ir.ts importa em Node e exporta economiaIR, reducao e tabela', () => {
  expect(why, 'erro ao importar src/games/ir.ts').toBe('')
  expect(Object.keys(mod ?? {})).toEqual(expect.arrayContaining(['economiaIR', 'reducao', 'tabela']))
})

describe.skipIf(!ready)('economiaIR', () => {
  it('R$ 5.000: zera o imposto, economia de R$ 312,89 por mês e R$ 4.067,57 por ano', () => {
    const r = ir.economiaIR(5000)
    expect(r.mes).toBeCloseTo(312.89, 2)
    expect(r.ano).toBeCloseTo(4067.57, 2)
    expect(r.agora).toBeCloseTo(0, 2)
  })

  it('R$ 4.000: economia igual ao imposto que pagava (≈ R$ 114,76)', () => {
    const r = ir.economiaIR(4000)
    expect(r.mes).toBeCloseTo(114.76, 2)
    expect(r.agora).toBeCloseTo(0, 2)
  })

  it('R$ 6.000: redução parcial (≈ R$ 179,75)', () => {
    const r = ir.economiaIR(6000)
    expect(r.mes).toBeCloseTo(179.75, 2)
    expect(r.agora).toBeGreaterThan(0)
  })

  it('R$ 8.000: sem redução', () => {
    expect(ir.economiaIR(8000).mes).toBe(0)
  })

  it('isento antes continua sem economia', () => {
    expect(ir.economiaIR(2000)).toMatchObject({ antes: 0, agora: 0, mes: 0, ano: 0 })
  })

  it('o ano conta 13 salários', () => {
    for (const s of [3000, 4500, 5000, 6000, 7000]) {
      const r = ir.economiaIR(s)
      expect(r.ano).toBeCloseTo(r.mes * 13, 6)
    }
  })
})

describe.skipIf(!ready)('reducao e tabela', () => {
  it('reducao nas faixas da lei', () => {
    expect(ir.reducao(5000)).toBeCloseTo(312.89, 2)
    expect(ir.reducao(7350)).toBeCloseTo(0, 1)
    expect(ir.reducao(7351)).toBe(0)
  })

  it('tabela mensal de 2025', () => {
    expect(ir.tabela(2428.8)).toBe(0)
    expect(ir.tabela(4392.8)).toBeCloseTo(312.89, 2)
  })
})
