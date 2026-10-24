// Cenário do título, procedural e só com a paleta de 32 cores, pintado em planos de profundidade
// (docs/ART-DIRECTION.md, "Lições de cenário"):
//  0 céu com brasa no horizonte · lua em eclipse com halo do lado aceso · estratos acesos por baixo
//  1 cúmulos grená com a base laranja · serra distante na névoa · faixa de água brilhando no horizonte
//  2 Pão de Açúcar + Urca com bondinho, morros médios · Corcovado com o Cristo e a estrada acesa
//  3 cidade em 3 fileiras (longe, meio, perto) · orla curva com a areia acesa · água com reflexos quebrados
//  4 morro de pedra, musgo e cachos de folhas com aro vermelho · 5 primeiro plano de copas quase pretas
// Cada camada é assada uma vez em canvas e desenhada com deslocamento inteiro (parallax).
import { mulberry32 } from '../lib/rng'
import { DEPTH, type Layout, layoutFor, PAD } from './layout'
import { Buf, bayer, clamp01, dith, HEX, hash2, type K, makeNoise, vgrad } from './pal'
import { drawBird, haloAround } from './props'

/** margem vertical das camadas (respiração da câmera) */
export const PY = 6

export interface Cam {
  x: number
  y: number
}

interface Lamp {
  x: number
  y: number
  k: K
  ph: number
  d: number
  sp: number
}
interface Streak {
  x: number
  y: number
  len: number
  ph: number
  k: K
}
interface Bird {
  x: number
  y: number
  v: number
  ph: number
}

const CLOUD_RAMP: K[] = [
  'emberBright',
  'redGlow',
  'redHot',
  'red',
  'crimson',
  'crimsonDeep',
  'blood1',
  'blood0',
]

/**
 * Rampa de nuvem acesa por baixo pela cidade: aro laranja de 1 px, faixa vermelha logo acima,
 * corpo grená e topo quase da cor do céu. Use com `cloudLayer(..., 'bottom', 0, ..., CLOUD_UNDERLIT, 'crimson')`.
 */
export const CLOUD_UNDERLIT: K[] = [
  'emberBright',
  'ember',
  'red',
  'crimson',
  'crimsonDeep',
  'blood1',
  'blood1',
  'blood0',
  'blood0',
]

export interface Puff {
  x: number
  y: number
  r: number
  flat: number
}

export function bank(rnd: () => number, x0: number, x1: number, yb: number, hb: number, n: number): Puff[] {
  const out: Puff[] = []
  // mais sopros (menores) quando a resolução sobe: couve-flor mais rica, pontilhado mais fino
  n = Math.round(n * Math.min(2.2, Math.max(1, hb / 28)))
  for (let i = 0; i < n; i++) {
    const f = (i + rnd() * 0.6) / n
    const env = Math.sin(Math.PI * Math.min(1, Math.max(0, f))) ** 0.7
    const r = hb * (0.22 + 0.38 * env * (0.6 + rnd() * 0.5))
    out.push({
      x: Math.round(x0 + f * (x1 - x0)),
      y: Math.round(yb - r * 0.35 - env * hb * 0.45 * rnd()),
      r,
      flat: 0.3 + rnd() * 0.25,
    })
  }
  return out
}

/**
 * Nuvem cúmulo: cada sopro tem sua borda iluminada sobre o corpo do sopro de trás.
 * `ramp` troca a rampa (padrão: vermelha); `topRim` acende 1 px no topo de cada sopro quando a luz vem de baixo.
 */
export function cloudLayer(
  w: number,
  h: number,
  puffs: Puff[],
  lit: 'top' | 'bottom',
  dim: number,
  seed: number,
  stretch = 1.35,
  ramp: K[] = CLOUD_RAMP,
  topRim: K | null = null,
) {
  const b = new Buf(w, h)
  const nz = makeNoise(seed)
  const order = puffs.slice().sort((a, c) => (lit === 'top' ? a.y - c.y : c.y - a.y))
  for (const p of order) {
    const rx = p.r * stretch
    const ry = p.r
    const ex = Math.ceil(rx * 1.2)
    const ey = Math.ceil(ry * 1.2)
    for (let oy = -ey; oy <= ey; oy++)
      for (let ox = -ex; ox <= ex; ox++) {
        const u = ox / rx
        const v = oy / ry
        if (lit === 'top' ? v > p.flat : v < -p.flat * 2.2) continue
        const y = p.y + oy
        if (y < 0 || y >= h) continue
        const xx = (((p.x + ox) % w) + w) % w
        const e = 0.8 + nz.fbm(xx / 8, y / 6, 3, w / 8) * 0.4
        const d = Math.hypot(u, v)
        if (d > e) continue
        if (d > e - 0.12 && !dith(xx, y, 0.5)) continue
        let s = lit === 'top' ? v * 0.5 + 0.5 : 0.5 - v * 0.5
        s += u * 0.12 + (nz.n2(xx / 3, y / 3, w / 3) - 0.5) * 0.2
        const edge = (e - d) * ry
        const toLight = lit === 'top' ? v < 0.05 : v > -0.05
        let idx = dim + 2 + clamp01(s) * 5.5
        if (toLight && edge < 1.4 && Math.abs(u) < 0.9) idx = dim
        else if (toLight && edge < 2.6) idx = Math.min(idx, dim + 2)
        const i0 = Math.floor(idx)
        let k = ramp[Math.min(ramp.length - 1, dith(xx, y, idx - i0) ? i0 + 1 : i0)] ?? 'blood0'
        if (topRim && !toLight && edge < 1.1 && v < -0.35 && u > -0.6) k = topRim
        b.set(xx, y, k)
      }
  }
  return b
}

export interface Stratus {
  x: number
  /** linha de baixo (a que acende) */
  y: number
  len: number
  /** espessura máxima em px */
  th: number
  /** 0 longe do horizonte .. 1 colado no horizonte (mais quente e mais fino) */
  heat: number
}

/**
 * Estratos: faixas finas e compridas perto do horizonte, acesas por baixo pela brasa da cidade
 * (laranja colado no horizonte, vermelho mais alto), corpo grená e topo escuro. Repete em x a cada `w`.
 */
export function stratusLayer(w: number, h: number, bands: Stratus[], seed: number) {
  const b = new Buf(w, h)
  const nz = makeNoise(seed)
  const order = bands.slice().sort((a, c) => c.y - a.y)
  for (const s of order) {
    for (let i = 0; i < s.len; i++) {
      const f = i / s.len
      const x = (((Math.round(s.x) + i) % w) + w) % w
      const env = Math.sin(Math.PI * f) ** 0.55
      const th = Math.round(s.th * env * (0.45 + 0.8 * nz.n2(x / 6, s.y * 0.37, w / 6)))
      if (th < 1) continue
      const yb = s.y + (nz.n2(x / 11, s.y * 0.71 + 3, w / 11) > 0.62 ? 1 : 0)
      for (let k = 0; k < th; k++) {
        const y = yb - k
        if ((f < 0.1 || f > 0.9) && !dith(x, y, 0.5)) continue
        let c: K
        if (k === 0)
          c =
            s.heat > 0.66
              ? dith(x, y, 0.55)
                ? 'emberBright'
                : 'ember'
              : s.heat > 0.33
                ? dith(x, y, 0.5)
                  ? 'ember'
                  : 'red'
                : 'red'
        else if (k === 1 && th > 2) c = s.heat > 0.5 ? 'red' : 'crimson'
        else if (k === th - 1 && th > 2) c = dith(x, y, 0.5) ? 'blood1' : 'blood0'
        else c = dith(x, y, 0.35 + s.heat * 0.3) ? 'crimson' : 'crimsonDeep'
        b.set(x, y, c)
      }
    }
  }
  return b
}

/**
 * Lua em eclipse. `crescent` (título): o crescente aceso fica à direita, o limbo do lado escuro é
 * só um fio grená e o halo pontilhado nasce quase todo do lado aceso (como na referência).
 */
