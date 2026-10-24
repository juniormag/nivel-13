// Fase 11 · Soberania, Porto de Santos. 7 planos: céu com estratos e cúmulos de base acesa · Serra do
// Mar ao longe (hazeDark, névoa blood1) · cidade de Santos em fileiras com o Monte Serrat · faixa de água
// do horizonte (a mais clara do meio) · navio porta-contêiner em três quartos · portêineres (guindastes
// de cais, o marco) com as luzes vermelhas no alto e pilhas de contêineres com lateral grossa · cais
// escuro com cabeços de amarração no primeiro plano. A arena do escudo fica no centro, que é calmo.
import { type Ctx, moon, type Painter, sky } from '../levels'
import type { K } from '../pal'
import {
  beam,
  box3,
  city,
  cumulus,
  frameFg,
  halo,
  hills,
  horizonWater,
  star,
  stratus,
  strokes,
} from './c-kit'

const CONT: [K, K, K][] = [
  ['crimsonDeep', 'crimson', 'red'],
  ['blue0', 'blue0', 'blue1'],
  ['gold0', 'gold1', 'gold'],
  ['vine0', 'vine1', 'green'],
  ['blood0', 'emberDark', 'ember'],
  ['hazeDark', 'haze', 'stone1'],
]

/** pilha de contêineres em três quartos: frente com nervuras, lateral escura saturada e teto */
function pilha(
  c: Ctx,
  x: number,
  base: number,
  cols: number,
  rows: number,
  k: number,
  seed: number,
  dir: 1 | -1,
) {
  const cw = Math.round(k * 11)
  const ch = Math.round(k * 4.5)
  let n = seed
  for (let r = 0; r < rows; r++)
    for (let i = 0; i < cols; i++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff
      if (r === rows - 1 && n % 5 === 0) continue
      const col = CONT[n % CONT.length] ?? CONT[0]
      if (!col) continue
      const xx = x + i * (cw + 1)
      const yb = base - r * (ch + 1)
      box3(c, {
        x: xx,
        base: yb,
        w: cw,
        h: ch,
        d: Math.max(1, Math.round(k * 2)),
        dir,
        front: [col[0], col[0], col[0], col[1]],
        side: ['void', 'blood0', col[0]],
        roof: col[1],
      })
      for (let q = xx + 2; q < xx + cw - 1; q += 2) c.b.rect(q, yb - ch + 1, 1, ch - 2, col[0])
    }
}

/** portêiner: duas pernas em A, viga alta com a lança sobre a água e luzes vermelhas nas pontas */
function porteiner(c: Ctx, x: number, base: number, k: number, boomLeft: boolean, reach = 1) {
  const { b } = c
  const h = Math.round(k * 34)
  const legW = Math.round(k * 12)
  const t = Math.max(2, Math.round(k * 1.3))
  for (const lx of [x, x + legW]) {
    b.rect(lx, base - h, t, h, 'stone1')
    b.rect(lx + t, base - h, Math.max(1, Math.round(t * 0.6)), h, 'crimsonDeep')
    b.rect(lx, base - h, 1, h, 'stone3')
  }
  // travessas em X entre as pernas
  for (let i = 0; i < legW; i++) {
    b.set(x + i, base - h * 0.35 - Math.round((i / legW) * h * 0.3), 'stone0')
    b.set(x + i, base - h * 0.65 + Math.round((i / legW) * h * 0.3), 'stone0')
  }
  // viga e lança
  const by = base - h
  const L = Math.round(k * 32 * reach)
  const x0 = boomLeft ? x - L : x - Math.round(k * 6)
  const x1 = boomLeft ? x + legW + Math.round(k * 6) : x + legW + L
  b.rect(x0, by - t, x1 - x0, t, 'stone2')
  b.rect(x0, by - t, x1 - x0, 1, 'stone3')
  b.rect(x0, by, x1 - x0, 1, 'blood1')
  // casa de máquinas e cabos (treliça) até o topo
  const mx = x + Math.round(legW / 2)
  b.rect(mx - Math.round(k * 3), by - t - Math.round(k * 4), Math.round(k * 6), Math.round(k * 4), 'stone1')
  b.rect(mx - Math.round(k * 3), by - t - Math.round(k * 4), Math.round(k * 6), 1, 'stone2')
  const apex = by - t - Math.round(k * 10)
  b.rect(mx, apex, 1, Math.round(k * 6), 'stone1')
  for (const ex of [x0, x1 - 1]) {
    const steps = Math.abs(ex - mx)
    for (let i = 0; i < steps; i += 2)
      b.set(
        Math.round(mx + ((ex - mx) * i) / steps),
        Math.round(apex + ((by - t - apex) * i) / steps),
        'stone0',
      )
  }
  // luzes de aviso vermelhas com halo, e o spreader pendurado
  for (const lx of [x0, x1 - 1, mx]) {
    halo(c, lx, lx === mx ? apex : by - t - 1, 3, 'crimson', 0.5)
    b.set(lx, lx === mx ? apex - 1 : by - t - 1, 'redHot')
  }
  const sx = boomLeft ? x0 + Math.round(L * 0.35) : x1 - Math.round(L * 0.35)
  b.rect(sx, by + 1, 1, Math.round(k * 8), 'stone0')
  b.rect(sx - Math.round(k * 3), by + 1 + Math.round(k * 8), Math.round(k * 6) + 1, 1, 'gold1')
}

