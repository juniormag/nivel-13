// Card de share do Onde Foi?: "Seu mapa" com os 6 pinos e as linhas, o total e o link.
// Story 1080×1920 (lógico 180×320, zona segura: topo 270 px, laterais 65 px, essencial até 1250 px e
// rodapé na zona mole até 1540 px) e Feed 1080×1350 (180×225). Rótulo de IA e responsável sempre.
import { CONFIG, responsavelText } from '../../config'
import {
  bayer,
  CAP,
  canvas,
  compose,
  free,
  type Ink,
  linkMask,
  loadFonts,
  type Paint,
  paint,
  quantize,
  rect,
  silkWidth,
  sparkle,
  text,
  toBlob,
  wrap,
} from '../../share/kit'
import { drawMap, type Mark } from './draw'
import type { Pt } from './geo'
import { fmtInt, ONDE_MAX, seedLabel } from './logic'

export type OndeFormat = 'story' | 'feed'

export interface OndeCardData {
  seed: string
  total: number
  marks: { side: 'avanco' | 'caso'; guess: Pt; target: Pt }[]
}

const SIZE: Record<OndeFormat, { w: number; h: number }> = {
  story: { w: 180, h: 320 },
  feed: { w: 180, h: 225 },
}
const SCALE = 6
const LEGAL_LH = 4.5
const GOLD: Ink[] = ['goldHi', 'gold', 'gold', 'gold1']
const WHITE: Ink[] = ['white', 'stoneHi', 'stoneHi', 'stone3']
const big = (fill: Ink[], k: number): Paint => ({
  fill,
  outline: 'void',
  shadow: 'blood0',
  shadowDy: Math.max(1, k),
})

function arrow(g: CanvasRenderingContext2D, x: number, y: number, col: Ink) {
  for (let i = 0; i < 3; i++) rect(g, x + i, y + i, 1, CAP - 2 * i, col)
}

/** Faixa vermelha com ▶, como o item ativo do menu. */
function tag(g: CanvasRenderingContext2D, s: string, cx: number, y: number) {
  const w = silkWidth(s) + 14
  const x = Math.round(cx - w / 2)
  rect(g, x, y - 2, w, CAP + 4, 'crimson')
  rect(g, x, y - 2, w, 1, 'red')
  rect(g, x, y + CAP + 1, w, 1, 'blood1')
  rect(g, x - 1, y - 2, 1, CAP + 4, 'void')
  rect(g, x + w, y - 2, 1, CAP + 4, 'void')
  arrow(g, x + 3, y, 'white')
  text(g, s, x + 9, y, { fill: 'white', outline: 'void' })
}

function legalLines(maxW: number) {
  return [...wrap(CONFIG.aiLabel.toUpperCase(), maxW), ...wrap(responsavelText().toUpperCase(), maxW)]
}

