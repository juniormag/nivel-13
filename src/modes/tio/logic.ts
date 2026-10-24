// Convence o Tio (docs/MODOS-NOVOS.md §1): regras puras do modo, sem DOM. Testes em tests/tio.test.ts.
// O conteúdo vem de src/content/tio.ts (fact-checker); aqui só se escolhe, embaralha, pontua e monta texto.
import type { Parente, ParenteId, TioMsg, TioReply } from '../../content/tio'

/** Mensagens por partida. */
export const ROUNDS = 5
/** Respostas boas para convencer (o medidor tem 5 degraus; a marca de vitória fica no 4º). */
export const WIN_AT = 4

export const PARENTE_IDS: readonly ParenteId[] = ['tio', 'tia', 'vo', 'prima', 'mae']
export const isParenteId = (v: unknown): v is ParenteId =>
  typeof v === 'string' && (PARENTE_IDS as readonly string[]).includes(v)

/** Artigo de cada parente ("Convenci o Tio Zé", "Duvido você convencer a Tia Cida"). */
const ARTIGO: Record<ParenteId, 'o' | 'a'> = { tio: 'o', tia: 'a', vo: 'o', prima: 'a', mae: 'a' }
export const comArtigo = (p: Pick<Parente, 'id' | 'name'>) => `${ARTIGO[p.id]} ${p.name}`

export interface Pool {
  parentes: Parente[]
  msgs: TioMsg[]
  /** true quando a fixture de desenvolvimento está no lugar do conteúdo real */
  fixture: boolean
}

/**
 * Escolhe o conteúdo do modo. Produção: só `review === 'ok'`. Desenvolvimento: tudo do fact-checker
 * (para ele ver o pendente) e, se não houver nada, a fixture marcada como exemplo.
 */
export function selectPool(
  real: { parentes: Parente[]; msgs: TioMsg[] },
  fixture: { parentes: Parente[]; msgs: TioMsg[] },
  env: { dev: boolean; prod: boolean },
): Pool {
  const useFixture = env.dev && !env.prod && real.msgs.length === 0
  const src = useFixture ? fixture : real
  const msgs = env.prod ? src.msgs.filter((m) => m.review === 'ok') : src.msgs
  const parentes = src.parentes.filter((p) => msgs.some((m) => m.parente === p.id))
  return { parentes, msgs, fixture: useFixture }
}

/** As mensagens do parente, na ordem do arquivo, até ROUNDS. */
export const msgsOf = (pool: Pick<Pool, 'msgs'>, id: ParenteId) =>
  pool.msgs.filter((m) => m.parente === id).slice(0, ROUNDS)

/** Ordem das 2 cartas: `true` = a boa vem primeiro. Aleatória, mas sem 3 iguais seguidas. */
export function cardOrders(n: number, rnd: () => number = Math.random): boolean[] {
  const out: boolean[] = []
  for (let i = 0; i < n; i++) {
    let v = rnd() < 0.5
    if (i >= 2 && out[i - 1] === v && out[i - 2] === v) v = !v
    out.push(v)
  }
  return out
}

export type Mark = 'good' | 'trap'

export const isGood = (r: TioReply) => r.kind === 'fato'
export const goods = (marks: Mark[]) => marks.filter((m) => m === 'good').length
export const won = (marks: Mark[], total = ROUNDS) => goods(marks) >= Math.min(WIN_AT, total)

/** 🟩 boa, 🟥 armadilha. */
export const emojiGrid = (marks: Mark[]) => marks.map((m) => (m === 'good' ? '🟩' : '🟥')).join('')

/**
 * Dica principal do fim (quando não convenceu): o `why` da armadilha que mais se repetiu
 * (empate: a primeira que caiu). Sem armadilha, null.
 */
export function mainTip(msgs: TioMsg[], marks: Mark[]): string | null {
  const count = new Map<string, { why: string; n: number }>()
  for (let i = 0; i < marks.length; i++) {
    const t = msgs[i]?.trap
    if (marks[i] !== 'trap' || !t?.why) continue
    const c = count.get(t.kind)
    if (c) c.n++
    else count.set(t.kind, { why: t.why, n: 1 })
  }
  let best: { why: string; n: number } | null = null
  for (const c of count.values()) if (!best || c.n > best.n) best = c
  return best?.why ?? null
}

/** Link do desafio: abre direto naquele parente (`?t=`), com a corrente e a superfície. */
export function challengeLink(base: string, id: ParenteId, ref?: string, s?: string) {
  const p = new URLSearchParams({ t: id })
  if (ref) p.set('r', ref)
  if (s) p.set('s', s)
  return `${base.replace(/\/$/, '')}/?${p.toString()}`
}

/**
 * "Mandar no grupo da família": as 5 respostas boas do parente, cada uma com a dúvida e a fonte,
 * e o link na última linha (preview do WhatsApp). Nada de placar aqui: é conversa, não jogo.
 */
export function familyText(p: Parente, msgs: TioMsg[], link: string) {
  const blocks = msgs.map((m) => {
    const src = m.good.source
    return [`💬 ${m.doubt}`, `✅ ${m.good.text}`, src ? `Fonte: ${src.name} (${src.date}) ${src.url}` : '']
      .filter(Boolean)
      .join('\n')
  })
  return [
    `Separei ${msgs.length === 1 ? 'uma resposta' : `${msgs.length} respostas`} com fonte pra nossa conversa de família 💬`,
    ...blocks,
    `Achei num joguinho em que a gente tenta convencer ${comArtigo(p)}. Tenta você:`,
    link,
  ].join('\n\n')
}

/** Texto do resultado (folha de compartilhar): manchete, grade e desafio. */
export function resultText(p: Parente, marks: Mark[], link: string) {
  const win = won(marks, marks.length)
  const head = win
    ? `Convenci ${comArtigo(p)} em ${marks.length} mensagens 💬`
    : `Quase convenci ${comArtigo(p)} 💬 Ficou pro almoço.`
  return [head, emojiGrid(marks), `Duvido você convencer ${comArtigo(p)}.`, link].join('\n')
}

/** Espera do "digitando..." (600 a 900 ms), proporcional ao tamanho da mensagem. */
export const typingMs = (text: string) => Math.round(600 + Math.min(300, text.length * 4))
