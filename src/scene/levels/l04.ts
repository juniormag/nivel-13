// Fase 4 · Pará, a floresta à noite com as queimadas no horizonte. A grade de árvores do jogo cobre
// quase toda a tela, então o horizonte sobe para o terço de cima e o resto vira um chão de mata
// escuro e calmo (as árvores do jogo leem por cima). Sete planos: céu, fumaça das queimadas acesa por
// baixo, a linha da floresta queimando ao longe (fria e baixa em contraste), copas do meio em
// silhueta, o rio com reflexos quebrados, o chão de mata e o primeiro plano quase preto com as
// sapopemas da sumaúma e folhas grandes. Luz: brasa das queimadas (rim vermelho de cima), lua em
// eclipse, vaga-lumes (práticos, verde-claro).
import { clump, cumulus, fgFrame, haze, horizonGlow, streaks } from '../../games/fx-a'
import { mulberry32 } from '../../lib/rng'
import { type Ctx, calm, moon, type Painter, sky } from '../levels'
import { dith, type K } from '../pal'

/** posições compartilhadas com o jogo (clarões das queimadas vivos) */
export function anchors(W: number, H: number) {
  const mob = W < H
  const hz = Math.round(H * (mob ? 0.13 : 0.17))
  const fires = (mob ? [0.18, 0.62, 0.9] : [0.1, 0.36, 0.6, 0.86]).map((f) => ({
    x: Math.round(W * f),
    y: hz,
  }))
  return { mob, hz, fires }
}

/** sumaúma de primeiro plano: tronco grosso com sapopemas (raízes em aleta), silhueta com rim */
function sumauma(c: Ctx, x: number, w: number, dir: number) {
  const { b, H } = c
  for (let y = 0; y < H; y++) {
    const t = y / H
    const ww = Math.round(w * (0.55 + (t > 0.75 ? ((t - 0.75) / 0.25) ** 2 * 1.6 : 0)))
    for (let i = 0; i < ww; i++) {
      const xx = dir > 0 ? x + i : x - i
      const edge = i === ww - 1
      const inner = dir > 0 ? i : ww - 1 - i
      const fiss = (inner * 3 + Math.floor(y / 6)) % 5 === 0
      let k: K = fiss ? 'void' : inner > ww - 4 ? 'night' : 'void'
      if (edge) k = t < 0.55 ? 'crimsonDeep' : 'blood0'
      else if (inner === ww - 2 && t < 0.55 && y % 2) k = 'blood0'
      b.set(xx, y, k)
    }
    // casca: frestas verticais
    if (y % 5 === 0) b.set(dir > 0 ? x + (ww >> 1) : x - (ww >> 1), y, 'night')
  }
  // aletas da raiz
  for (let k = 0; k < 3; k++) {
    const rx = x + dir * (w * 0.5 + k * w * 0.35)
    for (let y = Math.round(H * (0.82 + k * 0.05)); y < H; y++) {
      const t = (y - H * (0.82 + k * 0.05)) / (H * 0.18)
      for (let i = 0; i < 2 + t * 4; i++) b.set(rx + dir * i, y, i === 0 ? 'blood0' : 'void')
    }
  }
}

