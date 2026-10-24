// Cards de compartilhamento: arte em pixels lógicos (180×320 story, 180×225 feed, 180×180 square)
// ampliada ×6 sem suavização, só com a paleta mestra. Spec: docs/research/share.md §0.
import { CONFIG, responsavelText } from '../config'
import { FACTS } from '../content/facts'
import { LEVELS } from '../content/levels'
import { STATEMENTS } from '../content/statements'
import { mulberry32 } from '../lib/rng'
import { skillIcon, sprite } from '../lib/sprites'
import { getSave, shareLink, stats, XP_MAX, xpTotal } from '../state/save'
import { heroStill } from './hero'
import {
  type Align,
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
  star,
  text,
  toBlob,
  wrap,
} from './kit'
import { drawCrown } from './monument2d'
import type { Format, Moment } from './types'

/** Ampliação inteira: 1 pixel lógico = 6 pixels do PNG. A camada fina usa ×3. */
export const SCALE = 6

export const FORMAT_SIZE: Record<Format, { w: number; h: number }> = {
  story: { w: 180, h: 320 },
  feed: { w: 180, h: 225 },
  square: { w: 180, h: 180 },
}

export const FORMAT_LABEL: Record<Format, string> = {
  story: 'Story',
  feed: 'Feed',
  square: 'Quadrado',
}

// ---------------------------------------------------------------- tintas

const WHITE: Ink[] = ['white', 'stoneHi', 'stoneHi', 'stone3']
const GOLD: Ink[] = ['goldHi', 'gold', 'gold', 'gold1']
const RED: Ink[] = ['redGlow', 'redHot', 'red', 'crimson']
const big = (fill: Ink[], k: number): Paint => ({ fill, outline: 'void', shadow: 'blood0', shadowDy: Math.max(1, k) })
const small = (fill: Ink | Ink[]): Paint => ({ fill, outline: 'void' })
const fineInk = (fill: Ink): Paint => ({ fill })

const fmtInt = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(n))
export const fmtBRL = (n: number) => `R$ ${fmtInt(n)}`

// ---------------------------------------------------------------- contexto do card

interface Card {
  fmt: Format
  W: number
  H: number
  g: CanvasRenderingContext2D
  /** camada fina (grade ×2 da lógica): texto pequeno e molduras finas */
  f: CanvasRenderingContext2D
  /** área segura do conteúdo (lógica) */
  x0: number
  x1: number
  y0: number
  cx: number
  story: boolean
  rnd: () => number
  heroKind?: 'hero' | '2d'
}

/**
 * Story 1080×1920: topo de 270 px é da UI do Instagram, laterais de 65 px, o essencial até
 * y 1250 e a zona mole (link) até 1540. Feed 1080×1350: margens ≥ 60 px (recorte 3:4 da grade).
 */
function zones(fmt: Format) {
  return fmt === 'story' ? { x0: 11, x1: 169, y0: 46 } : { x0: 11, x1: 169, y0: 8 }
}
/** Story: o rodapé começa na zona mole e não passa de y 257 (1540 px). */
const STORY_FOOTER = 211
const STORY_FOOTER_MAX = 257

const ACCENT = /[ÁÉÍÓÚÂÊÔÃÕÀ]/

/** Texto grande centrado; reserva espaço para acentos; retorna o y seguinte. */
function head(c: Card, s: string, y: number, fill: Ink[], k: number) {
  const yy = y + (ACCENT.test(s.toLocaleUpperCase('pt-BR')) ? 3 * k : 0)
  text(c.g, s, c.cx, yy, big(fill, k), { k, align: 'center' })
  return yy + CAP * k + 2 + k
}

/** Duas cores na mesma linha (ex.: "NÍVEL" branco e "13" vermelho), centradas. */
function head2(c: Card, a: string, b: string, y: number, fa: Ink[], fb: Ink[], k: number) {
  const yy = y + (ACCENT.test(`${a}${b}`.toLocaleUpperCase('pt-BR')) ? 3 * k : 0)
  const gapW = 3 * k
  const wa = silkWidth(a, k)
  const wb = silkWidth(b, k)
  const x = Math.round(c.cx - (wa + gapW + wb) / 2)
  text(c.g, a, x, yy, big(fa, k), { k })
  text(c.g, b, x + wa + gapW, yy, big(fb, k), { k })
  return yy + CAP * k + 2 + k
}

