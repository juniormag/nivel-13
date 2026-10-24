// Textos e envio do Chuta Aí (VIRAL-DESIGN §2.5). URL sempre na última linha para gerar o preview.
// Envio: navigator.share({ text }) e, sem ele, wa.me. Nunca em modal, nunca no meio da rodada.
import { CONFIG } from '../config'
import { emoji, MAX_TOTAL } from '../lib/score'
import { getSave } from '../state/save'
import { encodeDuel } from './duel'
import { fmtInt } from './format'

export function chuteUrl(n: number, opts: { duel?: string; group?: string | null; s?: string } = {}) {
  // /c/<n> é servido pelo Worker com o OG certo e redireciona para /?c=<n>&...
  const p = new URLSearchParams()
  if (opts.duel) p.set('d', opts.duel)
  if (opts.group) p.set('g', opts.group)
  p.set('r', getSave().id)
  if (opts.s) p.set('s', opts.s)
  return `${CONFIG.siteUrl}/c/${n}?${p.toString()}`
}

export const myDuelToken = (n: number, s: number[]) => encodeDuel(n, s, getSave().name)

/** Linha-gancho sem números e sem spoiler. */
export function hookLine(s: number[], themes: string[]) {
  let worst = -1
  s.forEach((v, i) => {
    if (v < 35 && (worst < 0 || v < (s[worst] ?? 100))) worst = i
  })
  if (worst >= 0 && themes[worst]) return `Errei ${themes[worst]} feio 😅 Quanto você chuta?`
  const bull = s.indexOf(100)
  if (bull >= 0 && themes[bull]) return `Cravei ${themes[bull]} 🎯 Duvido você.`
  return 'Quase gabaritei. Tira-teima?'
}

export const grid = (s: number[]) => s.map((v) => emoji(v)).join('')

export function groupText(n: number, s: number[], total: number, themes: string[], link: string) {
  const streak = getSave().daily.streak
  return [
    `Chuta Aí! #${n} · ${fmtInt(total)}/${fmtInt(MAX_TOTAL)}`,
    grid(s),
    hookLine(s, themes),
    ...(streak > 1 ? [`🔥 ${streak} dias`] : []),
    link,
  ].join('\n')
}

export function duelText(n: number, total: number, link: string) {
  return [`Tira-teima no Chuta Aí! #${n}`, `Fiz ${fmtInt(total)}. Você faz mais?`, link].join('\n')
}

export function rematchText(
  n: number,
  me: { s: number[]; total: number },
  them: { s: number[]; total: number; name: string },
  link: string,
) {
  return [
    `Tira-teima Chuta Aí! #${n}`,
    `Eu ${fmtInt(me.total)} x ${fmtInt(them.total)} ${them.name || 'você'}`,
    grid(me.s),
    grid(them.s),
    'Revanche amanhã?',
    link,
  ].join('\n')
}

/** Abre a folha do sistema ou o WhatsApp. Devolve 'shared' | 'wa' | 'abort'. */
export async function sendText(text: string): Promise<'shared' | 'wa' | 'abort'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text })
      return 'shared'
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return 'abort'
  }
  openWhatsApp(text)
  return 'wa'
}

export function openWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
