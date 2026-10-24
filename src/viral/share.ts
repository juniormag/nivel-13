// Textos e envio do Chuta Aí (VIRAL-DESIGN §2.5). URL sempre na última linha para gerar o preview.
// Envio: navigator.share({ text }) e, sem ele, wa.me. Nunca em modal, nunca no meio da rodada.
import { CONFIG } from '../config'
import { emoji } from '../lib/score'
import { chuteShareText } from '../share/text'
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

export const grid = (s: number[]) => s.map((v) => emoji(v)).join('')

/** Texto principal (§2.5): formato e linha-gancho vêm do módulo de share; o link (com duelo e grupo) é nosso. */
export const groupText = (n: number, s: number[], total: number, themes: string[], link: string) =>
  chuteShareText(n, s, total, themes, link)

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
