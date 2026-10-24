// Desenho do mapa do Onde Foi? em pixels lógicos (L×L), só com a paleta mestra. Quem chama amplia com
// escala inteira e nearest (CSS image-rendering: pixelated). Serve à tela e ao card de share.
import { hex, type PaletteKey } from '../../lib/palette'
import { fromXY, landGrid, type Pt, toXY, ufIndex } from './geo'

type Side = 'avanco' | 'caso'

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)] ?? 0.5

function px(g: CanvasRenderingContext2D, x: number, y: number, c: PaletteKey) {
  g.fillStyle = hex(c)
  g.fillRect(x, y, 1, 1)
}

/** Litoral atlântico: o vizinho de fora fica a leste, ao norte do Amapá ao Ceará ou ao sul do Sudeste/Sul. */
function atlanticSide(dx: number, dy: number, x: number, y: number, L: number) {
  const p = fromXY(x + 0.5, y + 0.5, L)
  if (dx === 1) return p.lon > -52.5
  if (dy === -1) return p.lon > -52
  if (dy === 1) return p.lon > -53.6 && p.lat < -22
  return false
}

const baseCache = new Map<number, HTMLCanvasElement>()

/** Brasil escuro em pedra, divisas sutis, borda clara e o brilho vermelho do litoral. */
export function baseMap(L: number): HTMLCanvasElement {
  const hit = baseCache.get(L)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = L
  c.height = L
  const g = c.getContext('2d')
  if (!g) return c
  const grid = landGrid(L)
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= L || y >= L ? 0 : (grid[y * L + x] ?? 0))

  // mar: noite com uma malha de pontos discreta
  g.fillStyle = hex('night')
  g.fillRect(0, 0, L, L)
  for (let y = 3; y < L; y += 8) for (let x = 3; x < L; x += 8) px(g, x, y, 'dusk')

  // brilho do litoral (até 3 px mar adentro)
  const glow = new Uint8Array(L * L)
  const coast = new Uint8Array(L * L)
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      if (!at(x, y)) continue
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        if (at(x + dx, y + dy)) continue
        if (!atlanticSide(dx, dy, x, y, L)) continue
        coast[y * L + x] = 1
        for (let oy = -3; oy <= 3; oy++)
          for (let ox = -3; ox <= 3; ox++) {
            const d = Math.abs(ox) + Math.abs(oy)
            const xx = x + ox
            const yy = y + oy
            if (d === 0 || d > 3 || xx < 0 || yy < 0 || xx >= L || yy >= L || at(xx, yy)) continue
            const k = yy * L + xx
            const cur = glow[k] ?? 0
            if (cur === 0 || d < cur) glow[k] = d
          }
      }
    }
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      const d = glow[y * L + x] ?? 0
      if (d === 1) px(g, x, y, 'crimsonDeep')
      else if (d === 2 && bayer(x, y) < 0.6) px(g, x, y, 'blood1')
      else if (d === 3 && bayer(x, y) < 0.35) px(g, x, y, 'blood0')
    }

  // terra
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      const u = at(x, y)
      if (!u) continue
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)
      let col: PaletteKey
      if (coast[y * L + x]) col = bayer(x, y) < 0.2 ? 'redGlow' : 'redHot'
      else if (edge) col = !at(x - 1, y) || !at(x, y - 1) ? 'stone2' : 'stone1'
      else {
        const r = at(x + 1, y)
        const b = at(x, y + 1)
        if ((r && r !== u) || (b && b !== u)) col = 'haze'
        else col = (x * 3 + y * 5) % 13 === 0 ? 'dusk' : 'hazeDark'
      }
      px(g, x, y, col)
    }
  baseCache.set(L, c)
  return c
}

/** Pinta a UF escolhida na lista (toda a área um tom acima e a divisa clara). */
function highlightUf(g: CanvasRenderingContext2D, L: number, uf: string) {
  const grid = landGrid(L)
  const id = ufIndex(uf)
  if (!id) return
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= L || y >= L ? 0 : (grid[y * L + x] ?? 0))
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      if (at(x, y) !== id) continue
      const edge = at(x - 1, y) !== id || at(x + 1, y) !== id || at(x, y - 1) !== id || at(x, y + 1) !== id
      px(g, x, y, edge ? 'stone3' : bayer(x, y) < 0.5 ? 'haze' : 'stone1')
    }
}

/** Pixels de uma reta (Bresenham), do primeiro ao último. */
export function linePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = []
  let x = Math.round(x0)
  let y = Math.round(y0)
  const xe = Math.round(x1)
  const ye = Math.round(y1)
  const dx = Math.abs(xe - x)
  const dy = -Math.abs(ye - y)
  const sx = x < xe ? 1 : -1
  const sy = y < ye ? 1 : -1
  let err = dx + dy
  for (let guard = 0; guard < 4096; guard++) {
    out.push([x, y])
    if (x === xe && y === ye) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return out
}

const SIDE: Record<Side, { base: PaletteKey; hi: PaletteKey; lo: PaletteKey }> = {
  avanco: { base: 'green', hi: 'leafHi', lo: 'vine1' },
  caso: { base: 'red', hi: 'redGlow', lo: 'crimsonDeep' },
}