export function moonBuf(r: number, grow: number, crescent = false) {
  const cor = Math.ceil(r * 1.05 * grow) + 3
  const S = (r + cor) * 2
  const b = new Buf(S, S)
  const c = S / 2
  const k = r * 0.24
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c
      const dy = y + 0.5 - c
      const d = Math.hypot(dx, dy)
      const w = Math.cos(Math.atan2(dy, dx) - 0.35) // 1 = lado aceso (direita, um pouco abaixo)
      if (d < r) {
        const d2 = Math.hypot(dx + k, dy + k * 0.3)
        if (d2 >= r * 0.985 && w > -0.1) {
          // crescente incandescente
          const thick = clamp01((d2 - r * 0.985) / k)
          let col: K
          if (w > 0.9 && thick > 0.45) col = 'white'
          else if (w > 0.75 && thick > 0.3) col = 'sparkle'
          else if (w > 0.55) col = 'emberBright'
          else if (w > 0.3) col = 'redGlow'
          else if (w > 0.1) col = 'redHot'
          else col = 'red'
          if (r - d < 1 && w < 0.75) col = col === 'white' ? 'sparkle' : 'redHot'
          b.set(x, y, col)
        } else if (crescent) {
          // disco escuro: fio grená no limbo, mais vivo perto do crescente
          b.set(x, y, r - d < 1 ? (w > 0.2 ? 'crimson' : w > -0.5 ? 'crimsonDeep' : 'blood1') : 'void')
        } else {
          // disco escuro com limbo AA de 1 tom
          b.set(x, y, r - d < 1 ? 'blood0' : 'void')
        }
        continue
      }
      const e = d - r
      const wt = 0.5 + 0.5 * Math.max(-0.2, w)
      if (crescent) {
        if (e < 1) {
          if (w > 0.15) b.set(x, y, 'redHot')
          else if (w > -0.45) b.set(x, y, 'crimson')
          else if (dith(x, y, 0.55)) b.set(x, y, 'crimsonDeep')
          continue
        }
        if (e < 2.2 && w > 0.3) {
          b.set(x, y, 'red')
          continue
        }
        const span = r * 1.05 * grow * (0.08 + 0.92 * wt ** 2.2)
        const t = 1 - (e - 1) / span
        if (t <= 0) continue
        const dens = t ** 1.5
        if (!dith(x, y, dens * 0.95)) continue
        b.set(x, y, dens > 0.66 ? (w > 0.55 ? 'red' : 'crimson') : dens > 0.36 ? 'crimsonDeep' : 'blood1')
        continue
      }
      if (e < 1) {
        b.set(x, y, w > -0.3 ? 'redHot' : 'crimson')
        continue
      }
      if (e < 2.6) {
        b.set(x, y, w > 0 ? 'red' : 'crimson')
        continue
      }
      const span = r * 1.05 * grow * (0.55 + 0.45 * wt)
      const t = 1 - (e - 2.6) / span
      if (t <= 0) continue
      const dens = t ** 1.4
      if (!dith(x, y, dens * 1.05)) continue
      b.set(x, y, dens > 0.62 ? 'crimson' : dens > 0.32 ? 'crimsonDeep' : 'blood1')
    }
  return b
}
const moonCanvas = (r: number, grow: number) => moonBuf(r, grow, true).canvas()

export interface RidgeStyle {
  /** corpo do plano */
  body: K
  /** encosta virada para longe da luz (direita) */
  shade?: K
  /** 1 px no topo: a brasa do horizonte contornando a silhueta */
  rim?: K
  /** névoa pontilhada que sobe do pé */
  fog?: K
  fogH?: number
  /** densidade máxima da névoa (0..1) */
  fogMax?: number
}

/**
 * Plano de serra com perspectiva atmosférica: corpo quase chapado, aro de 1 px no topo,
 * encosta da direita 1 tom mais escura e névoa pontilhada no pé. `top(x)` dá a linha do cume.
 */
export function ridge(b: Buf, x0: number, x1: number, base: number, top: (x: number) => number, st: RidgeStyle) {
  const fogH = st.fogH ?? 0
  const fogMax = st.fogMax ?? 0.55
  let prev = top(x0 - 1)
  let cur = top(x0)
  for (let x = x0; x < x1; x++) {
    const next = top(x + 1)
    const t0 = cur
    if (t0 < base) {
      const falling = prev < t0 || next > t0
      for (let y = Math.max(0, t0); y <= base; y++) {
        let k: K = st.body
        if (st.shade && falling && prev < t0 && y - t0 < 6 + (x % 3)) k = dith(x, y, 0.6) ? st.shade : k
        if (st.fog && fogH > 0 && y > base - fogH && dith(x, y, ((y - (base - fogH)) / fogH) * fogMax)) k = st.fog
        if (y === t0 && st.rim) k = st.rim
        b.set(x, y, k)
      }
    }
    prev = cur
    cur = next
  }
}

export interface CityTier {
  body: K
  /** aresta acesa (esquerda e topo) */
  edge: K
  /** aresta oposta (aro vermelho do monumento, opcional) */
  rim?: K
  /** cores das janelas, da mais comum à mais rara */
  win: K[]
  /** probabilidade de uma janela acesa */
  dens: number
  /** passo da grade de janelas */
  step: number
  /** janelas de 2 px de largura */
  wide?: boolean
}

/** Fileiras de cidade: longe (corpo quase céu, poucas luzes fracas), meio (fachadas quentes, luzes densas), perto (silhueta, janelas maiores). */
export const CITY: Record<'far' | 'mid' | 'near', CityTier> = {
  far: { body: 'blood0', edge: 'blood1', win: ['emberDark', 'gold1', 'ember', 'gold'], dens: 0.42, step: 2 },
  mid: {
    body: 'night',
    edge: 'gold0',
    win: ['ember', 'gold1', 'gold', 'emberBright', 'goldHi'],
    dens: 0.5,
    step: 2,
  },
  near: {
    body: 'void',
    edge: 'dusk',
    rim: 'blood1',
    win: ['gold1', 'ember', 'gold', 'emberDark', 'goldHi'],
    dens: 0.3,
    step: 3,
    wide: true,
  },
}

/**
 * Uma fileira de prédios apoiada em `base(x)`. Janelas de 1 px em grade com 2 a 3 tons e um pixel
 * quente forte de vez em quando; as mais claras viram âncoras de brilho (`anchors`).
 */
export function cityRow(
  b: Buf,
  rnd: () => number,
  x0: number,
  x1: number,
  base: (x: number) => number,
  hMin: number,
  hMax: number,
  tier: CityTier,
  anchors?: { x: number; y: number }[],
) {
  let x = Math.floor(x0)
  while (x < x1) {
    const tower = rnd() < 0.12
    const w = tower ? 3 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 6)
    const hh = Math.max(2, Math.round((hMin + rnd() ** 1.6 * (hMax - hMin)) * (tower ? 1.7 : 1)))
    const yb = base(x)
    const top = yb - hh
    const xe = Math.min(x1, x + w)
    for (let xx = x; xx < xe; xx++)
      for (let y = top; y < yb; y++) {
        let k: K = tier.body
        if (y === top || xx === x) k = tier.edge
        else if (tier.rim && xx === xe - 1) k = tier.rim
        b.set(xx, y, k)
      }
    if (tower && hh > 6) b.set(x + (w >> 1), top - 1, rnd() < 0.5 ? 'red' : tier.edge)
    const s = tier.step
    for (let wy = top + 2; wy < yb - 1; wy += s)
      for (let wx = x + 1; wx < xe - 1; wx += s) {
        if (rnd() >= tier.dens) continue
        const v = rnd()
        const n = tier.win.length
        const k = tier.win[Math.min(n - 1, Math.floor(v ** 1.8 * n))] ?? 'gold'
        b.set(wx, wy, k)
        if (tier.wide && wx + 1 < xe - 1) b.set(wx + 1, wy, k)
        if (anchors && v > 0.93) anchors.push({ x: wx, y: wy })
      }
    x = xe + (rnd() < 0.25 ? 1 : 0)
  }
}

type Glow = { x: number; y: number; r: number } | null

export interface FoliageOpts {
  /** sombra, corpo, luz (3 tons) */
  tones?: [K, K, K]
  /** highlight de 1 px no alto-esquerda de cada cacho (null desliga) */
  hi?: K | null
  /** 0..1: empurra os tons para o escuro (distância, contraluz) */
  fade?: number
  /** aro vermelho na borda virada para esta luz */
  glow?: Glow
  /** espalhamento horizontal (1 = moita redonda, 2 = copa larga) */
  spread?: number
}

/**
 * Cachos de folhas: vários sopros pequenos, cada um com 3 tons (sombra embaixo-direita, corpo,
 * luz em cima-esquerda) e 1 px de highlight; os de baixo são pintados por cima dos de cima.
 */
