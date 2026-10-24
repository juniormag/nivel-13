// Ajudantes de cenário das fases 9–13 (level-art-lead C). Puro Buf, sem Pixi; não é pintor de fase
// (o glob de levels.ts só carrega `l*.ts`). Lições da ref v2: três quartos com lateral grossa e saturada,
// chanfro de 1 px, 5–7 planos com névoa púrpura/vermelha, base das nuvens acesa, luzes de cidade em 1 px
// por bairro, reflexos em traços quebrados, primeiro plano quase preto com cachos de 3 tons.
import { mulberry32 } from '../../lib/rng'
import {
  bank,
  CITY,
  cityRow,
  cumulusLayer,
  DARK_CANOPY,
  drawRock,
  foliage,
  ridge,
  type Stratus,
  stratusLayer,
} from '../backdrop'
import type { Ctx } from '../levels'
import { bayer, clamp01, DARKER, dith, type K, KEYS, U32 } from '../pal'

const REV = new Map<number, K>(KEYS.map((k) => [U32[k], k]))

/** luzes de cidade: bairros de pontos de 1 px em 2–3 tons, com um ponto quente forte aqui e ali */
export function lights(c: Ctx, x0: number, x1: number, y0: number, y1: number, dens: number, seed: number) {
  const r = mulberry32(seed)
  const hoods = Math.max(2, Math.round((x1 - x0) / 20))
  for (let h = 0; h < hoods; h++) {
    const cx = x0 + ((h + 0.15 + r() * 0.7) / hoods) * (x1 - x0)
    const cy = y0 + r() * (y1 - y0)
    const rx = 5 + r() * 11
    const ry = Math.max(1.5, (y1 - y0) * (0.25 + r() * 0.45))
    const n = Math.round(rx * ry * dens * 0.7)
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283
      const d = r() ** 0.75
      const x = Math.round(cx + Math.cos(a) * rx * d)
      const y = Math.round(cy + Math.sin(a) * ry * d)
      if (x < x0 || x >= x1 || y < y0 || y > y1) continue
      const v = r()
      c.b.set(
        x,
        y,
        v > 0.975 ? 'sparkle' : v > 0.88 ? 'goldHi' : v > 0.62 ? 'gold' : v > 0.3 ? 'gold1' : 'emberDark',
      )
    }
  }
}

/** reflexos em traços horizontais quebrados embaixo de cada luz (lição 7) */
export function strokes(c: Ctx, y0: number, y1: number, ls: { x: number; k: K; len?: number }[]) {
  for (const l of ls) {
    const len = l.len ?? Math.round((y1 - y0) * 0.6)
    for (let i = 1; i < len; i += 2) {
      const f = i / len
      if (f > 0.4 && bayer(l.x + i, y0 + i) < f - 0.25) continue
      const w = Math.max(1, Math.round((1 - f) * 4 + ((i * 7 + l.x) % 3)))
      const x = Math.round(l.x - w / 2 + Math.sin(i * 1.7 + l.x) * 1.5)
      const k: K = f < 0.2 ? l.k : f < 0.5 ? DARKER[l.k] : DARKER[DARKER[l.k]]
      c.b.rect(x, y0 + i, w, 1, k)
    }
  }
}

/** água escura com faixas de reflexo do céu (vermelho perto do horizonte, azul-noite embaixo) */
export function pool(c: Ctx, y0: number, y1: number, glow: K) {
  const { b, W, nz } = c
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0)
    for (let x = 0; x < W; x++) {
      const s = nz.n2(x / 13, y * 0.8)
      let k: K = t < 0.25 ? 'night' : 'void'
      if (t < 0.1 && s > 0.5) k = glow
      else if (s > 0.83 - t * 0.12) k = t < 0.45 ? DARKER[glow] : 'blue0'
      b.set(x, y, k)
    }
  }
}

export interface Box3 {
  x: number
  base: number
  w: number
  h: number
  /** espessura da lateral */
  d: number
  /** 1 = lateral à direita, -1 = à esquerda */
  dir?: 1 | -1
  /** frente do escuro ao claro (4 tons) */
  front: [K, K, K, K]
  /** lateral do escuro ao claro (3 tons), saturada */
  side: [K, K, K]
  roof?: K
  rim?: K
  win?: { rate: number; sx: number; sy: number; seed: number }
}

