// Fase 6 · Porto Velho: a escola em três quartos com o sino e a bandeira, as Três Caixas d'Água
// (o símbolo da cidade) à esquerda e a locomotiva da Madeira-Mamoré à direita, mata e Rio Madeira ao fundo.
// As duas pistas do ritmo passam por cima: marcos nas bordas e na faixa entre as pistas, miolo calmo.
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { DARKER, dith, type K } from '../pal'
import { bird, box3q, city, cumulus, fgFrame, halo, range, reflect, river, star4, stratus } from './b-kit'

/** caixa d'água: cilindro em pernas, luz da esquerda, rim vermelho à direita, faixa clara no topo */
function tank(c: Ctx, cx: number, base: number, k: number, hgt: number) {
  const { b } = c
  const rw = Math.max(3, Math.round(k * 3.4))
  const ch = Math.round(k * 6)
  const top = base - hgt
  // pernas e travas em X
  for (const dx of [-rw + 1, rw - 1]) b.rect(cx + dx, top + ch, 1, hgt - ch, 'stone1')
  for (let y = top + ch + 2; y < base - 2; y += Math.max(4, Math.round(k * 4)))
    b.line(cx - rw + 1, y, cx + rw - 1, y + Math.max(3, Math.round(k * 3)), 'stone0')
  // cilindro
  for (let y = 0; y < ch; y++)
    for (let x = -rw; x <= rw; x++) {
      const u = x / rw
      let kk: K = u < -0.55 ? 'stone3' : u < 0.1 ? 'stone2' : u < 0.7 ? 'stone1' : 'stone0'
      if (u > 0.85) kk = 'redHot'
      if (y === 0 || y === ch - 1) kk = u < 0.3 ? 'stoneHi' : 'stone2'
      if (y === Math.round(ch / 2) && u < 0.7) kk = DARKER[kk]
      b.set(cx + x, top + y, kk)
    }
  // tampa cônica
  for (let i = 0; i < Math.max(2, Math.round(k * 1.6)); i++)
    b.rect(cx - rw + i * 2, top - 1 - i, rw * 2 + 1 - i * 4, 1, i ? 'stone2' : 'stone3')
  b.set(cx, top - Math.round(k * 2) - 1, 'redHot')
}

/** locomotiva a vapor em silhueta quente (Madeira-Mamoré), virada para a esquerda */
function loco(c: Ctx, x: number, base: number, k: number) {
  const { b } = c
  const L = Math.round(k * 16)
  const bh = Math.round(k * 4)
  // trilho
  b.rect(x - L, base, L * 2 + 4, 1, 'stone1')
  for (let i = x - L; i < x + L + 4; i += 3) b.set(i, base + 1, 'gold0')
  // caldeira
  for (let y = 0; y < bh; y++)
    b.rect(
      x - L + Math.round(k * 2),
      base - Math.round(k * 3) - bh + y,
      Math.round(L * 1.1),
      1,
      y === 0 ? 'stone2' : y === 1 ? 'stone1' : 'stone0',
    )
  // cabine
  const cab = x - L + Math.round(k * 2) + Math.round(L * 1.1)
  b.rect(cab, base - Math.round(k * 10), Math.round(k * 6), Math.round(k * 7), 'blood1')
  b.rect(cab, base - Math.round(k * 10), Math.round(k * 6), 1, 'crimson')
  b.rect(cab - 1, base - Math.round(k * 11), Math.round(k * 6) + 2, 1, 'stone1')
  b.rect(
    cab + 1,
    base - Math.round(k * 8),
    Math.max(2, Math.round(k * 2)),
    Math.max(2, Math.round(k * 2)),
    'gold',
  )
  b.set(cab + 1, base - Math.round(k * 8), 'sparkle')
  // chaminé, farol e limpa-trilhos
  const fx = x - L + Math.round(k * 4)
  b.rect(
    fx,
    base - Math.round(k * 3) - bh - Math.round(k * 4),
    Math.max(2, Math.round(k * 2)),
    Math.round(k * 4),
    'stone0',
  )
  b.rect(
    fx - 1,
    base - Math.round(k * 3) - bh - Math.round(k * 4),
    Math.max(2, Math.round(k * 2)) + 2,
    1,
    'stone1',
  )
  b.rect(x - L, base - Math.round(k * 3) - 2, 2, 2, 'goldHi')
  halo(c, x - L, base - Math.round(k * 3) - 1, Math.round(k * 4), 'gold1', 0.4)
  for (let i = 0; i < Math.round(k * 2); i++) b.rect(x - L - i, base - Math.round(k * 2) + i, 1, 1, 'stone1')
  // rodas
  for (let i = 0; i < 4; i++) {
    const wx = x - L + Math.round(k * 4) + i * Math.round(k * 4)
    const rr = Math.max(1, Math.round(k * 1.5))
    for (let a = 0; a < 12; a++)
      b.set(
        wx + Math.round(Math.cos(a / 1.9) * rr),
        base - rr + Math.round(Math.sin(a / 1.9) * rr),
        i % 2 ? 'stone2' : 'stone1',
      )
    b.set(wx, base - rr, 'redHot')
  }
  // fumaça subindo em pontilhado frio
  for (let i = 0; i < k * 14; i++) {
    const t = i / (k * 14)
    const sx = fx + Math.round(i * 0.7 + Math.sin(i * 0.4) * 2)
    const sy = base - Math.round(k * 3) - bh - Math.round(k * 4) - i
    const rw = 1 + Math.round(t * k * 2)
    for (let j = -rw; j <= rw; j++)
      if (dith(sx + j, sy, 0.5 * (1 - t))) b.set(sx + j, sy, t < 0.3 ? 'stone1' : 'hazeDark')
  }
}

