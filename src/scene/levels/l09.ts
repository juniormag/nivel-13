// Fase 9 · Siga o Dinheiro, Rio de Janeiro. O quadro de cortiça com as cartas cobre o miolo; o cenário
// vive no horizonte e nas bordas: Pão de Açúcar e Urca enevoados, o Corcovado com o Cristo aceso e a
// estrada em zigue-zague, a baía com reflexos quebrados, bairros de luz em 1 px e o Palácio Tiradentes
// (Alerj) em três quartos: colunata clara, frontão, cúpula com lanterna, lateral em granito carmim e
// holofotes dourados de baixo (luz própria do marco).
// No celular em pé o horizonte sobe para 21% (só o alto e o pé da tela aparecem em volta da grade);
// no desktop fica em 60% e o palácio ocupa a borda direita, fora do quadro.
import { type Ctx, moon, type Painter, sky } from '../levels'
import { dith, type K } from '../pal'
import {
  beam,
  bird,
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

/** Cristo aceso no topo do Corcovado (5 px de envergadura por unidade `u`) */
function cristo(c: Ctx, x: number, y: number, u: number) {
  const { b } = c
  const h = Math.max(4, Math.round(u * 5))
  const arm = Math.max(2, Math.round(u * 2.4))
  halo(c, x, y - h / 2, Math.round(u * 4) + 2, 'crimsonDeep', 0.4)
  b.rect(x, y - h, 1, h, 'stoneHi')
  b.rect(x + 1, y - h + 1, 1, h - 1, 'emberDark')
  b.rect(x - arm, y - h + Math.max(1, Math.round(u * 0.8)), arm * 2 + 2, 1, 'redGlow')
  b.rect(x - arm, y - h + Math.max(1, Math.round(u * 0.8)), arm, 1, 'stoneHi')
  b.set(x, y - h - 1, 'stoneHi')
  b.rect(x - 1, y, 4, 1, 'emberDark')
}

/** Palácio Tiradentes em três quartos: base, colunata, frontão, cúpula com lanterna e estátua */
function palacio(c: Ctx, x: number, base: number, k: number) {
  const { b } = c
  const w = Math.round(k * 34)
  const h = Math.round(k * 15)
  const d = Math.max(2, Math.round(k * 4))
  // corpo principal: frente osso e lateral grossa em granito carmim (lição 2)
  box3(c, {
    x,
    base,
    w,
    h,
    d,
    front: ['stone0', 'stone1', 'stone2', 'stone3'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    roof: 'stone2',
    rim: 'redHot',
  })
  // escadaria
  for (let i = 0; i < Math.max(2, Math.round(k * 2)); i++)
    b.rect(
      x + Math.round(k * 8) - i,
      base + i,
      w - Math.round(k * 16) + i * 2,
      1,
      i % 2 ? 'stone1' : 'stone2',
    )
  // colunata: 6 colunas claras com sombra à direita e janelas acesas entre elas
  const cols = 6
  const cx0 = x + Math.round(k * 7)
  const cw = w - Math.round(k * 14)
  for (let i = 0; i < cols; i++) {
    const px = Math.round(cx0 + (i * cw) / (cols - 1))
    const cwid = Math.max(1, Math.round(k * 1.1))
    b.rect(px, base - h + Math.round(k * 3), cwid, h - Math.round(k * 4), 'stoneHi')
    b.rect(px + cwid, base - h + Math.round(k * 3), 1, h - Math.round(k * 4), 'stone1')
    if (i < cols - 1) {
      const wx = Math.round(px + cw / (cols - 1) / 2)
      b.rect(wx, base - Math.round(k * 9), Math.max(1, Math.round(k)), Math.round(k * 4), 'gold')
      b.set(wx, base - Math.round(k * 9), 'goldHi')
    }
  }
  // frontão triangular sobre a colunata
  const ph = Math.round(k * 5)
  for (let i = 0; i < ph; i++) {
    const half = Math.round(((ph - i) / ph) * (cw / 2 + k * 2))
    b.rect(
      cx0 + Math.round(cw / 2) - half,
      base - h - i,
      half * 2,
      1,
      i === ph - 1 ? 'stoneHi' : i % 2 ? 'stone2' : 'stone3',
    )
  }
  // cúpula com lanterna e estátua
  const dx = cx0 + Math.round(cw / 2)
  const R = Math.round(k * 6)
  const dy = base - h - ph + 1
  for (let y = 0; y <= R; y++)
    for (let xx = -R; xx <= R; xx++) {
      if (xx * xx + y * y * 1.6 > R * R) continue
      const kk: K =
        xx < -R * 0.35 ? 'stoneHi' : xx < R * 0.2 ? 'stone3' : xx < R * 0.7 ? 'stone2' : 'crimsonDeep'
      b.set(dx + xx, dy - y, (xx + 50) % 3 === 0 && kk !== 'crimsonDeep' ? 'stone1' : kk)
    }
  b.rect(dx - 1, dy - R - Math.round(k * 2), 3, Math.round(k * 2), 'stone2')
  b.rect(dx, dy - R - Math.round(k * 4), 1, Math.round(k * 2), 'gold1')
  b.set(dx, dy - R - Math.round(k * 4) - 1, 'goldHi')
  // holofotes dourados lavando a fachada de baixo para cima
  for (const fx of [cx0 + 2, cx0 + cw - 2]) {
    for (let i = 0; i < h + ph; i++)
      if (dith(fx, base - i, 0.45 - i / ((h + ph) * 2.4))) b.set(fx + (i % 3) - 1, base - i, 'gold1')
    b.set(fx, base, 'sparkle')
  }
  halo(c, dx, base - h, Math.round(k * 12), 'gold0', 0.25)
}

const p09: Painter = (c) => {
  const { W, H, s } = c
  const portrait = W < H
  // no celular em pé a grade cobre de 23% a 83%: o horizonte sobe para 21%
  const hz = Math.round(H * (portrait ? 0.21 : 0.58))
  const u = portrait ? s * 0.55 : s
  // 1 · céu: void → night → dusk → blood0 → blood1 → crimsonDeep colado no horizonte; estrelas raras
  sky({ ...c, hz }, 'crimsonDeep', 0.6)
  moon(c, W * (portrait ? 0.84 : 0.86), H * (portrait ? 0.075 : 0.14), s * (portrait ? 3.2 : 5))
  stratus(
    c,
    [
      { x: W * 0.05, y: hz - Math.round(u * 3), len: W * 0.5, th: 2, heat: 0.9 },
      { x: W * 0.55, y: hz - Math.round(u * 6), len: W * 0.4, th: 3, heat: 0.5 },
      { x: W * 0.2, y: hz - Math.round(u * 12), len: W * 0.35, th: 4, heat: 0.15 },
    ],
    94,
  )
  if (!portrait) {
    cumulus(c, 0, W * 0.32, H * 0.3, H * 0.13, 91, 6)
    cumulus(c, W * 0.6, W * 0.82, H * 0.24, H * 0.1, 92, 5)
  }
  // 2 · serra distante (hazeDark, aro crimsonDeep, névoa blood1 no pé)
  const wb = hz - Math.round(u * 1.5)
  hills(c, (x) => wb - u * 6 - c.nz.fbm(x / 30, 5, 3) * u * 7, wb, 'hazeDark', 'crimsonDeep', 'blood1')
  // 3 · Pão de Açúcar e Urca em silhueta contra a água (marco, ~8% da altura no desktop)
  const pa = W * (portrait ? 0.16 : 0.24)
  const ur = W * (portrait ? 0.05 : 0.17)
  const paH = portrait ? u * 15 : H * 0.13
  hills(
    c,
    (x) => {
      const a = (x - pa) / (paH * 0.42)
      const b2 = (x - ur) / (paH * 0.6)
      const sug = Math.abs(a) < 1 ? wb - paH * (1 - a * a) ** 0.55 : wb
      const urca = Math.abs(b2) < 1 ? wb - paH * 0.45 * (1 - b2 * b2) ** 0.8 : wb
      return Math.min(sug, urca, wb - u * 1.5)
    },
    wb,
    'night',
    'blood1',
    'blood0',
  )
  c.b.set(Math.round(pa), Math.round(wb - paH - 1), 'goldHi')
  c.b.set(Math.round(pa) + 1, Math.round(wb - paH), 'gold')
  for (let i = 0; i < paH * 0.6; i += 2)
    c.b.set(
      Math.round(ur + i * 0.9),
      Math.round(wb - paH * 0.45 - i * ((paH * 0.55) / (paH * 0.6))),
      'stone1',
    )
  // 4 · Corcovado: topo arredondado, encosta íngreme, pedra fria mais clara que o céu e faceta quente
  const co = W * (portrait ? 0.66 : 0.7)
  const coH = portrait ? u * 20 : H * 0.2
  const coTop = wb - coH
  hills(
    c,
    (x) => {
      const dx = x - co
      const prof =
        dx < 0
          ? coTop + (-dx / (coH * 0.18)) ** 1.6 * coH * 0.12
          : coTop + (dx / (coH * 0.42)) ** 1.3 * coH * 0.16
      return Math.min(wb - u, prof + c.nz.fbm(x / 6, 3, 2) * u * 1.2)
    },
    wb,
    'stone0',
    'crimsonDeep',
    'blood0',
    'hazeDark',
  )
  // faceta quente do lado da cidade (esquerda) e estrada em zigue-zague acesa
  for (let y = Math.round(coTop + u * 2); y < wb - u * 2; y++)
    for (let x = Math.round(co - coH * 0.35); x < co; x++)
      if (c.b.is(x, y, 'stone0') && dith(x, y, 0.35)) c.b.set(x, y, 'stone1')
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const yy = Math.round(coTop + u * 3 + t * (coH - u * 5))
    const xx = Math.round(co + Math.sin(i * 1.3) * coH * 0.12 * (0.4 + t) + t * coH * 0.2)
    c.b.set(xx, yy, 'blood1')
    if (i % 2 === 0) c.b.set(xx, yy - 1, i % 4 === 0 ? 'goldHi' : 'gold')
  }
  cristo(c, Math.round(co), Math.round(coTop), u * (portrait ? 0.9 : 1.1))
  // 5 · cidade em 3 fileiras no pé dos morros (longe, meio, acesa)
  city(c, 0, W, () => wb, u * 1.5, u * 4, 'far', 95, 0.3)
  city(c, W * 0.25, W * 0.6, () => wb + 1, u * 1, u * 3, 'mid', 96, 0.3)
  // 6 · faixa de água do horizonte: a parte mais clara do meio da tela
  const wh = Math.max(3, Math.round(H * (portrait ? 0.03 : 0.045)))
  const deep = Math.round(wb + H * (portrait ? 0.14 : 0.16))
  horizonWater(c, wb + 1, wh, deep, 97)
  strokes(c, wb + wh + 1, deep, [
    { x: Math.round(co - u * 4), k: 'gold' },
    { x: Math.round(W * 0.42), k: 'ember' },
    { x: Math.round(pa + u * 2), k: 'goldHi', len: 8 },
  ])
  // 7 · o Centro na margem de cá: morro escuro, cidade acesa e o Palácio Tiradentes
  const shore = deep
  for (let y = shore; y < H; y++)
    for (let x = 0; x < W; x++) c.b.set(x, y, c.nz.n2(x / 6, y / 3) > 0.82 ? 'void' : 'night')
  city(c, 0, W, () => shore + Math.round(u * 3), u * 1.5, u * 4, 'lit', 98, 0.45)
  if (portrait) palacio(c, Math.round(W * 0.58), hz + Math.round(u * 1.5), u * 0.55)
  else {
    palacio(c, Math.round(W * 0.77), Math.round(H * 0.8), s * 0.95)
    for (let i = 0; i < 3; i++)
      box3(c, {
        x: Math.round(W * (0.02 + i * 0.07)),
        base: Math.round(H * 0.8),
        w: Math.round(s * (6 + i)),
        h: Math.round(s * (20 - i * 4)),
        d: Math.round(s * 1.5),
        front: ['void', 'night', 'dusk', 'hazeDark'],
        side: ['blood0', 'blood1', 'crimsonDeep'],
        rim: 'crimson',
        win: { rate: 0.3, sx: 2, sy: 2, seed: 30 + i },
      })
  }
  // feixe fino com estrela no nó, gaivotas
  beam(c, Math.round(W * 0.97), hz - H * 0.1, hz, 'crimson')
  star(c, Math.round(W * 0.97), Math.round(hz - H * 0.1), 2)
  bird(c, W * 0.3, hz - u * 14, 'stone1')
  bird(c, W * 0.36, hz - u * 17, 'stone1', false)
  if (!portrait) bird(c, W * 0.9, H * 0.32, 'stone2')
  // 8 · primeiro plano quase preto emoldurando
  frameFg(c, 99, { h: portrait ? 0.08 : 0.12, glowY: H * 0.5 })
}

export default p09
