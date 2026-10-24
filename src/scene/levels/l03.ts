// Fase 3 · São Luís, a Praia Grande à noite. Sete planos: céu com brasa baixa, nuvens acesas pela base,
// as torres da Sé e os telhados do Centro Histórico ao longe (frios, em névoa) com luzes de 1 px,
// a fileira de sobrados do meio, os sobrados de azulejo em três quartos nas bordas (frente de azulejo,
// lateral grossa de reboco vermelho, sacadas de ferro, janelas em arco acesas), a ladeira de pedra com
// os lampiões e o primeiro plano quase preto. Luz: lampiões dourados (práticos), brasa da cidade
// (rim vermelho nas quinas), lua em eclipse no alto. O meio fica vazio para a calculadora.
import { box3q, cityLights, clump, cumulus, fgFrame, haze, horizonGlow, stratus } from '../../games/fx-a'
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { bayer, dith, type K } from '../pal'

/** posições compartilhadas com o jogo (lampiões vivos) */
export function anchors(W: number, H: number) {
  const mob = W < H
  const hz = Math.round(H * (mob ? 0.66 : 0.64))
  const street = Math.round(H * (mob ? 0.86 : 0.84))
  const lamps = (mob ? [0.06, 0.94] : [0.05, 0.3, 0.7, 0.95]).map((f) => ({
    x: Math.round(W * f),
    y: street - Math.round(H * (mob ? 0.075 : 0.13)),
  }))
  return { mob, hz, street, lamps }
}

/** azulejo português: quadrado de 4×4 com motivo em cruz; `lit` 0..1 clareia perto da luz */
function azulejo(x: number, y: number, lit: number): K {
  const u = x & 3
  const v = y & 3
  const motif = (u === 1 || u === 2) && (v === 1 || v === 2) ? 2 : u === 0 || v === 0 ? 0 : 1
  const l = lit + (bayer(x, y) - 0.5) * 0.3
  if (motif === 0) return l > 0.6 ? 'stone1' : 'stone0'
  if (motif === 2) return l > 0.55 ? 'blue1' : l > 0.25 ? 'blue0' : 'night'
  return l > 0.7 ? 'stone2' : l > 0.35 ? 'blue0' : 'night'
}

/** sobrado colonial em três quartos: azulejo na frente, reboco vermelho na lateral grossa, telhado e sacadas */
function sobrado(
  c: Ctx,
  x: number,
  base: number,
  w: number,
  h: number,
  sideRight: boolean,
  seed: number,
  near: boolean,
) {
  const { b } = c
  const depth = Math.max(3, Math.round(w * (near ? 0.2 : 0.16)))
  const g = box3q(
    b,
    x,
    base,
    w,
    h,
    depth,
    ['night', 'dusk', 'dusk', 'hazeDark'],
    near ? ['void', 'blood0', 'blood1', 'crimsonDeep'] : ['void', 'night', 'blood0'],
    null,
    sideRight,
    near ? 'redHot' : null,
  )
  const r = mulberry32(seed)
  // azulejos na frente, mais claros perto do chão (luz dos lampiões vem de baixo)
  if (near)
    for (let yy = g.fy + 2; yy < base - 1; yy++)
      for (let xx = g.fx + 1; xx < g.fx + w - 1; xx++)
        b.set(xx, yy, azulejo(xx, yy, ((yy - g.fy) / h) * 0.65))
  // cornija e beiral do telhado
  b.rect(g.fx - 1, g.fy, w + 2, 1, near ? 'stone3' : 'stone1')
  b.rect(g.fx - 1, g.fy + 1, w + 2, 1, 'night')
  const roofH = Math.max(2, Math.round(h * 0.12))
  for (let i = 0; i < roofH; i++) {
    const inset = Math.round(i * 1.4)
    for (let xx = g.fx + inset; xx < g.fx + w - inset + depth; xx++)
      b.set(xx, g.fy - 1 - i, i === roofH - 1 ? 'crimson' : (xx + i) % 3 === 0 ? 'blood1' : 'crimsonDeep')
  }
  // janelas em arco, 2 ou 3 andares, com sacada de ferro no andar de cima
  const floors = h > 40 ? 3 : 2
  const fh = Math.floor((h - 4) / floors)
  const ww = Math.max(2, Math.round(w * 0.14))
  const cols = Math.max(2, Math.floor((w - 2) / (ww + Math.max(2, Math.round(ww * 0.9)))))
  const gap = (w - cols * ww) / (cols + 1)
  for (let f = 0; f < floors; f++) {
    const wy = g.fy + 3 + f * fh + Math.round(fh * 0.15)
    const wh = Math.max(3, Math.round(fh * 0.6))
    for (let k = 0; k < cols; k++) {
      const wx = Math.round(g.fx + gap + k * (ww + gap))
      const lit = r() < (near ? 0.4 : 0.3)
      for (let yy = 0; yy < wh; yy++)
        for (let xx = 0; xx < ww; xx++) {
          if (yy === 0 && (xx === 0 || xx === ww - 1) && ww > 2) continue
          let k2: K = lit ? (yy < wh * 0.4 && xx < ww * 0.6 ? 'goldHi' : 'gold') : 'void'
          if (lit && xx === ww >> 1) k2 = 'gold1'
          if (!lit && near && yy > 1 && xx === 0) k2 = 'night'
          b.set(wx + xx, wy + yy, k2)
        }
      // moldura de pedra e peitoril
      b.rect(wx - 1, wy + wh, ww + 2, 1, near ? 'stone2' : 'stone0')
      if (near && f === 0) {
        // sacada de ferro: guarda-corpo com balaústres
        b.rect(wx - 2, wy + wh + 1, ww + 4, 1, 'void')
        for (let xx = wx - 2; xx < wx + ww + 2; xx += 2) b.set(xx, wy + wh - 1, 'void')
        b.rect(wx - 2, wy + wh - 2, ww + 4, 1, 'void')
      }
      if (lit && near)
        for (let yy = 1; yy < 4; yy++)
          for (let xx = -1; xx <= ww; xx++)
            if (dith(wx + xx, wy + wh + yy, 0.45 - yy * 0.12)) b.set(wx + xx, wy + wh + yy, 'gold1')
    }
  }
  // porta grande no térreo
  const dw = Math.max(3, Math.round(w * 0.2))
  const dx = g.fx + Math.round((w - dw) / 2)
  b.rect(dx, base - Math.round(h * 0.22), dw, Math.round(h * 0.22), 'void')
  b.rect(dx - 1, base - Math.round(h * 0.22) - 1, dw + 2, 1, near ? 'stone3' : 'stone1')
}