/** escola em três quartos: frente clara, lateral vermelha, telhado, janelas 1 px, sino e bandeira */
function escola(c: Ctx, cx: number, base: number, k: number, w: number) {
  const { b } = c
  const h = Math.round(k * 11)
  const x0 = Math.round(cx - w / 2)
  box3q(c, {
    x: x0,
    base,
    w,
    h,
    d: Math.max(3, Math.round(k * 4)),
    dir: 1,
    front: ['void', 'night', 'stone0', 'stone2'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    roof: 'crimson',
    rim: 'redHot',
  })
  // telhado de duas águas em telha vermelha
  const rh = Math.round(k * 4)
  for (let i = 0; i < rh; i++)
    b.rect(
      x0 - 2 + i,
      base - h - 1 - i,
      w + 4 - i * 2,
      1,
      i === rh - 1 ? 'redGlow' : i % 2 ? 'crimson' : 'crimsonDeep',
    )
  // janelas: faixa de salas com luz quente (baixa, para não roubar o foco)
  const ww = Math.max(2, Math.round(k * 2.5))
  for (let x = x0 + 3; x < x0 + w - ww - 2; x += ww + Math.max(2, Math.round(k * 2))) {
    // o miolo fica apagado: o cofrinho do jogo senta bem na frente da escola
    const lit = (x * 13) % 7 < 4 && Math.abs(x - cx) > w * 0.28
    b.rect(x, base - h + Math.round(k * 3), ww, Math.round(k * 3), lit ? 'gold1' : 'night')
    if (lit) b.rect(x, base - h + Math.round(k * 3), ww, 1, 'gold')
    b.rect(x - 1, base - h + Math.round(k * 6), ww + 2, 1, 'stone2')
  }
  // porta e degrau
  b.rect(cx - Math.round(k * 2), base - Math.round(k * 5), Math.round(k * 4), Math.round(k * 5), 'blood0')
  b.rect(cx - Math.round(k * 2), base - Math.round(k * 5), Math.round(k * 4), 1, 'gold0')
  b.rect(cx - Math.round(k * 3), base - 1, Math.round(k * 6), 1, 'stone2')
  // torre do sino
  const bx = cx
  const bt = base - h - rh - Math.round(k * 6)
  b.rect(bx - Math.round(k * 2), bt, Math.round(k * 4), Math.round(k * 6), 'stone2')
  b.rect(bx - Math.round(k * 2), bt, 1, Math.round(k * 6), 'stone3')
  b.rect(bx + Math.round(k * 2) - 1, bt, 1, Math.round(k * 6), 'redHot')
  b.rect(bx - 1, bt + 1, 2, Math.max(2, Math.round(k * 2)), 'gold')
  b.set(bx - 1, bt + 1, 'goldHi')
  for (let i = 0; i < Math.round(k * 2.5); i++)
    b.rect(bx - Math.round(k * 2.5) + i, bt - 1 - i, Math.round(k * 5) - i * 2, 1, 'crimson')
}

/** bandeira do Brasil pequena, ondulando em degraus (losango e círculo) */
function flag(c: Ctx, x: number, top: number, k: number, pole: number) {
  const { b } = c
  b.rect(x, top, 1, pole, 'stone2')
  b.set(x, top - 1, 'goldHi')
  const fw = Math.max(9, Math.round(k * 9))
  const fh = Math.max(6, Math.round(k * 6))
  for (let xx = 0; xx < fw; xx++) {
    const wave = Math.round(Math.sin(xx / 3) * 1)
    for (let yy = 0; yy < fh; yy++) {
      const u = (xx - fw / 2) / (fw / 2)
      const v = (yy - fh / 2) / (fh / 2)
      let kk: K = Math.abs(u) + Math.abs(v) < 0.95 ? 'gold' : 'green'
      if (u * u * 2 + v * v * 2 < 0.45) kk = 'blue0'
      if (kk === 'green' && wave > 0) kk = 'vine1'
      if (kk === 'gold' && wave < 0) kk = 'gold1'
      b.set(x + 1 + xx, top + yy + wave, kk)
    }
  }
}

const paint: Painter = (c) => {
  const { W, H, hz, s } = c
  const portrait = W < H
  sky(c, 'crimsonDeep', 0.6)
  moon(c, portrait ? W * 0.5 : W * 0.5, H * (portrait ? 0.1 : 0.14), s * (portrait ? 3.6 : 3.4))
  // cúmulos nas bordas (o miolo das pistas fica vazio) e estratos acesos no horizonte
  cumulus(
    c,
    [
      { x: 0.12, y: hz / H - 0.17, r: 0.05, n: 5 },
      { x: 0.9, y: hz / H - 0.13, r: 0.045, n: 6 },
    ],
    83,
  )
  stratus(
    c,
    [
      { x: 0, y: hz - Math.round(H * 0.02), len: W * 0.6, th: 2, heat: 0.95 },
      { x: W * 0.45, y: hz - Math.round(H * 0.04), len: W * 0.55, th: 3, heat: 0.65 },
      { x: W * 0.1, y: hz - Math.round(H * 0.075), len: W * 0.3, th: 4, heat: 0.3 },
    ],
    87,
  )
  // planos 6 e 5: serra fria com aro grená e névoa de brasa; mata mais perto, mais escura
  range(
    c,
    hz - s * 2,
    (x) => hz - s * 9 - c.nz.fbm(x / 22, 3, 4) * s * 7,
    'hazeDark',
    'crimsonDeep',
    'blood1',
  )
  range(c, hz, (x) => hz - s * 3 - c.nz.fbm(x / 9, 9, 3) * s * 5, 'vine0', 'vine1', 'blood0')
  // copas em cachos com highlight de 1 px
  const r = mulberry32(606)
  for (let x = 0; x < W; x += 2 + Math.floor(r() * 3)) {
    const y = Math.round(hz - s * 3 - c.nz.fbm(x / 9, 9, 3) * s * 5)
    if (r() < 0.5) c.b.set(x, y, 'green')
    if (r() < 0.12) c.b.set(x, y - 1, 'leafHi')
  }
  city(c, 0, W, () => hz + 1, s, s * 3, 'far', 97, 0.4)
  // Rio Madeira em faixa estreita, depois o pátio da escola
  const ground = Math.round(H * (portrait ? 0.8 : 0.8))
  river(c, hz, hz + Math.round(s * 4), 'emberDark', 'night')
  reflect(c, hz + 1, hz + Math.round(s * 4), [
    { x: Math.round(W * 0.3), k: 'gold1', len: s * 3 },
    { x: Math.round(W * 0.7), k: 'ember', len: s * 3 },
  ])
  for (let y = hz + Math.round(s * 4); y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = (y - hz) / (H - hz)
      const n = c.nz.n2(x / 9, y / 4)
      let k: K = t < 0.2 ? 'night' : n > 0.62 ? 'night' : 'void'
      // pátio: lajotas em perspectiva, linhas pontilhadas que se espaçam ao chegar perto
      if (Math.round(Math.sqrt(y - hz) * 2) % 4 === 0 && dith(x, y, 0.5 - t * 0.4))
        k = t < 0.5 ? 'hazeDark' : 'dusk'
      c.b.set(x, y, k)
    }
  // no recorte do card de introdução (168×104, s = 1) o marco cresce para continuar legível
  const k = Math.max(s * (portrait ? 0.62 : 0.78), H < 160 ? 1.25 : 0)
  // escola no meio do pátio (a faixa entre as pistas)
  const ew = Math.round(portrait ? W * 0.56 : W * 0.4)
  escola(c, Math.round(W / 2), ground - Math.round(s * 4), k, ew)
  // Três Caixas d'Água à esquerda
  const tkx = portrait ? W * 0.11 : W * 0.14
  const tBase = ground - Math.round(s * 2)
  tank(c, Math.round(tkx - k * 8), tBase, k, Math.round(k * 28))
  tank(c, Math.round(tkx), tBase + 1, k, Math.round(k * 34))
  tank(c, Math.round(tkx + k * 8), tBase, k, Math.round(k * 25))
  halo(c, Math.round(tkx), tBase - Math.round(k * 36), Math.round(k * 5), 'crimsonDeep', 0.4)
  // locomotiva à direita, sobre o trilho
  loco(c, Math.round(portrait ? W * 0.9 : W * 0.84), ground - Math.round(s * 1), k)
  // mastro com bandeira ao lado da escola
  const fx = Math.round(W / 2 + ew / 2 + k * 7)
  if (fx < W - 4) flag(c, fx, ground - Math.round(k * 34), k, Math.round(k * 34) - Math.round(s * 4))
  // linha de cerca do pátio
  for (let x = 0; x < W; x += 3) c.b.set(x, ground + Math.round(s * 2), 'stone0')
  for (let i = 0; i < 2; i++) bird(c, W * (0.2 + i * 0.55), H * (0.23 + i * 0.04), 'stone1', i === 0)
  star4(c, Math.round(tkx), tBase - Math.round(k * 34) - Math.round(k * 4), 2)
  calm(c, 0.45, 0.28, 0.26)
  fgFrame(c, 6, { h: 0.1 })
}

export default paint