export function foliage(b: Buf, cx: number, cy: number, rad: number, seed: number, o: FoliageOpts = {}) {
  const r = mulberry32(seed)
  const tones: K[] = ['void', ...(o.tones ?? ['vine0', 'vine1', 'green'])]
  const hi = o.hi === undefined ? 'leafHi' : o.hi
  const shift = Math.round((o.fade ?? 0) * 2.4)
  const spread = o.spread ?? 1.3
  const glow = o.glow ?? null
  const n = Math.max(4, Math.round(rad * rad * 0.3 * (spread / 1.3)))
  const cl: { x: number; y: number; s: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.PI + r() * Math.PI
    const d = Math.sqrt(r())
    cl.push({
      x: cx + Math.cos(a) * rad * spread * d,
      y: cy + Math.sin(a) * rad * 0.85 * d + rad * 0.3,
      s: 1.3 + r() * 1.3 + rad * 0.07,
    })
  }
  cl.sort((a, c) => a.y - c.y)
  for (const c of cl) {
    const rx = c.s * 1.25
    const ry = c.s
    const ex = Math.ceil(rx)
    const ey = Math.ceil(ry)
    for (let oy = -ey; oy <= ey; oy++)
      for (let ox = -ex; ox <= ex; ox++) {
        const q = (ox / rx) ** 2 + (oy / ry) ** 2
        if (q > 1) continue
        const x = Math.round(c.x + ox)
        const y = Math.round(c.y + oy)
        if (q > 0.72 && hash2(x, y) > 0.62) continue
        const l = -(ox / rx) * 0.45 - (oy / ry) * 0.8
        let ti = l > 0.42 ? 3 : l > -0.25 ? 2 : 1
        if (oy > 0 && q > 0.5) ti = 1
        ti = Math.max(0, ti - shift)
        let k = tones[ti] ?? 'void'
        if (hi && shift === 0 && l > 0.7 && q > 0.2 && q < 0.75 && hash2(x * 3, y) > 0.5) k = hi
        if (glow && q > 0.45) {
          const gx = glow.x - x
          const gy = glow.y - y
          const gd = Math.hypot(gx, gy)
          const gl = clamp01(1 - gd / glow.r)
          if (gl > 0.3 && ox * gx + oy * gy > 0) k = gl > 0.62 ? 'red' : 'crimson'
        }
        b.set(x, y, k)
      }
  }
}

/** Cristo de braços abertos no pedestal, aceso de frente-esquerda pela cidade (creme, sombra fria, aro quente). */
function christStatue(h: number) {
  const pad = 3
  const span = Math.round(h * 0.92) | 1
  const W = span + pad * 2
  const H = h + pad * 2
  const b = new Buf(W, H)
  const cx = Math.floor(W / 2)
  const top = pad
  const big = h >= 22
  const headW = big ? 3 : 2
  const headH = big ? 3 : 2
  const pedH = Math.max(3, Math.round(h * 0.17))
  const bodyTop = top + headH
  const bodyBot = top + h - pedH
  const armY = top + headH + (big ? 1 : 0)
  const armT = h >= 28 ? 3 : h >= 16 ? 2 : 1
  // braços abertos, afinando nas mãos
  const half = span >> 1
  for (let x = cx - half; x <= cx + half; x++) {
    const dx = Math.abs(x - cx)
    const t = dx < half - 1 ? armT : Math.max(1, armT - 1)
    for (let y = armY; y < armY + t; y++) {
      let k: K = x < cx ? 'stoneHi' : 'stone3'
      if (y === armY + t - 1 && t > 1) k = x < cx ? 'stone3' : 'stone2'
      if (y === armY && x < cx) k = 'sparkle'
      b.set(x, y, k)
    }
    // luz quente da cidade por baixo dos braços
    if (dx > 2) b.set(x, armY + t, dx % 3 === 0 ? 'gold1' : 'gold0')
  }
  // manto: ombros e caimento alargando até o pedestal
  const sh = big ? 2 : 1
  for (let y = bodyTop; y < bodyBot; y++) {
    const t = (y - bodyTop) / Math.max(1, bodyBot - bodyTop)
    const hw = sh + Math.round(t * (big ? 1.4 : 0.8))
    for (let x = cx - hw; x <= cx + hw; x++) {
      const u = (x - (cx - hw)) / Math.max(1, hw * 2)
      let k: K = u < 0.3 ? 'stoneHi' : u < 0.55 ? 'stone3' : u < 0.85 ? 'stone2' : 'stone1'
      if (x === cx + hw && y > bodyTop + 2) k = 'redGlow'
      if (big && x === cx && y > armY + armT + 1 && (y & 1) === 0) k = 'stone2'
      b.set(x, y, k)
    }
  }
  // cabeça
  for (let y = 0; y < headH; y++)
    for (let x = 0; x < headW; x++) b.set(cx - (headW >> 1) + x, top + y, x === 0 ? 'sparkle' : 'stone3')
  // pedestal
  const pw = Math.max(2, Math.round(h * 0.12))
  for (let y = bodyBot; y < top + h; y++)
    for (let x = cx - pw; x <= cx + pw; x++) {
      let k: K = x < cx - 1 ? 'stone3' : x < cx + 1 ? 'stone2' : 'stone1'
      if (y === bodyBot) k = 'stoneHi'
      b.set(x, y, k)
    }
  haloAround(b, 'gold0', 'blood0', 0.35)
  // refletores no pé
  b.set(cx - pw - 1, top + h - 1, 'goldHi')
  b.set(cx + pw + 1, top + h - 1, 'gold')
  return { c: b.canvas(), ax: cx, ay: top + h }
}

export class Backdrop {
  L!: Layout
  private sky!: HTMLCanvasElement
  private moonA!: HTMLCanvasElement
  private moonB!: HTMLCanvasElement
  private cloudsFar!: HTMLCanvasElement
  private cloudsNear!: HTMLCanvasElement
  private skyline!: HTMLCanvasElement
  private bay!: HTMLCanvasElement
  private hill!: HTMLCanvasElement
  private lip!: HTMLCanvasElement
  private front!: HTMLCanvasElement
  private stars: { x: number; y: number; k: K; ph: number; sp: number }[] = []
  private lamps: Lamp[] = []
  private streaks: Streak[] = []
  private birds: Bird[] = []
  private christ!: { c: HTMLCanvasElement; x: number; y: number }
  private cable = { x0: 0, y0: 0, x1: 0, y1: 0 }
  /** brilhos possíveis nas luzes da cidade (âncoras para o FX) */
  cityAnchors: { x: number; y: number }[] = []

  constructor(W: number, H: number) {
    this.build(W, H)
  }

