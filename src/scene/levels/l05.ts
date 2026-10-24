// Fase 5 · Manaus: o Teatro Amazonas (cúpula de escamas verde, ouro e azul) à esquerda, a Ponte Rio Negro
// (pilono em arco com estais) à direita, a cidade em luzes de 1 px na margem e o Rio Negro embaixo.
// O prédio do jogo ocupa o centro: os marcos ficam nas bordas e o miolo fica escuro.
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { DARKER, type K } from '../pal'
import {
  bird,
  box3q,
  city,
  cumulus,
  fgFrame,
  halo,
  horizonWater,
  palmSil,
  range,
  reflect,
  river,
  star4,
  stratus,
} from './b-kit'

/** Teatro Amazonas em três quartos: corpo rosado sob a luz vermelha, colunata clara, cúpula de escamas */
function teatro(c: Ctx, cx: number, base: number, k: number) {
  const { b } = c
  const w = Math.round(k * 26)
  const h = Math.round(k * 10)
  const x0 = Math.round(cx - w / 2)
  // corpo: frente rosada (crimson/redGlow) e lateral grossa sangue à esquerda (lado da sombra)
  box3q(c, {
    x: x0,
    base,
    w,
    h,
    d: Math.max(3, Math.round(k * 4)),
    dir: -1,
    front: ['blood1', 'crimsonDeep', 'crimson', 'redGlow'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    roof: 'stone2',
    rim: 'blood1',
  })
  // frontão central com colunata clara e escadaria
  const pw = Math.round(k * 10)
  const px = Math.round(cx - pw / 2)
  const ph = Math.round(k * 3)
  b.rect(px, base - h - ph, pw, ph + h, 'crimsonDeep')
  for (let i = 0; i < ph; i++)
    b.rect(px + i, base - h - ph - i, pw - i * 2, 1, i === ph - 1 ? 'stoneHi' : 'stone3')
  for (let x = px + 1; x < px + pw - 1; x += 2) {
    b.rect(x, base - h - 1, 1, h - 1, 'stone3')
    b.set(x, base - h - 1, 'stoneHi')
  }
  b.rect(px - 1, base - h - 1, pw + 2, 1, 'stoneHi')
  for (let i = 0; i < 3; i++) b.rect(px - 2 - i, base - 1 - i, pw + 4 + i * 2, 1, i ? 'stone2' : 'stone3')
  // janelas do corpo acesas em 1 px
  for (let x = x0 + 2; x < x0 + w - 2; x += 3) {
    if (x > px - 2 && x < px + pw + 1) continue
    b.set(x, base - h + 3, (x * 7) % 5 < 3 ? 'goldHi' : 'gold1')
    b.set(x, base - h + 6, (x * 3) % 4 < 2 ? 'gold' : 'emberDark')
  }
  // tambor e cúpula de escamas (verde, ouro, azul) com luz da esquerda e rim vermelho à direita
  const R = Math.round(k * 7)
  const dy = base - h - ph - Math.round(k * 2)
  b.rect(Math.round(cx - R * 0.8), dy, Math.round(R * 1.6), Math.round(k * 2), 'stone2')
  b.rect(Math.round(cx - R * 0.8), dy, Math.round(R * 1.6), 1, 'stoneHi')
  for (let x = Math.round(cx - R * 0.8) + 1; x < cx + R * 0.8 - 1; x += 2) b.set(x, dy + 1, 'gold1')
  for (let y = -R; y <= 0; y++)
    for (let x = -R; x <= R; x++) {
      const q = (x * x) / (R * R) + (y * y) / (R * R * 1.15)
      if (q > 1) continue
      const row = Math.floor((y + R) / 2)
      const sc = Math.floor((x + R + (row % 2)) / 2) + row
      let kk: K = sc % 3 === 0 ? 'gold' : sc % 3 === 1 ? 'green' : 'blue1'
      const lit = -x / R - y / R
      if (lit < -0.2) kk = DARKER[kk]
      if (lit > 0.9 && kk === 'gold') kk = 'goldHi'
      if ((x + y) % 2 === 0 && (y + R) % 2 === 0) kk = DARKER[kk]
      if (q > 0.82 && x > R * 0.3) kk = 'redHot'
      b.set(cx + x, dy + y, kk)
    }
  // lanterna com luz própria
  const ly = dy - Math.round(R * 1.07)
  b.rect(cx - 1, ly - 3, 3, 3, 'stone3')
  b.set(cx, ly - 4, 'goldHi')
  b.set(cx, ly - 5, 'sparkle')
  halo(c, cx, ly - 4, Math.round(k * 4), 'gold1', 0.35)
  star4(c, cx, ly - 5, 2)
}

/** Ponte Rio Negro: pilono em arco, estais em leque e tabuleiro com luzes */
function ponte(c: Ctx, px: number, deckY: number, k: number, x0: number, x1: number) {
  const { b } = c
  const ph = Math.round(k * 22)
  const pw = Math.round(k * 5)
  // tabuleiro
  b.rect(x0, deckY, x1 - x0, 2, 'stone1')
  b.rect(x0, deckY, x1 - x0, 1, 'stone2')
  for (let x = x0; x < x1; x += 4) b.set(x, deckY - 1, x % 8 ? 'gold1' : 'goldHi')
  // pernas em arco (parábola) com rim vermelho do lado de fora
  for (let i = 0; i <= ph; i++) {
    const t = i / ph
    const off = Math.round(pw * (1 - t * t) * 0.9 + 1)
    b.set(px - off, deckY - i, 'stone2')
    b.set(px - off - 1, deckY - i, 'stone1')
    b.set(px + off, deckY - i, 'stone2')
    b.set(px + off + 1, deckY - i, 'redHot')
  }
  b.rect(px - 1, deckY - ph - 3, 3, 4, 'stone3')
  b.set(px, deckY - ph - 4, 'redHot')
  halo(c, px, deckY - ph - 4, 3, 'crimson', 0.5)
  // estais em leque (pontilhados)
  for (let s = 1; s <= 7; s++) {
    const ay = deckY - ph + s
    for (const dir of [-1, 1]) {
      const ex = px + dir * Math.round(s * k * 4.5)
      if (ex < x0 - 4 || ex > x1 + 4) continue
      b.line(px + dir * 2, ay, ex, deckY - 1, s % 2 ? 'stone1' : 'haze', 2)
    }
  }
}

const paint: Painter = (c) => {
  const { W, H, hz, s } = c
  const portrait = W < H
  const r = mulberry32(505)
  // céu com estrelas raras (lição 14) e o clarão quente colado no horizonte
  sky(c, 'crimsonDeep', 0.6)
  moon(c, portrait ? W * 0.2 : W * 0.15, H * (portrait ? 0.12 : 0.16), s * (portrait ? 4.4 : 3.8))
  // cúmulos legíveis nas bordas (o miolo fica vazio) e estratos acesos colados no horizonte
  cumulus(
    c,
    [
      { x: 0.86, y: hz / H - 0.14, r: 0.055, n: 6 },
      { x: 0.1, y: hz / H - 0.2, r: 0.04, n: 5 },
    ],
    61,
  )
  stratus(
    c,
    [
      { x: 0, y: hz - Math.round(H * 0.025), len: W * 0.5, th: 3, heat: 0.9 },
      { x: W * 0.55, y: hz - Math.round(H * 0.045), len: W * 0.5, th: 4, heat: 0.6 },
      { x: W * 0.2, y: hz - Math.round(H * 0.08), len: W * 0.35, th: 5, heat: 0.3 },
    ],
    67,
  )
  // plano 6: mata da outra margem, com aro grená e névoa de brasa no pé
  range(c, hz, (x) => hz - s * 3 - c.nz.fbm(x / 18, 3, 3) * s * 4, 'hazeDark', 'crimsonDeep', 'blood1')
  // planos 5 e 4: a cidade na margem em duas fileiras (longe e meio), luzes de 1 px
  city(c, 0, W, () => hz - s, s * 2, s * 7, 'far', 71, 0.15)
  city(c, 0, W, () => hz + 1, s, s * 4, 'mid', 73, 0.35)
  // plano 3: faixa de água acesa no horizonte (a mais clara do meio) e o Rio Negro escuro
  const ry1 = Math.round(H * 0.86)
  const band = Math.max(3, Math.round(H * 0.045))
  horizonWater(c, hz + 2, band, 79)
  river(c, hz + 2 + band, ry1, 'blood1', 'night')
  // marcos nas bordas
  // no recorte do card de introdução (168×104, s = 1) o marco cresce para continuar legível
  const k = Math.max(s * (portrait ? 0.62 : 0.8), H < 160 ? 1.25 : 0)
  const tx = Math.round(portrait ? W * 0.09 : W * 0.15)
  const tBase = hz + Math.round(s * 1.5)
  teatro(c, tx, tBase, k)
  const pX = Math.round(portrait ? W * 0.93 : W * 0.86)
  ponte(c, pX, hz - Math.round(s * 1.5), k, Math.round(portrait ? W * 0.62 : W * 0.6), W)
  const lights: { x: number; k: K; len?: number }[] = [
    { x: tx, k: 'gold' },
    { x: tx + Math.round(k * 6), k: 'redGlow' },
    { x: pX, k: 'redHot' },
  ]
  for (let x = 6; x < W; x += Math.round(9 + r() * 14))
    lights.push({ x, k: r() < 0.6 ? 'gold1' : 'ember', len: 6 + Math.round(r() * 10) })
  reflect(c, hz + 2, ry1, lights)
  // barquinhos (recreios) parados com lanterna
  for (const bx of portrait ? [0.3] : [0.33, 0.7]) {
    const x = Math.round(W * bx)
    const y = Math.round(hz + (ry1 - hz) * 0.3)
    c.b.rect(x - s * 3, y, s * 6, Math.max(1, s - 1), 'night')
    c.b.rect(x - s * 2, y - s, s * 4, s, 'dusk')
    c.b.set(x - s * 2, y - s, 'goldHi')
    c.b.rect(x - s * 3, y + s, s * 6, 1, 'gold1')
  }
  // feixe da cúpula e gaivotas
  for (let i = 0; i < 3; i++)
    bird(c, W * (0.55 + i * 0.1), H * (0.2 + (i % 2) * 0.05), i ? 'stone1' : 'stone2', i % 2 === 0)
  // margem de cá: chão escuro e palmeiras em silhueta
  for (let y = ry1; y < H; y++)
    for (let x = 0; x < W; x++) c.b.set(x, y, c.nz.n2(x / 5, y / 2) > 0.78 ? 'night' : 'void')
  calm(c, 0.45, 0.3, 0.26)
  palmSil(c, Math.round(W * 0.03), H, Math.round(H * 0.22), 0.12, 'void', 'blood1')
  palmSil(c, Math.round(W * 0.96), H, Math.round(H * 0.18), -0.14, 'void', 'blood1')
  fgFrame(c, 5, { h: 0.1 })
  // estrela no topo da ponte (nó de energia)
  star4(c, pX, hz - Math.round(s * 1.5) - Math.round(k * 22) - 6, 2)
}

export default paint