/** Maior escala inteira em que o texto cabe na largura. */
function fitK(s: string, maxW: number, kMax: number) {
  for (let k = kMax; k > 1; k--) if (silkWidth(s, k) <= maxW) return k
  return 1
}

/** Texto na camada fina, coordenadas lógicas (convertidas para a grade ×2). */
function fine(c: Card, s: string, x: number, y: number, col: Ink, align: Align = 'left') {
  return text(c.f, s, Math.round(x * 2), Math.round(y * 2), fineInk(col), { align }) / 2
}

function fineFrame(c: Card, x: number, y: number, w: number, h: number, col: Ink) {
  frame(c.f, Math.round(x * 2) - 1, Math.round(y * 2) - 1, Math.round(w * 2) + 2, Math.round(h * 2) + 2, col)
}

/** Painel opaco de HUD: fundo noite e moldura fina clara com cantos recortados. */
function panel(c: Card, x: number, y: number, w: number, h: number, col: Ink = 'stone3') {
  rect(c.g, x, y, w, h, 'night')
  rect(c.g, x, y + h, w, 1, 'void')
  fineFrame(c, x, y, w, h, col)
}

/** ▶ de 3×5 pixels. */
function arrow(g: CanvasRenderingContext2D, x: number, y: number, col: Ink) {
  for (let i = 0; i < 3; i++) rect(g, x + i, y + i, 1, CAP - 2 * i, col)
}

/** Faixa vermelha de menu com ▶ (como o item ativo da referência). */
function tag(c: Card, s: string, y: number) {
  const w = silkWidth(s) + 14
  const x = Math.round(c.cx - w / 2)
  rect(c.g, x, y - 2, w, CAP + 4, 'crimson')
  rect(c.g, x, y - 2, w, 1, 'red')
  rect(c.g, x, y + CAP + 1, w, 1, 'blood1')
  rect(c.g, x - 1, y - 2, 1, CAP + 4, 'void')
  rect(c.g, x + w, y - 2, 1, CAP + 4, 'void')
  arrow(c.g, x + 3, y, 'white')
  text(c.g, s, x + 9, y, small('white'))
  return y + CAP + 5
}

function sprinkle(c: Card, n: number, area: { x0: number; x1: number; y0: number; y1: number }, big = 3) {
  const placed: [number, number][] = []
  for (let i = 0; i < n * 8 && placed.length < n; i++) {
    const x = area.x0 + c.rnd() * (area.x1 - area.x0)
    const y = area.y0 + c.rnd() * (area.y1 - area.y0)
    if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 14)) continue
    placed.push([x, y])
    sparkle(c.g, x, y, 1 + Math.floor(c.rnd() * big))
  }
}

// ---------------------------------------------------------------- blocos comuns

/** Retrato + NÍVEL + barra de XP (o HUD do jogador da referência). */
function playerBadge(c: Card, x: number, y: number, level: number) {
  const s = getSave()
  rect(c.g, x, y, 20, 20, 'night')
  c.g.drawImage(sprite(s.avatar), x + 2, y + 2)
  fineFrame(c, x, y, 20, 20, 'stoneHi')
  const tx = x + 24
  const wl = text(c.g, 'NÍVEL', tx, y + 1, small(['stoneHi']))
  text(c.g, String(level), tx + wl + 4, y + 1, small(['redHot', 'red']))
  const bw = 52
  rect(c.g, tx, y + 9, bw, 3, 'blood0')
  const xp = level >= 13 ? 1 : Math.min(1, xpTotal() / XP_MAX)
  const fw = Math.max(2, Math.round(bw * xp))
  rect(c.g, tx, y + 9, fw, 3, 'red')
  rect(c.g, tx, y + 9, fw, 1, 'redGlow')
  fineFrame(c, tx, y + 9, bw, 3, 'stone3')
  const name = s.name.trim()
  const label = name ? name.toLocaleUpperCase('pt-BR').slice(0, 14) : `${fmtInt(level >= 13 ? XP_MAX : xpTotal())} XP`
  fine(c, label, tx, y + 15, 'stone3')
}

