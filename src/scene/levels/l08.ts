// Fase 8 · O Julgamento, STF em Brasília. O Palácio do STF em três quartos (laje fina sobre as colunas em
// ponta de Niemeyer, vidro aceso atrás), a estátua da Justiça (sentada, olhos vendados, espada no colo)
// grande na borda, as torres do Congresso ao longe e a praça escura no meio para as cartas e a bancada.
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, clouds, moon, type Painter, sky } from '../levels'
import { DARKER, dith, type K } from '../pal'
import { bird, box3q, cityLights, fgFrame, fogBand, halo, reflect, star4 } from './b-kit'

/** Palácio do STF em três quartos: vidro recuado, colunas em ponta, laje com lateral grossa */
function stf(c: Ctx, x0: number, x1: number, base: number, k: number) {
  const { b } = c
  const h = Math.round(k * 11)
  const d = Math.max(3, Math.round(k * 5))
  const rise = Math.round(d * 0.45)
  // plataforma
  box3q(c, {
    x: x0 - 2,
    base: base + Math.round(k * 2),
    w: x1 - x0 + 4,
    h: Math.round(k * 2),
    d,
    front: ['stone0', 'stone1', 'stone2', 'stone3'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    roof: 'stone2',
    rim: 'red',
  })
  // caixa de vidro recuada com salas acesas em 1 px
  const gx0 = x0 + Math.round(k * 2)
  const gx1 = x1 - Math.round(k * 2)
  const r = mulberry32(88)
  for (let y = base - h + 2; y < base; y++)
    for (let x = gx0; x < gx1; x++) {
      let kk: K = (y - base) % 3 === 0 ? 'hazeDark' : 'night'
      if ((x - gx0) % 5 === 0) kk = 'dusk'
      b.set(x, y, kk)
    }
  for (let y = base - h + 3; y < base - 1; y += 3)
    for (let x = gx0 + 1; x < gx1; x += 2) if (r() < 0.32) b.set(x, y, r() < 0.2 ? 'goldHi' : r() < 0.6 ? 'gold' : 'gold1')
  // laje fina (cobertura) com lateral e chanfro
  box3q(c, {
    x: x0,
    base: base - h + 2,
    w: x1 - x0,
    h: Math.max(2, Math.round(k * 1.5)),
    d,
    front: ['stone2', 'stone3', 'stoneHi', 'white'],
    side: ['blood1', 'crimsonDeep', 'crimson'],
    roof: 'stone3',
    rim: 'redHot',
  })
  // colunas em ponta (finas em cima e embaixo, largas no meio), luz da esquerda
  const step = Math.max(6, Math.round(k * 6))
  for (let cx = x0 + Math.round(step / 2); cx < x1; cx += step) {
    for (let y = 0; y < h - 1; y++) {
      const t = y / (h - 2)
      const half = Math.round(Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.5 * k * 1.1)
      for (let xx = -half; xx <= half; xx++) {
        const kk: K = xx < 0 ? 'stoneHi' : xx === 0 ? 'stone3' : 'stone2'
        b.set(cx + xx, base - h + 2 + y, kk)
      }
      if (half > 0) b.set(cx + half + 1, base - h + 2 + y, 'void')
    }
    b.set(cx, base, 'stone3')
  }
  // brilho de luz de chão nas colunas (halo quente pontilhado na base)
  for (let x = x0; x < x1; x++) if (dith(x, base - 1, 0.35)) b.set(x, base - 1, 'gold1')
  void rise
}

/**
 * a Justiça (Ceschiatti), procedural em qualquer escala `u`: sentada, coque, venda nos olhos, espada
 * atravessada no colo. Cada forma é sombreada pela posição dentro dela (luz da esquerda), contorno
 * seletivo e rim vermelho no lado de fora.
 */
function justica(c: Ctx, cx: number, base: number, u: number, face: 1 | -1) {
  const { b } = c
  const pw = Math.round(u * 13)
  const ph = Math.round(u * 5)
  box3q(c, {
    x: cx - Math.round(pw / 2),
    base,
    w: pw,
    h: ph,
    d: Math.max(2, Math.round(u * 2)),
    dir: face,
    front: ['stone0', 'stone1', 'stone2', 'stone3'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    roof: 'stone2',
    rim: 'red',
  })
  const oy = base - ph
  const R = Math.ceil(u * 8)
  const T = Math.ceil(u * 21)
  const gw = R * 2 + 1
  const gh = T + 2
  // forma: [tipo, cx, cy, rx, ry] em unidades u (y para cima); tipo 0 elipse, 1 trapézio (rx base, ry topo)
  type Sh = [number, number, number, number, number, number?]
  const shapes: Sh[] = [
    [1, 0.6, 0, 4.6, 3.6, 7], // drapeado até os pés (trapézio: meia-largura embaixo, em cima, altura)
    [0, 1.2, 8, 5, 1.7], // colo
    [1, 0, 8, 3.1, 2.4, 6.2], // tronco
    [0, 0, 14.4, 3.2, 1.3], // ombros
    [0, 0.1, 17.4, 1.5, 1.9], // cabeça
    [0, -1.3, 18.2, 0.9, 0.9], // coque
    [0, -2.9, 11.6, 0.9, 2.8], // braço de trás
    [0, 2.4, 10.6, 0.9, 2.6], // braço da frente
  ]
  const mask = new Int8Array(gw * gh).fill(-1)
  const nxv = new Float32Array(gw * gh)
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      const X = (gx - R) / u
      const Y = (gh - 1 - gy) / u
      shapes.forEach(([t, scx, scy, a, bb, hh], i) => {
        let inside = false
        let n = 0
        if (t === 0) {
          const q = ((X - scx) / a) ** 2 + ((Y - scy) / bb) ** 2
          inside = q <= 1
          n = (X - scx) / a
        } else {
          const k = (Y - scy) / (hh ?? 1)
          if (k >= 0 && k <= 1) {
            const half = a + (bb - a) * k
            inside = Math.abs(X - scx) <= half
            n = (X - scx) / half
          }
        }
        if (inside) {
          mask[gy * gw + gx] = i
          nxv[gy * gw + gx] = n
        }
      })
    }
  const at = (gx: number, gy: number) => (gx < 0 || gy < 0 || gx >= gw || gy >= gh ? -1 : (mask[gy * gw + gx] ?? -1))
  const X0 = cx - R
  const Y0 = oy - gh
  const px = (gx: number) => (face > 0 ? X0 + gx : X0 + gw - 1 - gx)
  halo(c, cx, Y0 + Math.round(gh * 0.45), Math.round(u * 11), 'blood1', 0.22)
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      const m = at(gx, gy)
      if (m < 0) {
        // contorno seletivo: escuro embaixo/esquerda de quem está do lado da sombra
        if (at(gx - 1, gy) >= 0 || at(gx, gy - 1) >= 0) b.set(px(gx), Y0 + gy, 'stone0')
        continue
      }
      const n = (nxv[gy * gw + gx] ?? 0) + (at(gx, gy - 1) < 0 ? -0.5 : 0)
      let k: K = n < -0.45 ? 'stoneHi' : n < 0.1 ? 'stone3' : n < 0.6 ? 'stone2' : 'stone1'
      if (at(gx, gy + 1) !== m && at(gx, gy + 1) >= 0) k = 'stone1' // sombra de dobra entre formas
      if (at(gx + 1, gy) < 0) k = 'redHot'
      b.set(px(gx), Y0 + gy, k)
    }
  // venda nos olhos
  const vy = Y0 + gh - 1 - Math.round(17.6 * u)
  for (let gx = Math.round(R + (0.1 - 1.5) * u); gx <= Math.round(R + (0.1 + 1.5) * u); gx++)
    if (at(gx, vy - Y0) >= 0) b.set(px(gx), vy, 'stone0')
  // espada atravessada no colo, punho dourado
  const sy = Y0 + gh - 1 - Math.round(8.9 * u)
  for (let gx = Math.round(R - 6.5 * u); gx <= Math.round(R + 7.4 * u); gx++) {
    b.set(px(gx), sy, 'stoneHi')
    b.set(px(gx), sy + 1, 'stone1')
  }
  const hx = Math.round(R - 5.2 * u)
  for (let i = -1; i <= 1; i++) b.set(px(hx), sy + i, i ? 'gold' : 'goldHi')
  b.set(px(hx - 1), sy, 'gold1')
}

