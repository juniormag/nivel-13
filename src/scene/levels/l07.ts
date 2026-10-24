// Fase 7 · 8 de Janeiro, Brasília. O jogo desenha os três Poderes na frente; o fundo mostra o que se vê
// da Praça: a Esplanada dos Ministérios em três quartos convergindo para o centro, a Catedral (coroa de
// colunas curvas) à esquerda, a Torre de TV ao longe e o Mastro da Bandeira, alto o bastante para aparecer
// acima do card de introdução. Céu com o clarão vermelho da noite tensa; centro escuro para as minutas.
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { DARKER, dith, type K } from '../pal'
import { bird, box3q, city, cumulus, fgFrame, halo, range, reflect, river, star4, stratus } from './b-kit'

/** Catedral de Brasília: colunas curvas que se apertam num anel alto e abrem em pontas (coroa) */
function catedral(c: Ctx, cx: number, base: number, k: number) {
  const { b } = c
  const h = Math.round(k * 17)
  const R = Math.round(k * 9)
  const ring = 0.72
  const radAt = (t: number) =>
    t < ring ? R * (1 - (t / ring) ** 1.6 * 0.68) : R * (0.32 + ((t - ring) / (1 - ring)) * 0.5)
  // vidro escuro com reflexo azul atrás das colunas
  for (let y = 1; y < h * ring; y++) {
    const rad = radAt(y / h)
    for (let x = -Math.round(rad) + 1; x < rad - 1; x++)
      b.set(cx + x, base - y, dith(cx + x, base - y, 0.18 + (x < 0 ? 0.12 : 0)) ? 'blue1' : 'blue0')
  }
  const cols = 8
  for (let i = 0; i <= cols; i++) {
    const side = -1 + (2 * i) / cols
    for (let y = 0; y <= h; y++) {
      const t = y / h
      const x = Math.round(cx + side * radAt(t))
      let kk: K = side < -0.5 ? 'stoneHi' : side < 0.3 ? 'stone3' : 'stone2'
      if (side > 0.8) kk = 'redHot'
      b.set(x, base - y, kk)
      if (t < ring && Math.abs(side) < 0.95) b.set(x + (side < 0 ? 1 : -1), base - y, DARKER[kk])
    }
  }
  b.rect(cx - Math.round(R * 0.32), base - Math.round(h * ring), Math.round(R * 0.64) + 1, 1, 'stoneHi')
  // espelho d'água em volta e a cruz no topo
  b.rect(cx - R - 2, base + 1, R * 2 + 5, 1, 'stone2')
  b.rect(cx, base - h - Math.round(k * 3), 1, Math.round(k * 3), 'stone3')
  b.rect(cx - 1, base - h - Math.round(k * 2), 3, 1, 'stone3')
  halo(c, cx, base - Math.round(h * 0.4), R + 2, 'blue0', 0.3)
  // campanário: haste fina ao lado
  const bx = cx + R + Math.round(k * 3)
  b.rect(bx, base - Math.round(k * 12), 1, Math.round(k * 12), 'stone2')
  b.rect(bx + 1, base - Math.round(k * 12), 1, Math.round(k * 12), 'stone0')
  b.set(bx, base - Math.round(k * 12) - 1, 'goldHi')
}