/** Atributos com barras segmentadas (o painel de status da referência), na grade fina. */
function statsPanel(c: Card, xRight: number, y: number, w: number) {
  const st = stats()
  const rows: [string, number][] = [
    ['FATOS', st.fatos],
    ['MEMÓRIA', st.memoria],
    ['CORAGEM', st.coragem],
    ['DEMOCRACIA', st.democracia],
  ]
  const F = c.f
  const fx1 = xRight * 2
  const fx0 = fx1 - w * 2
  const barW = Math.round(w * 2 * 0.36)
  const barX = fx1 - 14 - barW
  rows.forEach(([k, v], i) => {
    const fy = y * 2 + i * 10
    text(F, k, fx0, fy, fineInk('stoneHi'))
    rect(F, barX, fy + 1, barW, 3, 'blood1')
    const fill = Math.round((barW * v) / 99)
    rect(F, barX, fy + 1, fill, 3, 'red')
    rect(F, barX, fy + 1, fill, 1, 'redHot')
    for (let s = 1; s < 3; s++) rect(F, barX + Math.round((barW * s) / 3), fy + 1, 1, 3, 'void')
    text(F, String(v), fx1, fy, fineInk('stoneHi'), { align: 'right' })
  })
}

const LEGAL_LH = 4.5

function legalLines(c: Card) {
  const maxW = (c.x1 - c.x0 - 2) * 2
  return [...wrap(CONFIG.aiLabel.toUpperCase(), maxW), ...wrap(responsavelText().toUpperCase(), maxW)]
}

interface FooterOpts {
  cta?: string
  /** linhas finas num painel acima do link (ex.: a lei, com fonte) */
  note?: { lines: string[]; first?: Ink }
  /** y mínimo (story) */
  min?: number
}

function footerHeight(c: Card, o: FooterOpts) {
  const note = o.note ? o.note.lines.length * LEGAL_LH + 7 : 0
  return note + (o.cta ? CAP + 4 : 0) + 9 + legalLines(c).length * LEGAL_LH
}

/**
 * Rodapé obrigatório: link da corrente (id em minúsculas), rótulo de IA e responsável.
 * No story fica na zona mole (y 1266..1540 px); no feed encosta na base.
 */
