// Card de resultado do Convence o Tio (Story 1080×1920 e Feed 1080×1350), com o kit de src/share/kit.ts:
// arte em pixels lógicos 180×320 / 180×225 ampliada ×6, só a paleta mestra, zonas seguras do Instagram
// (topo de 270 px e laterais de 65 px livres; essencial até y 1250; link na zona mole até 1540),
// e o rodapé obrigatório com link, rótulo de IA e responsável (regra 4).
import { CONFIG, responsavelText } from '../../config'
import type { Parente } from '../../content/tio'
import { still2d } from '../../share/hero'
import {
  CAP,
  canvas,
  compose,
  frame,
  free,
  type Ink,
  linkMask,
  loadFonts,
  type Paint,
  paint,
  quantize,
  rect,
  rowsMask,
  shade,
  silkWidth,
  sparkle,
  text,
  toBlob,
  wrap,
} from '../../share/kit'
import { type Expr, FACE, faceCanvas } from './faces'
import { comArtigo, type Mark, won } from './logic'

export type TioFormat = 'story' | 'feed'
export const TIO_SIZE: Record<TioFormat, { w: number; h: number }> = {
  story: { w: 180, h: 320 },
  feed: { w: 180, h: 225 },
}
const SCALE = 6

const WHITE: Ink[] = ['white', 'stoneHi', 'stoneHi', 'stone3']
const GOLD: Ink[] = ['goldHi', 'gold', 'gold', 'gold1']
const big = (fill: Ink[], k: number): Paint => ({ fill, outline: 'void', shadow: 'blood0', shadowDy: Math.max(1, k) })
const small = (fill: Ink | Ink[]): Paint => ({ fill, outline: 'void' })

const CHECK = ['........X', '.......XX', '......XX.', 'X....XX..', 'XX..XX...', '.XXXX....', '..XX.....']
const CROSS = ['XX...XX', '.XX.XX.', '..XXX..', '.XX.XX.', 'XX...XX']
const ACCENT = /[ÁÉÍÓÚÂÊÔÃÕÀÇ]/

export interface TioCardData {
  parente: Pick<Parente, 'id' | 'name' | 'win' | 'lose'>
  marks: Mark[]
  /** link desenhado no card (sem https://) */
  link: string
}

function fitK(s: string, maxW: number, kMax: number) {
  for (let k = kMax; k > 1; k--) if (silkWidth(s, k) <= maxW) return k
  return 1
}

