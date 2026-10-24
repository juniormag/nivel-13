// Ajudantes de cenário das fases 5–8 (level-art-lead B). Puro canvas/Buf, sem Pixi.
// Lições da ref v2: volume em três quartos com lateral grossa e saturada, chanfro de 1 px,
// luzes de cidade em 1 px agrupadas, reflexos em traços quebrados, primeiro plano quase preto.
import { mulberry32 } from '../../lib/rng'
import {
  CITY,
  type CityTier,
  cityRow,
  cumulusLayer,
  DARK_CANOPY,
  drawRock,
  foliage,
  type Puff,
  ridge as ridgeV2,
  type Stratus,
  stratusLayer,
} from '../backdrop'
import type { Ctx } from '../levels'
import { bayer, clamp01, DARKER, dith, type K } from '../pal'

/** luzes de cidade: bairros de pontos de 1 px em 2–3 tons, com um ponto quente aqui e ali */
export function cityLights(
  c: Ctx,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  dens: number,
  seed: number,
) {
  const r = mulberry32(seed)
  const hoods = Math.max(2, Math.round((x1 - x0) / 22))
  for (let h = 0; h < hoods; h++) {
    const cx = x0 + ((h + 0.2 + r() * 0.6) / hoods) * (x1 - x0)
    const cy = y0 + r() * (y1 - y0)
    const rx = 6 + r() * 12
    const ry = Math.max(2, (y1 - y0) * (0.3 + r() * 0.4))
    const n = Math.round(rx * ry * dens * 0.6)
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283
      const d = r() ** 0.7
      const x = Math.round(cx + Math.cos(a) * rx * d)
      const y = Math.round(cy + Math.sin(a) * ry * d)
      if (x < x0 || x >= x1 || y < y0 || y > y1) continue
      const v = r()
      c.b.set(
        x,
        y,
        v > 0.97 ? 'sparkle' : v > 0.85 ? 'goldHi' : v > 0.6 ? 'gold' : v > 0.3 ? 'gold1' : 'emberDark',
      )
    }
  }
}

/** reflexos na água: traços horizontais quebrados embaixo de cada luz */
export function reflect(c: Ctx, y0: number, y1: number, lights: { x: number; k: K; len?: number }[]) {
  const r = mulberry32(Math.round(y0 * 31 + y1))
  for (const l of lights) {
    const len = l.len ?? Math.round((y1 - y0) * (0.4 + r() * 0.5))
    for (let i = 1; i < len; i += 1 + (r() < 0.4 ? 1 : 0)) {
      const f = i / len
      const w = Math.max(1, Math.round((1 - f) * 3 + r() * 2))
      const jit = Math.round((r() - 0.5) * 3 * f)
      const k: K = f < 0.25 ? l.k : f < 0.5 ? DARKER[l.k] : f < 0.75 ? 'emberDark' : 'blood1'
      if (f > 0.6 && bayer(l.x, y0 + i) < f - 0.4) continue
      c.b.rect(l.x + jit - (w >> 1), y0 + i, w, 1, k)
    }
  }
}

/** água calma: faixas de brilho do céu perto da margem, escura no meio */
export function river(c: Ctx, y0: number, y1: number, glow: K, deep: K = 'void') {
  const { b, W, nz } = c
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0)
    for (let x = 0; x < W; x++) {
      const s = nz.n2(x / 13, y * 0.8)
      let k: K = t < 0.35 ? 'night' : deep
      if (t < 0.1 && s > 0.5) k = glow
      else if (t < 0.3 && s > 0.72) k = DARKER[glow]
      else if (s > 0.86 - t * 0.05) k = t < 0.6 ? 'blood0' : 'blue0'
      b.set(x, y, k)
    }
  }
}

export interface Box {
  x: number
  base: number
  w: number
  h: number
  /** espessura da lateral (px) */
  d: number
  /** 1 = lateral à direita (lado da energia), -1 = à esquerda */
  dir?: 1 | -1
  /** frente: escuro → claro (4 tons) */
  front: [K, K, K, K]
  /** lateral: escuro → claro (3 tons), saturada */
  side: [K, K, K]
  roof?: K
  rim?: K
  /** janelas: densidade de acesas, passo x/y */
  win?: { rate: number; sx: number; sy: number; seed: number }
}

