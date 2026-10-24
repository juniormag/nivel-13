// Convence o Tio: regras puras (src/modes/tio/logic.ts), o retrato em pixels e as regras do conteúdo.
import { describe, expect, it } from 'vitest'
import { PARENTES, TIO_MSGS, type TioMsg } from '../src/content/tio'
import { PALETTE } from '../src/lib/palette'
import { FACE, faceGrid } from '../src/modes/tio/faces'
import { FIX_MSGS, FIX_PARENTES } from '../src/modes/tio/fixture'
import {
  cardOrders,
  challengeLink,
  emojiGrid,
  familyText,
  isParenteId,
  type Mark,
  mainTip,
  msgsOf,
  PARENTE_IDS,
  ROUNDS,
  resultText,
  selectPool,
  typingMs,
  won,
} from '../src/modes/tio/logic'

const real = { parentes: PARENTES, msgs: TIO_MSGS }
const fix = { parentes: FIX_PARENTES, msgs: FIX_MSGS }

describe('selectPool', () => {
  it('produção: só review ok e nunca a fixture', () => {
    const pend: TioMsg = { ...(TIO_MSGS[0] as TioMsg), id: 'x', review: 'pendente' }
    const p = selectPool({ parentes: PARENTES, msgs: [...TIO_MSGS, pend] }, fix, { dev: false, prod: true })
    expect(p.fixture).toBe(false)
    expect(p.msgs.every((m) => m.review === 'ok')).toBe(true)
    expect(p.msgs.some((m) => m.id === 'x')).toBe(false)
    const empty = selectPool({ parentes: PARENTES, msgs: [] }, fix, { dev: false, prod: true })
    expect(empty.msgs).toHaveLength(0)
    expect(empty.parentes).toHaveLength(0)
  })
  it('dev sem conteúdo: fixture marcada como exemplo', () => {
    const p = selectPool({ parentes: PARENTES, msgs: [] }, fix, { dev: true, prod: false })
    expect(p.fixture).toBe(true)
    expect(p.parentes).toHaveLength(1)
    expect(p.msgs).toHaveLength(3)
    for (const m of p.msgs) expect(m.doubt).toMatch(/exemplo/)
  })
  it('dev com conteúdo: usa o real', () => {
    expect(selectPool(real, fix, { dev: true, prod: false }).fixture).toBe(false)
  })
})

describe('conteúdo do fact-checker (contrato do modo)', () => {
  const pool = selectPool(real, fix, { dev: false, prod: true })
  it('cada parente revisado tem até 5 mensagens', () => {
    for (const p of pool.parentes) {
      const ms = msgsOf(pool, p.id)
      expect(ms.length).toBeGreaterThan(0)
      expect(ms.length).toBeLessThanOrEqual(ROUNDS)
    }
  })
  it('a boa tem fonte; a armadilha tem lição e não traz número', () => {
    for (const m of pool.msgs) {
      expect(m.good.kind).toBe('fato')
      expect(m.good.source?.url).toMatch(/^https:\/\//)
      expect(m.trap.kind).not.toBe('fato')
      expect(m.trap.why?.length ?? 0).toBeGreaterThan(5)
      // armadilha nunca traz número (nem falso nem verdadeiro): erra no tom, na fonte ou no assunto
      expect(m.trap.text).not.toMatch(/\d/)
    }
  })
  it('sem travessão no texto do modo', () => {
    for (const m of pool.msgs)
      for (const s of [m.doubt, m.good.text, m.trap.text, m.trap.why ?? '', m.react.good, m.react.bad])
        expect(s).not.toContain('—')
  })
})

describe('regras', () => {
  it('isParenteId', () => {
    expect(isParenteId('tio')).toBe(true)
    expect(isParenteId('chefe')).toBe(false)
    expect(isParenteId(undefined)).toBe(false)
    expect(PARENTE_IDS).toHaveLength(5)
  })
  it('ordem das cartas sem 3 iguais seguidas', () => {
    const o = cardOrders(5, () => 0.1)
    expect(o.includes(false)).toBe(true)
    for (let i = 2; i < o.length; i++) expect(o[i] === o[i - 1] && o[i] === o[i - 2]).toBe(false)
  })
  it('vence com 4 de 5', () => {
    const m = (s: string) => [...s].map((c) => (c === 'g' ? 'good' : 'trap')) as Mark[]
    expect(won(m('ggggt'))).toBe(true)
    expect(won(m('gggtt'))).toBe(false)
    expect(emojiGrid(m('gtg'))).toBe('🟩🟥🟩')
  })
  it('dica principal: a armadilha que mais se repetiu', () => {
    const ms = msgsOf(selectPool(real, fix, { dev: false, prod: true }), 'tio')
    if (ms.length < 5) return
    const tip = mainTip(ms, ['trap', 'good', 'good', 'trap', 'good'])
    expect(tip).toBe(ms[0]?.trap.why)
    expect(mainTip(ms, ['good', 'good', 'good', 'good', 'good'])).toBeNull()
  })
  it('digitando entre 600 e 900 ms', () => {
    expect(typingMs('')).toBe(600)
    expect(typingMs('x'.repeat(500))).toBe(900)
  })
})

describe('textos de share', () => {
  const p = PARENTES[0]
  const ms = msgsOf({ msgs: TIO_MSGS }, 'tio')
  it('link do desafio abre o parente', () => {
    expect(challengeLink('https://jogo.com.br/', 'tia', 'abc', 'wa')).toBe(
      'https://jogo.com.br/?t=tia&r=abc&s=wa',
    )
  })
  it('mensagem da família: 5 respostas boas, fontes e link na última linha', () => {
    if (!p) return
    const t = familyText(p, ms, 'https://jogo.com.br/?t=tio')
    for (const m of ms) {
      expect(t).toContain(m.good.text)
      if (m.good.source) expect(t).toContain(m.good.source.url)
      expect(t).not.toContain(m.trap.text)
    }
    expect(t.split('\n').at(-1)).toBe('https://jogo.com.br/?t=tio')
    expect(t).not.toContain('—')
  })
  it('resultado: manchete, grade e desafio', () => {
    if (!p) return
    const t = resultText(p, ['good', 'good', 'trap', 'good', 'good'], 'L')
    expect(t).toBe('Convenci o Tio Zé em 5 mensagens 💬\n🟩🟩🟥🟩🟩\nDuvido você convencer o Tio Zé.\nL')
  })
})

describe('retratos', () => {
  it('20×20, só cores da paleta, 3 expressões diferentes', () => {
    for (const id of PARENTE_IDS) {
      const seen = new Set<string>()
      for (const e of ['neutro', 'pensando', 'fechado'] as const) {
        const g = faceGrid(id, e)
        expect(g).toHaveLength(FACE)
        for (const row of g) {
          expect(row).toHaveLength(FACE)
          for (const c of row) if (c) expect(c in PALETTE).toBe(true)
        }
        seen.add(JSON.stringify(g))
      }
      expect(seen.size).toBe(3)
    }
  })
})
