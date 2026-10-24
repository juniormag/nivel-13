// Fase 1 · Sertão de Pernambuco, à noite. Sete planos: céu com brasa no horizonte, nuvens acesas por baixo,
// a Chapada do Araripe ao longe (clara e fria), serras médias com rim quente, a caatinga com luzes de
// um povoado, a casa de taipa em três quartos com a lamparina acesa e o cata-vento, e o primeiro plano
// quase preto com chão rachado e mandacarus. Luz: brasa do poente à esquerda (rim quente), lua em
// eclipse no alto à direita, lamparina dourada (prática). O meio fica vazio para o mapa.
import {
  bird,
  box3q,
  cityLights,
  clump,
  cracks,
  cumulus,
  fgFrame,
  haze,
  horizonGlow,
  range,
  stratus,
} from '../../games/fx-a'
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { dith, type K } from '../pal'

/** posições compartilhadas com o jogo (lamparina e cata-vento vivos) */
export function anchors(W: number, H: number) {
  const hz = Math.round(H * (W < H ? 0.66 : 0.64))
  const mob = W < H
  const s = Math.max(1, Math.round(Math.min(W, H) / 75))
  const house = { x: Math.round(W * (mob ? 0.04 : 0.05)), base: Math.round(hz + H * (mob ? 0.05 : 0.07)) }
  const hw = Math.round(Math.max(26, W * (mob ? 0.26 : 0.13)))
  const hh = Math.round(hw * 0.5)
  const win = {
    x: house.x + Math.round(hw * 0.22),
    y: house.base - Math.round(hh * 0.62),
    w: Math.max(3, Math.round(hw * 0.14)),
    h: Math.max(3, Math.round(hh * 0.3)),
  }
  const mill = {
    x: Math.round(W * (mob ? 0.86 : 0.88)),
    base: Math.round(hz + H * (mob ? 0.03 : 0.04)),
    h: Math.round(Math.max(30, H * (mob ? 0.13 : 0.2))),
  }
  return { hz, s, house, hw, hh, win, mill, mob }
}

/** mandacaru: colunas com costelas (3 tons + highlight), rim vermelho do lado da brasa, espinhos claros */
function mandacaru(c: Ctx, x: number, base: number, h: number, rim: K, dark = false) {
  const { b } = c
  const w = Math.max(3, Math.round(h / 6))
  const ramp: K[] = dark ? ['void', 'void', 'vine0', 'vine0'] : ['vine0', 'vine1', 'vine1', 'green']
  const col = (cx: number, top: number, bot: number) => {
    for (let y = top; y < bot; y++)
      for (let i = 0; i < w; i++) {
        // costelas: listras verticais alternadas; luz da esquerda (brasa), sombra à direita
        let k: K = i === 0 ? rim : i === w - 1 ? (ramp[0] ?? 'void') : (ramp[i % 2 ? 1 : 2] ?? 'vine1')
        if (i === 1 && !dark) k = ramp[3] ?? 'green'
        if (y === top && (i === 0 || i === w - 1)) continue
        b.set(cx + i, y, k)
      }
    // espinhos
    for (let y = top + 2; y < bot - 1; y += 3) {
      b.set(cx - 1, y, dark ? 'blood1' : 'stone2')
      if (!dark) b.set(cx + w, y + 1, 'stone0')
    }
    b.set(cx + (w >> 1), top - 1, dark ? 'crimsonDeep' : 'leafHi')
  }
  col(x, base - h, base)
  const arm = (dir: number, at: number, out: number, up: number) => {
    const ay = base - Math.round(h * at)
    const ax = dir > 0 ? x + w : x - out
    for (let i = 0; i < out; i++)
      for (let j = 0; j < w - 1; j++) b.set(ax + i, ay - j, j === w - 2 ? rim : (ramp[1] ?? 'vine1'))
    col(dir > 0 ? x + w + out - w + 1 : x - out, ay - Math.round(h * up), ay + 1)
  }
  arm(1, 0.42, Math.round(w * 1.4), 0.32)
  arm(-1, 0.58, Math.round(w * 1.2), 0.24)
  if (h > 30) arm(1, 0.7, Math.round(w * 1.1), 0.18)
}