  build(W: number, H: number) {
    const L = layoutFor(W, H)
    this.L = L
    const P = L.portrait
    const LW = W + PAD * 2
    const LH = H + PY * 2
    const X = (x: number) => x + PAD
    const Y = (y: number) => y + PY
    const hz = Y(L.horizon)
    const rnd = mulberry32(1313)
    const nz = makeNoise(7)
    this.lamps = []
    this.streaks = []
    this.cityAnchors = []
    // linhas-chave: pé da serra distante, linha da cidade na orla de lá, fim da água
    const farShore = hz - Math.max(3, Math.round(H * (P ? 0.012 : 0.022)))
    const cityLine = hz + Math.max(3, Math.round(H * (P ? 0.014 : 0.028)))
    const wb = Y(L.waterBottom)

    // ---------- céu (0.0) ----------
    {
      const b = new Buf(LW, LH)
      b.fill('void')
      vgrad(b, 0, 0, LW, farShore + 3, [
        [0, 'void'],
        [0.3, 'void'],
        [0.52, 'night'],
        [0.72, 'dusk'],
        [0.86, 'blood0'],
        [0.95, 'blood1'],
        [1, 'crimsonDeep'],
      ])
      const m = L.moon
      const nStars = Math.round((LW * farShore) / 260)
      for (let i = 0; i < nStars; i++) {
        const x = Math.floor(rnd() * LW)
        const y = Math.floor(rnd() ** 1.7 * farShore * 0.75)
        if (Math.hypot(x - X(m.x), y - Y(m.y)) < m.r * 2.3) continue
        b.set(x, y, rnd() < 0.7 ? 'stone0' : 'stone1')
      }
      this.sky = b.canvas()
      this.stars = []
      for (let i = 0; i < Math.round(W / 12); i++) {
        const x = Math.floor(rnd() * W)
        const y = Math.floor(rnd() ** 1.4 * L.horizon * 0.6)
        if (Math.hypot(x - m.x, y - m.y) < m.r * 2.4) continue
        const v = rnd()
        this.stars.push({
          x,
          y,
          k: v > 0.85 ? 'sparkle' : v > 0.5 ? 'stone3' : 'stone2',
          ph: rnd() * 6.28,
          sp: 0.6 + rnd() * 1.8,
        })
      }
    }

    // ---------- lua (0.02) ----------
    this.moonA = moonCanvas(L.moon.r, 1)
    this.moonB = moonCanvas(L.moon.r, 1.08)

    // ---------- nuvens: estratos colados no horizonte (0.06) e cúmulos acesos por baixo (0.10) ----------
    {
      const CW = Math.ceil((W * 1.6) / 24) * 24
      const r2 = mulberry32(51)
      const top = farShore - H * (P ? 0.13 : 0.2)
      const bot = farShore - 2
      const bands: Stratus[] = []
      const nb = Math.round(CW / (P ? 26 : 34))
      for (let i = 0; i < nb; i++) {
        const q = r2() ** 0.6
        const y = Math.round(top + q * (bot - top))
        bands.push({
          x: r2() * CW,
          y,
          len: Math.round(CW * (0.05 + r2() * 0.14) * (1.3 - q * 0.5)),
          th: 1.5 + (1 - q) * (P ? 2.5 : 4) + r2() * 1.5,
          heat: q,
        })
      }
      this.cloudsFar = stratusLayer(CW, LH, bands, 11).canvas()

      const near: Puff[] = []
      if (P) {
        const yb = Y(L.moon.y + L.moon.r * 2.6)
        near.push(...bank(r2, -CW * 0.02, W * 0.45, yb + H * 0.02, H * 0.07, 12))
        near.push(...bank(r2, W * 0.6, W * 1.02, yb + H * 0.05, H * 0.06, 10))
        near.push(...bank(r2, W * 1.15, W * 1.5, yb + H * 0.01, H * 0.07, 10))
      } else {
        near.push(...bank(r2, -W * 0.03, W * 0.34, Y(H * 0.47), H * 0.15, 18))
        near.push(...bank(r2, W * 0.24, W * 0.44, Y(H * 0.41), H * 0.06, 8))
        near.push(...bank(r2, W * 0.6, W * 0.8, Y(H * 0.43), H * 0.05, 8))
        near.push(...bank(r2, W * 0.9, W * 1.04, Y(H * 0.47), H * 0.045, 6))
        near.push(...bank(r2, W * 1.12, W * 1.5, Y(H * 0.44), H * 0.1, 12))
      }
      this.cloudsNear = cloudLayer(CW, LH, near, 'bottom', 0, 23, 1.5, CLOUD_UNDERLIT, 'crimson').canvas()
    }

    // ---------- skyline (0.18): água do horizonte, serra, Pão de Açúcar, morros, Corcovado ----------
    {
      const b = new Buf(LW, LH)
      // faixa de água do horizonte, devolvendo a brasa do céu em traços horizontais
      for (let y = farShore; y <= cityLine + 2; y++) {
        const t = (y - farShore) / (cityLine + 2 - farShore)
        for (let x = 0; x < LW; x++) {
          const n = nz.n2(x / 16, y * 0.8)
          const s = n * (1.12 - t * 0.55) + (hash2(x >> 1, y) - 0.5) * 0.16
          let k: K =
            s > 0.8
              ? 'goldHi'
              : s > 0.68
                ? 'emberBright'
                : s > 0.54
                  ? 'ember'
                  : s > 0.4
                    ? 'emberDark'
                    : s > 0.26
                      ? 'blood1'
                      : 'blood0'
          if ((y - farShore) % 3 === 2 && s < 0.68) k = 'blood0'
          b.set(x, y, k)
        }
      }
      // serra distante: pontuda, chapada na névoa, aro grená no cume
      const peaks: [number, number, number][] = P
        ? [
            [0.06, 0.04, 0.12],
            [0.34, 0.03, 0.14],
            [0.62, 0.028, 0.12],
            [0.78, 0.045, 0.12],
          ]
        : [
            [0.02, 0.075, 0.06],
            [0.09, 0.05, 0.05],
            [0.3, 0.045, 0.07],
            [0.45, 0.035, 0.06],
            [0.62, 0.05, 0.06],
            [0.74, 0.075, 0.07],
            [0.97, 0.05, 0.06],
          ]
      const farTop = (x: number) => {
        const fx = (x - PAD) / W
        let hgt = H * 0.01 + nz.fbm(x / 22, 0.5, 3) * H * (P ? 0.015 : 0.025)
        for (const [px, ph, pw] of peaks) {
          const tri = Math.max(0, 1 - Math.abs(fx - px) / pw)
          if (tri > 0) hgt = Math.max(hgt, ph * H * tri ** 1.15 + (nz.n2(x / 3, 7) - 0.5) * 3 * tri)
        }
        return Math.round(farShore - hgt)
      }
      ridge(b, 0, LW, farShore, farTop, {
        body: 'hazeDark',
        shade: 'dusk',
        rim: 'crimsonDeep',
        fog: 'haze',
        fogH: Math.round(H * 0.03),
        fogMax: 0.5,
      })

      // Pão de Açúcar + Urca + Babilônia (pé na água)
      const sx = X(L.sugar.x)
      const sh = Math.round(Math.min(L.sugar.h, H * (P ? 0.075 : 0.085)))
      const sw = sh * 0.5
      const sFoot = hz + 2
      const sugarTop = (x: number) => {
        let hgt = 0
        const u = (x - sx) / sw
        if (u > -1 && u < 1)
          hgt = u < 0 ? sh * Math.max(0, 1 - (-u) ** 1.9) ** 0.6 : sh * Math.max(0, 1 - u ** 2.4) ** 0.5
        const ux = (x - (sx + sw * 1.75)) / (sw * 0.95)
        if (ux > -1 && ux < 1) hgt = Math.max(hgt, sh * 0.42 * Math.max(0, 1 - ux * ux) ** 0.7)
        const ub = (x - (sx - sw * 1.9)) / (sw * 1.3)
        if (ub > -1 && ub < 1)
          hgt = Math.max(hgt, sh * 0.3 * Math.max(0, 1 - ub * ub) ** 0.9 * (0.8 + nz.n2(x / 5, 3) * 0.4))
        return hgt > 0.5 ? Math.round(sFoot - hgt) : sFoot + 1
      }
      for (let x = Math.max(0, Math.floor(sx - sw * 3.3)); x < Math.min(LW, sx + sw * 3); x++) {
        const top = sugarTop(x)
        if (top > sFoot) continue
        const l = sugarTop(x - 1)
        const r = sugarTop(x + 1)
        const u = (x - sx) / sw
        for (let y = top; y <= sFoot; y++) {
          const dy = y - top
          let k: K = 'night'
          // face esquerda pega a luz da lua: 1 tom acima, com estrias verticais de pedra
          if (u > -1 && u < -0.15 && dith(x, y, clamp01((-0.15 - u) * 2.2))) k = 'dusk'
          if (nz.n2(x / 1.4, y / 9) > 0.66) k = k === 'dusk' ? 'hazeDark' : 'dusk'
          if (u > 0.35 && dy > 1) k = 'night'
          const leftLit = l > y || (r < top && dy < 2)
          if (dy === 0 || (leftLit && dy < 2)) k = leftLit ? 'hazeDark' : 'blood1'
          // a mata no pé
          if (y > sFoot - sh * 0.25 && nz.n2(x / 3, y / 3) > 0.55) k = dith(x, y, 0.5) ? 'vine0' : 'night'
          b.set(x, y, k)
        }
      }
      // luzes da estação no cume e na Urca
      const sTop = sugarTop(Math.round(sx))
      b.set(sx, sTop + 1, 'goldHi')
      b.set(sx - 2, sTop + 1, 'gold')
      b.set(sx + 1, sTop + 2, 'emberBright')
      const ux0 = Math.round(sx + sw * 1.75)
      const uTop = sugarTop(ux0)
      b.set(ux0, uTop + 1, 'gold')
      b.set(ux0 + 2, uTop + 1, 'ember')
      this.cable = { x0: ux0, y0: uTop, x1: sx + 1, y1: sTop }
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        const x = this.cable.x0 + (this.cable.x1 - this.cable.x0) * t
        const y = this.cable.y0 + (this.cable.y1 - this.cable.y0) * t + Math.sin(t * Math.PI) * 2
        if (i % 2 === 0) b.set(x, y, 'stone0')
      }

      // morros médios na frente do Pão de Açúcar (escuros, mata, aro grená)
      const mids: [number, number, number][] = P
        ? [
            [0.02, 0.03, 0.1],
            [0.2, 0.022, 0.08],
          ]
        : [
            [0.02, 0.065, 0.08],
            [0.11, 0.035, 0.055],
            [0.27, 0.03, 0.07],
          ]
      const midTop = (x: number) => {
        const fx = (x - PAD) / W
        let hgt = 0
        for (const [px, ph, pw] of mids) {
          const u = (fx - px) / pw
          if (u > -1 && u < 1) hgt = Math.max(hgt, ph * H * (1 - u * u) ** 0.75)
        }
        if (hgt <= 0.5) return cityLine + 2
        return Math.round(cityLine + 1 - hgt - (nz.fbm(x / 6, 21, 2) - 0.5) * 4)
      }
      ridge(b, 0, Math.round(X(W * 0.45)), cityLine + 1, midTop, { body: 'night', shade: 'void', rim: 'blood1' })
      for (let x = 0; x < X(W * 0.45); x++) {
        const t0 = midTop(x)
        for (let y = t0 + 2; y < cityLine; y++)
          if (nz.n2(x / 3.5, y / 3) > 0.6 && dith(x, y, 0.6)) b.set(x, y, 'vine0')
      }

      // Corcovado: pedra quente do lado da cidade, mata escura, plataforma acesa no cume
      const cx = X(L.corc.x)
      const peak = Y(L.corc.peak)
      const half = L.corc.half
      const humps: [number, number, number][] = [
        [0, 1, half * 0.42],
        [-half * 0.55, 0.62, half * 0.45],
        [-half * 1.1, 0.3, half * 0.5],
        [half * 0.55, 0.7, half * 0.5],
        [half * 1.25, 0.5, half * 0.7],
      ]
      const cBase = hz + 2
      const cTop = (x: number) => {
        const H0 = cBase - peak
        let hgt = 0
        for (const [dx, hh, w] of humps) {
          const u = (x - cx - dx) / w
          if (u > -1.6 && u < 1.6) hgt = Math.max(hgt, H0 * hh * Math.max(0, 1 - (u / 1.6) ** 2) ** 0.85)
        }
        if (hgt <= 0) return cBase
        hgt += (nz.fbm(x / 8, 9, 3) - 0.5) * 5 * Math.min(1, Math.abs(x - cx) / half)
        if (Math.abs(x - cx) <= 2) hgt = H0
        return Math.round(cBase - hgt)
      }
      const mh = cBase - peak
      for (let x = Math.max(0, Math.floor(cx - half * 2.2)); x < LW; x++) {
        const top = cTop(x)
        if (top >= cBase) continue
        const left = x < cx
        for (let y = top; y <= cBase; y++) {
          const dy = y - top
          const n = nz.fbm(x / 9, y / 9, 3)
          const stri = nz.n2(x / 1.7, y / 12)
          const gully = nz.n2((x + y * 0.55) / 2.5, y / 10) > 0.7
          const litF = clamp01((cx - x) / (half * 0.7) + 0.4)
          let v = 0.2 + litF * 0.36 + (n - 0.5) * 0.55 + (stri - 0.5) * 0.18 - (dy / mh) * 0.3
          if (gully) v -= 0.25
          let k: K =
            v > 0.6
              ? dith(x, y, 0.5)
                ? 'emberDark'
                : 'blood1'
              : v > 0.42
                ? 'blood1'
                : v > 0.22
                  ? 'blood0'
                  : 'night'
          if (dy === 0) k = left ? 'crimsonDeep' : 'blood1'
          // mata escura em manchas, com folha acesa rara do lado da cidade
          if (dy > 1 && nz.n2(x / 5, y / 5) > 0.6 && dith(x, y, 0.65)) k = 'vine0'
          if (dy > 1 && k === 'vine0' && left && hash2(x, y) > 0.94) k = 'vine1'
          b.set(x, y, k)
        }
      }
      // plataforma do Cristo
      for (let x = cx - 4; x <= cx + 4; x++) {
        b.set(x, peak + 1, 'stone1')
        b.set(x, peak + 2, 'blood1')
      }
      for (const dx of [-4, -2, 2, 4]) b.set(cx + dx, peak + 1, dx < 0 ? 'goldHi' : 'gold')
      // favela e bairros acesos em cachos na encosta baixa
      const nCl = P ? 7 : 14
      for (let c = 0; c < nCl; c++) {
        const ccx = cx - half * 1.5 + rnd() * half * 2.6
        const ccy = cBase - 2 - rnd() * mh * 0.32
        const cr = 3 + rnd() * (P ? 4 : 7)
        for (let i = 0; i < cr * cr * 0.9; i++) {
          const x = Math.round(ccx + (rnd() - 0.5) * cr * 2)
          const y = Math.round(ccy + (rnd() - 0.5) * cr)
          if (x < 0 || x >= LW || y < cTop(x) + 3 || y > cBase) continue
          const v = rnd()
          b.set(x, y, v > 0.93 ? 'goldHi' : v > 0.7 ? 'gold' : v > 0.4 ? 'ember' : v > 0.18 ? 'gold1' : 'emberDark')
        }
      }
      // estrada em zigue-zague: luzes pontilhadas, curvas abrindo para baixo
      {
        const y0 = peak + 4
        const y1 = cBase - 2
        const n = Math.round((y1 - y0) * 8)
        let lastX = -1
        let lastY = -1
        let dist = 0
        for (let i = 0; i <= n; i++) {
          const v = i / n
          const tri = 1 - 2 * Math.abs(((v * 5 + 0.25) % 1) * 2 - 1)
          const amp = 1.5 + v * half * 0.22
          const px = Math.round(cx - 1 - v * half * 0.7 + tri * amp)
          let py = Math.round(y0 + v * (y1 - y0))
          const lim = cTop(px) + 2
          if (py < lim) py = lim
          if (px === lastX && py === lastY) continue
          dist += 1
          lastX = px
          lastY = py
          if (dist % 2 === 0) b.set(px, py, 'gold0')
          if (dist % 3 === 0) {
            const r0 = rnd()
            const k: K = r0 > 0.75 ? 'goldHi' : r0 > 0.35 ? 'gold' : 'emberBright'
            b.set(px, py, k)
            if (dist % 6 === 0)
              this.lamps.push({ x: px - PAD, y: py - PY, k, ph: rnd() * 6.28, d: DEPTH.skyline, sp: 1 + rnd() * 2 })
          }
        }
      }
      const ch = Math.max(13, Math.round(L.ppu * (P ? 0.95 : 1.15)))
      const cr = christStatue(ch)
      this.christ = { c: cr.c, x: cx - PAD - cr.ax, y: peak - PY - cr.ay + 1 }
      this.skyline = b.canvas()
    }