/** bloco em três quartos: frente com chanfro de 1 px, lateral grossa pontilhada, teto e rim na aresta */
export function box3(c: Ctx, o: Box3) {
  const { b } = c
  const dir = o.dir ?? 1
  const rise = Math.max(1, Math.round(o.d * 0.45))
  const top = Math.round(o.base - o.h)
  const x0 = Math.round(o.x)
  const x1 = x0 + Math.round(o.w)
  for (let i = 0; i < o.d; i++) {
    const x = dir > 0 ? x1 + i : x0 - 1 - i
    const lift = Math.round(((i + 1) / o.d) * rise)
    for (let y = top - lift; y < o.base - lift; y++) {
      const t = (y - (top - lift)) / o.h
      let k: K = t < 0.12 ? o.side[2] : t < 0.6 ? o.side[1] : o.side[0]
      if (k !== o.side[0] && dith(x, y, 0.28)) k = DARKER[k]
      if (i === o.d - 1 && o.rim) k = o.rim
      b.set(x, y, k)
    }
  }
  for (let i = 0; i < rise; i++) {
    const sh = Math.round(((i + 1) / rise) * o.d)
    b.rect(dir > 0 ? x0 + sh : x0 - sh, top - 1 - i, Math.round(o.w), 1, o.roof ?? o.front[2])
  }
  for (let y = top; y < o.base; y++) {
    const t = (y - top) / o.h
    const i = t < 0.08 ? 3 : t < 0.5 ? 2 : t < 0.82 ? 1 : 0
    for (let x = x0; x < x1; x++) {
      let k = o.front[i] ?? o.front[0]
      if (i > 0 && i < 3 && t > 0.4 && dith(x, y, (t - 0.4) * 1.5)) k = o.front[i - 1] ?? k
      b.set(x, y, k)
    }
  }
  b.rect(x0, top, Math.round(o.w), 1, o.front[3])
  b.rect(dir > 0 ? x1 - 1 : x0, top, 1, Math.round(o.h), o.front[3])
  if (o.win) {
    const r = mulberry32(o.win.seed)
    for (let y = top + 2; y < o.base - 2; y += o.win.sy)
      for (let x = x0 + 2; x < x1 - 2; x += o.win.sx) {
        const v = r()
        if (v < o.win.rate)
          b.set(x, y, v < o.win.rate * 0.1 ? 'sparkle' : v < o.win.rate * 0.4 ? 'goldHi' : 'gold1')
        else b.set(x, y, DARKER[o.front[1]])
      }
  }
}

/** névoa atmosférica: pontilha `k` por cima do que já foi pintado (empurra um plano para trás) */
export function haze(
  c: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  k: K,
  amt: number,
  fromTop = false,
) {
  const { b } = c
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(c.H, y1); y++) {
    const t = clamp01((y - y0) / Math.max(1, y1 - y0))
    const a = amt * (fromTop ? 1 - t : t)
    for (let x = Math.max(0, Math.round(x0)); x < Math.min(c.W, x1); x++)
      if (b.get(x, y) && dith(x + ((y >> 2) & 1) * 2, y, a)) b.set(x, y, k)
  }
}

/** faixa de névoa horizontal (pé de morro, chão de cidade) que some para cima */
export function fog(c: Ctx, y0: number, y1: number, k: K, amt = 0.5) {
  for (let y = Math.round(y0); y < y1; y++) {
    const t = 1 - (y - y0) / Math.max(1, y1 - y0)
    for (let x = 0; x < c.W; x++) if (dith(x + ((y >> 2) & 1) * 2, y, (1 - t) * amt)) c.b.set(x, y, k)
  }
}

/** gaivota/pássaro em "v" de 3–5 px */
export function bird(c: Ctx, x: number, y: number, k: K = 'stone2', up = true) {
  const X = Math.round(x)
  const Y = Math.round(y)
  c.b.set(X, Y, k)
  c.b.set(X - 1, Y + (up ? -1 : 0), k)
  c.b.set(X + 1, Y + (up ? -1 : 0), k)
  c.b.set(X - 2, Y + (up ? 0 : -1), k)
  c.b.set(X + 2, Y + (up ? 0 : -1), k)
}

