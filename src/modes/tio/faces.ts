// Retratos pixel dos parentes (fictícios, regra 3 do repositório): 20×20 lógicos, só cores da paleta
// mestra, contorno automático de 1 px e 3 expressões. Desenhados em código; a grade pura é testável.
import type { ParenteId } from '../../content/tio'
import { hex, type PaletteKey } from '../../lib/palette'

export type Expr = 'neutro' | 'pensando' | 'fechado'
export const FACE = 20

type Grid = (PaletteKey | null)[][]

interface Look {
  skin: PaletteKey
  shade: PaletteKey
  light?: PaletteKey
  hair: PaletteKey
  hairShade: PaletteKey
  hairHi?: PaletteKey
  brow: PaletteKey
  shirt: PaletteKey
  shirtShade: PaletteKey
}

const LOOK: Record<ParenteId, Look> = {
  tio: {
    skin: 'gold1',
    shade: 'gold0',
    light: 'emberBright',
    hair: 'night',
    hairShade: 'void',
    brow: 'night',
    shirt: 'green',
    shirtShade: 'vine1',
  },
  tia: {
    skin: 'emberDark',
    shade: 'blood1',
    light: 'gold1',
    hair: 'stone2',
    hairShade: 'stone1',
    hairHi: 'stone3',
    brow: 'stone1',
    shirt: 'blue1',
    shirtShade: 'blue0',
  },
  vo: {
    skin: 'redGlow',
    shade: 'ember',
    light: 'sparkle',
    hair: 'stoneHi',
    hairShade: 'stone3',
    brow: 'stoneHi',
    shirt: 'stone2',
    shirtShade: 'stone1',
  },
  prima: {
    skin: 'emberBright',
    shade: 'ember',
    light: 'goldHi',
    hair: 'crimsonDeep',
    hairShade: 'blood1',
    hairHi: 'red',
    brow: 'blood1',
    shirt: 'haze',
    shirtShade: 'hazeDark',
  },
  mae: {
    skin: 'gold1',
    shade: 'gold0',
    light: 'emberBright',
    hair: 'gold0',
    hairShade: 'blood0',
    hairHi: 'emberDark',
    brow: 'gold0',
    shirt: 'crimson',
    shirtShade: 'crimsonDeep',
  },
}

const CX = 9.5
const CY = 8.6
const RX = 5.9
const RY = 6.3

const inEll = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
const inHead = (x: number, y: number) => inEll(x, y, CX, CY, RX, RY)

function put(g: Grid, x: number, y: number, c: PaletteKey | null) {
  const row = g[y]
  if (row && x >= 0 && x < FACE) row[x] = c
}
const at = (g: Grid, x: number, y: number) => g[y]?.[x] ?? null

function body(g: Grid, L: Look, id: ParenteId) {
  // ombros
  for (let y = 15; y < FACE; y++)
    for (let x = 0; x < FACE; x++)
      if (inEll(x, y, CX, 21.5, 8.6, 5.6)) put(g, x, y, x >= 13 || y >= 19 ? L.shirtShade : L.shirt)
  // pescoço e gola
  for (let y = 13; y <= 16; y++) for (let x = 8; x <= 11; x++) put(g, x, y, L.shade)
  put(g, 9, 16, L.skin)
  put(g, 10, 16, L.skin)
  // cabeça com luz do alto à esquerda
  for (let y = 0; y < FACE; y++)
    for (let x = 0; x < FACE; x++) {
      if (!inHead(x, y)) continue
      const nx = (x + 0.5 - CX) / RX
      const ny = (y + 0.5 - CY) / RY
      const k = nx * 0.62 + ny * 0.78
      put(g, x, y, k > 0.62 ? L.shade : L.light && k < -0.5 && id !== 'vo' ? L.light : L.skin)
    }
  if (L.light) {
    put(g, 6, 4, L.light)
    put(g, 5, 5, L.light)
  }
  // orelhas
  for (const y of [9, 10]) {
    put(g, 3, y, L.skin)
    put(g, 16, y, L.shade)
  }
}