    // ---------- baía, orla e cidade (0.30) ----------
    {
      const b = new Buf(LW, LH)
      // terra da direita (pé do Corcovado): começa aqui e desce inclinada para a esquerda
      const landR = (y: number) => X(W * (P ? 0.74 : 0.6)) - (y - hz) * 0.6
      // orla curva: a areia desce para a esquerda (perspectiva da enseada)
      const xb = X(W * (P ? 0.14 : 0.34))
      const sMin = cityLine + (P ? 3 : 6)
      const sMax = cityLine + Math.round(H * (P ? 0.05 : 0.15))
      const sandY = (x: number) => (x < xb ? Math.round(sMin + (sMax - sMin) * (1 - x / xb) ** 1.8) : sMin)
      const sandT = (x: number) => 2 + Math.round((1 - Math.min(1, x / xb)) * (P ? 1 : 2))
      // água perto: escura, com a orla lavando de laranja e traços quebrados de luz
      for (let x = 0; x < LW; x++) {
        const s0 = sandY(x) + sandT(x)
        for (let y = cityLine; y < LH; y++) {
          if (x >= landR(y)) break
          if (y < s0) continue
          const dy = y - s0
          let k: K = dith(x, y, 0.3 - Math.min(0.3, dy / 120)) ? 'dusk' : 'night'
          if (dy < 7 && dith(x, y, (1 - dy / 7) * 0.7)) k = dy < 2 ? 'emberDark' : 'blood1'
          const rip = nz.n2(x / 9, y * 1.1)
          if (rip > 0.74 && dy > 4) k = 'hazeDark'
          b.set(x, y, k)
        }
      }
      // cidade da orla de lá: fileiras de trás para a frente, até a areia
      const rowsL = P ? 2 : 4
      for (let r = 0; r < rowsL; r++) {
        const yb = cityLine + 2 + r * (P ? 2 : 4)
        const tier = r === 0 ? CITY.far : CITY.mid
        let xe = 0
        while (xe < LW && sandY(xe) - 1 > yb && xe < landR(yb)) xe++
        cityRow(b, rnd, 0, xe, () => yb, 2, P ? 4 : 5 + r * 1.5, tier, r > 0 ? this.cityAnchors : undefined)
      }
      // chão aceso (ruas) entre a cidade e a areia
      for (let x = 0; x < LW; x++) {
        const s = sandY(x) - 1
        for (let y = cityLine + 2; y < s; y++) {
          if (x >= landR(y)) break
          if (b.get(x, y)) continue
          b.set(x, y, 'void')
          if ((y & 1) === 0 && hash2(x, y) > 0.72) {
            const v = hash2(y, x)
            b.set(x, y, v > 0.9 ? 'goldHi' : v > 0.6 ? 'gold' : v > 0.3 ? 'ember' : 'gold1')
          }
        }
      }
      for (let r = 0; r < 4 && !P; r++) {
        const yb = cityLine + 6 + rowsL * 4 + r * 9
        let xe = 0
        while (xe < xb && sandY(xe) - 3 > yb) xe++
        if (xe > 4) cityRow(b, rnd, 0, xe, () => yb, 3, 8, CITY.mid, this.cityAnchors)
      }
      // areia acesa + calçadão com postes; reflexos dos postes na água
      for (let x = 0; x < LW; x++) {
        const sy = sandY(x)
        const st = sandT(x)
        if (x >= landR(sy)) break
        b.set(x, sy - 1, x % 2 ? 'gold0' : 'blood1')
        for (let k = 0; k < st; k++) {
          const yy = sy + k
          let c: K = dith(x, yy, 0.45) ? 'gold1' : 'emberDark'
          if (k === st - 1) c = dith(x, yy, 0.35) ? 'emberBright' : 'ember'
          b.set(x, yy, c)
        }
        if (x % 3 === 0) {
          const k: K = x % 9 === 0 ? 'sparkle' : x % 6 === 0 ? 'goldHi' : 'gold'
          b.set(x, sy - 1, k)
          if (x % 9 === 0) this.cityAnchors.push({ x: x - PAD, y: sy - 1 - PY })
          // reflexo estático em traços quebrados (cai e esfria com a distância)
          const len = 4 + Math.floor(hash2(x, 3) * (P ? 6 : 12))
          for (let j = 1; j <= len; j++) {
            const yy = sy + st + j * 2 - 1
            const xx = x + (hash2(x, j) > 0.7 ? 1 : 0)
            if (xx >= landR(yy) || hash2(xx, yy) < 0.25) continue
            const f = j / len
            const c: K = f < 0.25 ? 'gold1' : f < 0.55 ? 'emberDark' : 'blood1'
            b.set(xx, yy, c)
            if (f < 0.4 && hash2(yy, xx) > 0.5) b.set(xx + 1, yy, c)
          }
          if (x % 9 === 0 && hash2(x, 9) > 0.4)
            this.streaks.push({ x: x - PAD, y: sy + st - PY, len: len * 2, ph: rnd() * 6.28, k })
        }
      }
      // reflexo vermelho da lua na água de perto
      const mx = X(L.moon.x)
      if (mx < landR(sandY(mx) + 4))
        this.streaks.push({
          x: mx - PAD,
          y: sandY(mx) + sandT(mx) + 3 - PY,
          len: Math.round((wb - sandY(mx)) * 0.6),
          ph: 0,
          k: 'crimson',
        })

      // terra da direita: cidade subindo o pé do Corcovado em fileiras separadas por morros escuros
      for (let y = hz + 2; y < LH; y++)
        for (let x = Math.max(0, Math.floor(landR(y))); x < LW; x++)
          b.set(x, y, nz.n2(x / 4, y / 4) > 0.66 ? 'night' : 'void')
      const rowsR: [number, number, number, CityTier][] = P
        ? [
            [hz + 3, 2, 5, CITY.far],
            [hz + Math.round(H * 0.03), 3, 8, CITY.mid],
            [hz + Math.round(H * 0.07), 4, 12, CITY.mid],
          ]
        : [
            [hz + 3, 2, 6, CITY.far],
            [hz + Math.round(H * 0.045), 3, 9, CITY.far],
            [hz + Math.round(H * 0.09), 4, 12, CITY.mid],
            [hz + Math.round(H * 0.15), 6, 18, CITY.mid],
          ]
      rowsR.forEach(([yb, h0, h1, tier], i) => {
        const x0 = Math.floor(landR(yb)) + 2
        cityRow(b, rnd, x0, LW, (x) => yb + Math.round((x - x0) * 0.04), h0, h1, tier, this.cityAnchors)
        // morro escuro de mata atravessando entre as fileiras
        if (i === 1 || i === 2) {
          const ph = rnd() * 10
          for (let x = x0; x < LW; x++) {
            const hgt = Math.max(0, Math.sin(x / (W * 0.05) + ph) * H * 0.02 + nz.n2(x / 5, i * 9) * 4 - 1)
            for (let y = Math.round(yb + 3 - hgt); y < yb + 4; y++)
              b.set(x, y, y === Math.round(yb + 3 - hgt) ? 'blood0' : nz.n2(x / 3, y / 3) > 0.55 ? 'vine0' : 'void')
          }
        }
      })
      // prédios de perto, na direita e na esquerda (silhuetas com janelas maiores)
      const nearTop = P ? H * 0.06 : H * 0.14
      cityRow(b, rnd, X(W * (P ? 0.84 : 0.72)), LW, () => wb + 2, nearTop * 0.4, nearTop, CITY.near)
      cityRow(b, rnd, 0, X(W * (P ? 0.12 : 0.19)), () => LH, nearTop * 0.9, nearTop * 2, CITY.near)
      this.bay = b.canvas()
    }

