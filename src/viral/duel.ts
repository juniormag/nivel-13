// Tira-teima sem backend (VIRAL-DESIGN §5.4): token autossuficiente no link.
//   v1.<n>.<5 notas em base36, 2 caracteres cada>.<apelido opcional>
//   ex.: ?d=v1.5.2s2s1e0r2s.Junior
// Adulterar o token não traz vantagem nenhuma (é jogo, sem prêmio). Quando o backend entrar, o cliente
// aceita também o código de 6 caracteres e resolve pela API.
import { cleanName } from '../app/screens/Onboard'

export const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/
const TOKEN_RE = /^v1\.(\d{1,4})\.([0-9a-z]{10})(?:\.(.{0,48}))?$/

export interface DuelInfo {
  /** número do Chuta Aí que o duelo fixa */
  n: number
  s: number[]
  name: string
  /** token ou código original, para guardar em save.duels */
  raw: string
  /** código do servidor (6 letras), quando o duelo veio dele: a resposta conta como aceite */
  code?: string
}

const clampScore = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

export function encodeDuel(n: number, s: number[], name: string) {
  const notes = s
    .slice(0, 5)
    .map((v) => clampScore(v).toString(36).padStart(2, '0'))
    .join('')
  const nick = cleanName(name).replace(/\./g, '')
  return `v1.${n}.${notes}${nick ? `.${nick}` : ''}`
}

export function decodeDuel(raw: string | null | undefined): DuelInfo | null {
  if (!raw) return null
  const m = TOKEN_RE.exec(raw.trim())
  if (!m) return null
  const n = Number(m[1])
  const notes = m[2] ?? ''
  const s: number[] = []
  for (let i = 0; i < 10; i += 2) {
    const v = Number.parseInt(notes.slice(i, i + 2), 36)
    if (!Number.isFinite(v) || v < 0 || v > 100) return null
    s.push(v)
  }
  if (n < 1) return null
  return { n, s, name: cleanName(m[3] ?? ''), raw: raw.trim() }
}

export const isDuelCode = (raw: string | null | undefined) => !!raw && CODE_RE.test(raw)
export const isGroupCode = (raw: string | null | undefined) => !!raw && CODE_RE.test(raw)
