// Números do Chuta Aí: formatação PT-BR, escala do slider (lin/log) e a frase da distância.
import { bucket as linBucket } from '../lib/score'
import type { NumberRound, PlayRound } from './rounds'

const nf = (max: number, min = 0) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max, minimumFractionDigits: min })

export const fmtInt = (n: number) => nf(0).format(Math.round(n))

const decimals = (step: number) => (step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9)))

/** "15,6 milhões", "850 mil", "1 milhão". */
export function fmtMi(v: number) {
  if (v >= 1e9) return `${nf(1).format(v / 1e9)} ${v / 1e9 < 2 ? 'bilhão' : 'bilhões'}`
  if (v >= 1e6) return `${nf(1).format(v / 1e6)} ${v / 1e6 < 2 ? 'milhão' : 'milhões'}`
  if (v >= 1e3) return `${nf(0).format(v / 1e3)} mil`
  return fmtInt(v)
}

/** Valor grande do slider e da revelação. */
export function fmtValue(r: NumberRound, v: number) {
  const d = decimals(r.step)
  switch (r.fmt) {
    case 'pct':
      return `${nf(d).format(v)}%`
    case 'brl':
      return `R$ ${nf(d).format(v)}`
    case 'year':
      return String(Math.round(v))
    case 'mi':
      return fmtMi(v)
    default:
      return nf(d).format(v)
  }
}

/** Legenda pequena sob o número ("por mês", "pessoas", "anos"). */
export function unitCaption(r: NumberRound) {
  switch (r.unit) {
    case '%':
    case 'R$':
    case 'ano':
      return ''
    case 'R$/mês':
      return 'por mês'
    case 'R$/ano':
      return 'por ano'
    default:
      return r.unit
  }
}

export const valueText = (r: NumberRound, v: number) =>
  [fmtValue(r, v), unitCaption(r)].filter(Boolean).join(' ')

// ---------------------------------------------------------------- escala

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/** 2 algarismos significativos, para a escala log não mostrar 15.734.211. */
function nice(v: number, step: number) {
  if (v <= 0) return step
  const p = 10 ** (Math.floor(Math.log10(v)) - 1)
  return Math.max(step, Math.round(v / p) * p)
}

export function posToValue(r: NumberRound, pos: number) {
  const p = clamp01(pos)
  if (r.scale === 'log') {
    const lo = Math.log(r.min)
    const hi = Math.log(r.max)
    return Math.min(r.max, Math.max(r.min, nice(Math.exp(lo + p * (hi - lo)), r.step)))
  }
  const raw = r.min + p * (r.max - r.min)
  const snapped = Math.round(raw / r.step) * r.step
  return Number(Math.min(r.max, Math.max(r.min, snapped)).toFixed(decimals(r.step)))
}

export function valueToPos(r: NumberRound, v: number) {
  if (r.scale === 'log') {
    const lo = Math.log(r.min)
    const hi = Math.log(r.max)
    return clamp01((Math.log(Math.max(r.min, v)) - lo) / (hi - lo))
  }
  return clamp01((v - r.min) / (r.max - r.min))
}

/** Um passo para cima ou para baixo (setas e botões −/+). Na escala log, anda 1% da régua. */
export function stepValue(r: NumberRound, v: number, dir: 1 | -1, big = false) {
  if (r.scale === 'log') {
    let p = valueToPos(r, v)
    for (let k = 1; k < 40; k++) {
      const next = posToValue(r, p + dir * (big ? 0.1 : 0.01) * k)
      if (next !== v) return next
    }
    p = dir > 0 ? 1 : 0
    return posToValue(r, p)
  }
  const s = big ? Math.max(r.step, (r.max - r.min) / 10) : r.step
  const next = v + dir * s
  return Number(
    Math.min(r.max, Math.max(r.min, Math.round(next / r.step) * r.step)).toFixed(decimals(r.step)),
  )
}

/** Começa no meio da régua, nunca perto da resposta (anti-ancoragem). */
export const startValue = (r: NumberRound) => posToValue(r, 0.5)

// ---------------------------------------------------------------- frases

/** "5,7 pontos acima", "R$ 2.000 abaixo", "2,1 vezes acima", "3 anos antes". Vazio quando cravou. */
export function distanceText(r: NumberRound, guess: number) {
  const diff = guess - r.answer
  if (Math.abs(diff) < r.step / 2) return ''
  const up = diff > 0
  if (r.fmt === 'year') {
    const y = Math.abs(Math.round(diff))
    return `${y} ${y === 1 ? 'ano' : 'anos'} ${up ? 'depois' : 'antes'}`
  }
  if (r.scale === 'log') {
    const ratio = up ? guess / r.answer : r.answer / guess
    if (ratio >= 1.5) return `${nf(1).format(ratio)} vezes ${up ? 'acima' : 'abaixo'}`
    return `${fmtInt(Math.abs(diff / r.answer) * 100)}% ${up ? 'acima' : 'abaixo'}`
  }
  const d = decimals(r.step)
  const abs = Math.abs(diff)
  if (r.fmt === 'pct') {
    const pts = nf(d).format(abs)
    return `${pts} ${abs === 1 ? 'ponto' : 'pontos'} ${up ? 'acima' : 'abaixo'}`
  }
  if (r.fmt === 'brl') return `R$ ${nf(d).format(abs)} ${up ? 'acima' : 'abaixo'}`
  const unit = r.unit && r.unit !== '%' ? ` ${r.unit}` : ''
  return `${nf(d).format(abs)}${unit} ${up ? 'acima' : 'abaixo'}`
}

/** Faixa −10..10 do erro para o "Brasil chutou" (na escala log, mede na régua log). */
export function guessBucket(r: PlayRound, guess: number | null): number {
  if (guess === null) return 0
  if (r.kind === 'choice') return guess === r.correct ? 0 : Math.max(-10, Math.min(10, guess - r.correct))
  if (r.scale === 'log')
    return linBucket(Math.log(Math.max(1, guess)), Math.log(r.answer), Math.log(r.min), Math.log(r.max))
  return linBucket(guess, r.answer, r.min, r.max)
}