/** brilho de 4 pontas (núcleo branco, braços ouro-claro, pontas douradas) */
export function star(c: Ctx, x: number, y: number, r: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  for (let i = 1; i <= r; i++) {
    const k: K = i === r ? 'gold' : 'goldHi'
    c.b.set(X + i, Y, k)
    c.b.set(X - i, Y, k)
    c.b.set(X, Y + i, k)
    c.b.set(X, Y - i, k)
  }
  c.b.set(X, Y, 'white')
}

/** feixe vertical fino (1 px) com pontilhado nas pontas */
export function beam(c: Ctx, x: number, y0: number, y1: number, k: K) {
  const L = y1 - y0
  for (let y = Math.round(y0); y < y1; y++) {
    const t = (y - y0) / Math.max(1, L)
    const e = Math.min(t, 1 - t) * 4
    if (e < 1 && !dith(x, y, e)) continue
    c.b.set(x, y, k)
  }
}

/** halo pontilhado em volta de uma luz (só em pixel vazio ou escuro) */
export function halo(c: Ctx, x: number, y: number, r: number, k: K, amt = 0.5) {
  for (let yy = -r; yy <= r; yy++)
    for (let xx = -r; xx <= r; xx++) {
      const d = Math.hypot(xx, yy) / r
      if (d > 1) continue
      const X = Math.round(x + xx)
      const Y = Math.round(y + yy)
      if (dith(X, Y, (1 - d) * amt)) c.b.set(X, Y, k)
    }
}

/** silhueta de serra com rim quente do lado da luz (`lightX`) e corpo que esfria com a distância */
export function ridgeLit(
  c: Ctx,
  top: (x: number) => number,
  body: K,
  rim: K,
  lightX: number,
  bottom: number,
) {
  const { b, W } = c
  for (let x = 0; x < W; x++) {
    const t = Math.round(top(x))
    if (t >= bottom) continue
    const slope = top(x + 1) - top(x - 1)
    const facing = (x < lightX && slope > 0) || (x > lightX && slope < 0)
    for (let y = Math.max(0, t); y <= bottom; y++) {
      let k: K = body
      if (y - t < 1) k = facing ? rim : DARKER[rim]
      else if (facing && y - t < 2 && Math.abs(slope) > 0.6) k = DARKER[rim]
      b.set(x, y, k)
    }
  }
}

/**
 * Primeiro plano quase preto emoldurando os cantos de baixo: massa void/night, pedras e cachos de folha
 * de 3 tons com rim vermelho do lado da energia (centro), e musgo/grama em fiapos na borda.
 */
export function frameFg(
  c: Ctx,
  seed: number,
  o: { h?: number; glowY?: number; leaves?: boolean; reach?: number } = {},
) {
  const r = mulberry32(seed)
  const { W, H, s } = c
  const hh = (o.h ?? 0.12) * H
  const glow = { x: W / 2, y: o.glowY ?? H * 0.45, r: W * 0.7 }
  for (const side of [0, 1]) {
    const reach = W * ((o.reach ?? 0.24) + r() * 0.06)
    for (let i = 0; i < reach; i++) {
      const x = side ? W - 1 - i : i
      const t = i / reach
      const top = Math.round(H - hh * (1 - t * t) - Math.sin(i * 0.4 + seed) * s * 1.3)
      for (let y = top; y < H; y++) c.b.set(x, y, 'void')
      if (t > 0.25 && t < 0.97) c.b.set(x, top, dith(x, top, 0.5) ? 'blood0' : 'night')
      // fiapos de grama escura saindo da borda
      if (i % 3 === 0 && t < 0.9) {
        const gh = 1 + Math.round(r() * 3 * s * 0.5)
        for (let g = 1; g <= gh; g++)
          c.b.set(x + (g === gh ? (side ? -1 : 1) : 0), top - g, g === gh && t > 0.5 ? 'blood0' : 'void')
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = side ? W - r() * W * 0.15 : r() * W * 0.15
      const y = H - r() * hh * 0.6
      drawRock(c.b, x, y, s * (4 + r() * 5), s * (3 + r() * 3), Math.floor(r() * 1e6), 0.7, glow, 0.06)
    }
    if (o.leaves !== false)
      for (let i = 0; i < 4; i++) {
        const x = side ? W - s * 2 - r() * W * 0.2 : s * 2 + r() * W * 0.2
        const y = H - hh * (0.4 + r() * 0.6)
        // copa quase preta com 1 px de verde-escuro nos topos (lição 13) e um cacho de 3 tons mais perto
        if (i < 3) foliage(c.b, x, y, s * (2.5 + r() * 3), Math.floor(r() * 1e6), { ...DARK_CANOPY, glow })
        else foliage(c.b, x, y, s * (1.6 + r()), Math.floor(r() * 1e6), { fade: 0.4, glow })
      }
  }
}

/**
 * Área de jogo calma: escurece o miolo da elipse (cx, cy, rx, ry em frações da tela) para no máximo
 * `max` de valor, com borda pontilhada (não marca linha).
 */
export function calmZone(c: Ctx, cx: number, cy: number, rx: number, ry: number, steps = 2) {
  const { b, W, H } = c
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x / W - cx) / rx, (y / H - cy) / ry)
      if (d >= 1) continue
      const raw = b.get(x, y)
      if (!raw) continue
      if (d > 0.7 && !dith(x, y, (1 - d) / 0.3)) continue
      let k = REV.get(raw)
      if (!k) continue
      for (let n = 0; n < steps; n++) k = DARKER[k]
      b.set(x, y, k)
    }
}

