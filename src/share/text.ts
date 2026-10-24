// Textos de compartilhamento (WhatsApp primeiro). URL sempre na última linha para gerar o preview.
// Sem travessão. O plano de domingo nunca entra em texto: só na imagem que a pessoa escolher mandar.
import { CONFIG } from '../config'
import { emoji, MAX_TOTAL } from '../lib/score'
import { getSave, shareLink } from '../state/save'
import type { Moment } from './types'

const fmtInt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(n))

/** Acrescenta a superfície de origem (`s=wa`, `s=link`...) para atribuição. */
export function withSurface(url: string, s: string) {
  return `${url}${url.includes('?') ? '&' : '?'}s=${encodeURIComponent(s)}`
}

/**
 * Link do Chuta Aí #n, com a corrente `r` por padrão (na arte vai sem, para caber e ser digitável).
 * A rota `/c/:n` do worker, quando existir, redireciona para cá.
 */
export function chuteLink(n: number, withRef = true) {
  return `${CONFIG.siteUrl}/?c=${n}${withRef ? `&r=${getSave().id}` : ''}`
}

/**
 * Linha-gancho do Chuta Aí (VIRAL-DESIGN §2.5), sem números e sem spoiler.
 * `theme` pode ser um tema só ou a lista de temas das 5 rodadas (aí escolhemos o pior ou o cravado).
 */
export function chuteHook(s: number[], theme: string | string[], withEmoji = true) {
  const themes = Array.isArray(theme) ? theme : s.map(() => theme)
  let worst = -1
  for (let i = 0; i < s.length; i++)
    if ((s[i] ?? 100) < 35 && (worst < 0 || (s[i] ?? 0) < (s[worst] ?? 0))) worst = i
  const bull = s.indexOf(100)
  const tw = themes[worst]
  const tb = themes[bull]
  if (worst >= 0 && tw)
    return withEmoji ? `Errei ${tw} feio 😅 Quanto você chuta?` : `Errei ${tw} feio. Quanto você chuta?`
  if (bull >= 0 && tb) return withEmoji ? `Cravei ${tb} 🎯 Duvido você.` : `Cravei ${tb}. Duvido você.`
  return 'Quase gabaritei. Tira-teima?'
}

/**
 * Texto do Chuta Aí para o WhatsApp (VIRAL-DESIGN §2.5):
 *   Chuta Aí #5 · 1.040 de 1.300
 *   🎯🟩🟨🟥🟩
 *   Errei o desemprego feio 😅 Quanto você chuta?
 *   🔥 3 dias
 *   jogo.com.br/c/5?d=K7Q2PX&s=wa
 */
export function chuteShareText(
  n: number,
  s: number[],
  total: number,
  theme: string | string[],
  link: string,
  streak = getSave().daily.streak,
) {
  const lines = [
    `Chuta Aí #${n} · ${fmtInt(total)} de ${fmtInt(MAX_TOTAL)}`,
    s.map((v) => emoji(v)).join(''),
    chuteHook(s, theme),
  ]
  if (streak > 1) lines.push(`🔥 ${streak} dias`)
  lines.push(link)
  return lines.join('\n')
}

/** Texto curto que acompanha cada momento no WhatsApp (sem o link; quem chama acrescenta). */
export function momentText(m: Moment): string {
  switch (m.kind) {
    case 'stars3':
      return `Fiz 3 estrelas na fase ${m.level} do Nível 13 (${m.title}): ${fmtInt(m.score)} pontos. Você faz melhor?`
    case 'ir':
      return `Com a isenção do IR eu economizo R$ ${fmtInt(m.perYear)} por ano. Faça a sua conta no jogo:`
    case 'nivel13':
      return 'Cheguei ao nível 13! 13 fases curtas, tudo com fonte. Você chega?'
    case 'daily': {
      const hits = m.grid.filter(Boolean).length
      const grid = m.grid.map((ok) => (ok ? '🟩' : '🟥')).join('')
      const streak = m.streak > 1 ? `\n🔥 ${m.streak} dias seguidos` : ''
      return `Fato ou Fake #${m.n} 🇧🇷 ${hits}/${m.grid.length}\n${grid}${streak}`
    }
    case 'movimento':
      return m.escolha === 'virei'
        ? `Virei meu voto: 13. ${CONFIG.electionLabel}. Confira os fatos no jogo:`
        : `Eu vou votar 13. ${CONFIG.electionLabel}. Confira os fatos no jogo:`
    case 'convite':
      return 'Joga comigo? 13 fases, fatos com fonte e um desafio por dia. Você chega ao nível 13?'
    case 'chute':
      return [
        `Chuta Aí #${m.n} · ${fmtInt(m.total)} de ${fmtInt(MAX_TOTAL)}`,
        m.s.map((v) => emoji(v)).join(''),
        chuteHook(m.s, m.theme),
      ].join('\n')
    case 'plano':
      // nada do plano sai em texto
      return `Já fiz o meu plano para votar: ${CONFIG.electionLabel}. E você, já fez o seu?`
  }
}

/** Link que acompanha o momento (com a corrente). */
export function momentLink(m: Moment) {
  return m.kind === 'chute' ? chuteLink(m.n) : shareLink()
}
