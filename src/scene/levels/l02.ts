// Fase 2 · Fortaleza à noite. Sete planos: céu com o clarão da cidade embaixo, nuvens acesas pela base,
// os prédios da Beira-Mar ao longe (frios, em névoa) com bairros de luzes de 1 px, o mar com reflexos
// em traços quebrados, a Ponte dos Ingleses com os postes acesos, o Farol do Mucuripe com o facho,
// jangadas de vela triangular em três quartos e o primeiro plano quase preto com coqueiros.
// Luz: clarão vermelho-laranja da cidade (base das nuvens, rim dos prédios), lua em eclipse à esquerda,
// lanterna do farol (prática, dourada). O meio fica vazio para a carta e o meteoro.
import {
  box3q,
  cityLights,
  clump,
  cumulus,
  fgFrame,
  haze,
  horizonGlow,
  stratus,
  streaks,
} from '../../games/fx-a'
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { bayer, dith, type K } from '../pal'

/** posições compartilhadas com o jogo (facho do farol vivo) */
export function anchors(W: number, H: number) {
  const mob = W < H
  const hz = Math.round(H * (mob ? 0.66 : 0.64))
  const farol = {
    x: Math.round(W * (mob ? 0.88 : 0.9)),
    base: hz + Math.round(H * 0.02),
    h: Math.round(H * (mob ? 0.12 : 0.22)),
  }
  return { mob, hz, farol, lamp: { x: farol.x, y: farol.base - farol.h - 2 } }
}

/** prédio da orla em três quartos, frio e baixo contraste quando longe */
function tower(c: Ctx, x: number, base: number, w: number, h: number, far: boolean, r: () => number) {
  const g = box3q(
    c.b,
    x,
    base,
    w,
    h,
    Math.max(2, Math.round(w * 0.35)),
    far ? ['dusk', 'hazeDark', 'hazeDark', 'haze'] : ['night', 'dusk', 'dusk', 'hazeDark'],
    far ? ['night', 'dusk', 'dusk'] : ['void', 'night', 'blood0'],
    null,
    false,
    far ? null : 'crimsonDeep',
  )
  // janelas: grade de pontos de 1 px, acesas em bairros (lição 7)
  for (let wy = g.fy + 2; wy < base - 1; wy += 2)
    for (let wx = g.fx + 1; wx < g.fx + w - 1; wx += 2) {
      const v = r()
      if (v < (far ? 0.55 : 0.5)) continue
      c.b.set(
        wx,
        wy,
        v > 0.97 ? 'sparkle' : v > 0.85 ? 'goldHi' : v > 0.7 ? 'gold' : far ? 'emberDark' : 'ember',
      )
    }
  if (h > 20 && r() < 0.6) c.b.set(g.fx + (w >> 1), g.fy - 1, 'redHot')
}

/** jangada de vela triangular em três quartos: face da vela clara do lado da lua, verso em sombra */
function jangada(c: Ctx, x: number, y: number, k: number) {
  const { b } = c
  const hh = Math.round(13 * k)
  const ww = Math.round(8 * k)
  // mastro
  for (let i = 0; i < hh + 1; i++) b.set(x, y - i, 'gold0')
  // vela: triângulo com a lateral grossa (verso) à direita, curva de vento
  for (let i = 0; i < hh; i++) {
    const t = i / hh
    const w = Math.max(1, Math.round(ww * (1 - t) + Math.sin(t * Math.PI) * k))
    for (let j = 1; j <= w; j++) {
      const lit = j < w * 0.6
      let col: K = lit ? (j < 2 ? 'stoneHi' : 'stone3') : 'stone1'
      if (i % 4 === 0 && j > 1) col = lit ? 'stone2' : 'stone0'
      if (j === w) col = 'crimsonDeep'
      b.set(x + j, y - 2 - i, col)
    }
  }
  // casco e reflexo partido
  const hw = Math.round(7 * k)
  b.rect(x - hw, y, hw * 2 + 2, Math.max(1, Math.round(k)), 'emberDark')
  b.rect(x - hw + 1, y + 1, hw * 2, 1, 'blood0')
  for (let i = 0; i < 4; i++)
    if (i % 2 === 0) b.rect(x - hw + 2 + i, y + 2 + i, hw * 2 - 4 - i * 2, 1, 'night')
  for (let i = 0; i < hh * 0.6; i += 2) b.set(x + 2 + (i % 3), y + 3 + i, i < 4 ? 'stone1' : 'stone0')
}

