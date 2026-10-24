// Cenários das 13 fases, no estilo do título: noite, a mesma paleta de 32 cores, 4–5 planos achatados
// (céu, nuvens, silhueta distante, marco do lugar, primeiro plano escuro). O meio da tela fica calmo
// (valor ≤ 30%) para o jogo por cima; o detalhe vai para o horizonte e as bordas.
import { mulberry32 } from '../lib/rng'
import { bank, cloudLayer, drawBush, drawRock, moonBuf, type Puff } from './backdrop'
import { Buf, bayer, clamp01, DARKER, dith, KEYS, type K, makeNoise, RGB, U32, vgrad } from './pal'

type Ctx = {
  b: Buf
  W: number
  H: number
  hz: number
  /** unidade de escala: lado menor / 100 */
  s: number
  rnd: () => number
  nz: ReturnType<typeof makeNoise>
}

const LUM = {} as Record<K, number>
for (const k of KEYS) {
  const [r, g, b] = RGB[k]
  LUM[k] = Math.max(r, g, b) / 255
}
const FROM_U32 = new Map<number, K>(KEYS.map((k) => [U32[k], k]))

// ---------- peças de cenário ----------

function sky(c: Ctx, glow: K = 'blood1', stars = 1) {
  const { b, W, hz, rnd } = c
  vgrad(b, 0, 0, W, hz + 2, [
    [0, 'void'],
    [0.35, 'void'],
    [0.62, 'night'],
    [0.82, 'dusk'],
    [0.94, 'blood0'],
    [1, glow],
  ])
  const n = Math.round(((W * hz) / 170) * stars)
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * W)
    const y = Math.floor(rnd() ** 1.5 * hz * 0.75)
    const v = rnd()
    b.set(x, y, v > 0.97 ? 'sparkle' : v > 0.8 ? 'stone2' : v > 0.45 ? 'stone1' : 'stone0')
  }
}

function moon(c: Ctx, x: number, y: number, r: number) {
  const m = moonBuf(Math.max(6, Math.round(r)), 1)
  c.b.blit(m, Math.round(x - m.w / 2), Math.round(y - m.h / 2))
}

function clouds(c: Ctx, y: number, h: number, lit: 'top' | 'bottom', dim: number, seed: number, xs: [number, number][]) {
  const r = mulberry32(seed)
  const W = Math.ceil(c.W / 24) * 24
  const puffs: Puff[] = []
  for (const [a, z] of xs) puffs.push(...bank(r, a * c.W, z * c.W, y, h, Math.max(5, Math.round(((z - a) * c.W) / (h * 0.7)))))
  const layer = cloudLayer(W, c.H, puffs, lit, dim, seed)
  c.b.blit(layer, 0, 0)
}

/** serra/morro: perfil `top(x)`, corpo escuro com borda acesa e névoa no pé */
function ridge(c: Ctx, top: (x: number) => number, body: K, rim: K, fog: K | null, bottom = c.hz) {
  const { b, W } = c
  for (let x = 0; x < W; x++) {
    const t = Math.round(top(x))
    if (t >= bottom) continue
    const rising = top(x + 1) < t
    for (let y = t; y <= bottom; y++) {
      let k: K = y === t || (rising && y - t < 2) ? rim : body
      if (fog && y > bottom - (bottom - t) * 0.35 && dith(x, y, ((y - (bottom - (bottom - t) * 0.35)) / ((bottom - t) * 0.35 + 1)) * 0.5)) k = fog
      b.set(x, y, k)
    }
  }
}

function windows(c: Ctx, x: number, y: number, w: number, h: number, rate: number, step = 2) {
  for (let wy = y + 2; wy < y + h - 1; wy += step + 1)
    for (let wx = x + 1; wx < x + w - 1; wx += step) {
      if (c.rnd() < rate) {
        const v = c.rnd()
        c.b.set(wx, wy, v > 0.9 ? 'sparkle' : v > 0.65 ? 'goldHi' : v > 0.35 ? 'gold' : v > 0.12 ? 'ember' : 'emberDark')
      } else c.b.set(wx, wy, 'void')
    }
}

function building(c: Ctx, x: number, base: number, w: number, h: number, body: K, edge: K, rate = 0.35) {
  const top = base - h
  c.b.rect(x, top, w, h, body)
  c.b.rect(x, top, w, 1, edge)
  c.b.rect(x, top, 1, h, edge)
  windows(c, x, top, w, h, rate)
}

function skyline(c: Ctx, x0: number, x1: number, base: number, hMin: number, hMax: number, back: boolean) {
  let x = x0
  while (x < x1) {
    const w = Math.round(c.s * (3 + c.rnd() * 6))
    const h = Math.round(hMin + c.rnd() ** 1.5 * (hMax - hMin))
    building(c, x, base, w, h, back ? 'dusk' : 'night', back ? 'hazeDark' : 'dusk', back ? 0.25 : 0.35)
    x += w + (c.rnd() < 0.3 ? 1 : 0)
  }
}