/**
 * Bloco em três quartos: frente clara com chanfro de 1 px no topo e na quina, lateral grossa
 * e saturada (pontilhada como granito), teto em paralelogramo e rim vermelho na aresta de fora.
 */
export function box3q(c: Ctx, o: Box) {
  const { b } = c
  const dir = o.dir ?? 1
  const rise = Math.max(1, Math.round(o.d * 0.45))
  const top = o.base - o.h
  const x0 = Math.round(o.x)
  const x1 = x0 + o.w
  // lateral: paralelogramo que sobe em direção ao fundo
  for (let i = 0; i < o.d; i++) {
    const x = dir > 0 ? x1 + i : x0 - 1 - i
    const lift = Math.round(((i + 1) / o.d) * rise)
    for (let y = top - lift; y < o.base - lift; y++) {
      const t = (y - (top - lift)) / o.h
      let k: K = t < 0.15 ? o.side[2] : t < 0.6 ? o.side[1] : o.side[0]
      if (dith(x, y, 0.3) && k !== o.side[0]) k = DARKER[k]
      if (i === o.d - 1) k = o.rim ?? o.side[2]
      b.set(x, y, k)
    }
  }
  // teto
  for (let i = 0; i < rise; i++) {
    const y = top - 1 - i
    const sh = Math.round(((i + 1) / rise) * o.d)
    b.rect(dir > 0 ? x0 + sh : x0 - sh, y, o.w, 1, o.roof ?? o.front[1])
  }
  // frente em 4 tons: luz de cima, base escurece
  for (let y = top; y < o.base; y++) {
    const t = (y - top) / o.h
    const i = t < 0.08 ? 3 : t < 0.55 ? 2 : t < 0.85 ? 1 : 0
    for (let x = x0; x < x1; x++) {
      let k = o.front[i] ?? o.front[0]
      if (i > 0 && i < 3 && t > 0.45 && dith(x, y, (t - 0.45) * 1.6)) k = o.front[i - 1] ?? k
      b.set(x, y, k)
    }
  }
  // chanfro: 1 px claro no topo e na quina que pega a luz
  b.rect(x0, top, o.w, 1, o.front[3])
  b.rect(dir > 0 ? x1 - 1 : x0, top, 1, o.h, o.front[3])
  b.rect(dir > 0 ? x0 : x1 - 1, top, 1, o.h, o.front[0])
  if (o.win) {
    const r = mulberry32(o.win.seed)
    for (let y = top + 2; y < o.base - 2; y += o.win.sy)
      for (let x = x0 + 2; x < x1 - 2; x += o.win.sx) {
        const v = r()
        if (v < o.win.rate)
          b.set(x, y, v < o.win.rate * 0.12 ? 'sparkle' : v < o.win.rate * 0.4 ? 'goldHi' : 'gold1')
        else b.set(x, y, DARKER[o.front[1]])
      }
  }
}

/** névoa atmosférica: empurra uma região para trás pontilhando a cor `k` por cima do que não é vazio */
export function haze(c: Ctx, x0: number, y0: number, x1: number, y1: number, k: K, amt: number) {
  const { b } = c
  for (let y = Math.max(0, y0); y < Math.min(c.H, y1); y++) {
    const t = clamp01((y - y0) / Math.max(1, y1 - y0))
    for (let x = Math.max(0, x0); x < Math.min(c.W, x1); x++)
      if (dith(x, y, amt * (1 - t * 0.6))) b.set(x, y, k)
  }
}

/** gaivota de 5×2 px */
export function bird(c: Ctx, x: number, y: number, k: K = 'stone2', up = true) {
  x = Math.round(x)
  y = Math.round(y)
  if (up) {
    c.b.set(x, y + 1, k)
    c.b.set(x + 1, y, k)
    c.b.set(x + 2, y + 1, k)
    c.b.set(x + 3, y, k)
    c.b.set(x + 4, y + 1, k)
  } else {
    c.b.set(x, y, k)
    c.b.set(x + 1, y + 1, k)
    c.b.set(x + 2, y + 1, k)
    c.b.set(x + 3, y + 1, k)
    c.b.set(x + 4, y, k)
  }
}