/** torres da Igreja da Sé em silhueta fria ao longe */
function se(c: Ctx, x: number, base: number, h: number) {
  const { b } = c
  const tw = Math.max(4, Math.round(h * 0.22))
  for (const dx of [-tw - 2, tw + 2]) {
    b.rect(x + dx - (tw >> 1), base - h, tw, h, 'hazeDark')
    b.rect(x + dx - (tw >> 1), base - h, 1, h, 'haze')
    // cúpula em bulbo e cruz
    for (let i = 0; i < tw; i++)
      b.rect(x + dx - (tw >> 1) + (i >> 1), base - h - 1 - i * 0.6, tw - i, 1, 'hazeDark')
    b.rect(x + dx, base - h - tw - 3, 1, 3, 'haze')
    b.set(x + dx - 1, base - h - tw - 2, 'haze')
    b.set(x + dx + 1, base - h - tw - 2, 'haze')
    b.set(x + dx, base - Math.round(h * 0.6), 'gold1')
  }
  b.rect(x - tw - 2, base - Math.round(h * 0.55), tw * 2 + 4, Math.round(h * 0.55), 'hazeDark')
  // rosácea acesa
  b.set(x, base - Math.round(h * 0.4), 'gold')
  b.set(x, base - Math.round(h * 0.4) - 1, 'gold1')
}

function lampiao(c: Ctx, x: number, street: number, h: number) {
  const { b } = c
  b.rect(x, street - h, 1, h, 'void')
  b.rect(x - 1, street - 1, 3, 1, 'void')
  b.rect(x - 2, street - h - 3, 5, 3, 'void')
  b.rect(x - 1, street - h - 2, 3, 2, 'goldHi')
  b.set(x, street - h - 2, 'white')
  b.set(x, street - h - 4, 'void')
  // poça de luz no chão de pedra
  for (let yy = -2; yy < 6; yy++)
    for (let xx = -14; xx <= 14; xx++) {
      const d = Math.hypot(xx / 14, yy / 5)
      if (d > 1) continue
      const y = street + yy
      if (!b.get(x + xx, y)) continue
      if (dith(x + xx, y, (1 - d) * 0.8)) b.set(x + xx, y, d < 0.4 ? 'gold1' : 'gold0')
    }
}

