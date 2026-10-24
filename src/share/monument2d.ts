// O "13" de pedra em 2D (degrau final quando não há WebGL nem o still do diretor de arte),
// mais a coroa e os anéis de energia, que os cards e o clipe também usam.
import { css, type Ink, rect } from './kit'

const G1 = ['.XXX.', 'XXXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', 'XXXXX']
const G3 = ['XXXXX.', 'XXXXXX', '....XX', '....XX', '.XXXX.', '....XX', '....XX', 'XXXXXX', 'XXXXX.']

function hash(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** Coroa procedural: faixa com joias, 5 pontas com pérolas, luz do alto à esquerda. */
export function crownSize(w: number) {
  const W = Math.max(13, Math.round(w) | 1)
  const band = Math.max(4, Math.round(W * 0.22))
  const tall = Math.round(W * 0.5)
  return { w: W, h: band + tall + 3, band, tall }
}

const crownCache = new Map<number, HTMLCanvasElement>()

function crownSprite(width: number) {
  const { w: W, h: H, band, tall } = crownSize(width)
  const hit = crownCache.get(W)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = W + 2
  c.height = H + 2
  const g = c.getContext('2d')
  if (!g) return c
  const col = new Map<string, Ink>()
  const set = (x: number, y: number, k: Ink) => {
    if (x >= 0 && y >= 0 && x < W && y < H) col.set(`${x},${y}`, k)
  }
  const top = H - band
  // pontas
  const n = 5
  for (let i = 0; i < n; i++) {
    const px = Math.round(((i + 0.5) / n) * (W - 1))
    const ph = Math.round(tall * ([0.55, 0.8, 1, 0.8, 0.55][i] ?? 1))
    const hw = Math.max(2, Math.round(W / n / 2))
    for (let r = 0; r <= ph; r++) {
      const half = Math.round((hw * r) / ph)
      for (let x = px - half; x <= px + half; x++)
        set(x, top - ph + r, x < px ? 'goldHi' : x === px ? 'gold' : 'gold1')
    }
    // pérola no topo
    const by = top - ph - 2
    set(px - 1, by, 'gold')
    set(px + 1, by, 'gold1')
    set(px, by - 1, 'goldHi')
    set(px, by + 1, 'gold1')
    set(px, by, 'sparkle')
  }
  // faixa
  for (let y = top; y < H; y++)
    for (let x = 0; x < W; x++) {
      let k: Ink = 'gold'
      if (y === top) k = 'goldHi'
      else if (y === H - 1) k = 'gold1'
      else if (x < 2) k = 'goldHi'
      else if (x > W - 3) k = 'gold1'
      set(x, y, k)
    }
  // joias
  const jy = top + Math.floor(band / 2) - 1
  for (const [fx, a, b] of [
    [0.2, 'crimson', 'redHot'],
    [0.5, 'blue0', 'blue1'],
    [0.8, 'crimson', 'redHot'],
  ] as const) {
    const jx = Math.round(fx * (W - 1))
    set(jx - 1, jy, b)
    set(jx, jy, a)
    set(jx - 1, jy + 1, a)
    set(jx, jy + 1, a)
    if (band > 4) {
      set(jx + 1, jy, a)
      set(jx + 1, jy + 1, a)
    }
  }
  const has = (x: number, y: number) => col.has(`${x},${y}`)
  for (let y = -1; y <= H; y++)
    for (let x = -1; x <= W; x++)
      if (!has(x, y) && (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1))) {
        g.fillStyle = css('gold0')
        g.fillRect(x + 1, y + 1, 1, 1)
      }
  for (const [k, v] of col) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    g.fillStyle = css(v)
    g.fillRect(x + 1, y + 1, 1, 1)
  }
  crownCache.set(W, c)
  return c
}

/** Coroa com halo pontilhado. (x, y) = centro da base; `w` = largura em px lógicos. */
export function drawCrown(g: CanvasRenderingContext2D, x: number, y: number, w = 25, halo = true) {
  const spr = crownSprite(w)
  const ox = Math.round(x - spr.width / 2)
  const oy = Math.round(y - spr.height)
  if (halo) {
    const rx = spr.width / 2 + 6
    const ry = spr.height / 2 + 5
    for (let yy = -6; yy < spr.height + 5; yy++)
      for (let xx = -7; xx < spr.width + 7; xx++) {
        const dx = (xx - spr.width / 2) / rx
        const dy = (yy - spr.height / 2) / ry
        const d = dx * dx + dy * dy
        if (d > 1) continue
        const th = ((xx & 1) + (yy & 1) * 2) / 4
        if ((1 - d) * 0.9 > th + 0.2) rect(g, ox + xx, oy + yy, 1, 1, d < 0.45 ? 'gold1' : 'gold0')
      }
  }
  g.drawImage(spr, ox, oy)
  return { x: ox, y: oy, w: spr.width, h: spr.height }
}

type Pt = [number, number]