function farol(c: Ctx) {
  const A = anchors(c.W, c.H)
  const { b } = c
  const { x, base, h } = A.farol
  const w = Math.max(4, Math.round(h * 0.16))
  // morro do Mucuripe sob o farol
  for (let y = 0; y < h * 0.25; y++) {
    const half = Math.round(w * 1.4 + y * 2.2)
    for (let xx = -half; xx <= half; xx++)
      b.set(x + xx, base - Math.round(h * 0.25) + y, xx < -half + 2 ? 'hazeDark' : y < 1 ? 'dusk' : 'night')
  }
  const tb = base - Math.round(h * 0.25)
  // torre afinando, frente clara (lua), lateral grossa em sombra com rim vermelho do lado da cidade
  for (let y = 0; y < h * 0.75; y++) {
    const t = y / (h * 0.75)
    const half = Math.max(2, Math.round(w * (0.55 + 0.45 * t)))
    for (let xx = -half; xx <= half; xx++) {
      const u = (xx + half) / (half * 2)
      let col: K = u < 0.18 ? 'stoneHi' : u < 0.5 ? 'stone3' : u < 0.82 ? 'stone1' : 'stone0'
      if (u > 0.92) col = 'crimsonDeep'
      // faixas da torre
      if (Math.floor(y / Math.max(3, h * 0.12)) % 2 === 1 && u < 0.82)
        col = u < 0.5 ? 'crimson' : 'crimsonDeep'
      b.set(x + xx, tb - Math.round(h * 0.75) + y, col)
    }
  }
  // lanterna e galeria
  const ly = tb - Math.round(h * 0.75)
  b.rect(x - w, ly - 1, w * 2 + 1, 1, 'stone2')
  b.rect(x - w + 1, ly - 4, w * 2 - 1, 3, 'goldHi')
  b.rect(x - 1, ly - 4, 2, 2, 'white')
  b.rect(x - w + 2, ly - 6, w * 2 - 3, 2, 'stone1')
  b.set(x, ly - 7, 'stone2')
  // halo pontilhado em volta da lanterna
  for (let yy = -8; yy <= 4; yy++)
    for (let xx = -8; xx <= 8; xx++) {
      const d = Math.hypot(xx, yy * 1.3)
      if (d < w + 1 || d > 8) continue
      if (dith(x + xx, ly - 3 + yy, (1 - d / 8) * 0.8) && !b.get(x + xx, ly - 3 + yy))
        b.set(x + xx, ly - 3 + yy, 'gold1')
    }
}

/** Ponte dos Ingleses: tabuleiro escuro entrando no mar, pilares e postes acesos */
function ponte(c: Ctx, x0: number, x1: number, y: number) {
  const { b } = c
  for (let x = x0; x <= x1; x++) {
    b.set(x, y, 'stone1')
    b.set(x, y + 1, 'night')
    if ((x - x0) % 5 === 0) for (let k = 2; k < 7; k++) b.set(x, y + k, k < 4 ? 'dusk' : 'night')
    if ((x - x0) % 12 === 6) {
      b.set(x, y - 1, 'stone0')
      b.set(x, y - 2, 'stone0')
      b.set(x, y - 3, 'goldHi')
      streaks(c, x, y + 3, 9, 'gold', 2)
    }
  }
  b.set(x1, y, 'stone2')
}