const p11: Painter = (c) => {
  const { W, H, s } = c
  const portrait = W < H
  const hz = Math.round(H * (portrait ? 0.3 : 0.4))
  const u = portrait ? s * 0.75 : s
  sky({ ...c, hz }, 'crimsonDeep', 0.6)
  moon(c, W * 0.5, H * (portrait ? 0.1 : 0.13), s * (portrait ? 3.6 : 4.4))
  cumulus(c, -W * 0.05, W * 0.35, hz - H * 0.2, H * 0.08, 111, 5)
  cumulus(c, W * 0.68, W * 1.05, hz - H * 0.24, H * 0.07, 112, 5)
  stratus(
    c,
    [
      { x: W * 0.1, y: hz - Math.round(u * 2), len: W * 0.7, th: 2, heat: 0.95 },
      { x: W * 0.5, y: hz - Math.round(u * 6), len: W * 0.45, th: 3, heat: 0.45 },
    ],
    113,
  )
  // Serra do Mar e o Monte Serrat com o bondinho aceso
  const wb = hz
  hills(c, (x) => wb - u * 5 - c.nz.fbm(x / 28, 4, 3) * u * 7, wb, 'hazeDark', 'crimsonDeep', 'blood1')
  const ms = W * 0.22
  hills(
    c,
    (x) => {
      const t = (x - ms) / (u * 14)
      return Math.abs(t) < 1 ? wb - u * 9 * (1 - t * t) ** 0.7 : wb - u
    },
    wb,
    'dusk',
    'blood1',
    'blood0',
  )
  for (let i = 0; i < u * 8; i += 2)
    c.b.set(Math.round(ms - u * 6 + i), Math.round(wb - u * 1 - i * 0.95), 'gold1')
  c.b.set(Math.round(ms + u * 2), Math.round(wb - u * 9), 'goldHi')
  city(c, 0, W, () => wb, u * 1.2, u * 4, 'far', 114, 0.25)
  city(c, W * 0.55, W, () => wb + 1, u * 1, u * 3, 'mid', 115, 0.3)
  // faixa de água do horizonte e o canal escuro
  const wh = Math.max(3, Math.round(H * 0.028))
  const quay = Math.round(H * (portrait ? 0.8 : 0.84))
  horizonWater(c, wb + 1, wh, quay, 116)
  // navio porta-contêiner em três quartos atravessando o canal
  const shipY = Math.round(wb + wh + u * 7)
  const sx0 = Math.round(W * (portrait ? 0.04 : 0.2))
  const sw = Math.round(W * (portrait ? 0.55 : 0.4))
  box3(c, {
    x: sx0,
    base: shipY,
    w: sw,
    h: Math.round(u * 5),
    d: Math.round(u * 2),
    front: ['void', 'blood0', 'blood1', 'crimsonDeep'],
    side: ['void', 'void', 'blood0'],
    roof: 'stone1',
    rim: 'red',
  })
  c.b.rect(sx0, shipY - 2, sw, 1, 'stone2')
  pilha(
    c,
    sx0 + Math.round(u * 2),
    shipY - Math.round(u * 5) - 1,
    Math.max(2, Math.floor(sw / (u * 12)) - 1),
    1,
    u * 0.75,
    7,
    1,
  )
  // castelo do navio com janelas acesas
  box3(c, {
    x: sx0 + sw - Math.round(u * 7),
    base: shipY - Math.round(u * 5),
    w: Math.round(u * 5),
    h: Math.round(u * 7),
    d: Math.round(u * 1.5),
    front: ['stone0', 'stone1', 'stone2', 'stone3'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    rim: 'redHot',
    win: { rate: 0.6, sx: 2, sy: 2, seed: 117 },
  })
  strokes(c, shipY + 1, quay, [
    { x: sx0 + sw - Math.round(u * 5), k: 'gold' },
    { x: Math.round(W * 0.12), k: 'redHot' },
    { x: Math.round(W * 0.86), k: 'redHot' },
    { x: Math.round(W * 0.6), k: 'ember' },
  ])
  // portêineres (marco) e pilhas no cais, nas bordas
  const k = (H * (portrait ? 0.34 : 0.4)) / 34
  porteiner(c, Math.round(W * (portrait ? 0.8 : 0.8)), quay, k, true, portrait ? 0.22 : 1)
  if (!portrait) porteiner(c, Math.round(W * 0.06), quay, k * 0.85, false, 0.6)
  pilha(c, Math.round(W * (portrait ? 0.66 : 0.8)), quay, 3, 3, u * 0.7, 3, -1)
  pilha(c, Math.round(-u * 2), quay, 3, 3, u * 0.7, 5, 1)
  // cais: concreto escuro com borda acesa e cabeços de amarração
  for (let y = quay; y < H; y++)
    for (let x = 0; x < W; x++)
      c.b.set(
        x,
        y,
        y === quay ? 'stone1' : y === quay + 1 ? 'stone0' : c.nz.n2(x / 6, y / 2) > 0.8 ? 'night' : 'void',
      )
  for (let x = Math.round(W * 0.1); x < W; x += Math.round(W * 0.2)) {
    c.b.rect(x, quay - 2, 3, 2, 'stone1')
    c.b.set(x, quay - 2, 'stone3')
  }
  beam(c, Math.round(W * 0.95), hz - H * 0.2, hz, 'crimson')
  star(c, Math.round(W * 0.95), Math.round(hz - H * 0.2), 2)
  frameFg(c, 1111, { h: 0.08, glowY: H * 0.48, leaves: false })
}

export default p11