/** estrela de 4 pontas: núcleo branco, braços dourados, pontas gold */
export function star4(c: Ctx, x: number, y: number, r: number) {
  x = Math.round(x)
  y = Math.round(y)
  for (let i = 1; i <= r; i++) {
    const k: K = i === r ? 'gold' : 'goldHi'
    c.b.set(x + i, y, k)
    c.b.set(x - i, y, k)
    c.b.set(x, y + i, k)
    c.b.set(x, y - i, k)
  }
  c.b.set(x, y, 'white')
}

/** feixe vertical fino e pontilhado (luz subindo de um marco) */
export function beam(c: Ctx, x: number, y0: number, y1: number, k: K) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0)
    if (dith(x, y, t * 0.9)) c.b.set(x, y, k)
  }
}

/** halo pontilhado em volta de uma luz (regra 15) */
export function halo(c: Ctx, x: number, y: number, r: number, k: K, amt = 0.5) {
  for (let yy = -r; yy <= r; yy++)
    for (let xx = -r; xx <= r; xx++) {
      const d = Math.hypot(xx, yy) / r
      if (d > 1) continue
      if (dith(x + xx, y + yy, (1 - d) * amt)) c.b.set(x + xx, y + yy, k)
    }
}

/**
 * Primeiro plano quase preto emoldurando os cantos de baixo (lições 12–13): massa escura saindo do canto,
 * pedras grandes com faces até stone3 (lift) e copas DARK_CANOPY com 1 px de vine0 nos topos.
 * Aro vermelho só nas bordas viradas para a energia, perto dela.
 */
export function fgFrame(c: Ctx, seed: number, o: { h?: number; leaves?: boolean; glowY?: number } = {}) {
  const r = mulberry32(seed)
  const { W, H, s } = c
  const hh = (o.h ?? 0.12) * H
  const glow = { x: W / 2, y: o.glowY ?? H * 0.62, r: W * 0.45 }
  for (const side of [0, 1]) {
    const reach = W * (0.2 + r() * 0.08)
    for (let i = 0; i < reach; i++) {
      const x = side ? W - 1 - i : i
      const t = i / reach
      const top = Math.round(H - hh * (1 - t * t) - Math.sin(i * 0.35 + seed) * s * 1.2)
      for (let y = top; y < H; y++) c.b.set(x, y, 'void')
      if (t > 0.3 && t < 0.95 && dith(x, top, 0.5)) c.b.set(x, top, 'night')
    }
    for (let i = 0; i < 2; i++) {
      const x = side ? W - r() * W * 0.14 : r() * W * 0.14
      const y = H - r() * hh * 0.6
      drawRock(c.b, x, y, s * (5 + r() * 4), s * (3 + r() * 3), Math.floor(r() * 1e6), 0.55, glow, 0.12)
    }
    if (o.leaves !== false)
      for (let i = 0; i < 3; i++) {
        const x = side ? W - s * 2 - r() * W * 0.2 : s * 2 + r() * W * 0.2
        const y = H - hh * (0.45 + r() * 0.6)
        foliage(c.b, x, y, s * (3 + r() * 3), Math.floor(r() * 1e6), DARK_CANOPY)
      }
  }
}

/** cúmulos legíveis (lição 5): cachos de 4–9 sopros grandes, raio em fração da altura */
export function cumulus(c: Ctx, clusters: { x: number; y: number; r: number; n: number }[], seed: number) {
  const rr = mulberry32(seed)
  const puffs: Puff[] = []
  for (const cl of clusters) {
    // no celular em pé a altura é grande: o raio segue o lado menor para os sopros não engolirem o céu
    const R = cl.r * Math.min(c.H, c.W * 1.1)
    for (let i = 0; i < cl.n; i++) {
      const f = cl.n > 1 ? i / (cl.n - 1) : 0.5
      const env = Math.sin(Math.PI * (0.15 + f * 0.7))
      puffs.push({
        x: Math.round(cl.x * c.W + (f - 0.5) * R * cl.n * 0.9 + (rr() - 0.5) * R * 0.4),
        y: Math.round(cl.y * c.H - env * R * 0.55 + rr() * R * 0.2),
        r: R * (0.55 + 0.45 * env * (0.7 + rr() * 0.4)),
        flat: 0.35 + rr() * 0.15,
      })
    }
  }
  if (puffs.length) c.b.blit(cumulusLayer(c.W, c.H, puffs, seed), 0, 0)
}