/** bandeira do Brasil grande, em 3 dobras de luz (ondulação em degraus, sem rotação) */
function bandeira(c: Ctx, x: number, top: number, fw: number, fh: number) {
  const { b } = c
  for (let xx = 0; xx < fw; xx++) {
    const ph = xx / fw
    const wave = Math.round(Math.sin(ph * 6.3 + 0.6) * (1 + ph * 1.5))
    const shade = Math.cos(ph * 6.3 + 0.6) // >0 = dobra virada para a luz
    for (let yy = 0; yy < fh - Math.round(ph * 2); yy++) {
      const u = (xx - fw / 2) / (fw / 2)
      const v = (yy - fh / 2) / (fh / 2)
      let kk: K = 'green'
      if (Math.abs(u) * 0.95 + Math.abs(v) < 0.88) kk = 'gold'
      if (u * u * 2.6 + v * v * 1.6 < 0.42) kk = 'blue0'
      if (kk === 'blue0' && Math.abs(v + u * 0.3) < 0.08) kk = 'stoneHi'
      if (kk === 'blue0' && (xx * 7 + yy * 3) % 11 === 0) kk = 'sparkle'
      if (shade < -0.4)
        kk = kk === 'green' ? 'vine1' : kk === 'gold' ? 'gold1' : kk === 'blue0' ? 'night' : 'stone2'
      else if (shade > 0.7 && kk === 'green') kk = 'leafHi'
      else if (shade > 0.7 && kk === 'gold') kk = 'goldHi'
      if (yy === 0 && kk === 'green') kk = 'leafHi'
      b.set(x + xx, top + yy + wave, kk)
    }
    // rim vermelho na borda de baixo (luz da praça)
    b.set(x + xx, top + fh - Math.round(ph * 2) + wave, 'crimson')
  }
}

/** ministério em três quartos: lâmina alta, frente com grade de janelas 1 px, lateral grossa vermelha */
function ministerio(
  c: Ctx,
  x: number,
  base: number,
  w: number,
  h: number,
  d: number,
  dir: 1 | -1,
  seed: number,
  far: number,
) {
  box3q(c, {
    x,
    base,
    w,
    h,
    d,
    dir,
    front: far > 0.5 ? ['dusk', 'hazeDark', 'haze', 'stone1'] : ['night', 'stone0', 'stone1', 'stone2'],
    side: far > 0.5 ? ['blood0', 'blood0', 'blood1'] : ['blood0', 'blood1', 'crimsonDeep'],
    roof: far > 0.5 ? 'haze' : 'stone2',
    rim: far > 0.5 ? 'crimsonDeep' : 'red',
    win: { rate: 0.28 - far * 0.12, sx: 2, sy: 2, seed },
  })
}