export async function renderOndeCard(d: OndeCardData, fmt: OndeFormat): Promise<HTMLCanvasElement> {
  await loadFonts()
  const { w: W, h: H } = SIZE[fmt]
  const story = fmt === 'story'
  const art = canvas(W, H)
  const fine = canvas(W * 2, H * 2)
  const g = art.g
  const f = fine.g
  const cx = W / 2
  const x0 = 11
  const x1 = 169

  // fundo: noite, faixa de topo mais escura e poucas estrelas só na metade de cima
  rect(g, 0, 0, W, H, 'night')
  const band = story ? 40 : 6
  rect(g, 0, 0, W, band - 6, 'void')
  for (let yy = band - 6; yy < band + 6; yy++)
    for (let xx = 0; xx < W; xx++) if (bayer(xx, yy) > (yy - band + 6) / 12) rect(g, xx, yy, 1, 1, 'void')
  // story: horizonte em brasa embaixo (fica sob a barra de resposta do Instagram, só arte)
  if (story) {
    const ramp: Ink[] = ['blood0', 'blood1', 'crimsonDeep', 'crimson']
    for (let yy = 262; yy < H; yy++) {
      const t = (yy - 262) / (H - 262)
      const k = t * ramp.length
      const lo = ramp[Math.min(ramp.length - 1, Math.floor(k))] ?? 'blood0'
      const hi = ramp[Math.min(ramp.length - 1, Math.floor(k) + 1)] ?? lo
      for (let xx = 0; xx < W; xx++) {
        const base = bayer(xx, yy) < k - Math.floor(k) ? hi : lo
        if (t < 0.12 && bayer(xx, yy) > t / 0.12) continue
        rect(g, xx, yy, 1, 1, base)
      }
    }
  }
  const stars: [number, number][] = story
    ? [
        [22, 18],
        [151, 12],
        [96, 30],
        [168, 34],
        [12, 40],
      ]
    : [[166, 14]]
  stars.forEach(([sx, sy], i) => {
    sparkle(g, sx, sy, 1 + (i % 2))
  })

  let y = story ? 50 : 10
  tag(g, `ONDE FOI? ${seedLabel(d.seed)}`, cx, y)
  y += CAP + 8

  // total gigante + "/1.000"
  const tot = fmtInt(d.total)
  const den = `/${fmtInt(ONDE_MAX)}`
  const kd = 2
  const k = story ? 4 : 3
  const wt = silkWidth(tot, k)
  const wd = silkWidth(den, kd)
  const tx = Math.round(cx - (wt + 3 + wd) / 2)
  text(g, tot, tx, y, big(GOLD, k), { k })
  text(g, den, tx + wt + 3, y + CAP * (k - kd), big(WHITE, kd), { k: kd })
  y += CAP * k + k + 6

  // rodapé: CTA, link e legal (story na zona mole, feed encostado na base)
  const lines = legalLines((x1 - x0 - 2) * 2)
  const footH = CAP + 4 + 9 + lines.length * LEGAL_LH
  const footY = story ? 213 : Math.round(H - 4 - footH)

  // mapa: o maior quadrado que cabe entre o total e o rodapé
  const M = Math.min(x1 - x0, (story ? 208 : footY - 4) - y)
  const mx = Math.round(cx - M / 2)
  const my = y
  rect(g, mx - 1, my - 1, M + 2, M + 2, 'stone1')
  const marks: Mark[] = d.marks.map((m) => ({
    side: m.side,
    guess: m.guess,
    target: m.target,
    line: 1,
    pin: true,
    small: true,
  }))
  drawMap(g, M, { marks, ox: mx, oy: my })

  let fy = footY
  text(g, 'FAZ MELHOR QUE EU? JOGUE:', cx, fy, { fill: GOLD, outline: 'void' }, { align: 'center' })
  fy += CAP + 4
  const link = `${CONFIG.siteUrl}/?o=${d.seed}`.replace(/^https?:\/\//, '')
  const lm = linkMask(link)
  if (lm.w + 8 <= x1 - x0) {
    const lx = Math.round(cx - (lm.w + 6) / 2)
    arrow(g, lx, fy, 'redHot')
    paint(g, lm, lx + 6, fy, { fill: 'stoneHi', outline: 'void' })
  } else paint(f, lm, Math.round(cx * 2 - lm.w / 2), fy * 2 + 2, { fill: 'stoneHi' })
  fy += 9
  for (const l of lines) {
    text(f, l, Math.round(cx * 2), Math.round(fy * 2), { fill: 'stone3' }, { align: 'center' })
    fy += LEGAL_LH
  }

  quantize(g, W, H)
  const out = compose(art.c, fine.c, SCALE)
  free(art.c)
  free(fine.c)
  return out
}

export async function makeOndeCard(d: OndeCardData, fmt: OndeFormat): Promise<Blob> {
  const c = await renderOndeCard(d, fmt)
  try {
    return await toBlob(c, 'image/png')
  } finally {
    free(c)
  }
}

export const ondeCardName = (seed: string, fmt: OndeFormat) => `onde-foi-${seed}-${fmt}.png`