/** estratos finos colados no horizonte (lição 6) */
export function stratus(c: Ctx, bands: Stratus[], seed: number) {
  c.b.blit(stratusLayer(c.W, c.H, bands, seed), 0, 0)
}

/** serra/morro com névoa no pé e aro de 1 px (lições 2–3) */
export function range(
  c: Ctx,
  base: number,
  top: (x: number) => number,
  body: K,
  rim: K,
  fog: K | undefined,
  fogFrac = 0.035,
) {
  ridgeV2(c.b, 0, c.W, base, top, {
    body,
    rim,
    fog,
    fogH: Math.max(2, Math.round(c.H * fogFrac)),
    fogMax: 0.55,
  })
}

/** fileira de cidade sobre um morro escuro (lições 7–8) */
export function city(
  c: Ctx,
  x0: number,
  x1: number,
  base: (x: number) => number,
  hMin: number,
  hMax: number,
  tier: keyof typeof CITY | CityTier,
  seed: number,
  gap = 0,
) {
  cityRow(
    c.b,
    mulberry32(seed),
    x0,
    x1,
    base,
    hMin,
    hMax,
    typeof tier === 'string' ? CITY[tier] : tier,
    undefined,
    gap,
  )
}

/** faixa de água no horizonte, a parte mais clara do meio da tela (lição 4) */
export function horizonWater(c: Ctx, y0: number, h: number, seed: number) {
  const r = mulberry32(seed)
  for (let y = y0; y < y0 + h; y++) {
    const dark = (y - y0) % 3 === 2
    for (let x = 0; x < c.W; ) {
      const len = 1 + Math.floor(r() * 6)
      const v = r()
      const k: K | null = dark
        ? 'blood0'
        : v < 0.4
          ? null
          : v < 0.42
            ? 'goldHi'
            : v < 0.55
              ? 'emberBright'
              : v < 0.75
                ? 'ember'
                : v < 0.9
                  ? 'emberDark'
                  : 'blood1'
      if (k) c.b.rect(x, y, len, 1, k)
      x += len + (r() < 0.3 ? 1 : 0)
    }
  }
}

/** palmeira escura (silhueta) com cacho de folhas pendendo */
export function palmSil(
  c: Ctx,
  x: number,
  base: number,
  h: number,
  lean: number,
  k: K = 'void',
  rim: K | null = null,
) {
  const { b } = c
  let px = x
  let py = base
  for (let i = 0; i < h; i++) {
    px = x + lean * i + Math.sin((i / h) * 2) * 2
    py = base - i
    b.set(px, py, k)
    b.set(px + 1, py, k)
    if (rim && i % 2 === 0) b.set(px + 2, py, rim)
  }
  const fr = 9
  for (let f = 0; f < fr; f++) {
    const a = -Math.PI / 2 + ((f - (fr - 1) / 2) / fr) * Math.PI * 1.5
    const len = h * (0.32 + (f % 3) * 0.05)
    for (let i = 0; i < len; i++) {
      const t = i / len
      const xx = px + Math.cos(a) * i
      const yy = py + Math.sin(a) * i + t * t * len * 0.6
      b.set(xx, yy, k)
      if (i % 2 === 0 && t > 0.25) b.set(xx, yy + 1, k)
      if (rim && t > 0.3 && Math.cos(a) > 0.2 && i % 3 === 0) b.set(xx, yy - 1, rim)
    }
  }
}

/** pontilhado de linhas de transição entre duas cores (para pé de morro/névoa) */
export function fogBand(c: Ctx, y0: number, y1: number, k: K, amt = 0.5) {
  for (let y = y0; y < y1; y++) {
    const t = 1 - (y - y0) / Math.max(1, y1 - y0)
    for (let x = 0; x < c.W; x++) if (dith(x + ((y >> 2) & 1) * 2, y, t * amt)) c.b.set(x, y, k)
  }
}

/** desenho à mão em linhas de texto: cada letra vira uma cor de `map` ('.' transparente); `flip` espelha */
export function blitRows(c: Ctx, x: number, y: number, rows: string[], map: Record<string, K>, flip = false) {
  const w = Math.max(...rows.map((r) => r.length))
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = map[row[i] ?? '.']
      if (k) c.b.set(flip ? x + w - 1 - i : x + i, y + j, k)
    }
  })
}