function hairCap(
  g: Grid,
  L: Look,
  line: (x: number) => number,
  outer: { rx: number; ry: number; dy?: number },
) {
  for (let y = 0; y < FACE; y++)
    for (let x = 0; x < FACE; x++) {
      if (!inEll(x, y, CX, CY + (outer.dy ?? 0), outer.rx, outer.ry)) continue
      if (inHead(x, y) && y >= line(x)) continue
      if (y > 16) continue
      const right = x >= 13
      const hi = L.hairHi && (x + y) % 4 === 0 && !right
      put(g, x, y, hi ? (L.hairHi as PaletteKey) : right ? L.hairShade : L.hair)
    }
}

function hair(g: Grid, id: ParenteId, L: Look) {
  switch (id) {
    case 'tio': {
      // boné azul liso (sem marca) com aba, costeletas e bigode
      for (let y = 0; y <= 4; y++)
        for (let x = 0; x < FACE; x++)
          if (inEll(x, y, CX, CY, RX + 0.5, RY + 1.2)) put(g, x, y, x >= 13 ? 'blue0' : 'blue1')
      for (let x = 3; x <= 13; x++) put(g, x, 5, 'blue0')
      put(g, 6, 2, 'stoneHi')
      for (const y of [6, 7, 8]) {
        put(g, 4, y, L.hair)
        put(g, 15, y, L.hair)
      }
      for (let x = 7; x <= 12; x++) put(g, x, 11, L.hair)
      break
    }
    case 'tia': {
      // cabelo grisalho cacheado com coque e brincos
      hairCap(g, L, (x) => (x <= 4 || x >= 15 ? 11 : 5), { rx: RX + 1.6, ry: RY + 0.6, dy: -0.6 })
      for (let x = 8; x <= 11; x++) {
        put(g, x, 0, L.hair)
        put(g, x, 1, x === 8 ? (L.hairHi as PaletteKey) : L.hair)
      }
      put(g, 3, 12, 'gold')
      put(g, 16, 12, 'gold')
      break
    }
    case 'vo': {
      // careca com cabelo branco dos lados, óculos e bigode branco
      for (let y = 6; y <= 10; y++) {
        put(g, 4, y, L.hair)
        put(g, 15, y, L.hairShade)
      }
      put(g, 5, 6, L.hair)
      put(g, 14, 6, L.hairShade)
      for (const x of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
        if (x !== 9 && x !== 10) put(g, x, 7, 'stone0')
        if (x !== 9 && x !== 10) put(g, x, 10, 'stone0')
      }
      for (const x of [5, 9, 10, 14]) {
        put(g, x, 8, 'stone0')
        put(g, x, 9, 'stone0')
      }
      put(g, 6, 8, 'sparkle')
      put(g, 11, 8, 'sparkle')
      for (let x = 8; x <= 11; x++) put(g, x, 11, L.hair)
      break
    }
    case 'prima': {
      // cabelo comprido tingido com franja de lado e celular na mão
      hairCap(g, L, (x) => (x <= 4 || x >= 15 ? 99 : x <= 9 ? 6 : 5), { rx: RX + 1.4, ry: RY + 3.4, dy: 2.6 })
      for (let x = 5; x <= 9; x++) put(g, x, 5, L.hair)
      break
    }
    case 'mae': {
      // cabelo na altura do ombro com franja e brincos
      hairCap(g, L, (x) => (x <= 4 || x >= 15 ? 99 : 5), { rx: RX + 1.3, ry: RY + 1.6, dy: 1.2 })
      for (let x = 5; x <= 13; x += 2) put(g, x, 5, L.hair)
      put(g, 3, 12, 'gold')
      put(g, 16, 12, 'gold')
      break
    }
  }
}

function prop(g: Grid, id: ParenteId) {
  if (id !== 'prima') return
  // celular: corpo escuro e tela acesa (vídeo curto)
  for (let y = 13; y <= 18; y++) for (let x = 14; x <= 17; x++) put(g, x, y, 'stone0')
  for (let y = 14; y <= 16; y++) for (let x = 15; x <= 16; x++) put(g, x, y, 'blue1')
  put(g, 15, 14, 'sparkle')
  put(g, 13, 17, 'emberBright')
  put(g, 13, 18, 'ember')
}