const painter: Painter = (c) => {
  const { W, H, b } = c
  const A = anchors(W, H)
  const hz = A.hz
  const r = mulberry32(404)
  // plano 1: céu baixo, mais quente no horizonte das queimadas
  const cc = { ...c, hz }
  sky(cc, 'blood1', 1)
  horizonGlow(cc, Math.round(H * 0.04), 'blood0', 'emberDark')
  moon(c, W * (A.mob ? 0.5 : 0.24), H * (A.mob ? 0.05 : 0.07), c.s * (A.mob ? 3.6 : 3.4))
  // plano 2: fumaça das queimadas subindo, acesa por baixo
  // fumaça das queimadas em bancos de nuvem, a base acesa pelo fogo (lição 6)
  cumulus(
    c,
    hz - Math.round(H * 0.012),
    H * (A.mob ? 0.04 : 0.07),
    A.fires.map((f) => [f.x / W - 0.08, f.x / W + 0.08] as [number, number]),
    50,
  )
  // plano 3: linha da floresta ao longe queimando (baixo contraste, clarões na borda)
  for (let x = 0; x < W; x++) {
    const top = Math.round(hz - 2 - c.nz.fbm(x / 6, 1, 3) * H * 0.025)
    for (let y = top; y < hz + 3; y++) b.set(x, y, y === top ? 'blood1' : 'blood0')
    for (const f of A.fires) {
      const d = Math.abs(x - f.x)
      if (d < 10 && dith(x, top - 1, 1 - d / 10)) {
        b.set(x, top - 1, d < 3 ? 'emberBright' : d < 6 ? 'ember' : 'red')
        if (d < 5) b.set(x, top, 'redHot')
      }
    }
  }
  // plano 4: copas do meio em silhueta (só o contorno de cima leva o rim vermelho do incêndio)
  for (let x = 0; x < W; x++) {
    const top = Math.round(hz + 4 - (c.nz.fbm(x / 10, 4, 3) + Math.max(0, Math.sin(x / 9)) * 0.4) * H * 0.03)
    for (let y = top; y < hz + H * 0.06; y++)
      b.set(x, y, y === top ? 'crimsonDeep' : y < top + 2 ? 'blood0' : 'void')
  }
  haze(c, hz - H * 0.04, hz + 2, 'blood0', 0.25)
  // plano 5: o rio, faixa escura com os clarões refletidos em traços quebrados
  const ry0 = Math.round(hz + H * 0.06)
  const ry1 = Math.round(hz + H * (A.mob ? 0.1 : 0.13))
  for (let y = ry0; y < ry1; y++)
    for (let x = 0; x < W; x++) {
      const n = c.nz.n2(x / 9, y * 0.9)
      b.set(x, y, n > 0.78 ? 'blue0' : n > 0.6 ? 'night' : 'void')
    }
  for (const f of A.fires) streaks(c, f.x, ry0 + 1, ry1 - ry0, 'ember', 3)
  // plano 6: chão de mata escuro e calmo (as árvores do jogo leem por cima)
  for (let y = ry1; y < H; y++) {
    const t = (y - ry1) / (H - ry1)
    for (let x = 0; x < W; x++) {
      const n = c.nz.fbm(x / 14, y / 9, 3)
      // trilhas de folhiço um pouco mais claras, em manchas largas e raras
      let k: K = n > 0.7 && dith(x, y, (n - 0.7) * 6) ? 'vine0' : t < 0.5 && n < 0.35 ? 'night' : 'void'
      if (t < 0.08 && dith(x, y, 0.5 - t * 6)) k = 'night'
      b.set(x, y, k)
    }
  }
  // samambaias e moitas baixas em cacho, bem escuras
  for (let i = 0; i < W / 10; i++) {
    const x = r() * W
    const y = ry1 + 4 + r() * (H - ry1)
    clump(b, x, y, 2 + r() * 3, ['void', 'void', 'vine0', 'vine1'], Math.floor(r() * 1e6))
  }
  // vaga-lumes
  for (let i = 0; i < W / 8; i++) b.set(r() * W, ry1 + r() * (H - ry1), r() < 0.6 ? 'leafHi' : 'goldHi')
  calm(c, 0.55, 0.42, 0.42)
  // plano 7: primeiro plano quase preto: sumaúmas nas bordas e folhas grandes
  sumauma(c, 0, Math.round(W * (A.mob ? 0.06 : 0.045)), 1)
  sumauma(c, W - 1, Math.round(W * (A.mob ? 0.06 : 0.045)), -1)
  fgFrame(c, 41, 'crimson', 'blood0', 0.22, A.mob ? 0.04 : 0.07)
  for (const [x, dir] of [
    [0.06, 1],
    [0.94, -1],
  ] as const)
    clump(
      b,
      W * x,
      H - H * 0.03,
      A.mob ? 7 : 9,
      ['void', 'void', 'void', 'vine0'],
      77 + dir,
      'crimsonDeep',
      dir < 0,
    )
}

export default painter
