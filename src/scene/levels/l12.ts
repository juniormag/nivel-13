// Fase 12 · Farmácia Popular, Porto Alegre. O pôr do sol vermelho no Guaíba: sol baixo em disco
// (não eclipse) com a coluna de reflexo quebrada, estratos acesos colados no horizonte, a outra margem
// em hazeDark com névoa, a Usina do Gasômetro em três quartos (chaminé alta de tijolo e o prédio de
// arcos acesos) como marco, a cidade em fileiras à direita, veleiros em silhueta e o cais escuro.
// O meio fica livre para os remédios caírem; as prateleiras do jogo emolduram as laterais.
import { type Ctx, type Painter, sky } from '../levels'
import { dith, type K } from '../pal'
import { bird, box3, city, cumulus, frameFg, halo, hills, horizonWater, stratus, strokes } from './c-kit'

/** sol poente: disco quente com faixas horizontais cortadas pelas nuvens e halo pontilhado */
function sol(c: Ctx, x: number, y: number, r: number, cut: number) {
  halo(c, x, y, Math.round(r * 2.4), 'crimsonDeep', 0.5)
  halo(c, x, y, Math.round(r * 1.5), 'crimson', 0.45)
  for (let yy = -r; yy <= r; yy++) {
    if (y + yy > cut) break
    const hw = Math.round(Math.sqrt(r * r - yy * yy))
    const t = (yy + r) / (2 * r)
    const k: K = t < 0.3 ? 'emberBright' : t < 0.6 ? 'ember' : t < 0.85 ? 'redHot' : 'red'
    // faixas escuras finas (estratos passando na frente do sol)
    if (yy > r * 0.2 && (yy & 3) === 0) continue
    c.b.rect(x - hw, y + yy, hw * 2 + 1, 1, k)
  }
}

/** Usina do Gasômetro: chaminé de tijolo em três quartos e o galpão de arcos acesos */
function gasometro(c: Ctx, x: number, base: number, k: number) {
  const { b } = c
  // galpão
  box3(c, {
    x: x - Math.round(k * 6),
    base,
    w: Math.round(k * 26),
    h: Math.round(k * 9),
    d: Math.round(k * 3),
    front: ['blood0', 'blood1', 'emberDark', 'ember'],
    side: ['void', 'blood0', 'blood1'],
    roof: 'emberDark',
    rim: 'redHot',
  })
  for (let i = 0; i < 6; i++) {
    const ax = x - Math.round(k * 4) + Math.round(i * k * 4)
    const ay = base - Math.round(k * 6)
    b.rect(ax, ay, Math.max(1, Math.round(k * 2)), Math.round(k * 4), i % 3 === 1 ? 'goldHi' : 'gold')
    b.set(ax, ay - 1, 'gold1')
    b.set(ax + Math.max(1, Math.round(k * 2)) - 1, ay - 1, 'gold1')
  }
  // chaminé: tijolo em 2 tons com juntas, afinando para cima, lateral escura e coroa
  const h = Math.round(k * 42)
  const cx = x + Math.round(k * 2)
  for (let i = 0; i < h; i++) {
    const t = i / h
    const w = Math.max(2, Math.round(k * (3.6 - t * 1.4)))
    const y = base - Math.round(k * 9) - i
    for (let j = 0; j < w; j++) {
      let kk: K = j === 0 ? 'ember' : j < w * 0.6 ? 'emberDark' : 'blood1'
      if (i % 3 === 0 && j > 0 && j < w - 1) kk = 'blood0'
      b.set(cx - Math.round(w / 2) + j, y, kk)
    }
    b.set(cx + Math.round(w / 2), y, 'blood0')
  }
  const ty = base - Math.round(k * 9) - h
  b.rect(cx - Math.round(k * 2), ty - 1, Math.round(k * 4) + 1, 2, 'emberDark')
  b.rect(cx - Math.round(k * 2), ty - 1, Math.round(k * 4) + 1, 1, 'ember')
  b.set(cx, ty - 2, 'redHot')
}

/** veleiro em silhueta com vela clara pelo poente */
function veleiro(c: Ctx, x: number, y: number, k: number) {
  const { b } = c
  b.rect(x - Math.round(k * 4), y, Math.round(k * 8), Math.max(1, Math.round(k)), 'void')
  for (let i = 0; i < Math.round(k * 8); i++) {
    const w = Math.round((i / (k * 8)) * k * 4)
    b.rect(x, y - Math.round(k * 8) + i, Math.max(1, w), 1, i < k * 3 ? 'redGlow' : 'crimson')
  }
  b.rect(x - 1, y - Math.round(k * 9), 1, Math.round(k * 9), 'void')
}