const painter: Painter = (c) => {
  const { W, H, hz, b } = c
  const A = anchors(W, H)
  const mob = A.mob
  const r = mulberry32(202)
  sky(c, 'blood1', 0.8)
  horizonGlow(c, Math.round(H * 0.06), 'blood0', 'blood1')
  moon(c, W * (mob ? 0.2 : 0.16), H * (mob ? 0.13 : 0.17), c.s * (mob ? 4.6 : 4.2))
  // nuvens: base acesa pelo clarão da cidade (lição 6), duas camadas
  cumulus(c, hz - H * (mob ? 0.22 : 0.3), H * (mob ? 0.06 : 0.1), [[0.5, 1.08]], 5)
  stratus(
    c,
    [
      { x: -W * 0.05, y: hz - Math.round(H * 0.05), len: W * 0.42, th: 4, heat: 0.45 },
      { x: W * 0.3, y: hz - Math.round(H * 0.02), len: W * 0.35, th: 2, heat: 1 },
      { x: W * 0.62, y: hz - Math.round(H * 0.09), len: W * 0.3, th: 5, heat: 0.25 },
    ],
    9,
  )
  // plano 3: prédios da Beira-Mar ao longe (frios, em névoa) à direita
  const sx0 = Math.round(W * (mob ? 0.45 : 0.55))
  let x = sx0
  while (x < W) {
    const w = Math.round(4 + r() * (mob ? 6 : 9))
    const h = Math.round(H * (0.03 + r() ** 1.4 * (mob ? 0.06 : 0.11)) * Math.min(1, (x - sx0 + 20) / 60))
    tower(c, x, hz, w, h, true, r)
    x += w + Math.round(r() * 2)
  }
  haze(c, hz - H * 0.15, hz, 'dusk', 0.22)
  // plano 4: prédios mais perto, escuros e quentes, com rim vermelho do lado do clarão
  x = Math.round(W * (mob ? 0.58 : 0.66))
  while (x < W * 0.97) {
    const w = Math.round(5 + r() * (mob ? 7 : 10))
    const h = Math.round(H * (0.02 + r() ** 1.6 * (mob ? 0.05 : 0.09)))
    tower(c, x, hz + 1, w, h, false, r)
    x += w + 2 + Math.round(r() * 5)
  }
  cityLights(c, Math.round(W * 0.5), W, hz - 2, hz + 1, 2.2, 31)
  // plano 5: o mar, escuro, com faixas de brilho e reflexos em traços quebrados
  const sea1 = Math.round(H * (mob ? 0.86 : 0.88))
  for (let y = hz + 1; y < sea1; y++) {
    const t = (y - hz) / (sea1 - hz)
    for (let xx = 0; xx < W; xx++) {
      const n = c.nz.n2(xx / 13, y * 0.8)
      let k: K = t < 0.25 ? 'night' : 'void'
      if (n > 0.74 - t * 0.08) k = t < 0.35 ? 'blood0' : 'night'
      if (n > 0.86 && t < 0.6) k = 'blood1'
      if (y === hz + 1 && (xx >> 2) % 5) k = 'blood1'
      b.set(xx, y, k)
    }
  }
  for (let i = 0; i < W * 0.12; i++) {
    const lx = Math.round(W * 0.5 + r() * W * 0.5)
    streaks(c, lx, hz + 2, Math.round(4 + r() * (sea1 - hz) * 0.35), r() < 0.3 ? 'goldHi' : 'ember', 2)
  }
  // reflexo da lua (frio) e do farol
  streaks(c, Math.round(W * (mob ? 0.2 : 0.16)), hz + 3, Math.round((sea1 - hz) * 0.5), 'redGlow', 3)
  // plano 6: Ponte dos Ingleses à esquerda, jangadas, farol à direita
  ponte(c, 0, Math.round(W * (mob ? 0.34 : 0.28)), hz + Math.round(H * 0.035))
  jangada(c, Math.round(W * (mob ? 0.18 : 0.12)), Math.round(H * (mob ? 0.77 : 0.8)), mob ? 1 : 1.3)
  jangada(c, Math.round(W * (mob ? 0.46 : 0.38)), Math.round(hz + H * 0.06), mob ? 0.55 : 0.7)
  jangada(c, Math.round(W * (mob ? 0.7 : 0.78)), Math.round(H * (mob ? 0.8 : 0.82)), mob ? 0.85 : 1.1)
  farol(c)
  // areia da praia: escura, com espuma pontilhada na beira
  for (let y = sea1; y < H; y++)
    for (let xx = 0; xx < W; xx++) {
      const t = (y - sea1) / (H - sea1)
      let k: K = bayer(xx, y) < 0.18 - t * 0.3 ? 'gold0' : t < 0.2 ? 'blood0' : 'night'
      if (c.nz.n2(xx / 5, y / 2) > 0.7 && t < 0.5) k = 'blood1'
      if (t > 0.35) k = dith(xx, y, (t - 0.35) * 2) ? 'void' : 'night'
      b.set(xx, y, k)
    }
  for (let xx = 0; xx < W; xx++) {
    const w = Math.round(Math.sin(xx * 0.09) * 1.5)
    if ((xx >> 1) % 3 !== 0) b.set(xx, sea1 + w, xx % 5 === 0 ? 'stone3' : 'stone1')
  }
  calm(c, mob ? 0.5 : 0.48, mob ? 0.4 : 0.3, mob ? 0.16 : 0.24)
  // plano 7: coqueiros e mato quase pretos emoldurando (lições 5 e 10)
  fgFrame(c, 21, 'crimson', 'dusk', 0.2, mob ? 0.05 : 0.09)
  for (const [px, ph, dir] of [
    [0.04, mob ? 0.32 : 0.52, 1],
    [1.0, mob ? 0.25 : 0.4, -1],
  ] as const)
    coqueiro(c, Math.round(W * px), Math.round(H * ph), dir)
}