async function render(d: TioCardData, fmt: TioFormat) {
  await loadFonts()
  const { w: W, h: H } = TIO_SIZE[fmt]
  const art = canvas(W, H)
  const fineL = canvas(W * 2, H * 2)
  const g = art.g
  const f = fineL.g
  const story = fmt === 'story'
  const x0 = 11
  const x1 = 169
  const cx = W / 2
  const win = won(d.marks, d.marks.length)

  // cenário noturno sem o monumento (o chat é o herói), escurecido atrás do texto
  try {
    const st = await still2d(W, H + 40, { monument: false })
    rect(g, 0, 0, W, H, 'void')
    g.drawImage(st.c, 0, story ? 0 : -20)
  } catch {
    rect(g, 0, 0, W, H, 'night')
  }
  shade(g, 0, 0, W, H, (t) => 0.72 - 0.18 * Math.sin(t * Math.PI))

  const fine = (s: string, x: number, y: number, col: Ink, align: 'left' | 'center' = 'left') =>
    text(f, s, Math.round(x * 2), Math.round(y * 2), { fill: col }, { align })
  const head = (s: string, y: number, fill: Ink[], k: number) => {
    const yy = y + (ACCENT.test(s.toLocaleUpperCase('pt-BR')) ? 3 * k : 0)
    text(g, s, cx, yy, big(fill, k), { k, align: 'center' })
    return yy + CAP * k + 2 + k
  }

  let y = story ? 48 : 8
  // faixa vermelha de menu com ▶
  {
    const s = 'CONVENCE O TIO'
    const w = silkWidth(s) + 14
    const x = Math.round(cx - w / 2)
    rect(g, x, y - 2, w, CAP + 4, 'crimson')
    rect(g, x, y - 2, w, 1, 'red')
    rect(g, x, y + CAP + 1, w, 1, 'blood1')
    rect(g, x - 1, y - 2, 1, CAP + 4, 'void')
    rect(g, x + w, y - 2, 1, CAP + 4, 'void')
    for (let i = 0; i < 3; i++) rect(g, x + 3 + i, y + i, 1, CAP - 2 * i, 'white')
    text(g, s, x + 9, y, small('white'))
    y += CAP + 8
  }

  // a conversa: retrato do parente e a fala final dele numa bolha
  const k = 2
  const faceW = FACE * k
  const pw = x1 - x0
  const bubbleX = x0 + faceW + 10
  const bubbleW = x1 - bubbleX - 4
  const line = (win ? d.parente.win : d.parente.lose).toLocaleUpperCase('pt-BR')
  const lines = wrap(line, bubbleW - 8).slice(0, 4)
  const bubbleH = Math.max(18, lines.length * (CAP + 3) + 7)
  const ph = Math.max(faceW + 8, bubbleH + 16)
  rect(g, x0, y, pw, ph, 'night')
  rect(g, x0, y + ph, pw, 1, 'void')
  frame(f, x0 * 2 - 1, y * 2 - 1, pw * 2 + 2, ph * 2 + 2, 'stone3')
  const expr: Expr = win ? 'neutro' : 'fechado'
  const fc = faceCanvas(d.parente.id, expr)
  const fy = y + Math.round((ph - faceW) / 2)
  rect(g, x0 + 4, fy, faceW, faceW, 'dusk')
  g.drawImage(fc, x0 + 4, fy, faceW, faceW)
  fine(d.parente.name.toLocaleUpperCase('pt-BR'), x0 + 4 + faceW / 2, fy + faceW + 1.5, 'stone3', 'center')
  const by = y + Math.round((ph - bubbleH) / 2) - 2
  rect(g, bubbleX, by, bubbleW, bubbleH, 'stone0')
  rect(g, bubbleX, by + bubbleH, bubbleW, 1, 'void')
  frame(g, bubbleX - 1, by - 1, bubbleW + 2, bubbleH + 2, 'stone2')
  // biquinho da bolha apontando para o retrato
  rect(g, bubbleX - 3, by + 6, 3, 1, 'stone2')
  rect(g, bubbleX - 2, by + 7, 2, 1, 'stone0')
  rect(g, bubbleX - 2, by + 8, 2, 1, 'stone2')
  lines.forEach((l, i) => {
    text(g, l, bubbleX + 4, by + 4 + i * (CAP + 3), small(win ? 'stoneHi' : 'stone3'))
  })
  if (win) {
    sparkle(g, x0 + 2, fy + 2, 2)
    sparkle(g, x0 + faceW + 4, fy + faceW - 6, 1)
  }
  y += ph + (story ? 10 : 6)

  // manchete
  const name = d.parente.name.toLocaleUpperCase('pt-BR')
  const art_ = comArtigo(d.parente).split(' ')[0]?.toLocaleUpperCase('pt-BR') ?? ''
  y = head(win ? 'CONVENCI' : 'QUASE CONVENCI', y, WHITE, story ? 2 : 1)
  const who = `${art_} ${name}`
  y = head(who, y, GOLD, fitK(who, x1 - x0, 3))
  y = head(win ? `EM ${d.marks.length} MENSAGENS` : 'FICOU PRO ALMOÇO', y, WHITE, 1)
  y += story ? 4 : 2

  // grade: 🟩 boa, 🟥 armadilha
  const n = Math.max(1, d.marks.length)
  const size = story ? 22 : 18
  const gap = story ? 5 : 4
  const gx = Math.round(cx - (n * size + (n - 1) * gap) / 2)
  d.marks.forEach((m, i) => {
    const ok = m === 'good'
    const x = gx + i * (size + gap)
    rect(g, x - 1, y - 1, size + 2, size + 2, 'void')
    rect(g, x, y, size, size, ok ? 'green' : 'red')
    rect(g, x, y, size, 2, ok ? 'leafHi' : 'redGlow')
    rect(g, x, y, 2, size, ok ? 'leafHi' : 'redGlow')
    rect(g, x, y + size - 2, size, 2, ok ? 'vine1' : 'crimson')
    rect(g, x + size - 2, y, 2, size, ok ? 'vine1' : 'crimson')
    const mk = rowsMask(ok ? CHECK : CROSS)
    const kk = story ? 2 : 1
    paint(
      g,
      mk,
      x + Math.round((size - mk.w * kk) / 2),
      y + Math.round((size - mk.h * kk) / 2),
      { fill: 'white', outline: ok ? 'vine0' : 'blood0' },
      kk,
    )
  })
  y += size + 6

  // rodapé: desafio, link, rótulo de IA e responsável
  const legal = [
    ...wrap(CONFIG.aiLabel.toUpperCase(), (x1 - x0 - 2) * 2),
    ...wrap(responsavelText().toUpperCase(), (x1 - x0 - 2) * 2),
  ]
  const LH = 4.5
  const hgt = CAP + 4 + 9 + legal.length * LH
  let fy0 = story ? Math.min(257 - hgt, Math.max(213, y + 2)) : Math.round(H - 4 - hgt)
  shade(g, 0, Math.max(0, Math.round(fy0) - 6), W, Math.min(H, Math.round(hgt) + 12), (t) => 0.7 * Math.min(1, t * 3))
  const cta = `DUVIDO VOCÊ CONVENCER ${art_} ${name}:`
  const ctaLines = silkWidth(cta) <= x1 - x0 ? [cta] : [`DUVIDO VOCÊ CONVENCER`, `${art_} ${name}:`]
  if (ctaLines.length > 1) fy0 -= CAP + 3
  for (const l of ctaLines) {
    text(g, l, cx, fy0, small(GOLD), { align: 'center' })
    fy0 += CAP + 3
  }
  fy0 += 1
  const m = linkMask(d.link.replace(/^https?:\/\//, ''))
  if (m.w + 8 <= x1 - x0) {
    const x = Math.round(cx - (m.w + 6) / 2)
    for (let i = 0; i < 3; i++) rect(g, x + i, fy0 + i, 1, CAP - 2 * i, 'redHot')
    paint(g, m, x + 6, fy0, { fill: 'stoneHi', outline: 'void' })
  } else paint(f, m, Math.round(cx * 2 - m.w / 2), fy0 * 2 + 2, { fill: 'stoneHi' })
  fy0 += 9
  for (const l of legal) {
    fine(l, cx, fy0, 'stone3', 'center')
    fy0 += LH
  }

  // faixa de baixo do story (fora da leitura): brasas num chão escuro
  if (story) {
    for (let x = 0; x < W; x += 4) {
      const hh = 6 + Math.round(Math.abs(Math.sin(x * 0.13)) * 6) + Math.max(0, 14 - Math.min(x, W - x) / 4)
      rect(g, x, H - hh, 4, hh, 'void')
      rect(g, x, H - hh, 4, 1, 'stone0')
    }
    for (let i = 0; i < 20; i++) {
      const ramp: Ink[] = ['goldHi', 'emberBright', 'ember', 'red', 'crimson']
      rect(g, (i * 37) % W, 268 + ((i * 53) % 30), 1, 1, ramp[i % ramp.length] ?? 'red')
    }
  }

  quantize(g, W, H)
  const out = compose(art.c, fineL.c, SCALE)
  free(art.c)
  free(fineL.c)
  return out
}

/** PNG do card (story 1080×1920 ou feed 1080×1350). */
export async function makeTioCard(d: TioCardData, fmt: TioFormat): Promise<Blob> {
  const c = await render(d, fmt)
  try {
    return await toBlob(c, 'image/png')
  } finally {
    free(c)
  }
}

export const tioCardName = (d: TioCardData, fmt: TioFormat) => `convence-${d.parente.id}-${fmt}.png`