const p12: Painter = (c) => {
  const { W, H, s } = c
  const portrait = W < H
  const hz = Math.round(H * (portrait ? 0.4 : 0.5))
  const u = portrait ? s * 0.8 : s
  sky({ ...c, hz }, 'crimson', 0.4)
  // sol baixo no centro do horizonte, cortado pela margem de lá
  sol(
    c,
    Math.round(W * 0.5),
    hz - Math.round(u * 6),
    Math.round(u * (portrait ? 7 : 8)),
    hz - Math.round(u * 2),
  )
  stratus(
    c,
    [
      { x: W * 0.15, y: hz - Math.round(u * 5), len: W * 0.7, th: 2, heat: 1 },
      { x: W * 0.3, y: hz - Math.round(u * 10), len: W * 0.5, th: 3, heat: 0.7 },
      { x: 0, y: hz - Math.round(u * 17), len: W * 0.4, th: 4, heat: 0.3 },
    ],
    121,
  )
  cumulus(c, W * 0.62, W * 1.05, hz - H * 0.22, H * 0.08, 122, 5)
  // outra margem do Guaíba (ilhas e morros baixos) com névoa
  hills(c, (x) => hz - u * 2 - c.nz.fbm(x / 26, 2, 3) * u * 4, hz, 'hazeDark', 'crimsonDeep', 'blood1')
  // faixa de água do horizonte e a coluna de reflexo do sol
  const wh = Math.max(3, Math.round(H * 0.04))
  const deep = Math.round(H * (portrait ? 0.84 : 0.86))
  horizonWater(c, hz + 1, wh, deep, 123)
  const sx = Math.round(W * 0.5)
  for (let y = hz + wh + 1; y < deep; y += 2) {
    const t = (y - hz) / (deep - hz)
    const w = Math.round(u * 6 * (1 - t * 0.6) + ((y * 7) % 5))
    if (dith(sx, y, 0.9 - t))
      c.b.rect(
        sx - Math.round(w / 2) + ((y * 3) % 5) - 2,
        y,
        w,
        1,
        t < 0.25 ? 'ember' : t < 0.5 ? 'red' : 'crimsonDeep',
      )
  }
  // Gasômetro (marco) à esquerda e a cidade à direita
  gasometro(
    c,
    Math.round(W * (portrait ? 0.14 : 0.16)),
    hz + Math.round(u * 2),
    (H * (portrait ? 0.26 : 0.34)) / 51,
  )
  city(c, W * 0.62, W, () => hz + 1, u * 2, u * 9, 'mid', 124, 0.15)
  city(c, W * 0.72, W, () => hz + Math.round(u * 2), u * 2, u * 6, 'lit', 125, 0.3)
  strokes(c, hz + wh + 1, deep, [
    { x: Math.round(W * 0.8), k: 'gold' },
    { x: Math.round(W * 0.9), k: 'goldHi' },
    { x: Math.round(W * 0.16), k: 'gold' },
  ])
  veleiro(c, Math.round(W * 0.34), hz + Math.round(u * 6), u * 0.7)
  veleiro(c, Math.round(W * 0.66), hz + Math.round(u * 10), u * 0.9)
  bird(c, W * 0.4, hz - u * 14, 'blood0')
  bird(c, W * 0.46, hz - u * 17, 'blood0', false)
  bird(c, W * 0.58, hz - u * 12, 'blood0')
  // cais escuro com postes acesos
  for (let y = deep; y < H; y++)
    for (let x = 0; x < W; x++)
      c.b.set(x, y, y === deep ? 'blood1' : c.nz.n2(x / 6, y / 2) > 0.8 ? 'night' : 'void')
  for (let x = Math.round(W * 0.08); x < W; x += Math.round(W * 0.17)) {
    c.b.rect(x, deep - Math.round(u * 6), 1, Math.round(u * 6), 'stone0')
    c.b.set(x, deep - Math.round(u * 6) - 1, 'goldHi')
    halo(c, x, deep - Math.round(u * 6), 3, 'gold1', 0.4)
  }
  frameFg(c, 1212, { h: 0.08, glowY: hz, leaves: true })
}

export default p12
