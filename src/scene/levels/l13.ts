// Fase 13 · A Grande Fake, Esplanada dos Ministérios. Arena do chefe: céu de tempestade vermelha com o
// eclipse grande atrás da cabeça do meio (o chefe fica em contraluz), nuvens com a base acesa pela cidade,
// a Esplanada em três quartos convergindo para o Congresso (torres gêmeas, cúpula e cuia, acesos), névoa
// púrpura entre os planos, espelho d'água com reflexos quebrados e jornais caídos no chão. O horizonte
// sobe para 52% da tela: a pergunta do chefe cobre a metade de baixo no celular e no desktop.
// 7 planos: céu · eclipse · nuvens altas · nuvens baixas · ministérios ao longe · Congresso/ministérios
// perto · espelho d'água e chão · primeiro plano quase preto.
import { mulberry32 } from '../../lib/rng'
import { type Ctx, clouds, moon, type Painter, sky } from '../levels'
import { dith, type K } from '../pal'
import { beam, bird, box3, fog, frameFg, halo, haze, lights, pool, star, strokes } from './c-kit'

/** Congresso: torres gêmeas com a passarela, plataforma longa, cúpula (Senado) e cuia (Câmara) */
function congresso(c: Ctx, cx: number, hz: number, k: number) {
  const { b } = c
  const th = Math.round(k * 30)
  // torres em três quartos: frente osso, lateral carmim
  for (const dx of [-Math.round(k * 3.2), Math.round(k * 0.8)])
    box3(c, {
      x: cx + dx,
      base: hz - Math.round(k * 3),
      w: Math.max(2, Math.round(k * 2.2)),
      h: th,
      d: Math.max(1, Math.round(k * 0.9)),
      front: ['stone1', 'stone2', 'stone3', 'stoneHi'],
      side: ['blood0', 'blood1', 'crimsonDeep'],
      rim: 'redHot',
      win: { rate: 0.5, sx: 2, sy: 2, seed: 13 + dx },
    })
  b.rect(
    cx - Math.round(k * 1),
    hz - Math.round(th * 0.62),
    Math.round(k * 1.8),
    Math.max(1, Math.round(k * 1.2)),
    'stone2',
  )
  // plataforma longa com chanfro
  box3(c, {
    x: cx - Math.round(k * 24),
    base: hz,
    w: Math.round(k * 48),
    h: Math.max(2, Math.round(k * 3)),
    d: Math.max(2, Math.round(k * 1.5)),
    front: ['stone0', 'stone1', 'stone2', 'stone3'],
    side: ['blood0', 'blood1', 'crimsonDeep'],
    rim: 'crimson',
  })
  const top = hz - Math.round(k * 3)
  // cúpula (esquerda, para cima) e cuia (direita, aberta)
  const dome = (x: number, r: number, up: boolean) => {
    for (let y = 0; y <= r * 0.6; y++)
      for (let xx = -r; xx <= r; xx++) {
        const inside = up
          ? xx * xx + (y / 0.6) ** 2 <= r * r
          : Math.abs(xx) <= r * (0.4 + (y / (r * 0.6)) * 0.6)
        if (!inside) continue
        const yy = up ? top - 1 - y : top - 1 - Math.round(r * 0.6) + y
        const kk: K =
          xx < -r * 0.35 ? 'stoneHi' : xx < r * 0.35 ? 'stone3' : xx < r * 0.8 ? 'stone2' : 'crimsonDeep'
        b.set(x + xx, yy, kk)
      }
    halo(c, x, top - r * 0.3, Math.round(r * 1.4), 'crimsonDeep', 0.35)
  }
  dome(cx - Math.round(k * 14), Math.round(k * 5), true)
  dome(cx + Math.round(k * 14), Math.round(k * 7), false)
  // luz própria do marco: as janelas das torres acesas + estrela no topo
  star(c, cx - Math.round(k * 2), hz - th - Math.round(k * 3) - 2, 2)
}