const painter: Painter = (c) => {
  const { W, H, hz, b } = c
  const A = anchors(W, H)
  const mob = A.mob
  const r = mulberry32(303)
  sky(c, 'blood1', 0.8)
  horizonGlow(c, Math.round(H * 0.05), 'blood0', 'blood1')
  moon(c, W * (mob ? 0.8 : 0.84), H * (mob ? 0.11 : 0.15), c.s * (mob ? 4.4 : 4.2))
  cumulus(c, hz - H * (mob ? 0.3 : 0.36), H * (mob ? 0.06 : 0.09), [[-0.08, mob ? 0.45 : 0.32]], 7)
  stratus(
    c,
    [
      { x: W * 0.5, y: hz - Math.round(H * 0.16), len: W * 0.5, th: 4, heat: 0.4 },
      { x: W * 0.1, y: hz - Math.round(H * 0.12), len: W * 0.4, th: 3, heat: 0.7 },
    ],
    11,
  )
  // plano 3: a Sé e telhados ao longe, frios
  se(c, Math.round(W * (mob ? 0.3 : 0.24)), hz - Math.round(H * 0.06), Math.round(H * (mob ? 0.09 : 0.14)))
  let x = 0
  while (x < W) {
    const w = Math.round(6 + r() * 10)
    const h = Math.round(H * (0.04 + r() * 0.04))
    const base = hz - Math.round(H * 0.04)
    b.rect(x, base - h, w, h + Math.round(H * 0.04), 'dusk')
    for (let i = 0; i < 3; i++) b.rect(x + i, base - h - i, w - i * 2, 1, i === 2 ? 'hazeDark' : 'dusk')
    x += w + Math.round(r() * 2)
  }
  cityLights(c, 0, W, hz - Math.round(H * 0.07), hz - Math.round(H * 0.035), 1.4, 33)
  haze(c, hz - H * 0.18, hz - H * 0.03, 'hazeDark', 0.3)
  // plano 4: fileira de sobrados do meio (escuros, poucos detalhes)
  x = -4
  while (x < W) {
    const w = Math.round(W * (mob ? 0.2 : 0.11) * (0.8 + r() * 0.4))
    const h = Math.round(H * (mob ? 0.11 : 0.18) * (0.8 + r() * 0.3))
    sobrado(c, x, A.street - Math.round(H * 0.03), w, h, x > W / 2, Math.floor(r() * 1e6), false)
    x += w + Math.round(w * 0.25)
  }
  // plano 6: ladeira de pedra (pé de moleque) com reflexos dos lampiões
  for (let y = A.street - Math.round(H * 0.03); y < H; y++) {
    const t = (y - A.street) / (H - A.street)
    for (let xx = 0; xx < W; xx++) {
      const row = Math.floor((y - A.street) / 2)
      const sx = (xx + (row % 2) * 2) % 5
      let k: K = sx === 0 || (y - A.street) % 2 === 0 ? 'void' : 'night'
      if (k === 'night' && c.nz.n2(xx / 3, y / 2) > 0.7) k = 'stone0'
      if (t > 0.5 && dith(xx, y, (t - 0.5) * 1.4)) k = 'void'
      b.set(xx, y, k)
    }
  }
  // plano 5: sobrados de azulejo em três quartos nas bordas (o marco do lugar)
  const nw = Math.round(W * (mob ? 0.34 : 0.2))
  const nh = Math.round(H * (mob ? 0.2 : 0.42))
  sobrado(c, -Math.round(nw * 0.25), A.street, nw, nh, true, 5, true)
  sobrado(
    c,
    W - nw + Math.round(nw * 0.2) - Math.max(3, Math.round(nw * 0.35)),
    A.street,
    nw,
    nh,
    false,
    9,
    true,
  )
  if (!mob) {
    sobrado(c, Math.round(W * 0.18), A.street + 2, Math.round(nw * 0.7), Math.round(nh * 0.7), true, 13, true)
    sobrado(
      c,
      Math.round(W * 0.68),
      A.street + 2,
      Math.round(nw * 0.7),
      Math.round(nh * 0.7),
      false,
      17,
      true,
    )
  }
  for (const l of A.lamps) lampiao(c, l.x, A.street + 2, A.street + 2 - l.y)
  // plantas nas sacadas e musgo escorrendo (lição 10)
  for (let i = 0; i < 6; i++)
    clump(b, r() * W, A.street - nh * (0.3 + r() * 0.5), 2.5, ['vine0', 'vine1', 'green'], 40 + i, 'crimson')
  calm(c, mob ? 0.45 : 0.48, mob ? 0.42 : 0.24, mob ? 0.3 : 0.32)
  fgFrame(c, 31, 'crimson', 'dusk', 0.18, mob ? 0.04 : 0.08)
}

export default painter