function face(g: Grid, id: ParenteId, L: Look, e: Expr) {
  const eye: PaletteKey = 'night'
  const mouth: PaletteKey = id === 'tia' ? 'redGlow' : id === 'vo' || id === 'prima' ? 'crimsonDeep' : 'blood0'
  const glasses = id === 'vo'
  const lowLip = 12
  if (e === 'neutro') {
    for (const x of [7, 12]) {
      if (!glasses) put(g, x, 8, eye)
      put(g, x, 9, eye)
    }
    for (const x of [6, 7, 12, 13]) put(g, x, 6, L.brow)
    for (let x = 8; x <= 11; x++) put(g, x, lowLip + 1, mouth)
    put(g, 7, lowLip, mouth)
    put(g, 12, lowLip, mouth)
    if (id === 'vo' || id === 'prima') {
      put(g, 6, 11, 'redHot')
      put(g, 13, 11, 'redHot')
    }
  } else if (e === 'pensando') {
    // olhos para o alto à direita, uma sobrancelha erguida, boca de lado e mão no queixo
    for (const x of [8, 13]) {
      put(g, x, glasses ? 9 : 8, eye)
      if (!glasses) put(g, x, 7, eye)
    }
    for (const x of [6, 7]) put(g, x, 6, L.brow)
    put(g, 12, 5, L.brow)
    put(g, 13, 5, L.brow)
    put(g, 14, 6, L.brow)
    for (let x = 9; x <= 11; x++) put(g, x, 12, mouth)
    put(g, 12, 13, mouth)
    for (let y = 13; y <= 15; y++)
      for (let x = 11; x <= 14; x++) put(g, x, y, y === 13 || x === 11 ? 'void' : L.skin)
    put(g, 12, 15, L.shade)
    for (let y = 16; y <= 19; y++) for (let x = 12; x <= 14; x++) put(g, x, y, L.shirtShade)
    put(g, 11, 16, 'void')
    put(g, 15, 16, 'void')
  } else {
    // cara fechada: sobrancelhas para baixo no meio, olhos apertados, boca para baixo e braços cruzados
    put(g, 5, 6, L.brow)
    put(g, 6, 6, L.brow)
    put(g, 7, 7, L.brow)
    put(g, 8, 7, L.brow)
    put(g, 11, 7, L.brow)
    put(g, 12, 7, L.brow)
    put(g, 13, 6, L.brow)
    put(g, 14, 6, L.brow)
    for (const x of [7, 8, 11, 12]) put(g, x, 9, eye)
    for (let x = 8; x <= 11; x++) put(g, x, 12, mouth)
    put(g, 7, 13, mouth)
    put(g, 12, 13, mouth)
    for (let x = 3; x <= 16; x++) {
      put(g, x, 16, 'void')
      put(g, x, 17, x % 5 === 0 ? L.shade : L.skin)
      put(g, x, 18, L.shade)
    }
    put(g, 2, 17, 'void')
    put(g, 17, 17, 'void')
  }
}

/** Contorno de 1 px: todo vazio vizinho (4 lados) de pixel pintado vira `void`. */
function outline(g: Grid) {
  const marks: [number, number][] = []
  for (let y = 0; y < FACE; y++)
    for (let x = 0; x < FACE; x++) {
      if (at(g, x, y)) continue
      if (at(g, x - 1, y) || at(g, x + 1, y) || at(g, x, y - 1) || at(g, x, y + 1)) marks.push([x, y])
    }
  for (const [x, y] of marks) put(g, x, y, 'void')
}

/** Grade 20×20 do retrato (null = transparente). */
export function faceGrid(id: ParenteId, e: Expr): Grid {
  const g: Grid = Array.from({ length: FACE }, () => Array<PaletteKey | null>(FACE).fill(null))
  const L = LOOK[id]
  body(g, L, id)
  hair(g, id, L)
  face(g, id, L, e)
  prop(g, id)
  outline(g)
  return g
}

const cache = new Map<string, HTMLCanvasElement>()

/** Retrato como canvas 20×20 (cacheado; não altere o canvas devolvido). */
export function faceCanvas(id: ParenteId, e: Expr): HTMLCanvasElement {
  const key = `${id}|${e}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = FACE
  c.height = FACE
  const ctx = c.getContext('2d')
  if (ctx)
    faceGrid(id, e).forEach((row, y) => {
      row.forEach((col, x) => {
        if (!col) return
        ctx.fillStyle = hex(col)
        ctx.fillRect(x, y, 1, 1)
      })
    })
  cache.set(key, c)
  return c
}