/** água com faixas de reflexo e colunas de luz partidas embaixo de cada luz */
function water(c: Ctx, y0: number, y1: number, lights: { x: number; k: K }[], tint: K = 'blood1') {
  const { b, W, nz } = c
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0)
    for (let x = 0; x < W; x++) {
      const s = nz.n2(x / 11, y * 0.9)
      let k: K = t < 0.3 ? 'night' : 'void'
      if (t < 0.12) k = s > 0.58 ? 'emberDark' : s > 0.42 ? tint : k
      else if (s > 0.8 - t * 0.1) k = t < 0.5 ? tint : 'blue0'
      b.set(x, y, k)
    }
  }
  for (const l of lights) {
    const len = Math.round((y1 - y0) * (0.25 + c.rnd() * 0.4))
    for (let i = 1; i < len; i++) {
      if ((i + Math.floor(l.x)) % 3 === 0) continue
      const f = i / len
      if (f > 0.5 && bayer(l.x, y0 + i) < f - 0.3) continue
      const jit = Math.round(Math.sin(i * 0.7 + l.x) * (f > 0.3 ? 1 : 0))
      b.set(l.x + jit, y0 + i, f < 0.2 ? l.k : f < 0.45 ? 'ember' : f < 0.7 ? 'emberDark' : 'blood1')
    }
  }
}

function palm(c: Ctx, x: number, base: number, h: number, dark: boolean) {
  const { b, rnd } = c
  const lean = (rnd() - 0.5) * 0.6
  let px = x
  let py = base
  for (let i = 0; i < h; i++) {
    px = x + lean * i + Math.sin(i / h) * 2
    py = base - i
    b.set(px, py, dark ? 'void' : i % 3 === 0 ? 'gold0' : 'blood0')
    if (h > 18) b.set(px + 1, py, dark ? 'void' : 'blood0')
  }
  const fronds = 7
  for (let f = 0; f < fronds; f++) {
    const a = -Math.PI / 2 + ((f - (fronds - 1) / 2) / fronds) * Math.PI * 1.25
    const len = h * (0.35 + rnd() * 0.15)
    for (let i = 0; i < len; i++) {
      const t = i / len
      const xx = px + Math.cos(a) * i
      const yy = py + Math.sin(a) * i + t * t * len * 0.55
      b.set(xx, yy, dark ? 'void' : t < 0.3 ? 'vine1' : 'vine0')
      if (!dark && i % 2 === 0 && t > 0.2) b.set(xx, yy + 1, 'vine0')
    }
  }
}

function cactus(c: Ctx, x: number, base: number, h: number) {
  const { b } = c
  const w = Math.max(2, Math.round(h / 7))
  const col = (cx: number, top: number, bot: number) => {
    for (let y = top; y < bot; y++)
      for (let i = 0; i < w; i++) b.set(cx + i, y, i === 0 ? 'vine1' : i === w - 1 ? 'void' : 'vine0')
    b.set(cx + Math.floor(w / 2), top - 1, 'leafHi')
  }
  col(x, base - h, base)
  const arm = (dir: number, at: number, len: number) => {
    const ay = base - Math.round(h * at)
    for (let i = 0; i < len; i++) for (let j = 0; j < w; j++) b.set(x + dir * (i + w) + (dir < 0 ? 0 : 0), ay - j, j === 0 ? 'vine0' : 'vine1')
    col(x + dir * (len + w) + (dir < 0 ? 0 : 0), ay - Math.round(h * 0.35), ay)
  }
  arm(1, 0.45, Math.round(h * 0.18))
  arm(-1, 0.6, Math.round(h * 0.14))
}

function ground(c: Ctx, y0: number, a: K, b2: K) {
  const { b, W, H, nz } = c
  for (let y = y0; y < H; y++)
    for (let x = 0; x < W; x++) b.set(x, y, nz.n2(x / 4, y / 2) > 0.76 ? b2 : a)
}

/** primeiro plano escuro emoldurando os cantos de baixo */
function frame(c: Ctx, seed: number, glow = false) {
  const r = mulberry32(seed)
  const g = glow ? { x: c.W / 2, y: c.H * 0.4, r: c.W * 0.6 } : null
  for (const side of [0, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = side ? c.W - r() * c.W * 0.18 : r() * c.W * 0.18
      const y = c.H - r() * c.H * 0.08
      if (r() < 0.5) drawRock(c.b, x, y, c.s * (6 + r() * 6), c.s * (4 + r() * 3), Math.floor(r() * 1e6), 0.7, g)
      else drawBush(c.b, x, y, c.s * (5 + r() * 5), Math.floor(r() * 1e6), 0.75, null)
    }
  }
}