/** cata-vento de fazenda: torre treliçada, roda de pás e leme, em silhueta com aresta acesa */
function catavento(c: Ctx, x: number, base: number, h: number) {
  const { b } = c
  const top = base - h
  const spread = Math.round(h * 0.18)
  b.line(x - spread, base, x - 1, top + 3, 'stone0')
  b.line(x + spread, base, x + 1, top + 3, 'void')
  b.line(x - spread + 1, base, x, top + 3, 'hazeDark')
  for (let y = top + 6; y < base - 2; y += Math.max(4, Math.round(h / 7))) {
    const k = (y - top) / h
    const half = Math.round(spread * k)
    b.line(x - half, y, x + half, y, 'stone0')
    b.line(
      x - half,
      y,
      x + Math.round(spread * Math.min(1, k + 0.12)),
      y + Math.max(3, Math.round(h / 8)),
      'void',
    )
  }
  // roda: 12 pás em leque, aro de 1 px com rim quente à esquerda
  const R = Math.max(5, Math.round(h * 0.2))
  const cy = top + 1
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2
    for (let r = 2; r <= R; r++) {
      const px = x + Math.cos(ang) * r
      const py = cy + Math.sin(ang) * r
      b.set(px, py, r > R - 2 ? 'stone1' : 'stone0')
      b.set(px + Math.cos(ang + 0.2), py + Math.sin(ang + 0.2), 'hazeDark')
    }
  }
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2
    const left = Math.cos(ang) < -0.3
    b.set(x + Math.cos(ang) * R, cy + Math.sin(ang) * R, left ? 'emberDark' : 'stone0')
  }
  b.rect(x - 1, cy - 1, 3, 3, 'stone1')
  b.set(x - 1, cy - 1, 'stone3')
  // leme
  b.line(x + 1, cy, x + R + 4, cy - 1, 'stone0')
  for (let i = 0; i < 4; i++)
    b.line(x + R + 2, cy - 3 + i, x + R + 6, cy - 4 + i, i === 0 ? 'emberDark' : 'void')
}

/** casa de taipa em três quartos: parede de barro (frente quente), lateral grossa em sombra, telhado de telha */
function casa(c: Ctx) {
  const A = anchors(c.W, c.H)
  const { b } = c
  const { x, base } = A.house
  const w = A.hw
  const h = A.hh
  const depth = Math.max(5, Math.round(w * 0.32))
  const g = box3q(
    b,
    x,
    base,
    w,
    h,
    depth,
    ['blood0', 'blood1', 'emberDark', 'emberDark', 'gold1'],
    ['void', 'blood0', 'blood0', 'blood1'],
    null,
    true,
    'crimsonDeep',
  )
  // barro: pontos e rachaduras na frente
  const r = mulberry32(31)
  for (let i = 0; i < w * h * 0.06; i++)
    b.set(g.fx + 1 + r() * (w - 2), g.fy + 2 + r() * (h - 3), r() < 0.5 ? 'blood1' : 'gold0')
  for (let i = 0; i < 2; i++) {
    let px = g.fx + 2 + r() * (w - 4)
    let py = g.fy + 2
    for (let k = 0; k < h * 0.5; k++) {
      b.set(px, py, 'blood0')
      px += r() < 0.5 ? 1 : -1
      py += 1
    }
  }
  // telhado: duas águas, beiral escuro, telhas em fiadas com highlight de 1 px na de cima
  const over = Math.max(2, Math.round(w * 0.06))
  const rh = Math.round(h * 0.55)
  for (let i = 0; i < rh; i++) {
    const y = g.fy - i
    const x0 = g.fx - over + Math.round(i * 0.35)
    const x1 = g.fx + w + depth + over - Math.round(i * 0.15)
    for (let xx = x0; xx < x1; xx++) {
      const behind = xx > g.fx + w + Math.round(i * 0.6)
      let k: K =
        i === 0 ? 'void' : (xx + (i % 2) * 2) % 4 === 0 ? 'blood1' : behind ? 'blood0' : 'crimsonDeep'
      if (i === rh - 1) k = 'crimson'
      if (!behind && i % 3 === 1 && (xx >> 1) % 2 === 0) k = 'crimson'
      b.set(xx, y - Math.round((xx - x0) * 0.04), k)
    }
  }
  b.set(g.fx - over, g.fy, 'crimson')
  // janela acesa (lamparina) com halo pontilhado e luz derramada no chão
  const W0 = A.win
  b.rect(W0.x - 1, W0.y - 1, W0.w + 2, W0.h + 2, 'gold0')
  for (let yy = 0; yy < W0.h; yy++)
    for (let xx = 0; xx < W0.w; xx++)
      b.set(W0.x + xx, W0.y + yy, yy < W0.h * 0.35 && xx < W0.w * 0.6 ? 'sparkle' : 'goldHi')
  b.rect(W0.x + (W0.w >> 1), W0.y, 1, W0.h, 'gold1')
  for (let yy = -3; yy < W0.h + 3; yy++)
    for (let xx = -3; xx < W0.w + 3; xx++) {
      const out = xx < -1 || yy < -1 || xx > W0.w || yy > W0.h
      if (out && dith(W0.x + xx, W0.y + yy, 0.35) && b.get(W0.x + xx, W0.y + yy))
        b.set(W0.x + xx, W0.y + yy, 'gold1')
    }
  // porta entreaberta
  const dx = g.fx + Math.round(w * 0.62)
  const dw = Math.max(3, Math.round(w * 0.16))
  b.rect(dx, base - Math.round(h * 0.78), dw, Math.round(h * 0.78), 'void')
  b.rect(dx, base - Math.round(h * 0.78), 1, Math.round(h * 0.78), 'gold1')
  // luz no chão diante da janela e da porta
  for (let yy = 0; yy < 4; yy++)
    for (let xx = -2; xx < dw + 6; xx++)
      if (dith(dx + xx, base + yy, 0.5 - yy * 0.12)) b.set(dx + xx, base + yy, 'gold0')
  // cisterna (cilindro) e pote ao lado
  const cx = g.sx + depth + Math.round(w * 0.12)
  const cr = Math.max(4, Math.round(w * 0.13))
  const ch = Math.round(cr * 1.2)
  for (let yy = 0; yy < ch; yy++)
    for (let xx = -cr; xx <= cr; xx++) {
      const t = (xx + cr) / (cr * 2)
      b.set(cx + xx, base - yy, t < 0.2 ? 'stone1' : t < 0.55 ? 'stone0' : t < 0.85 ? 'night' : 'void')
    }
  for (let xx = -cr; xx <= cr; xx++) {
    b.set(cx + xx, base - ch, 'stone1')
    b.set(cx + xx, base - ch - 1, Math.abs(xx) < cr - 1 ? 'stone0' : 'night')
  }
  b.set(cx - cr, base - ch, 'stone2')
  // sombra de contato da casa
  for (let xx = g.fx - 1; xx < g.sx + depth + 2; xx++) b.set(xx, base, 'void')
}