/** Anel de energia: elipse inclinada com núcleo branco, corpo vermelho e halo pontilhado. */
export function ring(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tilt: number,
  half: 'back' | 'front' | 'all',
  phase = 0,
) {
  const core = new Map<string, Pt>()
  const n = Math.ceil(rx * 8)
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const back = Math.sin(a) < 0
    if (half === 'back' && !back) continue
    if (half === 'front' && back) continue
    // o anel some nas pontas de trás (luz fraca) e brilha na frente
    const ex = Math.cos(a) * rx
    const ey = Math.sin(a) * ry
    const x = Math.round(cx + ex * ct - ey * st)
    const y = Math.round(cy + ex * st + ey * ct)
    core.set(`${x},${y}`, [x, y])
  }
  const halo = new Map<string, Pt>()
  for (const [x, y] of core.values())
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const k = `${x + dx},${y + dy}`
      if (!core.has(k)) halo.set(k, [x + dx, y + dy])
    }
  for (const [x, y] of halo.values())
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const k = `${x + dx},${y + dy}`
      if (!core.has(k) && !halo.has(k) && ((x + dx + y + dy) & 1) === 0)
        rect(g, x + dx, y + dy, 1, 1, 'crimson')
    }
  for (const [x, y] of halo.values()) rect(g, x, y, 1, 1, half === 'back' ? 'crimson' : 'red')
  let i = 0
  for (const [x, y] of core.values()) {
    const hot = (i + Math.floor(phase)) % 9 < 3
    rect(g, x, y, 1, 1, half === 'back' ? 'red' : hot ? 'white' : 'redGlow')
    i++
  }
}

export interface MonumentInfo {
  left: number
  right: number
  top: number
  base: number
  crownX: number
  crownY: number
  crownW: number
}

/**
 * Monumento "13" extrudado, com pedra rachada, interior vermelho, mata e anéis.
 * `cx` = centro, `baseY` = linha do chão, `s` = lado menor da arte (escala o tamanho).
 */