/** área de jogo calma: valor ≤ 30% no miolo, subindo suave até as bordas */
function calm(c: Ctx, cy = 0.42, rx = 0.34, ry = 0.24) {
  const { b, W, H } = c
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x / W - 0.5) / rx
      const dy = (y / H - cy) / ry
      const d = Math.hypot(dx, dy)
      if (d >= 1.25) continue
      const t = clamp01((1.25 - d) / 0.5)
      const max = 1 - t * 0.7
      const i = y * W + x
      let k = FROM_U32.get(b.d[i] ?? 0)
      if (!k) continue
      let guard = 0
      while (LUM[k] > max && guard++ < 6) k = DARKER[k]
      // pontilha a fronteira para não marcar uma linha
      if (t < 0.4 && !dith(x, y, t * 2.5)) continue
      b.d[i] = U32[k]
    }
}

// ---------- as 13 fases ----------

type Painter = (c: Ctx) => void

const SCENES: Record<number, Painter> = {
  // 1 · Sertão de Pernambuco: chão rachado, mandacarus, casinha de taipa com a janela acesa
  1(c) {
    const { W, H, hz, s } = c
    sky(c, 'emberDark')
    moon(c, W * 0.78, H * 0.18, s * 9)
    clouds(c, hz - H * 0.08, H * 0.05, 'bottom', 2.4, 3, [[0, 0.4], [0.55, 1]])
    ridge(c, (x) => hz - H * 0.05 - c.nz.fbm(x / 30, 1, 3) * H * 0.07 - (Math.abs(x / W - 0.25) < 0.08 ? H * 0.04 : 0), 'hazeDark', 'haze', 'blood1')
    ground(c, hz, 'blood0', 'blood1')
    // rachaduras do chão
    for (let i = 0; i < 40; i++) {
      let x = c.rnd() * W
      let y = hz + 2 + c.rnd() * (H - hz)
      for (let k = 0; k < 8; k++) {
        c.b.set(x, y, 'void')
        x += c.rnd() < 0.5 ? 1 : -1
        y += c.rnd() < 0.5 ? 1 : 0
      }
    }
    // casinha
    const hx = Math.round(W * 0.08)
    const hb = Math.round(hz + H * 0.03)
    c.b.rect(hx, hb - s * 9, s * 16, s * 9, 'blood1')
    c.b.rect(hx, hb - s * 9, 1, s * 9, 'emberDark')
    for (let i = 0; i < s * 10; i++) c.b.rect(hx - s + i * 0.9, hb - s * 9 - i * 0.45, s * 18 - i * 1.8, 1, i === 0 ? 'emberDark' : 'blood0')
    c.b.rect(hx + s * 3, hb - s * 6, s * 3, s * 3, 'goldHi')
    c.b.set(hx + s * 3, hb - s * 6, 'sparkle')
    c.b.rect(hx + s * 9, hb - s * 6, s * 3, s * 6, 'void')
    cactus(c, Math.round(W * 0.86), Math.round(hz + H * 0.08), Math.round(s * 26))
    cactus(c, Math.round(W * 0.95), Math.round(hz + H * 0.05), Math.round(s * 16))
    cactus(c, Math.round(W * 0.3), Math.round(hz + H * 0.01), Math.round(s * 10))
    frame(c, 11)
  },
  // 2 · Fortaleza: mar, jangadas de vela triangular, coqueiros e o farol
  2(c) {
    const { W, H, hz, s } = c
    sky(c)
    moon(c, W * 0.2, H * 0.16, s * 8)
    clouds(c, hz - H * 0.12, H * 0.08, 'top', 0.8, 5, [[0.45, 0.95]])
    const lights: { x: number; k: K }[] = []
    skyline(c, Math.round(W * 0.62), W, hz, s * 4, s * 16, true)
    for (let x = Math.round(W * 0.6); x < W; x += 3) lights.push({ x, k: x % 2 ? 'gold' : 'ember' })
    water(c, hz, Math.round(H * 0.86), lights, 'crimsonDeep')
    // ondas com espuma
    for (let y = hz + 4; y < H * 0.86; y += Math.round(s * 4)) for (let x = (y * 7) % 9; x < W; x += 9) c.b.rect(x, y, 3, 1, y > H * 0.7 ? 'stone2' : 'haze')
    // areia
    ground(c, Math.round(H * 0.86), 'blood0', 'blood1')
    // jangadas
    for (const [jx, jy, js] of [
      [0.12, 0.72, 1],
      [0.3, 0.66, 0.6],
      [0.86, 0.7, 0.8],
    ] as const) {
      const x = Math.round(W * jx)
      const y = Math.round(H * jy)
      const k = js * s
      c.b.rect(x - k * 5, y, k * 10, Math.max(1, k), 'emberDark')
      for (let i = 0; i < k * 12; i++) {
        const w = Math.round((i / (k * 12)) * k * 7)
        c.b.rect(x, y - i - 1, Math.max(1, w), 1, i % 4 === 0 ? 'stone2' : 'stone3')
      }
      c.b.rect(x - 1, y - k * 13, 1, k * 13, 'gold0')
    }
    // farol do Mucuripe
    const fx = Math.round(W * 0.93)
    c.b.rect(fx - s * 2, hz - s * 22, s * 4, s * 22, 'stone1')
    c.b.rect(fx - s * 2, hz - s * 22, 1, s * 22, 'stone3')
    c.b.rect(fx - s * 3, hz - s * 24, s * 6, s * 2, 'goldHi')
    for (let i = 0; i < W * 0.35; i++) if (dith(fx - i, hz - s * 23, 0.6 - i / (W * 0.7))) c.b.set(fx - i, hz - s * 23 + Math.round(i * 0.08), 'gold1')
    palm(c, Math.round(W * 0.04), H, Math.round(s * 40), true)
    palm(c, Math.round(W * 0.97), H, Math.round(s * 34), true)
  },
  // 3 · São Luís: casario colonial com azulejos, sacadas e janelas acesas
  3(c) {
    const { W, H, hz, s } = c
    sky(c)
    clouds(c, hz - H * 0.22, H * 0.07, 'top', 1, 7, [[0, 0.5]])
    moon(c, W * 0.82, H * 0.14, s * 7)
    let x = 0
    const base = Math.round(H * 0.82)
    while (x < W) {
      const w = Math.round(s * (14 + c.rnd() * 6))
      const h = Math.round(s * (24 + c.rnd() * 10))
      const top = base - h
      const tile = c.rnd() < 0.5
      for (let yy = top; yy < base; yy++)
        for (let xx = x; xx < x + w; xx++) {
          let k: K = tile && (xx + yy) % 4 === 0 ? 'blue1' : tile && (xx + yy) % 2 === 0 ? 'blue0' : c.rnd() < 0.5 ? 'dusk' : 'hazeDark'
          if (yy === top || yy === top + 1) k = 'emberDark'
          if (xx === x) k = 'haze'
          c.b.set(xx, yy, k)
        }
      // janelas em arco, 2 andares
      for (const fy of [top + s * 5, top + s * 15]) {
        for (let wx = x + s * 2; wx < x + w - s * 4; wx += s * 6) {
          const lit = c.rnd() < 0.55
          c.b.rect(wx, fy, s * 3, s * 6, lit ? 'gold' : 'void')
          c.b.rect(wx, fy, s * 3, 1, lit ? 'goldHi' : 'night')
          c.b.set(wx, fy, 'stone2')
          c.b.rect(wx - 1, fy + s * 6, s * 3 + 2, 1, 'stone2')
        }
      }
      x += w + 1
    }
    // rua de pedra
    for (let y = base; y < H; y++) for (let xx = 0; xx < W; xx++) c.b.set(xx, y, (xx + (y % 2) * 2) % 4 === 0 ? 'stone0' : y % 3 === 0 ? 'night' : 'void')
    calm(c)
    frame(c, 13)
  },
  // 4 · Pará: floresta em camadas, rio e o clarão das queimadas no horizonte
  4(c) {
    const { W, H, hz, s, nz } = c
    sky(c, 'emberDark')
    clouds(c, hz - H * 0.04, H * 0.06, 'bottom', 1.6, 9, [[0, 1]])
    const canopy = (y0: number, amp: number, body: K, rim: K, seed: number) =>
      ridge(c, (x) => y0 - amp * (nz.fbm(x / (6 * s) + seed, seed, 3) + Math.max(0, Math.sin(x / (5 * s) + seed)) * 0.4), body, rim, null, c.H)
    canopy(hz - s * 2, s * 18, 'hazeDark', 'haze', 1)
    canopy(hz + s * 6, s * 16, 'vine0', 'vine1', 4)
    water(c, Math.round(H * 0.72), Math.round(H * 0.84), [{ x: Math.round(W * 0.7), k: 'ember' }], 'blood1')
    canopy(H * 0.98, s * 30, 'void', 'vine0', 9)
    // vaga-lumes
    for (let i = 0; i < 26; i++) c.b.set(c.rnd() * W, hz + c.rnd() * (H - hz), c.rnd() < 0.5 ? 'leafHi' : 'goldHi')
    // fumaça vermelha subindo do horizonte
    for (let i = 0; i < 3; i++) {
      const fx = W * (0.15 + i * 0.35)
      for (let y = hz - s * 30; y < hz; y++) {
        const w = (hz - y) * 0.25 + 2
        for (let xx = -w; xx < w; xx++) if (dith(Math.round(fx + xx), y, 0.25 * (1 - Math.abs(xx) / w))) c.b.set(fx + xx + Math.sin(y / 6) * 4, y, 'blood1')
      }
    }
    calm(c)
  },
  // 5 · Manaus: Teatro Amazonas com a cúpula de escamas verde-amarelo-azul e o Rio Negro
  5(c) {
    const { W, H, hz, s } = c
    sky(c)
    moon(c, W * 0.16, H * 0.15, s * 8)
    clouds(c, hz - H * 0.18, H * 0.07, 'top', 1, 15, [[0.5, 1]])
    skyline(c, 0, W, hz, s * 3, s * 12, true)
    const tx = Math.round(W * 0.74)
    const base = Math.round(hz + s * 2)
    const bw = Math.round(s * 34)
    c.b.rect(tx - bw / 2, base - s * 14, bw, s * 14, 'stone1')
    c.b.rect(tx - bw / 2, base - s * 14, bw, 1, 'stone3')
    for (let i = 0; i < 7; i++) c.b.rect(tx - bw / 2 + s * 2 + i * s * 4.6, base - s * 12, Math.max(1, s), s * 12, 'stone3')
    // cúpula de escamas
    const R = Math.round(s * 10)
    const cy = base - s * 14
    for (let y = -R; y <= 0; y++)
      for (let x = -R; x <= R; x++) {
        if (x * x + y * y * 1.3 > R * R) continue
        const sc = ((x + 50) >> 1) + ((y + 50) >> 1)
        const k: K = sc % 3 === 0 ? 'gold' : sc % 3 === 1 ? 'green' : 'blue1'
        c.b.set(tx + x, cy + y, x > R * 0.4 ? DARKER[k] : k)
      }
    c.b.rect(tx, cy - R - s * 3, 1, s * 3, 'goldHi')
    water(c, Math.round(H * 0.74), Math.round(H * 0.9), [{ x: tx, k: 'gold' }, { x: Math.round(W * 0.3), k: 'ember' }], 'blood1')
    ground(c, Math.round(H * 0.9), 'void', 'night')
    calm(c)
    frame(c, 17)
  },
  // 6 · Porto Velho: escola com janelas acesas, sino e bandeira no mastro
  6(c) {
    const { W, H, hz, s } = c
    sky(c)
    moon(c, W * 0.84, H * 0.14, s * 7)
    clouds(c, hz - H * 0.2, H * 0.06, 'top', 1, 19, [[0, 0.45]])
    ridge(c, (x) => hz - s * 6 - c.nz.fbm(x / 40, 3, 3) * s * 10, 'vine0', 'vine1', null)
    const base = Math.round(H * 0.8)
    const sx = Math.round(W * 0.08)
    const sw = Math.round(W * 0.84)
    c.b.rect(sx, base - s * 18, sw, s * 18, 'dusk')
    for (let i = 0; i < s * 6; i++) c.b.rect(sx - s * 2 + i, base - s * 18 - i, sw + s * 4 - i * 2, 1, i === 0 ? 'crimson' : 'blood1')
    for (let wx = sx + s * 4; wx < sx + sw - s * 6; wx += s * 9) {
      const lit = c.rnd() < 0.6
      c.b.rect(wx, base - s * 14, s * 6, s * 6, lit ? 'goldHi' : 'night')
      c.b.rect(wx + s * 3, base - s * 14, 1, s * 6, 'stone1')
    }
    c.b.rect(sx + sw / 2 - s * 3, base - s * 10, s * 6, s * 10, 'blood0')
    // mastro com bandeira
    const mx = Math.round(W * 0.9)
    c.b.rect(mx, base - s * 34, 1, s * 34, 'stone2')
    c.b.rect(mx + 1, base - s * 34, s * 10, s * 7, 'green')
    for (let i = 0; i < s * 3; i++) c.b.rect(mx + 1 + s * 5 - i * 1.5, base - s * 34 + s * 2 + i * 0.5, i * 3, 1, 'gold')
    ground(c, base, 'night', 'stone0')
    for (let x = 0; x < W; x += 6) c.b.rect(x, base + s * 8, 3, 1, 'stone1')
    calm(c)
    frame(c, 19)
  },
  // 7 · Praça dos Três Poderes: as duas torres do Congresso, a cúpula e a cuia, e o espelho d'água
  7(c) {
    congresso(c, 0.5, 0.62, 'emberDark')
    frame(c, 23)
  },
  // 8 · STF: colunas curvas de Niemeyer e a estátua da Justiça na praça
  8(c) {
    const { W, H, hz, s } = c
    sky(c)
    moon(c, W * 0.18, H * 0.15, s * 8)
    clouds(c, hz - H * 0.15, H * 0.07, 'top', 1, 29, [[0.45, 1]])
    const base = Math.round(hz + s * 4)
    c.b.rect(0, base - s * 3, W, s * 3, 'stone2')
    c.b.rect(0, base - s * 16, W, s * 2, 'stone3')
    c.b.rect(0, base - s * 14, W, s * 11, 'night')
    for (let x = s * 3; x < W; x += s * 10) {
      for (let y = 0; y < s * 13; y++) {
        const t = y / (s * 13)
        const w = Math.max(1, Math.round(s * (0.5 + Math.abs(t - 0.5) * 2.6)))
        c.b.rect(Math.round(x - w / 2), base - s * 14 + y, w, 1, t < 0.1 || t > 0.9 ? 'stoneHi' : 'stone3')
      }
    }
    windows(c, s * 2, base - s * 11, W - s * 4, s * 6, 0.25, 3)
    ground(c, base, 'night', 'stone0')
    // a Justiça, sentada, de olhos vendados
    const jx = Math.round(W * 0.85)
    const jb = Math.round(H * 0.9)
    c.b.rect(jx - s * 7, jb - s * 6, s * 14, s * 6, 'stone1')
    c.b.rect(jx - s * 4, jb - s * 16, s * 8, s * 10, 'stone2')
    c.b.rect(jx - s * 2, jb - s * 20, s * 4, s * 4, 'stone3')
    c.b.rect(jx - s * 2, jb - s * 19, s * 4, 1, 'void')
    c.b.rect(jx - s * 5, jb - s * 12, s * 10, s, 'stone3')
    c.b.rect(jx - s * 7, jb - s * 14, 1, s * 9, 'goldHi')
    calm(c)
    frame(c, 29)
  },
  // 9 · Rio de Janeiro: Palácio Tiradentes (Alerj) com colunas e a estátua; Pão de Açúcar ao longe
  9(c) {
    const { W, H, hz, s } = c
    sky(c)
    moon(c, W * 0.82, H * 0.13, s * 8)
    clouds(c, hz - H * 0.12, H * 0.08, 'top', 0.8, 31, [[0, 0.5]])
    const sxp = W * 0.15
    ridge(c, (x) => {
      const u = (x - sxp) / (s * 10)
      return Math.abs(u) < 1 ? hz - s * 22 * (1 - u * u) ** 0.5 : hz - s * 3 - c.nz.fbm(x / 20, 7, 2) * s * 6
    }, 'night', 'hazeDark', 'hazeDark')
    const tx = Math.round(W * 0.66)
    const base = Math.round(H * 0.8)
    const bw = Math.round(W * 0.5)
    c.b.rect(tx - bw / 2, base - s * 20, bw, s * 20, 'stone1')
    c.b.rect(tx - bw / 2, base - s * 20, bw, s, 'stone3')
    for (let i = 0; i < 8; i++) {
      const cx = Math.round(tx - bw / 2 + s * 3 + (i * (bw - s * 6)) / 7)
      c.b.rect(cx, base - s * 18, Math.max(1, s), s * 16, 'stoneHi')
      c.b.rect(cx + Math.max(1, s), base - s * 18, 1, s * 16, 'stone2')
    }
    for (let i = 0; i < s * 8; i++) c.b.rect(tx - s * 16 + i * 2, base - s * 20 - i, s * 32 - i * 4, 1, i % 2 ? 'stone2' : 'stone3')
    c.b.rect(tx - s, base - s * 32, s * 2, s * 5, 'gold1')
    windows(c, tx - bw / 2 + s, base - s * 17, bw - s * 2, s * 14, 0.2, 4)
    ground(c, base, 'night', 'stone0')
    calm(c)
    frame(c, 31)
  },
  // 10 · Aeroporto de Guarulhos: pista, luzes de balizamento, torre de controle e um avião parado
  10(c) {
    const { W, H, hz, s } = c
    sky(c, 'blood0')
    clouds(c, hz - H * 0.16, H * 0.06, 'bottom', 2, 37, [[0, 1]])
    // hangar em arco
    const hx = Math.round(W * 0.2)
    const R = Math.round(s * 18)
    for (let y = -R; y <= 0; y++)
      for (let x = -R * 1.6; x <= R * 1.6; x++) {
        if ((x / 1.6) ** 2 + y * y > R * R) continue
        c.b.set(hx + x, hz + y, (x | 0) % 4 === 0 ? 'stone1' : 'stone0')
      }
    c.b.rect(hx - R, hz - s * 8, R * 2, s * 8, 'void')
    windows(c, hx - R, hz - s * 8, R * 2, s * 8, 0.2, 3)
    // torre de controle
    const tx = Math.round(W * 0.84)
    c.b.rect(tx - s * 2, hz - s * 30, s * 4, s * 30, 'stone1')
    c.b.rect(tx - s * 5, hz - s * 36, s * 10, s * 5, 'blue0')
    c.b.rect(tx - s * 5, hz - s * 34, s * 10, s * 2, 'blue1')
    c.b.set(tx, hz - s * 37, 'redHot')
    ground(c, hz, 'void', 'night')
    // pista com luzes
    for (let i = 0; i < 18; i++) {
      const y = Math.round(hz + 2 + i * i * 0.18 * s)
      if (y >= H) break
      const spread = (y - hz) * 2.2 + 6
      c.b.set(W / 2 - spread, y, 'blue1')
      c.b.set(W / 2 + spread, y, 'blue1')
      if (i % 2 === 0) c.b.rect(W / 2, y, Math.max(1, i * 0.3), 1, 'stone1')
    }
    // avião
    const ax = Math.round(W * 0.66)
    const ay = Math.round(hz + s * 6)
    c.b.rect(ax - s * 16, ay - s * 2, s * 32, s * 3, 'stone2')
    c.b.rect(ax - s * 16, ay - s * 2, s * 32, 1, 'stone3')
    c.b.rect(ax - s * 4, ay, s * 14, s * 2, 'stone1')
    c.b.rect(ax + s * 12, ay - s * 8, s * 3, s * 7, 'stone2')
    for (let i = 0; i < 8; i++) c.b.set(ax - s * 12 + i * s * 3, ay - 1, 'goldHi')
    c.b.set(ax + s * 16, ay, 'redHot')
    calm(c)
  },
  // 11 · Porto de Santos: pilhas de contêineres coloridos, guindastes com luz vermelha e um navio
  11(c) {
    const { W, H, hz, s } = c
    sky(c)
    moon(c, W * 0.5, H * 0.12, s * 7)
    clouds(c, hz - H * 0.1, H * 0.06, 'bottom', 2, 41, [[0, 1]])
    // guindastes
    for (const gx of [0.12, 0.35, 0.82]) {
      const x = Math.round(W * gx)
      const top = hz - s * 28
      c.b.rect(x, top, s * 2, s * 28, 'stone1')
      c.b.rect(x + s * 6, top + s * 4, s * 2, s * 24, 'stone0')
      c.b.rect(x - s * 10, top, s * 30, s * 2, 'stone1')
      for (let i = 0; i < s * 10; i++) c.b.set(x + i, top + s * 4 + i * 2, 'stone0')
      c.b.set(x - s * 10, top - 1, 'redHot')
      c.b.set(x + s * 20, top - 1, 'redHot')
    }
    const cols: K[] = ['crimsonDeep', 'blue0', 'gold1', 'vine1', 'emberDark', 'crimson']
    const stack = (x0: number, x1: number, base: number, rows: number) => {
      for (let r = 0; r < rows; r++)
        for (let x = x0; x < x1; x += s * 12) {
          const k = cols[Math.floor(c.rnd() * cols.length)] ?? 'crimsonDeep'
          const y = base - (r + 1) * s * 5
          c.b.rect(x, y, s * 12 - 1, s * 5 - 1, k)
          c.b.rect(x, y, s * 12 - 1, 1, DARKER[k] === 'void' ? k : k)
          for (let i = x + 2; i < x + s * 12 - 2; i += 2) c.b.rect(i, y + 1, 1, s * 5 - 3, DARKER[k])
        }
    }
    stack(0, Math.round(W * 0.3), hz, 3)
    stack(Math.round(W * 0.7), W, hz, 4)
    water(c, hz, Math.round(H * 0.88), [{ x: Math.round(W * 0.12), k: 'redHot' }, { x: Math.round(W * 0.82), k: 'redHot' }], 'blood1')
    // navio
    const sy = Math.round(H * 0.78)
    c.b.rect(Math.round(W * 0.05), sy - s * 6, Math.round(W * 0.4), s * 6, 'blood0')
    c.b.rect(Math.round(W * 0.05), sy - s * 6, Math.round(W * 0.4), 1, 'crimson')
    stack(Math.round(W * 0.08), Math.round(W * 0.36), sy - s * 6, 2)
    ground(c, Math.round(H * 0.88), 'void', 'night')
    calm(c)
  },
  // 12 · Porto Alegre: o pôr do sol vermelho no Guaíba e a chaminé do Gasômetro
  12(c) {
    const { W, H, hz, s } = c
    sky(c, 'crimsonDeep', 0.6)
    moon(c, W * 0.5, hz - s * 8, s * 12)
    clouds(c, hz - H * 0.14, H * 0.07, 'bottom', 1.2, 43, [[0, 0.4], [0.6, 1]])
    ridge(c, (x) => hz - s * 3 - c.nz.fbm(x / 25, 2, 3) * s * 5, 'hazeDark', 'haze', null)
    water(c, hz, Math.round(H * 0.86), [{ x: Math.round(W * 0.5), k: 'redGlow' }, { x: Math.round(W * 0.5) + 2, k: 'redHot' }, { x: Math.round(W * 0.2), k: 'gold' }], 'crimsonDeep')
    // Gasômetro
    const gx = Math.round(W * 0.12)
    c.b.rect(gx, hz - s * 34, s * 4, s * 34, 'blood1')
    c.b.rect(gx, hz - s * 34, 1, s * 34, 'emberDark')
    c.b.rect(gx - s * 6, hz - s * 10, s * 22, s * 10, 'blood0')
    windows(c, gx - s * 6, hz - s * 10, s * 22, s * 10, 0.3, 3)
    skyline(c, Math.round(W * 0.68), W, hz, s * 6, s * 20, false)
    // barquinho
    c.b.rect(Math.round(W * 0.7), Math.round(H * 0.74), s * 10, s * 2, 'void')
    c.b.rect(Math.round(W * 0.7) + s * 4, Math.round(H * 0.74) - s * 8, 1, s * 8, 'void')
    ground(c, Math.round(H * 0.86), 'void', 'night')
    calm(c)
    frame(c, 43)
  },
  // 13 · Esplanada dos Ministérios sob céu vermelho: blocos em fila até o Congresso
  13(c) {
    congresso(c, 0.5, 0.5, 'crimson', true)
    frame(c, 47, true)
  },
}