const paint: Painter = (c) => {
  const { W, H, hz, s } = c
  const portrait = W < H
  sky(c, 'crimsonDeep', 0.6)
  // clarão da cidade no horizonte: base das nuvens acesa de vermelho/laranja
  moon(c, portrait ? W * 0.24 : W * 0.12, H * (portrait ? 0.12 : 0.15), s * (portrait ? 4.2 : 3.6))
  cumulus(
    c,
    [
      { x: 0.1, y: hz / H - 0.15, r: 0.05, n: 6 },
      { x: 0.66, y: hz / H - 0.2, r: 0.04, n: 5 },
    ],
    71,
  )
  stratus(
    c,
    [
      { x: 0, y: hz - Math.round(H * 0.02), len: W * 0.6, th: 2, heat: 0.95 },
      { x: W * 0.45, y: hz - Math.round(H * 0.04), len: W * 0.55, th: 3, heat: 0.65 },
      { x: W * 0.1, y: hz - Math.round(H * 0.075), len: W * 0.3, th: 4, heat: 0.3 },
    ],
    73,
  )
  // plano 6: cerrado baixo com névoa de brasa, a cidade ao longe (fileira longe) e a Torre de TV
  range(c, hz, (x) => hz - s - c.nz.fbm(x / 14, 4, 3) * s * 3, 'hazeDark', 'crimsonDeep', 'blood1')
  city(c, 0, W, () => hz, s, s * 4, 'far', 91, 0.3)
  const tvx = Math.round(W * 0.5)
  const tvh = Math.round(s * (portrait ? 20 : 16))
  for (let y = 0; y < tvh; y++) {
    const half = Math.max(0, Math.round((1 - y / tvh) * s * 1.5))
    c.b.rect(tvx - half, hz - y, half * 2 + 1, 1, y % 3 ? 'hazeDark' : 'haze')
  }
  c.b.rect(tvx - s, hz - Math.round(tvh * 0.62), s * 2 + 1, 2, 'haze')
  c.b.set(tvx, hz - tvh - 1, 'redHot')
  halo(c, tvx, hz - tvh - 1, 3, 'crimson', 0.5)
  // planos 5 e 4: Esplanada dos Ministérios, duas filas convergindo para o centro
  // no recorte do card de introdução (168×104, s = 1) o marco cresce para continuar legível
  const k = Math.max(s * (portrait ? 0.62 : 0.85), H < 160 ? 1.25 : 0)
  const n = portrait ? 5 : 7
  for (let i = n - 1; i >= 0; i--) {
    const f = i / (n - 1) // 0 = perto, 1 = longe
    const d = 1 - f * 0.6
    const w = Math.round(k * 9 * d)
    const h = Math.round(k * 13 * d)
    const base = hz + Math.round((1 - f) * k * 2)
    const gap = W * (portrait ? 0.07 : 0.11) + f * W * 0.02
    const step = (W / 2 - gap) / n
    const xl = Math.round(i * step * 0.85 + (1 - d) * 4)
    const xr = Math.round(W - xl - w)
    ministerio(c, xl, base, w, h, Math.max(2, Math.round(k * 2 * d)), 1, 700 + i, f)
    ministerio(c, xr, base, w, h, Math.max(2, Math.round(k * 2 * d)), -1, 800 + i, f)
  }
  // Catedral à esquerda, à frente da fila
  const cx = Math.round(portrait ? W * 0.17 : W * 0.24)
  catedral(c, cx, hz + Math.round(k * 3), k * (portrait ? 1 : 0.9))
  // espelho d'água / gramado escuro da Esplanada
  const ry1 = Math.round(H * 0.86)
  river(c, hz + Math.round(k * 4), ry1, 'crimsonDeep', 'night')
  reflect(c, hz + Math.round(k * 4) + 1, ry1, [
    { x: cx, k: 'blue1' },
    { x: tvx, k: 'redHot', len: s * 6 },
    { x: Math.round(W * 0.35), k: 'gold1', len: s * 5 },
    { x: Math.round(W * 0.65), k: 'gold1', len: s * 5 },
  ])
  // Mastro da Bandeira, à direita: haste de 1 px até o alto, bandeira grande
  const mx = Math.round(portrait ? W * 0.84 : W * 0.86)
  const mTop = Math.round(H * (portrait ? 0.07 : 0.08))
  for (let y = mTop; y < ry1; y++) {
    c.b.set(mx, y, y < hz ? 'stone3' : 'stone1')
    c.b.set(mx + 1, y, 'stone0')
  }
  c.b.set(mx, mTop - 1, 'goldHi')
  star4(c, mx, mTop - 2, 2)
  // base da haste: as 24 hastes ao redor viram um feixe de lâminas
  for (let i = 0; i < 4; i++)
    c.b.rect(mx - 3 - i, hz + Math.round(k * 2) + i * 2, 8 + i * 2, 1, i ? 'stone1' : 'stone2')
  const fw = Math.round(portrait ? W * 0.15 : W * 0.1)
  bandeira(c, mx + 2, mTop + 1, fw, Math.round(fw * 0.66))
  // gaivotas cruzando o clarão
  const r = mulberry32(77)
  for (let i = 0; i < 4; i++)
    bird(c, W * (0.3 + r() * 0.4), H * (0.18 + r() * 0.12), i % 2 ? 'stone1' : 'stone2', i % 2 === 0)
  // chão de cá
  for (let y = ry1; y < H; y++)
    for (let x = 0; x < W; x++) c.b.set(x, y, c.nz.n2(x / 6, y / 2) > 0.8 ? 'night' : 'void')
  calm(c, 0.42, 0.3, 0.24)
  fgFrame(c, 7, { h: 0.08, leaves: true })
}

export default paint