// alfinete do ponto certo: ponta em (2, 6)
const PIN = ['.kkk.', 'kHCCk', 'kCCCk', 'kCCLk', '.kLk.', '..s..', '..s..']
// mira do toque: centro em (3, 3)
const AIM = ['..kgk..', '.kgkgk.', 'kgk.kgk', 'gk.w.kg', 'kgk.kgk', '.kgkgk.', '..kgk..']

function sprite(
  g: CanvasRenderingContext2D,
  rows: string[],
  ox: number,
  oy: number,
  map: Record<string, PaletteKey>,
) {
  rows.forEach((r, yy) => {
    for (let xx = 0; xx < r.length; xx++) {
      const col = map[r[xx] ?? '.']
      if (col) px(g, ox + xx, oy + yy, col)
    }
  })
}

export function drawPin(g: CanvasRenderingContext2D, x: number, y: number, side: Side, drop = 0) {
  const s = SIDE[side]
  sprite(g, PIN, Math.round(x) - 2, Math.round(y) - 6 - Math.round(drop), {
    k: 'void',
    H: 'white',
    C: s.base,
    L: s.lo,
    s: 'stoneHi',
  })
}

export function drawAim(g: CanvasRenderingContext2D, x: number, y: number, hot = true) {
  sprite(g, AIM, Math.round(x) - 3, Math.round(y) - 3, {
    k: 'void',
    g: hot ? 'goldHi' : 'gold1',
    w: 'white',
  })
}

/** Mira pequena (3×3) para o mapa final, onde cabem 6 linhas. */
function drawDot(g: CanvasRenderingContext2D, x: number, y: number, col: PaletteKey) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  for (const [dx, dy] of [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ] as const)
    px(g, cx + dx, cy + dy, 'void')
  px(g, cx, cy, col)
}

function drawRing(g: CanvasRenderingContext2D, x: number, y: number, side: Side, k: number) {
  const r = Math.round(2 + k * 7)
  const cx = Math.round(x)
  const cy = Math.round(y)
  const col = k < 0.5 ? SIDE[side].hi : SIDE[side].base
  for (let dx = -r; dx <= r; dx++) {
    const dy = r - Math.abs(dx)
    if ((dx + r) % 2) continue
    px(g, cx + dx, cy + dy, col)
    if (dy) px(g, cx + dx, cy - dy, col)
  }
}

export interface Mark {
  side: Side
  guess?: Pt | null
  target?: Pt | null
  /** 0..1 da linha (do toque até o ponto certo) */
  line?: number
  /** desenha o alfinete do ponto certo */
  pin?: boolean
  /** queda do alfinete em pixels lógicos */
  drop?: number
  /** 0..1 do anel que se abre no ponto certo (fora disso, sem anel) */
  ring?: number
  /** rodadas já feitas, durante a partida: só um ponto escuro */
  past?: boolean
  /** mapa final: mira pequena no lugar da grande */
  small?: boolean
}

export function drawMap(
  g: CanvasRenderingContext2D,
  L: number,
  o: { marks: Mark[]; highlight?: string | null; ox?: number; oy?: number },
) {
  const ox = o.ox ?? 0
  const oy = o.oy ?? 0
  g.save()
  g.translate(ox, oy)
  g.imageSmoothingEnabled = false
  g.drawImage(baseMap(L), 0, 0)
  if (o.highlight) highlightUf(g, L, o.highlight)
  const P = (p: Pt) => toXY(p, L)
  // camadas: passadas, linhas, anéis, alfinetes, miras
  for (const m of o.marks) {
    if (!m.past || !m.target) continue
    const [x, y] = P(m.target)
    drawDot(g, x, y, SIDE[m.side].lo)
  }
  for (const m of o.marks) {
    if (m.past || !m.guess || !m.target || !m.line) continue
    const [x0, y0] = P(m.guess)
    const [x1, y1] = P(m.target)
    const pts = linePixels(x0, y0, x1, y1)
    const n = Math.round(pts.length * Math.min(1, m.line))
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      if (!p) continue
      if (i % 3 === 2) continue
      px(g, p[0], p[1], i % 3 === 0 ? 'goldHi' : 'gold')
    }
    // ponta da linha andando: um pixel branco
    const head = pts[Math.max(0, n - 1)]
    if (head && m.line < 1) px(g, head[0], head[1], 'white')
  }
  for (const m of o.marks) {
    if (m.past || !m.target || m.ring === undefined || m.ring < 0 || m.ring > 1) continue
    const [x, y] = P(m.target)
    drawRing(g, x, y, m.side, m.ring)
  }
  for (const m of o.marks) {
    if (m.past) continue
    if (m.guess) {
      const [x, y] = P(m.guess)
      if (m.small) drawDot(g, x, y, 'goldHi')
      else drawAim(g, x, y)
    }
  }
  for (const m of o.marks) {
    if (m.past || !m.target || !m.pin) continue
    const [x, y] = P(m.target)
    drawPin(g, x, y, m.side, m.drop ?? 0)
  }
  g.restore()
}