/** Congresso Nacional (torres gêmeas + cúpula + cuia) com espelho d'água; `esplanada` põe os ministérios. */
function congresso(c: Ctx, cxF: number, scale: number, glow: K, esplanada = false) {
  const { W, H, hz, s } = c
  sky(c, glow)
  moon(c, W * 0.18, H * 0.14, s * 9)
  clouds(c, hz - H * 0.14, H * 0.09, 'top', esplanada ? 0 : 0.8, 53, [[0, 0.45], [0.55, 1]])
  if (esplanada) clouds(c, hz - H * 0.3, H * 0.06, 'top', 0.4, 59, [[0.3, 0.8]])
  const cx = Math.round(W * cxF)
  const k = s * scale
  // ministérios em perspectiva dos dois lados
  if (esplanada) {
    for (let i = 0; i < 7; i++) {
      const d = 1 - i * 0.12
      const w = Math.round(k * 10 * d)
      const h = Math.round(k * 16 * d)
      for (const side of [-1, 1]) {
        const x = Math.round(cx + side * (k * 30 + i * k * 11 * d) - (side < 0 ? w : 0))
        c.b.rect(x, hz - h, w, h, 'stone0')
        c.b.rect(x, hz - h, w, 1, 'stone1')
        windows(c, x, hz - h, w, h, 0.4, 2)
      }
    }
  }
  // torres gêmeas
  const th = Math.round(k * 36)
  for (const dx of [-k * 3, k * 1]) {
    c.b.rect(cx + dx, hz - th, k * 2.5, th, 'stone2')
    c.b.rect(cx + dx, hz - th, 1, th, 'stoneHi')
  }
  c.b.rect(cx - k * 3, hz - th * 0.6, k * 6.5, k * 1.5, 'stone2')
  // plataforma
  c.b.rect(cx - k * 26, hz - k * 4, k * 52, k * 4, 'stone3')
  c.b.rect(cx - k * 26, hz - k * 4, k * 52, 1, 'stoneHi')
  // cúpula (Senado) e cuia (Câmara)
  const dome = (x: number, r: number, up: boolean) => {
    for (let y = 0; y <= r * 0.55; y++)
      for (let xx = -r; xx <= r; xx++) {
        const yy = up ? -y : y
        const inside = up ? xx * xx + (y / 0.55) ** 2 <= r * r : Math.abs(xx) <= r * (0.45 + (y / (r * 0.55)) * 0.55)
        if (inside) c.b.set(x + xx, hz - k * 4 + (up ? yy : -r * 0.55 + yy), xx < -r * 0.3 ? 'stoneHi' : xx < r * 0.4 ? 'stone3' : 'stone2')
      }
  }
  dome(cx - k * 15, Math.round(k * 7), true)
  dome(cx + k * 15, Math.round(k * 9), false)
  // espelho d'água
  water(c, hz, Math.round(H * 0.86), [{ x: cx - Math.round(k * 2), k: 'stoneHi' }, { x: cx + Math.round(k * 2), k: 'stoneHi' }], glow === 'crimson' ? 'crimsonDeep' : 'blood1')
  ground(c, Math.round(H * 0.86), 'void', 'night')
  calm(c)
}

/**
 * Cenário pixel de cada fase (1..13), em W×H pixels lógicos, só com a paleta.
 * Síncrono e determinístico; o meio fica escuro para o jogo ler por cima.
 */
export function renderLevelBackdrop(level: number, W: number, H: number): HTMLCanvasElement {
  W = Number.isFinite(W) ? Math.max(32, Math.floor(W)) : 270
  H = Number.isFinite(H) ? Math.max(32, Math.floor(H)) : 480
  const n = Math.min(13, Math.max(1, Math.round(level) || 1))
  const b = new Buf(W, H)
  b.fill('void')
  const ctx: Ctx = {
    b,
    W,
    H,
    hz: Math.round(H * (W < H ? 0.66 : 0.64)),
    s: Math.max(1, Math.round(Math.min(W, H) / 75)),
    rnd: mulberry32(1000 + n * 97),
    nz: makeNoise(500 + n),
  }
  SCENES[n]?.(ctx)
  return b.canvas()
}