/** coqueiro de primeiro plano em silhueta quase preta: tronco grosso curvo, folhas em leque com rim */
function coqueiro(c: Ctx, bx: number, h: number, dir: number) {
  const { b, H } = c
  let tx = bx
  const tw = Math.max(3, Math.round(h / 22))
  for (let i = 0; i < h; i++) {
    tx = bx + Math.round(dir * Math.sin((i / h) * 1.3) * h * 0.2)
    const w = Math.max(2, Math.round(tw * (1 - (i / h) * 0.35)))
    for (let j = 0; j < w; j++) b.set(tx + j, H - i, j === (dir > 0 ? w - 1 : 0) && i % 3 ? 'blood0' : 'void')
    if (i % 4 === 0) b.set(tx + (dir > 0 ? w - 1 : 0), H - i, 'blood1')
  }
  const ty = H - h
  const fronds = 9
  for (let f = 0; f < fronds; f++) {
    const a = -Math.PI / 2 + ((f - (fronds - 1) / 2) / ((fronds - 1) / 2)) * 1.75
    const len = h * (0.36 + ((f * 7) % 3) * 0.05)
    for (let i = 0; i < len; i++) {
      const t = i / len
      const fx = tx + Math.cos(a) * i
      const fy = ty + Math.sin(a) * i + t * t * len * 0.55
      const th = Math.max(1, Math.round((1 - t) * 3))
      for (let k = 0; k < th; k++) b.set(fx, fy + k, 'void')
      // folíolos caindo
      if (t > 0.2 && i % 2 === 0)
        for (let k = 1; k < 3 + t * 3; k++)
          b.set(fx + (Math.cos(a) > 0 ? -1 : 1) * (k >> 1), fy + th + k, 'void')
      // rim vermelho no lado de cima das folhas que olham para a cidade
      if (Math.cos(a) * dir > 0.2 && t > 0.15 && t < 0.85 && i % 2 === 0) b.set(fx, fy - 1, 'crimsonDeep')
    }
  }
  clump(b, tx + 1, ty + 3, 3.5, ['void', 'void', 'blood0'], 7)
}

export default painter