function footer(c: Card, o: FooterOpts = {}) {
  const hgt = footerHeight(c, o)
  let y = c.story
    ? Math.min(STORY_FOOTER_MAX - hgt, Math.max(STORY_FOOTER, o.min ?? 0))
    : Math.round(c.H - 4 - hgt)
  // placa escura sob o rodapé para leitura
  shade(c.g, 0, Math.max(0, y - 8), c.W, Math.min(c.H, hgt + 14), (t) => 0.75 * Math.min(1, t * 3))
  if (o.note) {
    const pw = c.x1 - c.x0 - 6
    const ph = o.note.lines.length * LEGAL_LH + 3
    panel(c, c.cx - pw / 2, y, pw, ph, 'stone2')
    o.note.lines.forEach((l, i) =>
      fine(c, l, c.cx, y + 2 + i * LEGAL_LH, i === 0 ? (o.note?.first ?? 'stoneHi') : 'stoneHi', 'center'),
    )
    y += ph + 4
  }
  if (o.cta) {
    text(c.g, o.cta, c.cx, y, small(GOLD), { align: 'center' })
    y += CAP + 4
  }
  const link = shareLink().replace(/^https?:\/\//, '')
  const m = linkMask(link)
  if (m.w + 8 <= c.x1 - c.x0) {
    const x = Math.round(c.cx - (m.w + 6) / 2)
    arrow(c.g, x, y, 'redHot')
    paint(c.g, m, x + 6, y, { fill: 'stoneHi', outline: 'void' })
  } else {
    // link comprido: vai para a grade fina
    paint(c.f, m, Math.round(c.cx * 2 - m.w / 2), y * 2 + 2, { fill: 'stoneHi' })
  }
  y += 9
  for (const l of legalLines(c)) {
    fine(c, l, c.cx, y, 'stone3', 'center')
    y += LEGAL_LH
  }
}

/** Escurece topo e base para o texto ler sobre a cena (a quantização posteriza depois). */
function vignette(c: Card, top: number, bottomFrom: number, strength = 0.8) {
  if (top > 0) shade(c.g, 0, 0, c.W, top, (t) => strength * (1 - t) ** 1.1)
  const from = Math.max(0, Math.min(c.H - 1, Math.round(bottomFrom)))
  shade(c.g, 0, from, c.W, c.H - from, (t) => strength * Math.min(1, t * 1.6) ** 0.8)
}

interface SceneGeo {
  base: number
  top: number
}

/**
 * Cena do herói. `extra` renderiza o still mais alto e corta a base: o monumento desce e
 * sobra céu em cima para o texto, sem deformar nada.
 */
async function scene(c: Card, o: { progress?: number; crown?: boolean; extra?: number } = {}): Promise<SceneGeo> {
  const hs = c.H + (o.extra ?? 0)
  const still = await heroStill(c.W, hs, { progress: o.progress ?? 1, crown: o.crown ?? false })
  c.heroKind = still.kind
  c.g.drawImage(still.c, 0, 0)
  if (still.info) return { base: still.info.base, top: still.info.top - (o.crown ? still.info.crownW : 0) }
  return { base: Math.round(hs * 0.54), top: Math.round(hs * 0.28) }
}

/**
 * Faixa de baixo do story (fora das zonas de leitura): a barra de habilidades do HUD da
 * referência (Q W E R) e brasas subindo. Decoração; nada essencial mora aqui.
 */
function foreground(c: Card) {
  if (!c.story) return
  const y0 = STORY_FOOTER_MAX + 3
  for (let i = 0; i < 16; i++) {
    const x = c.rnd() * c.W
    const y = y0 + c.rnd() * (c.H - y0)
    const ramp: Ink[] = ['goldHi', 'emberBright', 'ember', 'red', 'crimson']
    rect(c.g, x, y, 1, 1, ramp[Math.floor(c.rnd() * ramp.length)] ?? 'red')
  }
  const skills = [
    ['checar', 'CHECAR', 'Q'],
    ['lembrar', 'LEMBRAR', 'W'],
    ['foco', 'FOCO', 'E'],
    ['proteger', 'PROTEGER', 'R'],
  ] as const
  const size = 30
  const gap = 8
  const total = skills.length * size + (skills.length - 1) * gap
  let x = Math.round(c.cx - total / 2)
  const y = y0 + 4
  for (const [k, label, key] of skills) {
    rect(c.g, x - 1, y - 1, size + 2, size + 2, 'void')
    c.g.drawImage(skillIcon(k), 1, 1, size, size, x, y, size, size)
    fineFrame(c, x, y, size, size, 'stone3')
    fine(c, label, x + size / 2, y + size + 3, 'stoneHi', 'center')
    const kx = x + size / 2 - 3
    const ky = y + size + 9
    rect(c.g, kx, ky, 6, 7, 'night')
    fineFrame(c, kx, ky, 6, 7, 'stone2')
    fine(c, key, kx + 3, ky + 1, 'stone3', 'center')
    x += size + gap
  }
}

/** Quebra em vírgulas primeiro ("domingo, 25 de outubro" / "das 8h às 17h"). */
function wrapParts(s: string, maxW: number) {
  const parts = s.split(/,\s*/)
  const lines: string[] = []
  let line = ''
  for (const p of parts) {
    const t = line ? `${line}, ${p}` : p
    if (line && silkWidth(t) > maxW) {
      lines.push(line)
      line = p
    } else line = t
  }
  if (line) lines.push(line)
  return lines.flatMap((l) => (silkWidth(l) > maxW ? wrap(l, maxW) : [l]))
}

// ---------------------------------------------------------------- momentos

async function cardNivel13(c: Card) {
  const st = c.story
  const sc = await scene(c, { crown: true, progress: 1, extra: st ? 62 : 34 })
  vignette(c, st ? 90 : 40, sc.base - 2, 0.85)
  foreground(c)
  playerBadge(c, c.x0, c.y0, 13)
  statsPanel(c, c.x1, c.y0 + 1, 72)
  sprinkle(c, st ? 7 : 5, { x0: c.x0, x1: c.x1, y0: sc.top - 6, y1: sc.base - 16 })
  let y = sc.base + 3
  y = head(c, 'CHEGUEI AO', y, WHITE, 1)
  y = head2(c, 'NÍVEL', '13', y - 2, WHITE, RED, 3)
  footer(c, { cta: 'VOCÊ CHEGA? JOGUE:', min: y + 1 })
}

async function cardStars3(c: Card, m: Extract<Moment, { kind: 'stars3' }>) {
  const st = c.story
  const sc = await scene(c, { crown: false, progress: Math.min(1, m.level / 13), extra: st ? 50 : 34 })
  vignette(c, st ? 130 : 80, sc.base - 2, 0.85)
  foreground(c)
  let y = c.y0 + 2
  y = tag(c, `FASE ${m.level} COMPLETA`, y)
  const title = m.title.toLocaleUpperCase('pt-BR')
  const maxW = c.x1 - c.x0
  const lines = silkWidth(title, 2) <= maxW ? [title] : wrap(title, maxW, 2)
  const k = lines.every((l) => silkWidth(l, 2) <= maxW) ? 2 : 1
  for (const l of lines) y = head(c, l, y + 1, WHITE, k)
  // três estrelas em arco sobre o monumento
  const R = st ? 13 : 11
  const sy = y + R + (st ? 5 : 3)
  const gap = R * 2 + 6
  star(c.g, c.cx - gap, sy + 5, R)
  star(c.g, c.cx + gap, sy + 5, R)
  star(c.g, c.cx, sy, R + 3)
  sparkle(c.g, c.cx - gap - R - 2, sy - R, 2)
  sparkle(c.g, c.cx + gap + R + 3, sy - 2, 3)
  sparkle(c.g, c.cx + 7, sy - R - 7, 2)
  // placar com dígitos em caixas (o contador parado no total)
  const digits = fmtInt(m.score)
  const by = Math.max(sc.base + 3, sy + R + 10)
  const boxW = 11
  const totalW = [...digits].reduce((a, ch) => a + (ch === '.' ? 4 : boxW + 1), 0) - 1
  const lbl = 'PONTOS'
  const lw = silkWidth(lbl) + 5
  let x = Math.round(c.cx - (totalW + lw) / 2)
  text(c.g, lbl, x, by + 4, small('stoneHi'))
  x += lw
  for (const ch of digits) {
    if (ch === '.') {
      rect(c.g, x + 1, by + 11, 2, 2, 'gold')
      x += 4
      continue
    }
    rect(c.g, x, by, boxW, 14, 'night')
    rect(c.g, x, by + 7, boxW, 1, 'void')
    fineFrame(c, x, by, boxW, 14, 'stone2')
    text(c.g, ch, x + 1 + Math.floor((boxW - 2 - silkWidth(ch)) / 2), by + 4, small(GOLD))
    x += boxW + 1
  }
  footer(c, { cta: 'VOCÊ FAZ MELHOR? JOGUE:', min: by + 17 })
}

function irContent() {
  const fact = FACTS.find((f) => f.id === 'ir')
  const st = STATEMENTS.find((s) => /15\.270/.test(s.exp))
  return { title: fact?.title ?? '', law: st?.exp ?? fact?.sources[0]?.name ?? '' }
}

async function cardIR(c: Card, m: Extract<Moment, { kind: 'ir' }>) {
  const st = c.story
  const sc = await scene(c, { crown: false, progress: 1, extra: st ? 60 : 44 })
  vignette(c, st ? 150 : 90, sc.base - 2, 0.9)
  foreground(c)
  let y = c.y0 + (st ? 2 : 0)
  y = head(c, 'COM A ISENÇÃO DO IR', y, WHITE, 1)
  y = head(c, 'EU ECONOMIZO', y, WHITE, 1)
  const val = fmtBRL(m.perYear)
  const k = fitK(val, c.x1 - c.x0, st ? 4 : 3)
  const vy = y + 3
  y = head(c, val, vy, GOLD, k)
  y = head(c, 'POR ANO', y, GOLD, st ? 2 : 1)
  // moedas voando ao redor do valor
  const coin = sprite('moeda')
  const vw = silkWidth(val, k)
  const lx = Math.round(c.cx - vw / 2) - 12
  const rx = Math.round(c.cx + vw / 2) + 4
  const coins: [number, number][] = st
    ? [
        [lx, vy - 6],
        [lx + 3, vy + 12],
        [rx, vy - 2],
        [rx + 2, vy + 16],
      ]
    : [
        [lx + 2, vy - 4],
        [rx, vy + 8],
      ]
  for (const [cx, cy] of coins) c.g.drawImage(coin, Math.max(1, Math.min(c.W - 9, cx)), cy)
  sprinkle(c, 3, { x0: c.x0, x1: c.x1, y0: y + 2, y1: sc.top + 6 }, 2)
  const { title, law } = irContent()
  const w = (c.x1 - c.x0 - 10) * 2
  footer(c, {
    note: { lines: [...wrap(title.toUpperCase(), w), ...wrap(law.toUpperCase(), w)], first: 'goldHi' },
    cta: st ? 'FAÇA A SUA CONTA:' : undefined,
    min: sc.base + 2,
  })
}

const CHECK = ['........X', '.......XX', '......XX.', 'X....XX..', 'XX..XX...', '.XXXX....', '..XX.....']
const CROSS = ['XX...XX', '.XX.XX.', '..XXX..', '.XX.XX.', 'XX...XX']

async function cardDaily(c: Card, m: Extract<Moment, { kind: 'daily' }>) {
  const st = c.story
  const sc = await scene(c, { crown: false, progress: 1, extra: st ? 64 : 44 })
  vignette(c, st ? 130 : 90, sc.base - 2, 0.85)
  foreground(c)
  const n = Math.max(1, m.grid.length)
  const size = st ? 24 : 20
  const gap = st ? 5 : 4
  const gw = n * size + (n - 1) * gap
  const hits = m.grid.filter(Boolean).length
  // painel do resultado (estilo cartão do Wordle)
  const px = c.x0
  const pw = c.x1 - c.x0
  const py = c.y0 - 2
  const ph = (st ? 68 : 56) + (m.streak > 1 ? 9 : 0)
  panel(c, px, py, pw, ph, 'stoneHi')
  let y = py + 6
  y = tag(c, `FATO OU FAKE #${m.n}`, y)
  const gx = Math.round(c.cx - gw / 2)
  const gy = y + 2
  m.grid.forEach((ok, i) => {
    const x = gx + i * (size + gap)
    rect(c.g, x - 1, gy - 1, size + 2, size + 2, 'void')
    rect(c.g, x, gy, size, size, ok ? 'green' : 'red')
    rect(c.g, x, gy, size, 2, ok ? 'leafHi' : 'redGlow')
    rect(c.g, x, gy, 2, size, ok ? 'leafHi' : 'redGlow')
    rect(c.g, x, gy + size - 2, size, 2, ok ? 'vine1' : 'crimson')
    rect(c.g, x + size - 2, gy, 2, size, ok ? 'vine1' : 'crimson')
    const mk = rowsMask(ok ? CHECK : CROSS)
    const kk = st ? 2 : 1
    paint(
      c.g,
      mk,
      x + Math.round((size - mk.w * kk) / 2),
      gy + Math.round((size - mk.h * kk) / 2),
      { fill: 'white', outline: ok ? 'vine0' : 'blood0' },
      kk,
    )
  })
  y = gy + size + 5
  y = head2(c, `${hits}/${n}`, hits === 1 ? 'FATO' : 'FATOS', y, GOLD, WHITE, st ? 3 : 2)
  if (m.streak > 1) {
    const s = `${m.streak} DIAS SEGUIDOS`
    const fire = sprite('fogo')
    const w = silkWidth(s) + fire.width + 3
    const x = Math.round(c.cx - w / 2)
    c.g.drawImage(fire, x, y - 3)
    text(c.g, s, x + fire.width + 3, y, small(['emberBright', 'ember']))
  }
  sprinkle(c, 3, { x0: c.x0, x1: c.x1, y0: py + ph + 4, y1: sc.base - 20 }, 2)
  footer(c, { cta: 'E VOCÊ, ACERTA? JOGUE:', min: sc.base + 2 })
}

async function cardMovimento(c: Card, m: Extract<Moment, { kind: 'movimento' }>) {
  const st = c.story
  const sc = await scene(c, { crown: false, progress: 1, extra: st ? 40 : 30 })
  vignette(c, st ? 120 : 70, sc.base - 2, 0.85)
  foreground(c)
  let y = c.y0 + (st ? 4 : 0)
  if (m.escolha === 'virei') {
    y = head(c, 'VIREI MEU', y, WHITE, 2)
    y = head2(c, 'VOTO:', '13', y + 1, WHITE, RED, 3)
  } else {
    y = head(c, 'EU VOU', y, WHITE, st ? 3 : 2)
    y = head2(c, 'VOTAR', '13', y + 1, WHITE, RED, 3)
  }
  sprinkle(c, st ? 5 : 3, { x0: c.x0, x1: c.x1, y0: Math.max(y, sc.top - 8), y1: sc.base - 12 })
  y = Math.max(y + 3, sc.base + 2)
  const lines = wrapParts(CONFIG.electionLabel.toLocaleUpperCase('pt-BR'), c.x1 - c.x0 - 10)
  const ph = lines.length * (CAP + 3) + 5
  panel(c, c.x0 + 2, y, c.x1 - c.x0 - 4, ph, 'gold')
  for (const l of lines) {
    text(c.g, l, c.cx, y + 3, small(GOLD), { align: 'center' })
    y += CAP + 3
  }
  footer(c, { cta: st ? 'CONFIRA OS FATOS NO JOGO:' : undefined, min: y + 7 })
}

async function cardConvite(c: Card) {
  const st = c.story
  const sc = await scene(c, { crown: false, progress: 1, extra: st ? 56 : 40 })
  vignette(c, st ? 110 : 70, sc.base - 2, 0.85)
  foreground(c)
  let y = c.y0 + (st ? 2 : 0)
  y = head(c, 'VOCÊ CHEGA AO', y, WHITE, st ? 2 : 1)
  y = head2(c, 'NÍVEL', '13?', y, WHITE, RED, 3)
  // a coroa espera no alto: só quem termina as 13 fases a coloca no monumento
  const cw = st ? 27 : 21
  const cy = Math.max(y + 22, sc.top - 6)
  if (cy < sc.top + 4) {
    drawCrown(c.g, c.cx + 12, cy, cw)
    sprinkle(c, 3, { x0: c.cx - 20, x1: c.cx + 44, y0: cy - 24, y1: cy }, 2)
  }
  y = sc.base + 3
  const items = st ? ['13 FASES', 'FATOS COM FONTE', 'UM DESAFIO POR DIA'] : ['13 FASES · FATOS COM FONTE']
  for (const l of items) {
    text(c.g, l, c.cx, y, small(l === '13 FASES' ? ['redHot', 'red'] : 'stoneHi'), { align: 'center' })
    y += CAP + 3
  }
  footer(c, { cta: 'JOGUE NO CELULAR:', min: y })
}

// ---------------------------------------------------------------- API

/** Arte do card já ampliada (1080 px de largura). Libere com `free()` quando não usar mais. */
export async function renderCard(moment: Moment, format: Format): Promise<HTMLCanvasElement> {
  await loadFonts()
  const { w: W, h: H } = FORMAT_SIZE[format]
  const art = canvas(W, H)
  const fineL = canvas(W * 2, H * 2)
  const z = zones(format)
  const c: Card = {
    fmt: format,
    W,
    H,
    g: art.g,
    f: fineL.g,
    ...z,
    cx: W / 2,
    story: format === 'story',
    rnd: mulberry32(1313 + W + H),
  }
  switch (moment.kind) {
    case 'nivel13':
      await cardNivel13(c)
      break
    case 'stars3':
      await cardStars3(c, moment)
      break
    case 'ir':
      await cardIR(c, moment)
      break
    case 'daily':
      await cardDaily(c, moment)
      break
    case 'movimento':
      await cardMovimento(c, moment)
      break
    case 'convite':
      await cardConvite(c)
      break
  }
  quantize(art.g, W, H)
  const out = compose(art.c, fineL.c, SCALE)
  out.dataset.hero = c.heroKind ?? ''
  free(art.c)
  free(fineL.c)
  return out
}

/** PNG do card no formato pedido (story 1080×1920, feed 1080×1350, square 1080×1080). */
export async function makeCard(moment: Moment, format: Format): Promise<Blob> {
  const c = await renderCard(moment, format)
  try {
    return await toBlob(c, 'image/png')
  } finally {
    free(c)
  }
}

/** Nome de arquivo estável por momento (Chromium só aceita extensões conhecidas). */
export function cardFileName(moment: Moment, format: Format, ext = 'png') {
  const base =
    moment.kind === 'stars3'
      ? `fase-${moment.level}`
      : moment.kind === 'daily'
        ? `fato-ou-fake-${moment.n}`
        : moment.kind === 'movimento'
          ? `vou-votar-13`
          : moment.kind === 'ir'
            ? 'isencao-ir'
            : moment.kind === 'nivel13'
              ? 'nivel-13'
              : 'convite-nivel-13'
  return `${base}-${format}.${ext}`
}

/** Título da fase pelo número (para quem só tem o número em mãos). */
export const levelTitle = (n: number) => LEVELS.find((l) => l.n === n)?.title ?? `Fase ${n}`