const p13: Painter = (c) => {
  const { W, H, s } = c
  const hz = Math.round(H * 0.52)
  const cx = Math.round(W / 2)
  const wide = W > H
  const r = mulberry32(1313)
  // 1 · céu: preto em cima, carmim no horizonte (tempestade acesa pela cidade)
  sky({ ...c, hz }, 'crimson', 0.9)
  // 2 · eclipse grande atrás da cabeça do meio: o chefe em contraluz
  moon(c, cx, Math.round(wide ? H * 0.2 : H * 0.23), s * (wide ? 6.5 : 6))
  // 3–4 · nuvens: alta escura com a borda acesa embaixo, baixa grande com a base acesa (lição 6)
  clouds({ ...c, hz }, hz - H * 0.24, H * 0.05, 'bottom', 1.8, 131, [
    [0, 0.3],
    [0.72, 1],
  ])
  clouds({ ...c, hz }, hz - H * 0.07, H * 0.09, 'bottom', 1.2, 137, [
    [0, 0.34],
    [0.66, 1],
  ])
  // 5 · ministérios ao longe (mais claros, frios e baixos: névoa púrpura)
  const k = s * (wide ? 0.95 : 0.8)
  // do fundo (perto do eixo, pequenos e enevoados) para a frente (bordas, grandes e escuros)
  const N = wide ? 8 : 6
  let off = k * 23
  for (let i = 0; i < N; i++) {
    const d = 0.42 + (i / (N - 1)) * 0.75
    const w = Math.round(k * 7 * d)
    const h = Math.round(k * 12 * d)
    const far = i < N / 2
    for (const side of [-1, 1] as const) {
      const x = Math.round(cx + side * off - (side < 0 ? w : 0))
      box3(c, {
        x,
        base: hz + Math.round(i * 0.6),
        w,
        h,
        d: Math.max(1, Math.round(k * 2.6 * d)),
        dir: side > 0 ? -1 : 1,
        front: far ? ['hazeDark', 'hazeDark', 'haze', 'stone1'] : ['stone0', 'stone0', 'stone1', 'stone2'],
        side: far ? ['dusk', 'blood0', 'blood1'] : ['blood0', 'blood1', 'crimsonDeep'],
        rim: far ? undefined : 'crimson',
        win: { rate: far ? 0.22 : 0.4, sx: 2, sy: 2, seed: 50 + i * 7 + side },
      })
    }
    off += w + k * 3.2 * d + 2
  }
  haze(c, 0, hz - k * 16, W, hz + 1, 'hazeDark', 0.35)
  // 6 · Congresso no fim do eixo
  congresso(c, cx, hz, k * (wide ? 0.7 : 1.05))
  // cidade em 1 px no pé dos ministérios
  lights(c, 0, Math.round(W * 0.3), hz - 3, hz, 0.5, 71)
  lights(c, Math.round(W * 0.7), W, hz - 3, hz, 0.5, 73)
  // holofotes da arena: feixes finos subindo nas laterais
  beam(c, Math.round(W * 0.07), hz - H * 0.3, hz, 'crimson')
  beam(c, Math.round(W * 0.93), hz - H * 0.27, hz, 'crimson')
  beam(c, Math.round(W * 0.2), hz - H * 0.22, hz, 'blood1')
  beam(c, Math.round(W * 0.8), hz - H * 0.24, hz, 'blood1')
  // 7 · espelho d'água com reflexos quebrados e o chão escuro
  const py = Math.round(hz + H * 0.13)
  pool(c, hz + 1, py, 'crimsonDeep')
  strokes(c, hz + 1, py, [
    { x: cx - Math.round(k * 2), k: 'stoneHi', len: py - hz - 2 },
    { x: cx + Math.round(k * 2), k: 'stoneHi', len: py - hz - 4 },
    { x: Math.round(W * 0.12), k: 'gold' },
    { x: Math.round(W * 0.88), k: 'gold' },
  ])
  for (let y = py; y < H; y++)
    for (let x = 0; x < W; x++) c.b.set(x, y, c.nz.n2(x / 5, y / 2) > 0.78 ? 'night' : 'void')
  fog(c, py, py + Math.round(H * 0.04), 'blood0', 0.6)
  // jornais caídos no chão (a fake espalhada), escuros para não competir
  for (let i = 0; i < 18; i++) {
    const x = Math.round(r() * W)
    const y = Math.round(py + 3 + r() * (H - py - 6))
    const w = 3 + Math.round(r() * 3)
    c.b.rect(x, y, w, 2, r() < 0.2 ? 'blood1' : 'stone0')
    c.b.rect(x, y, w, 1, r() < 0.3 ? 'stone1' : 'stone0')
  }
  // pássaros fugindo da tempestade e brilhos de 4 pontas nos nós de luz
  bird(c, W * 0.18, hz - H * 0.3, 'stone1')
  bird(c, W * 0.24, hz - H * 0.33, 'stone1', false)
  bird(c, W * 0.82, hz - H * 0.37, 'stone1')
  star(c, Math.round(W * 0.07), Math.round(hz - H * 0.3), 2)
  star(c, Math.round(W * 0.93), Math.round(hz - H * 0.27), 2)
  // centro escuro onde a hidra vive: só o céu atrás do corpo, sem textura
  for (let y = Math.round(hz - H * 0.18); y < hz - k * 2; y++)
    for (let x = Math.round(W * 0.3); x < W * 0.7; x++)
      if (c.b.is(x, y, 'dusk') && dith(x, y, 0.5)) c.b.set(x, y, 'night')
  // 8 · primeiro plano quase preto emoldurando
  frameFg(c, 1313, { h: 0.1, glowY: hz })
}

export default p13