    // ---------- morro, pedras e mato (1.0) + borda da frente (lip) + primeiro plano (1.25) ----------
    {
      const hill = new Buf(LW, LH)
      const lip = new Buf(LW, LH)
      const front = new Buf(LW, LH)
      const bx = X(L.base.x)
      const by = Y(L.base.y)
      const u = L.ppu
      const plateau = u * (P ? 5.0 : 5.4)
      const slope = P ? 0.42 : 0.62
      const top = (x: number) => {
        const d = Math.abs(x - bx)
        return Math.round(
          by - u * 0.3 + Math.max(0, d - plateau) * slope + (nz.fbm(x / 7, 40, 3) - 0.5) * u * 0.5,
        )
      }
      const glow = { x: bx, y: by - u * 1.6, r: u * 6.2 }
      for (let x = 0; x < LW; x++) {
        const t0 = top(x)
        for (let y = Math.max(0, t0); y < LH; y++) {
          const n = nz.n2(x / 3, y / 3)
          let k: K = n > 0.72 ? 'night' : 'void'
          const gd = Math.hypot((x - glow.x) * 0.8, (y - by) * 1.6) / glow.r
          if (gd < 0.8) k = gd < 0.35 ? 'blood1' : dith(x, y, (0.8 - gd) * 2.5) ? 'blood0' : k
          hill.set(x, y, k)
        }
      }
      const rocks: {
        x: number
        y: number
        rx: number
        ry: number
        fade: number
        seed: number
        lip: boolean
      }[] = []
      let x = -u
      while (x < LW + u) {
        const rx = u * (0.55 + rnd() * 0.7) * (P ? 0.9 : 1)
        const ry = rx * (0.6 + rnd() * 0.25)
        const d = Math.abs(x - bx)
        const isLip = d < plateau * 0.95 && rnd() < 0.35
        rocks.push({
          x,
          y: top(x) + ry * 0.45,
          rx,
          ry,
          fade: 0,
          seed: Math.floor(rnd() * 1e6),
          lip: isLip && d > u * 0.6,
        })
        x += rx * (1.1 + rnd() * 0.5)
      }
      const rows = P ? 3 : 2
      for (let row = 1; row <= rows; row++) {
        let xx = -u + rnd() * u
        while (xx < LW + u) {
          const rx = u * (0.6 + rnd() * 0.9)
          const ry = rx * 0.65
          const yy = top(xx) + row * u * 1.05 + rnd() * u * 0.4
          if (yy < LH + ry)
            rocks.push({
              x: xx,
              y: yy,
              rx,
              ry,
              fade: Math.min(0.82, 0.25 + row * 0.15),
              seed: Math.floor(rnd() * 1e6),
              lip: false,
            })
          xx += rx * (1.5 + rnd() * 1.2)
        }
      }
      for (const r of rocks) {
        const dist = Math.hypot((r.x - bx) / 1.3, r.y - by) / (u * 9)
        r.fade = Math.min(0.8, Math.max(r.fade, (dist - 0.45) * 0.9))
      }
      rocks.sort((a, c) => a.y - c.y)
      for (const r of rocks) {
        if (r.lip) continue
        drawRock(hill, r.x, r.y, r.rx, r.ry, r.seed, r.fade, glow)
        if (r.fade < 0.35) moss(hill, r.x, r.y, r.rx, r.ry, r.seed)
        if (rnd() < 0.6)
          foliage(hill, r.x + (rnd() - 0.5) * r.rx * 1.6, r.y - r.ry * 0.45, u * (0.35 + rnd() * 0.45), r.seed + 7, {
            fade: r.fade,
            glow: r.fade < 0.3 ? glow : null,
          })
      }
      // mata que desce do morro: copas escuras abaixo das pedras
      const canopyY = (xx: number) => top(xx) + u * (rows + 1) * 1.0
      for (let xx = -u; xx < LW + u; xx += u * (0.7 + rnd() * 0.5)) {
        const cy = canopyY(xx) + rnd() * u * 0.6
        if (cy > LH + u) continue
        foliage(hill, xx, cy, u * (0.7 + rnd() * 0.5), Math.floor(rnd() * 1e6), {
          tones: ['void', 'night', 'vine0'],
          hi: null,
          spread: 1.8,
        })
      }
      for (let xx = 0; xx < LW; xx++) {
        const y0 = Math.round(canopyY(xx) + u * 0.6)
        if (y0 < LH) hill.rect(xx, y0, 1, LH - y0, 'void')
      }
      // borda da frente: pedras e moitas que tocam a base do monumento
      const lipSpots = [-4.6, -2.9, -0.4, 1.6, 3.6, 5.1]
      for (const s of lipSpots) {
        const lx = bx + s * u + (rnd() - 0.5) * u * 0.6
        const ly = by + u * (0.35 + rnd() * 0.25)
        if (rnd() < 0.5)
          drawRock(
            lip,
            lx,
            ly + u * 0.2,
            u * (0.45 + rnd() * 0.3),
            u * 0.35,
            Math.floor(rnd() * 1e6),
            0,
            glow,
          )
        foliage(lip, lx + u * 0.4, ly, u * (0.35 + rnd() * 0.35), Math.floor(rnd() * 1e6), { glow })
      }
      for (const r of rocks)
        if (r.lip) drawRock(lip, r.x, r.y + u * 0.3, r.rx * 0.8, r.ry * 0.8, r.seed, 0, glow)

      // primeiro plano: copas quase pretas emoldurando a cena (altas nos cantos, baixas no meio)
      const cornerH = P ? H * 0.13 : H * 0.24
      const midH = P ? H * 0.03 : H * 0.05
      const fh = (xx: number) => {
        const e = Math.abs((xx - LW / 2) / (LW / 2))
        return midH + (cornerH - midH) * e ** 2.4
      }
      for (let xx = -u; xx < LW + u; xx += u * (0.5 + rnd() * 0.4)) {
        const h0 = fh(Math.max(0, Math.min(LW - 1, xx)))
        const cy = LH - h0 * (0.55 + rnd() * 0.45)
        foliage(front, xx, cy, u * (0.6 + rnd() * 0.7) * (0.6 + h0 / cornerH), Math.floor(rnd() * 1e6), {
          tones: ['void', 'night', 'vine0'],
          hi: rnd() < 0.5 ? 'vine1' : null,
          spread: 1.6,
        })
      }
      for (let xx = 0; xx < LW; xx++) {
        const y0 = Math.round(LH - fh(xx) * 0.5)
        front.rect(xx, y0, 1, LH - y0, 'void')
      }
      this.hill = hill.canvas()
      this.lip = lip.canvas()
      this.front = front.canvas()
    }