/** cacho de cúmulos legíveis (lição 5): poucos sopros grandes, aro vermelho, base acesa de brasa */
export function cumulus(c: Ctx, x0: number, x1: number, yb: number, hb: number, seed: number, n = 6) {
  const r = mulberry32(seed)
  const puffs = bank(r, x0, x1, yb, hb, n)
  c.b.blit(cumulusLayer(c.W, c.H, puffs, seed), 0, 0)
}

/** estratos finos colados no horizonte (lição 6): `heat` 1 = laranja colado, 0 = vermelho alto */
export function stratus(c: Ctx, bands: Stratus[], seed: number) {
  c.b.blit(stratusLayer(c.W, c.H, bands, seed), 0, 0)
}

/** serra/morro com aro de 1 px e névoa subindo do pé na cor do horizonte (lições 2 e 3) */
export function hills(c: Ctx, top: (x: number) => number, base: number, body: K, rim: K, fog: K, shade?: K) {
  const fogH = Math.max(2, Math.round((base - Math.min(top(0), top(c.W / 2), top(c.W - 1))) * 0.35))
  ridge(c.b, 0, c.W, base, top, { body, rim, fog, fogH, fogMax: 0.55, shade })
}

/** fileira de cidade (lição 7): `tier` far/mid/lit/near, `gap` 0,3 faz bairros em cachos */
export function city(
  c: Ctx,
  x0: number,
  x1: number,
  base: (x: number) => number,
  hMin: number,
  hMax: number,
  tier: keyof typeof CITY,
  seed: number,
  gap = 0,
) {
  cityRow(c.b, mulberry32(seed), x0, x1, base, hMin, hMax, CITY[tier], undefined, gap)
}

/**
 * Faixa de água do horizonte (lição 4): a parte mais clara do meio da tela. Traços horizontais
 * ember/emberBright, goldHi raro, linha escura a cada 3; abaixo, água night/dusk.
 */
export function horizonWater(c: Ctx, y0: number, h: number, y1: number, seed: number) {
  const r = mulberry32(seed)
  const { b, W } = c
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < W; x++) b.set(x, y, y < y0 + h ? 'blood1' : dith(x, y, 0.25) ? 'dusk' : 'night')
  for (let y = y0; y < y0 + h; y++) {
    if ((y - y0) % 3 === 2) {
      b.rect(0, y, W, 1, 'blood0')
      continue
    }
    let x = Math.floor(r() * 4)
    while (x < W) {
      const len = 2 + Math.floor(r() * 9)
      const v = r()
      const k: K = v > 0.97 ? 'goldHi' : v > 0.55 ? 'emberBright' : v > 0.2 ? 'ember' : 'red'
      b.rect(x, y, len, 1, k)
      x += len + 1 + Math.floor(r() * 4)
    }
  }
}