export function draw13Monument(
  g: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  o: { crown?: boolean; progress?: number; rings?: boolean; phase?: number } = {},
): MonumentInfo {
  const cw = Math.max(3, Math.round(s / 24))
  const ch = Math.max(4, Math.round(s / 21))
  const gap = cw
  const W = (5 + 6) * cw + gap
  const H = 9 * ch
  const x0 = Math.round(cx - W / 2)
  const y0 = Math.round(baseY - H)
  const prog = o.progress ?? 1
  const mask = new Uint8Array(W * H)
  const put = (glyph: string[], ox: number) => {
    const cols = glyph[0]?.length ?? 0
    for (let gx = 0; gx < cols; gx++) {
      // ruína: cada coluna desmorona do topo conforme o progresso
      const hgt = prog >= 1 ? 9 : Math.round(9 * Math.min(1, 0.25 + prog * 0.6 + hash(gx + ox, 5) * 0.3))
      glyph.forEach((row, gy) => {
        if (row[gx] !== 'X' || gy < 9 - hgt) return
        for (let yy = 0; yy < ch; yy++)
          for (let xx = 0; xx < cw; xx++) mask[(gy * ch + yy) * W + ox + gx * cw + xx] = 1
      })
    }
  }
  put(G1, 0)
  put(G3, 5 * cw + gap)
  const has = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1

  const ring1 = { cx: cx + 2, cy: baseY - H * 0.32, rx: W * 0.72, ry: W * 0.16, tilt: -0.14 }
  const ring2 = { cx: cx - 1, cy: baseY - H * 0.7, rx: W * 0.6, ry: W * 0.12, tilt: 0.18 }
  if (o.rings !== false) {
    ring(g, ring1.cx, ring1.cy, ring1.rx, ring1.ry, ring1.tilt, 'back', o.phase)
    ring(g, ring2.cx, ring2.cy, ring2.rx, ring2.ry, ring2.tilt, 'back', o.phase)
  }

  // brilho vermelho atrás do monumento (pontilhado)
  for (let y = -6; y < H + 4; y++)
    for (let x = -8; x < W + 10; x++) {
      if (has(x, y)) continue
      let near = 99
      for (let r = 1; r <= 3 && near === 99; r++)
        if (has(x - r, y) || has(x + r, y) || has(x, y - r) || has(x, y + r)) near = r
      if (near === 99) continue
      if (near === 1) rect(g, x0 + x, y0 + y, 1, 1, 'blood0')
      else if (((x + y) & 1) === 0) rect(g, x0 + x, y0 + y, 1, 1, near === 2 ? 'crimsonDeep' : 'blood1')
    }

  // extrusão para trás e para a direita/cima: topo de pedra, lado vermelho
  const D = Math.max(2, Math.round(cw * 0.6))
  for (let d = D; d >= 1; d--) {
    const ox = d
    const oy = -Math.round(d * 0.7)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!has(x, y)) continue
        const top = !has(x, y - 1)
        const right = !has(x + 1, y)
        if (!top && !right) continue
        let col: Ink
        if (top) col = d === D ? 'stone0' : (x + d) % 5 === 0 ? 'stone1' : 'stone2'
        else col = d === D ? 'blood1' : y > H * 0.6 ? 'crimsonDeep' : (y + d) % 4 === 0 ? 'red' : 'crimson'
        rect(g, x0 + x + ox, y0 + y + oy, 1, 1, col)
      }
  }

  // face da frente: pedra clara com rachaduras e manchas vermelhas
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!has(x, y)) continue
      const n = hash(Math.floor(x / 2), Math.floor(y / 2))
      let col: Ink = n > 0.82 ? 'stoneHi' : n > 0.3 ? 'stone3' : 'stone2'
      if (!has(x - 1, y) || !has(x, y - 1)) col = 'stoneHi'
      if (!has(x + 1, y) || !has(x, y + 1)) col = 'stone2'
      // interior vermelho exposto na parte de baixo
      const rz = hash(Math.floor(x / 3) + 7, Math.floor(y / 3) + 3)
      if (y > H * 0.55 && rz > 0.72) col = rz > 0.9 ? 'red' : 'crimson'
      rect(g, x0 + x, y0 + y, 1, 1, col)
    }
  // rachaduras: caminhadas aleatórias
  for (let c = 0; c < 9; c++) {
    let x = Math.floor(hash(c, 1) * W)
    let y = Math.floor(hash(c, 2) * H)
    for (let k = 0; k < 10 + hash(c, 3) * 10; k++) {
      if (has(x, y) && has(x - 1, y) && has(x + 1, y)) rect(g, x0 + x, y0 + y, 1, 1, 'stone0')
      x += hash(c, k) < 0.5 ? (hash(k, c) < 0.5 ? -1 : 1) : 0
      y += hash(k + 3, c) < 0.6 ? 1 : 0
    }
  }
  // rim light vermelho na borda esquerda e contorno escuro embaixo
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!has(x, y)) continue
      if (!has(x - 1, y)) rect(g, x0 + x - 1, y0 + y, 1, 1, y % 3 === 0 ? 'redGlow' : 'redHot')
      if (!has(x, y + 1)) rect(g, x0 + x, y0 + y + 1, 1, 1, 'blood0')
    }
  // mata: tufos nas bordas de cima e trepadeiras descendo
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      if (!has(x, y) || has(x, y - 1)) continue
      const v = hash(x * 3, y * 5)
      if (v > 0.55) {
        rect(g, x0 + x, y0 + y - 1, 1, 1, v > 0.85 ? 'leafHi' : 'green')
        if (v > 0.7) rect(g, x0 + x, y0 + y - 2, 1, 1, 'vine1')
      }
      if (v > 0.8) {
        const len = 2 + Math.floor(hash(x, y) * ch * 0.9)
        for (let k = 0; k < len; k++) {
          if (!has(x, y + k)) break
          rect(g, x0 + x, y0 + y + k, 1, 1, k === len - 1 ? 'leafHi' : k % 2 ? 'vine1' : 'green')
        }
      }
    }
  // pedras e mato na base
  for (let x = -6; x < W + 8; x++) {
    const hgt = 1 + Math.floor(hash(x, 99) * 4)
    for (let k = 0; k < hgt; k++) {
      const col: Ink =
        k === hgt - 1 ? (hash(x, 7) > 0.5 ? 'green' : 'stone2') : hash(x, k) > 0.5 ? 'stone1' : 'stone0'
      rect(g, x0 + x, baseY - k + 1, 1, 1, col)
    }
    if (hash(x, 3) > 0.7) rect(g, x0 + x, baseY - hgt, 1, 1, 'leafHi')
  }

  if (o.rings !== false) {
    ring(g, ring1.cx, ring1.cy, ring1.rx, ring1.ry, ring1.tilt, 'front', o.phase)
    ring(g, ring2.cx, ring2.cy, ring2.rx, ring2.ry, ring2.tilt, 'front', o.phase)
  }

  const crownX = x0 + 5 * cw + gap + 3 * cw + 1
  const crownY = y0 - D - 4
  const crownW = Math.round(cw * 3.8) | 1
  if (o.crown) drawCrown(g, crownX, crownY, crownW)
  return { left: x0, right: x0 + W + D, top: y0 - D, base: baseY, crownX, crownY, crownW }
}

/** Faísca/brasa de 1 px que sobe (rampa do fogo pela idade 0..1). */
export function ember(g: CanvasRenderingContext2D, x: number, y: number, age: number) {
  const ramp: Ink[] = ['white', 'goldHi', 'emberBright', 'ember', 'red', 'blood1']
  const col = ramp[Math.min(ramp.length - 1, Math.floor(age * ramp.length))] ?? 'red'
  g.fillStyle = css(col)
  g.fillRect(Math.round(x), Math.round(y), 1, 1)
}