const paint: Painter = (c) => {
  const { W, H, hz, s } = c
  const portrait = W < H
  sky(c, 'blood1', 1)
  moon(c, portrait ? W * 0.78 : W * 0.86, H * (portrait ? 0.1 : 0.14), s * (portrait ? 3.8 : 3.4))
  clouds(c, hz - H * 0.15, H * 0.06, 'bottom', 1, 29, [
    [0, 0.4],
    [0.6, 1],
  ])
  fogBand(c, hz - Math.round(H * 0.09), hz, 'blood1', 0.5)
  // plano 6: cidade e as torres do Congresso ao longe (Praça dos Três Poderes)
  for (let x = 0; x < W; x++) {
    const hh = Math.round(s * (1 + c.nz.fbm(x / 8, 5, 3) * 2.5))
    for (let y = hz - hh; y < hz; y++) c.b.set(x, y, y === hz - hh ? 'haze' : 'hazeDark')
  }
  cityLights(c, 0, W, hz - s * 3, hz, 0.28, 113)
  const kx = Math.round(portrait ? W * 0.2 : W * 0.58)
  const th = Math.round(s * 13)
  for (const dx of [-s * 2, s]) {
    c.b.rect(kx + dx, hz - th, s, th, 'haze')
    c.b.rect(kx + dx, hz - th, 1, th, 'stone1')
  }
  c.b.rect(kx - s * 2, hz - Math.round(th * 0.62), s * 3 + 1, 1, 'haze')
  // praça: chão escuro com juntas em perspectiva
  for (let y = hz; y < H; y++) {
    const t = (y - hz) / (H - hz)
    for (let x = 0; x < W; x++) {
      let kk: K = t < 0.08 ? 'dusk' : t < 0.3 ? 'night' : 'void'
      if (Math.round(Math.sqrt(y - hz) * 2.2) % 5 === 0 && dith(x, y, 0.45 - t * 0.3)) kk = t < 0.4 ? 'hazeDark' : 'dusk'
      c.b.set(x, y, kk)
    }
  }
  // o Palácio
  const k = s * (portrait ? 0.62 : 0.8)
  const base = hz + Math.round(s * 4)
  if (portrait) stf(c, Math.round(W * 0.06), Math.round(W * 0.82), base, k)
  else stf(c, Math.round(W * 0.34), Math.round(W * 0.92), base, k)
  // espelho d'água na frente do STF com reflexos quebrados das colunas
  const sx0 = portrait ? Math.round(W * 0.06) : Math.round(W * 0.34)
  const sx1 = portrait ? Math.round(W * 0.82) : Math.round(W * 0.92)
  const wy = base + Math.round(k * 3)
  for (let y = wy; y < wy + Math.round(s * 3); y++)
    for (let x = sx0; x < sx1; x++) c.b.set(x, y, y === wy ? 'stone1' : 'night')
  const ls: { x: number; k: K; len: number }[] = []
  for (let x = sx0 + 3; x < sx1; x += Math.max(6, Math.round(k * 6))) ls.push({ x, k: 'stone2', len: Math.round(s * 3) })
  reflect(c, wy + 1, wy + Math.round(s * 3), ls)
  // a Justiça na borda (no celular, à direita; no desktop, à esquerda, grande)
  const u = s * (portrait ? 0.55 : 0.62)
  if (portrait) justica(c, Math.round(W * 0.83), Math.round(H * 0.78), u, -1)
  else justica(c, Math.round(W * 0.17), Math.round(H * 0.8), u, 1)
  for (let i = 0; i < 3; i++) bird(c, W * (0.35 + i * 0.12), H * (0.22 + (i % 2) * 0.04), 'stone1', i % 2 === 0)
  star4(c, portrait ? Math.round(W * 0.83) : Math.round(W * 0.17), Math.round(H * (portrait ? 0.78 : 0.8) - u * 28), 2)
  calm(c, 0.42, 0.3, 0.24)
  fgFrame(c, 8, { h: 0.08 })
}

export default paint