    // gaivotas
    this.birds = Array.from({ length: P ? 4 : 6 }, (_, i) => ({
      x: rnd() * W,
      y: L.horizon * (0.25 + rnd() * 0.45),
      v: (2.5 + rnd() * 3) * (i % 3 === 0 ? -1 : 1),
      ph: rnd() * 10,
    }))
  }

  private lay(g: CanvasRenderingContext2D, c: HTMLCanvasElement, d: number, cam: Cam, dx = 0) {
    g.drawImage(c, Math.round(dx - PAD - cam.x * d), Math.round(-PY - cam.y * d))
  }

  /** tudo que fica atrás do monumento */
  drawBack(g: CanvasRenderingContext2D, t: number, cam: Cam) {
    const L = this.L
    g.fillStyle = HEX.void
    g.fillRect(0, 0, L.W, L.H)
    this.lay(g, this.sky, DEPTH.sky, cam)
    for (const s of this.stars) {
      const tw = Math.sin(t * s.sp + s.ph)
      if (tw < -0.3) continue
      g.fillStyle = HEX[tw > 0.6 ? s.k : 'stone1']
      g.fillRect(s.x, s.y, 1, 1)
      if (s.k === 'sparkle' && tw > 0.93) {
        g.fillStyle = HEX.stone2
        g.fillRect(s.x - 1, s.y, 1, 1)
        g.fillRect(s.x + 1, s.y, 1, 1)
        g.fillRect(s.x, s.y - 1, 1, 1)
        g.fillRect(s.x, s.y + 1, 1, 1)
      }
    }
    // lua: pulso de ±1 px na coroa a cada 4 s
    const m = Math.sin((t * Math.PI * 2) / 4) > 0 ? this.moonB : this.moonA
    g.drawImage(
      m,
      Math.round(L.moon.x - m.width / 2 - cam.x * DEPTH.moon),
      Math.round(L.moon.y - m.height / 2 - cam.y * DEPTH.moon),
    )
    // estratos: derivam devagar (mais longe, mais lentos)
    this.wrap(g, this.cloudsFar, DEPTH.cloudsFar, cam, -t * 1.1)
    // gaivotas a 8 fps
    const f8 = Math.floor(t * 8)
    for (const b of this.birds) {
      const span = L.W + 20
      const bx = ((((b.x + t * b.v) % span) + span) % span) - 10
      const by = b.y + Math.round(Math.sin(t * 0.7 + b.ph) * 2)
      drawBird(
        g,
        Math.round(bx - cam.x * 0.08),
        Math.round(by),
        (f8 + Math.floor(b.ph)) % 3,
        b.v < 0 ? 'stone2' : 'stone3',
      )
    }
    this.wrap(g, this.cloudsNear, DEPTH.cloudsNear, cam, -t * 2.2)
    this.lay(g, this.skyline, DEPTH.skyline, cam)
    // Cristo
    g.drawImage(
      this.christ.c,
      Math.round(this.christ.x - cam.x * DEPTH.skyline),
      Math.round(this.christ.y - cam.y * DEPTH.skyline),
    )
    // bondinho indo e voltando
    {
      const c = this.cable
      const s = 0.5 - 0.5 * Math.cos(t * 0.12)
      const x = c.x0 + (c.x1 - c.x0) * s - PAD - cam.x * DEPTH.skyline
      const y = c.y0 + (c.y1 - c.y0) * s + Math.sin(s * Math.PI) * 2 - PY - cam.y * DEPTH.skyline
      g.fillStyle = HEX.goldHi
      g.fillRect(Math.round(x), Math.round(y) + 1, 2, 1)
      g.fillStyle = HEX.gold1
      g.fillRect(Math.round(x), Math.round(y) + 2, 2, 1)
    }
    this.lay(g, this.bay, DEPTH.bay, cam)
    // reflexos tremulando
    const ox = -cam.x * DEPTH.bay
    const oy = -cam.y * DEPTH.bay
    const f6 = Math.floor(t * 6)
    for (const s of this.streaks) {
      for (let k = 0; k < s.len; k += 2) {
        if ((k + f6 + Math.floor(s.ph * 3)) % 3 === 0) continue
        const fall = k / s.len
        if (fall > 0.5 && bayer(k, f6) < fall - 0.3) continue
        const jit = Math.sin(t * 2.6 + k * 0.9 + s.ph) > 0.55 ? 1 : 0
        const kk: K =
          s.k === 'crimson'
            ? fall < 0.3
              ? 'red'
              : fall < 0.6
                ? 'crimson'
                : 'crimsonDeep'
            : fall < 0.15
              ? s.k
              : fall < 0.4
                ? 'ember'
                : fall < 0.7
                  ? 'emberDark'
                  : 'blood1'
        g.fillStyle = HEX[kk]
        g.fillRect(Math.round(s.x + ox + jit), Math.round(s.y + oy + k), fall < 0.35 ? 2 : 1, 1)
      }
    }
    // luzes piscando (estrada do Corcovado, orla)
    for (const l of this.lamps) {
      const tw = Math.sin(t * l.sp + l.ph)
      g.fillStyle = HEX[tw > 0.2 ? l.k : tw > -0.5 ? 'gold1' : 'gold0']
      g.fillRect(Math.round(l.x - cam.x * l.d), Math.round(l.y - cam.y * l.d), 1, 1)
    }
    this.lay(g, this.hill, DEPTH.hill, cam)
  }

  /** o que fica na frente da base do monumento */
  drawFront(g: CanvasRenderingContext2D, cam: Cam) {
    this.lay(g, this.lip, DEPTH.hill, cam)
    this.lay(g, this.front, DEPTH.front, cam)
  }

  private wrap(g: CanvasRenderingContext2D, c: HTMLCanvasElement, d: number, cam: Cam, drift: number) {
    const w = c.width
    let x = Math.round(drift - PAD - cam.x * d) % w
    if (x > 0) x -= w
    const y = Math.round(-PY - cam.y * d)
    for (; x < this.L.W; x += w) g.drawImage(c, x, y)
  }
}