const painter: Painter = (c) => {
  const { W, H, hz, b } = c
  const A = anchors(W, H)
  const mob = A.mob
  sky(c, 'emberDark', 0.9)
  horizonGlow(c, Math.round(H * 0.05), 'blood0', 'emberDark')
  moon(c, W * (mob ? 0.78 : 0.82), H * (mob ? 0.13 : 0.17), c.s * (mob ? 5 : 4.6))
  // nuvens acesas por baixo pela brasa do horizonte (lição 6)
  cumulus(
    c,
    hz - H * (mob ? 0.2 : 0.28),
    H * (mob ? 0.06 : 0.1),
    [
      [-0.08, mob ? 0.4 : 0.28],
      [0.74, 1.08],
    ],
    3,
  )
  stratus(
    c,
    [
      { x: W * 0.05, y: hz - Math.round(H * 0.035), len: W * 0.4, th: 3, heat: 0.8 },
      { x: W * 0.5, y: hz - Math.round(H * 0.06), len: W * 0.45, th: 4, heat: 0.5 },
      { x: W * 0.62, y: hz - Math.round(H * 0.02), len: W * 0.3, th: 2, heat: 1 },
    ],
    5,
  )
  // plano 3: Chapada do Araripe, mesa de topo chato, clara e fria (longe)
  const nz = c.nz
  range(
    c,
    (x) => {
      const u = x / W
      const mesa =
        u > 0.08 && u < 0.62
          ? 1
          : u > 0.02 && u < 0.08
            ? (u - 0.02) / 0.06
            : u >= 0.62 && u < 0.72
              ? 1 - (u - 0.62) / 0.1
              : 0
      return hz - H * 0.02 - mesa * H * (mob ? 0.045 : 0.07) - nz.fbm(x / 9, 2, 2) * 1.5
    },
    'hazeDark',
    'dusk',
    'crimson',
    hz,
  )
  // estratos de arenito na face da chapada (linhas pontilhadas mais claras)
  for (let y = Math.round(hz - H * 0.09); y < hz; y += 3)
    for (let x = 0; x < W; x++) if (b.is(x, y, 'hazeDark') && dith(x, y, 0.55)) b.set(x, y, 'haze')
  haze(c, hz - H * 0.12, hz, 'dusk', 0.3)
  // plano 4: serras médias, mais escuras e quentes, rim de brasa do lado esquerdo
  range(
    c,
    (x) => hz + 1 - nz.fbm(x / 22 + 7, 4, 3) * H * 0.05 * (0.4 + Math.abs(Math.sin(x / (W * 0.21)))),
    'dusk',
    'night',
    'emberDark',
    hz + 2,
  )
  // luzes de um povoado no pé da serra, à direita
  cityLights(c, Math.round(W * 0.52), Math.round(W * 0.8), hz - 1, hz + 2, 1.2, 77)
  // plano 5: caatinga, chão escuro com pontilhado e arbustos secos em cacho
  for (let y = hz + 2; y < H; y++) {
    const t = (y - hz) / (H - hz)
    for (let x = 0; x < W; x++) {
      const n = nz.n2(x / 6, y / 2.5)
      let k: K = t < 0.12 ? (dith(x, y, 0.5 - t * 3) ? 'blood0' : 'night') : 'night'
      if (n > 0.72) k = t < 0.4 ? 'blood0' : 'dusk'
      if (t > 0.55 && dith(x, y, (t - 0.55) * 1.6)) k = 'void'
      b.set(x, y, k)
    }
  }
  // arbustos secos da caatinga: galhos em silhueta com ponta acesa pela brasa
  const r = mulberry32(19)
  for (let i = 0; i < W / 12; i++) {
    const x = Math.round(r() * W)
    const y = Math.round(hz + 3 + r() ** 1.6 * (H - hz) * 0.3)
    const hh = Math.round(2 + ((y - hz) / (H - hz)) * 14)
    for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
      const lean = (r() - 0.5) * 1.6
      for (let j = 0; j < hh; j++)
        b.set(x + Math.round(lean * j * (j / hh)), y - j, j === hh - 1 ? 'emberDark' : 'void')
    }
    clump(b, x, y - 1, Math.max(1.2, hh * 0.25), ['void', 'void', 'blood0'], Math.floor(r() * 1e6), null)
  }
  cracks(c, hz + (H - hz) * 0.25, H, 41, 'void', 'blood1', Math.round(W / 6))
  // juazeiro solitário no meio-fundo (verde escuro, rim de brasa)
  const jx = Math.round(W * (mob ? 0.62 : 0.7))
  const jy = Math.round(hz + 3)
  b.line(jx, jy, jx, jy - 5, 'gold0')
  clump(b, jx, jy - 7, mob ? 4 : 5, ['vine0', 'vine0', 'vine1', 'green'], 5, 'emberDark', false)
  // plano 6: casa de taipa, cisterna e cata-vento
  casa(c)
  catavento(c, A.mill.x, A.mill.base, A.mill.h)
  mandacaru(
    c,
    Math.round(W * (mob ? 0.33 : 0.27)),
    Math.round(hz + H * 0.035),
    Math.round(H * (mob ? 0.06 : 0.1)),
    'emberDark',
  )
  mandacaru(
    c,
    Math.round(W * (mob ? 0.7 : 0.78)),
    Math.round(hz + H * 0.06),
    Math.round(H * (mob ? 0.08 : 0.13)),
    'crimson',
  )
  // carcarás voando
  bird(b, Math.round(W * 0.3), Math.round(hz - H * 0.2), 'stone1', true)
  bird(b, Math.round(W * 0.36), Math.round(hz - H * 0.17), 'stone0')
  calm(c, mob ? 0.33 : 0.42, mob ? 0.42 : 0.26, mob ? 0.2 : 0.3)
  // plano 7: primeiro plano quase preto, com mandacarus em silhueta emoldurando
  fgFrame(c, 11, 'crimson', 'blood1', 0.24, mob ? 0.06 : 0.12)
  mandacaru(
    c,
    Math.round(W * 0.93),
    H - Math.round(H * 0.02),
    Math.round(H * (mob ? 0.16 : 0.3)),
    'crimson',
    true,
  )
  mandacaru(
    c,
    Math.round(W * 0.02),
    H - Math.round(H * 0.01),
    Math.round(H * (mob ? 0.1 : 0.18)),
    'blood1',
    true,
  )
}

export default painter
