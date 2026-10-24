// Fase 10 · Raio-X, Aeroporto de Guarulhos. 7 planos: céu com estratos e cúmulos de base acesa ·
// Cantareira ao longe (hazeDark, névoa blood1) · cidade em fileiras · terminal em três quartos com a
// fachada de vidro acesa · torre de controle (marco com a cabine azul e o farol vermelho) · pista com
// luzes de borda em perspectiva e um avião em três quartos com faróis acesos · pátio escuro e cercas no
// primeiro plano. O meio (esteira e scanner) fica escuro; o detalhe vai para o horizonte e as bordas.
import { mulberry32 } from '../../lib/rng'
import { type Ctx, moon, type Painter, sky } from '../levels'
import { dith, type K } from '../pal'
import { beam, box3, city, cumulus, frameFg, halo, hills, star, stratus } from './c-kit'

/** torre de controle: fuste em três quartos, cabine de vidro azul acesa, antena com farol vermelho */
function torre(c: Ctx, x: number, base: number, k: number) {
  const { b } = c
  const h = Math.round(k * 30)
  const w = Math.max(3, Math.round(k * 3))
  box3(c, {
    x: x - Math.round(w / 2),
    base,
    w,
    h,
    d: Math.max(1, Math.round(k * 1.2)),
    front: ['stone0', 'stone1', 'stone2', 'stone3'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    rim: 'crimson',
  })
  // cabine: trapézio mais largo em cima, vidro em 2 tons de azul com reflexo
  const cw = Math.round(k * 9)
  const ch = Math.round(k * 4)
  const cy = base - h - ch
  for (let i = 0; i < ch; i++) {
    const ww = cw - Math.round(((ch - i) / ch) * k * 2)
    const x0 = x - Math.round(ww / 2)
    for (let xx = 0; xx < ww; xx++) {
      const kk: K =
        xx < ww * 0.62 ? (i === 0 ? 'blue1' : dith(x0 + xx, cy + i, 0.35) ? 'blue1' : 'blue0') : 'night'
      b.set(x0 + xx, cy + i, kk)
    }
    b.set(x0 + ww, cy + i, 'redHot')
  }
  b.rect(x - Math.round(cw / 2) - 1, cy - 1, cw + 2, 1, 'stone2')
  b.rect(x - Math.round(cw / 2) - 1, cy + ch, cw + 2, 1, 'stone1')
  halo(c, x, cy + ch / 2, Math.round(k * 7), 'blue0', 0.3)
  // antena e farol
  b.rect(x, cy - Math.round(k * 5), 1, Math.round(k * 5), 'stone1')
  b.set(x, cy - Math.round(k * 5) - 1, 'redHot')
  halo(c, x, cy - Math.round(k * 5) - 1, 3, 'crimson', 0.5)
}

/** avião em três quartos: fuselagem osso, barriga e lateral escura, cauda vermelha, janelas acesas */
function aviao(c: Ctx, x: number, y: number, k: number, lit: boolean) {
  const { b } = c
  const L = Math.round(k * 34)
  const T = Math.max(3, Math.round(k * 4))
  // asa de trás (escura) e da frente (osso com chanfro)
  for (let i = 0; i < Math.round(k * 10); i++) {
    b.rect(
      x + Math.round(L * 0.42) + i,
      y - T + 1 - Math.round(i * 0.45),
      Math.max(1, Math.round(k * 3)),
      1,
      'stone0',
    )
    b.rect(
      x + Math.round(L * 0.36) - i,
      y + 1 + Math.round(i * 0.55),
      Math.max(2, Math.round(k * 5)),
      1,
      i === 0 ? 'stoneHi' : 'stone2',
    )
  }
  for (let i = 0; i < L; i++) {
    const t = i / L
    const nose = t < 0.08 ? (t / 0.08) ** 0.6 : t > 0.9 ? 1 - (t - 0.9) / 0.14 : 1
    const hh = Math.max(1, Math.round(T * nose))
    for (let j = 0; j < hh; j++) {
      const kk: K = j === 0 ? 'stoneHi' : j < hh * 0.55 ? 'stone3' : j < hh - 1 ? 'stone2' : 'blood1'
      b.set(x + i, y - Math.round(hh / 2) + j, kk)
    }
  }
  // janelas
  for (let i = Math.round(L * 0.12); i < L * 0.86; i += 2) b.set(x + i, y - 1, lit ? 'goldHi' : 'gold1')
  b.rect(x + 1, y - 1, 2, 1, 'blue0')
  // cauda vermelha (lateral grossa da ref) e farol
  const tx = x + L - Math.round(k * 5)
  for (let i = 0; i < Math.round(k * 8); i++)
    b.rect(
      tx + Math.round(i * 0.5),
      y - T / 2 - i,
      Math.max(2, Math.round(k * 4) - Math.round(i * 0.3)),
      1,
      i % 3 ? 'red' : 'crimson',
    )
  b.set(tx + Math.round(k * 4), y - T / 2 - Math.round(k * 8), 'redHot')
  if (lit) {
    // farol de pouso: feixe pontilhado para a frente
    for (let i = 1; i < k * 18; i++)
      for (let j = -Math.round(i * 0.15); j <= Math.round(i * 0.15); j++)
        if (dith(x - i, y + j, 0.42 - i / (k * 45))) b.set(x - i, y + j, i < 4 ? 'sparkle' : 'goldHi')
    b.set(x, y, 'white')
  }
}

const clampT = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v) ** (1 / 1.6)