/** Musgo no topo da pedra: 1 px verde (às vezes 2) seguindo a silhueta de cima, com sombra embaixo. */
function moss(b: Buf, cx: number, cy: number, rx: number, ry: number, seed: number) {
  const r = mulberry32(seed + 3)
  const y0 = Math.floor(cy - ry * 1.3)
  const y1 = Math.ceil(cy + ry * 0.2)
  for (let x = Math.floor(cx - rx * 0.9); x <= Math.ceil(cx + rx * 0.6); x++) {
    if (r() < 0.35) continue
    for (let y = y0; y < y1; y++) {
      const v = b.get(x, y)
      if (!v) continue
      if (b.is(x, y, 'void') || b.is(x, y, 'night') || b.is(x, y, 'blood0') || b.is(x, y, 'blood1')) break
      b.set(x, y, r() < 0.3 ? 'green' : 'vine1')
      if (r() < 0.5) b.set(x, y + 1, 'vine0')
      if (r() < 0.12) b.set(x, y - 1, 'leafHi')
      break
    }
  }
}

/** Pedra facetada: luz de cima-esquerda (lua), borda vermelha do lado dos anéis, contorno seletivo. */
export function drawRock(
  b: Buf,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  fade: number,
  glow: Glow,
) {
  const r = mulberry32(seed)
  const a1 = r() * 6.28
  const a2 = r() * 6.28
  const a3 = r() * 6.28
  const facets = 5 + Math.floor(r() * 3)
  const fj = r() * 6.28
  const LX = -0.55
  const LY = -0.65
  const LZ = 0.52
  const stone: K[] = ['void', 'night', 'stone0', 'stone1', 'stone2', 'stone3']
  const redR: K[] = ['blood0', 'blood1', 'crimsonDeep', 'crimson', 'red', 'redHot']
  const x0 = Math.floor(cx - rx * 1.3)
  const x1 = Math.ceil(cx + rx * 1.3)
  const y0 = Math.floor(cy - ry * 1.3)
  const y1 = Math.ceil(cy + ry * 0.7)
  const cracks = new Set<number>()
  for (let c = 0; c < 2; c++) {
    let px = cx + (r() - 0.5) * rx
    let py = cy - ry * 0.4 + r() * ry * 0.4
    for (let s = 0; s < rx * 0.8; s++) {
      cracks.add(Math.round(py) * 4096 + Math.round(px))
      px += r() < 0.5 ? 1 : 0
      py += r() < 0.6 ? 1 : 0
    }
  }
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / rx
      const v = (y + 0.5 - cy) / ry
      if (v > 0.6) continue
      const th = Math.atan2(v, u)
      const R = 1 + 0.12 * Math.sin(3 * th + a1) + 0.08 * Math.sin(5 * th + a2) + 0.05 * Math.sin(7 * th + a3)
      const rr = Math.hypot(u, v) / R
      if (rr > 1) continue
      const step = (Math.PI * 2) / facets
      const tq = Math.round((th - fj) / step) * step + fj
      let nx: number
      let ny: number
      let nzv: number
      if (rr < 0.42) {
        nx = -0.15
        ny = -0.45
        nzv = 0.88
      } else {
        nx = Math.cos(tq) * 0.82
        ny = Math.sin(tq) * 0.82
        nzv = 0.57
      }
      const lam = nx * LX + ny * LY + nzv * LZ
      let val = 0.08 + lam * 0.72 - fade * 0.75
      let k: K = stone[Math.max(0, Math.min(5, Math.floor(val * 6)))] ?? 'void'
      if (glow) {
        const gx = glow.x - x
        const gy = glow.y - y
        const gd = Math.hypot(gx, gy)
        const gl = clamp01(1 - gd / glow.r)
        const facing = (nx * gx + ny * gy) / (gd || 1)
        const amt = gl * (0.35 + Math.max(0, facing) * 0.9) - fade * 0.6
        if (amt > 0.38 || (amt > 0.3 && dith(x, y, (amt - 0.3) * 8))) {
          val = amt * 0.9 + lam * 0.4
          k = redR[Math.max(0, Math.min(5, Math.floor(val * 6)))] ?? 'blood0'
        }
        if (rr > 0.86 && facing > 0.35 && gl > 0.25 && fade < 0.3) k = gl > 0.55 ? 'redHot' : 'red'
      }
      if (rr > 0.88 && u + v > 0.35 && k !== 'redHot' && k !== 'red') k = 'void'
      if (cracks.has(y * 4096 + x) && rr < 0.85) k = fade > 0.4 ? 'void' : 'stone0'
      b.set(x, y, k)
    }
}

/** Moita de folhas: sopros pequenos, topo claro (leafHi), sombra azulada embaixo (vine0). */
export function drawBush(
  b: Buf,
  cx: number,
  cy: number,
  rad: number,
  seed: number,
  fade: number,
  glow: Glow,
) {
  const r = mulberry32(seed)
  const n = Math.max(6, Math.round(rad * rad * 0.55))
  const leaves: { x: number; y: number; s: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.PI + r() * Math.PI
    const d = Math.sqrt(r())
    leaves.push({
      x: cx + Math.cos(a) * rad * 1.25 * d,
      y: cy + Math.sin(a) * rad * d * 0.9 + rad * 0.25,
      s: 1.4 + r() * 1.5,
    })
  }
  leaves.sort((a, c) => c.y - a.y)
  const ramp: K[] = ['void', 'vine0', 'vine1', 'green', 'leafHi']
  for (const l of leaves) {
    const s = l.s
    for (let oy = -Math.ceil(s); oy <= Math.ceil(s); oy++)
      for (let ox = -Math.ceil(s * 1.3); ox <= Math.ceil(s * 1.3); ox++) {
        const q = (ox / (s * 1.3)) ** 2 + (oy / s) ** 2
        if (q > 1) continue
        const x = Math.round(l.x + ox)
        const y = Math.round(l.y + oy)
        const local = -(ox / s) * 0.35 - (oy / s) * 0.6
        const gpos = 1 - (y - (cy - rad)) / (rad * 1.6)
        let v = 1.3 + local * 1.1 + gpos * 1.6 - fade * 2.6
        if (q > 0.7 && oy > 0) v -= 0.8
        let k = ramp[Math.max(0, Math.min(4, Math.floor(v + (bayer(x, y) - 0.5) * 0.4)))] ?? 'vine0'
        if (glow && q > 0.55) {
          const gx = glow.x - x
          const gy = glow.y - y
          const gd = Math.hypot(gx, gy)
          const gl = clamp01(1 - gd / glow.r)
          if (gl > 0.35 && ox * gx + oy * gy > 0 && fade < 0.3) k = gl > 0.6 ? 'red' : 'crimson'
        }
        b.set(x, y, k)
      }
  }
}