const p10: Painter = (c) => {
  const { W, H, s } = c
  const portrait = W < H
  const hz = Math.round(H * (portrait ? 0.4 : 0.5))
  const r = mulberry32(1010)
  const u = portrait ? s * 0.8 : s
  // 1 · céu com estratos colados no horizonte e cúmulos de base acesa
  sky({ ...c, hz }, 'crimsonDeep', 0.6)
  moon(c, W * 0.2, H * (portrait ? 0.12 : 0.16), s * (portrait ? 3.4 : 4.5))
  cumulus(c, W * 0.5, W * 1.05, hz - H * (portrait ? 0.16 : 0.22), H * 0.09, 101, 6)
  stratus(
    c,
    [
      { x: 0, y: hz - Math.round(u * 2), len: W * 0.6, th: 2, heat: 0.95 },
      { x: W * 0.45, y: hz - Math.round(u * 5), len: W * 0.5, th: 3, heat: 0.55 },
    ],
    102,
  )
  // 2 · serra da Cantareira ao longe e cidade em fileiras
  hills(c, (x) => hz - u * 4 - c.nz.fbm(x / 34, 2, 3) * u * 6, hz, 'hazeDark', 'crimsonDeep', 'blood1')
  city(c, 0, W, () => hz, u * 1, u * 4, 'far', 103, 0.25)
  city(c, 0, W * 0.4, () => hz + 1, u * 1, u * 3, 'mid', 104, 0.3)
  // 3 · terminal em três quartos com a fachada de vidro acesa
  const tx = Math.round(W * (portrait ? 0.02 : 0.04))
  box3(c, {
    x: tx,
    base: hz + Math.round(u * 3),
    w: Math.round(W * (portrait ? 0.38 : 0.3)),
    h: Math.round(u * 8),
    d: Math.round(u * 3),
    front: ['night', 'dusk', 'hazeDark', 'stone1'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    roof: 'stone1',
    rim: 'redHot',
    win: { rate: 0.6, sx: 2, sy: 2, seed: 105 },
  })
  // 4 · torre de controle (marco)
  torre(c, Math.round(W * (portrait ? 0.84 : 0.88)), hz + Math.round(u * 2), u * (portrait ? 0.9 : 0.75))
  // 5 · pátio e pista: asfalto escuro, luzes de borda azuis em perspectiva e luzes de aproximação
  for (let y = hz + 1; y < H; y++)
    for (let x = 0; x < W; x++)
      c.b.set(x, y, y > hz + Math.round(u * 3) && c.nz.n2(x / 7, y / 2) > 0.8 ? 'dusk' : 'night')
  // pista em diagonal: nasce no canto de baixo à esquerda e some no horizonte à direita (centro livre)
  const vx = Math.round(W * 0.78)
  const yEnd = Math.round(H * 0.92)
  for (let y = hz + 3; y < yEnd; y++) {
    const t = clampT((y - hz - 3) / (yEnd - hz - 3))
    const cxr = vx - t * W * 0.95
    const sp = 2 + t * W * 0.16
    for (let x = Math.round(cxr - sp + 1); x < cxr + sp; x++) c.b.set(x, y, 'void')
    if (y % 6 < 3) c.b.rect(Math.round(cxr), y, Math.max(1, Math.round(t * 3)), 1, 'stone0')
  }
  for (let i = 0; i < 30; i++) {
    const t = (i / 29) ** 1.6
    const y = Math.round(hz + 3 + t * (H * 0.92 - hz - 3))
    const cxr = vx - t * W * 0.95
    const spread = 2 + t * W * 0.16
    for (const side of [-1, 1]) {
      const x = Math.round(cxr + side * spread)
      c.b.set(x, y, i % 4 === 0 ? 'sparkle' : 'blue1')
      if (t > 0.35) c.b.set(x + 1, y, 'blue0')
    }
  }
  for (let i = 0; i < 6; i++) c.b.set(vx - 3 + i, hz + 2, i % 2 ? 'redHot' : 'sparkle')
  // avião estacionado em três quartos e um decolando ao longe
  aviao(c, Math.round(W * (portrait ? 0.48 : 0.56)), hz + Math.round(u * 5), u * 0.7, false)
  aviao(c, Math.round(W * 0.12), Math.round(hz - H * 0.12), u * 0.32, true)
  // 6 · feixes finos dos holofotes do pátio e estrela no nó
  beam(c, Math.round(W * 0.95), hz - H * 0.16, hz, 'crimson')
  star(c, Math.round(W * 0.95), Math.round(hz - H * 0.16), 2)
  // centro calmo onde ficam a esteira e o scanner
  // 7 · cercas e primeiro plano quase preto
  const fy = Math.round(H * 0.9)
  for (let x = 0; x < W; x += 6) c.b.rect(x, fy - Math.round(u * 4), 1, Math.round(u * 4), 'void')
  c.b.rect(0, fy - Math.round(u * 4), W, 1, 'void')
  for (let i = 0; i < 8; i++) c.b.set(Math.round(r() * W), fy - Math.round(u * 4) - 1, 'blood1')
  frameFg(c, 1011, { h: 0.1, glowY: H * 0.5, leaves: !portrait })
}

export default p10
