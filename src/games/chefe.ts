// Fase 13 · A Grande Fake: a hidra de boatos. Cada cabeça só cai com o fato certo.
// Chefe em três quartos (ref v2): corpo-monte de jornal com frente clara e lateral de granito carmim,
// espinhos de papel dobrado, garras no chão e fitas de energia vermelha passando na frente e atrás.
// 5 cabeças de dragão de origami (chifres, sobrancelha raivosa, mandíbula que abre em 3 quadros).
// Fases visuais de dano: a cada cabeça derrubada o corpo abre um rasgo com o núcleo em brasa, o pescoço
// vira toco queimado, a barra do chefe perde 1 segmento e as fitas perdem força.
// Feel (números, iguais ao legado): 14 s por cabeça; bote = antecipação 300 ms (recua, "!" e mira
// piscando, olhos brancos), avanço 80 ms com 2 silhuetas de smear, recuperação 320 ms; o dano chega no
// contato. Cabeça certa: raio dourado do fato até a cabeça, hit-stop 180 ms com a cabeça em branco e
// depois vermelho, explosão de papel, feixes de luz, moedas voando ao contador. Fim: 11 estouros em
// 1,4 s com feixes subindo dos rasgos, depois impacto dourado, anel de 110 px e faixa "A GRANDE FAKE CAIU".
// Pontos = 200 + até 120 pela rapidez.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { stinger } from '../audio/audio'
import type { GameCtx, MicroGame } from '../engine/types'
import { shuffle } from '../lib/rng'
import { Banner, BossBar, FlyToHud, graniteAt, poly, Rays, Ribbons, solidTex, warnTex } from './fx-c'
import {
  bake,
  clamp01,
  Debris,
  domRect,
  Embers,
  Explosions,
  easeInQuad,
  easeOutBack,
  easeOutQuad,
  el,
  energyDot,
  goldPulse,
  hintPulse,
  impact,
  joy,
  P,
  type Painter,
  ScorePops,
  Sparkles,
  shakeEl,
  stop,
  Timers,
  tactile,
} from './kit-b'

// Textos factuais (revisados): mesmos do jogo legado. Fontes em src/content/facts.ts, ids 'fome'
// (FAO/ONU jul/2025 e jul/2026), 'ir' (Lei 15.270/2025), 'julgamento' (STF 11/09/2025),
// 'floresta' (PRODES/INPE 2025) e 'emprego' (PNAD Contínua/IBGE).
const ROUNDS = [
  {
    claim: 'O Brasil voltou ao Mapa da Fome.',
    right: 'A ONU tirou o Brasil do Mapa da Fome em 2025, e ele seguiu fora em 2026.',
    wrong: [
      'Não existe nenhum dado oficial sobre fome no Brasil.',
      'A fome só caiu em outros países da América do Sul.',
    ],
  },
  {
    claim: 'Isenção do IR é mentira: quem ganha R$ 5 mil continua pagando.',
    right: 'Desde janeiro de 2026, quem ganha até R$ 5 mil por mês não paga IR, nem no 13º.',
    wrong: [
      'A isenção só vale para quem ganha mais de R$ 10 mil.',
      'A lei foi aprovada, mas só começa a valer em 2030.',
    ],
  },
  {
    claim: 'Bolsonaro foi inocentado da trama golpista.',
    right: 'O STF condenou Bolsonaro a 27 anos e 3 meses em setembro de 2025, por 4 a 1.',
    wrong: ['O processo foi arquivado sem julgamento.', 'O STF nunca abriu processo contra ele.'],
  },
  {
    claim: 'O desmatamento na Amazônia disparou.',
    right: 'Caiu pelo quarto ano seguido: 5.796 km² em 2025, a menor área em 11 anos (INPE).',
    wrong: ['O INPE parou de medir o desmatamento em 2023.', 'Subiu 50% em 2025, segundo o INPE.'],
  },
  {
    claim: 'O desemprego está no maior nível da história.',
    right: 'Chegou a 5,1% no fim de 2025, o menor da série do IBGE, iniciada em 2012.',
    wrong: ['O IBGE não divulga mais a taxa de desemprego.', 'Passou de 15% em 2026.'],
  },
]

const PER = 14
const WIND = 0.3
const LUNGE = 0.08
const RECOVER = 0.32
// escala da arte da cabeça (base 32×26 + 5 de mandíbula); cresce quando há espaço (celular em pé)
let HF = 0.8
let BHF = 0.9
let HW = 26
let HH = 25
let BHW = 29
let BHH = 28

interface Head {
  alive: boolean
  phase: number
  dieT: number
  /** tempo real do golpe final (quadros branco → vermelho durante o hit-stop) */
  dieReal: number
  exploded: boolean
  s: Sprite
  attackT: number
  biteT: number
  blinkT: number
  x: number
  y: number
}

/** gerador local estável para a arte */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const hash = (x: number, y: number) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const headSize = (f: number) => ({ w: Math.ceil(36 * f) + 2, h: Math.ceil(36 * f) + 2 })
/** posição dos olhos na textura da cabeça (para o brilho aditivo) */
const EYE = { y: 14.5, x1: 13.5, x2: 22 }

/**
 * Cabeça de dragão de origami feita de jornal, em três quartos: leque de jornal plissado atrás (a
 * manchete vermelha corre na borda), chifres de papel varridos para trás, crânio osso (stoneHi→stone2)
 * com lateral direita grossa em granito carmim, sobrancelhas raivosas, olhos em fenda e focinho com
 * presas. `jaw` 0 fechada, 1 entreaberta, 2 escancarada; `eye` 0 brasa, 1 acesa (ativa), 2 branca
 * (bote), 3 piscando; `burn` 0..2 queima as pontas do leque e dos chifres.
 */
function headTex(f: number, jaw: number, eye: number, burn: number): Texture {
  const { w, h } = headSize(f)
  return bake(`hydra3-${f}-${jaw}${eye}${burn}`, w, h, (p) => {
    const o = 1
    const d = jaw === 0 ? 0 : jaw === 1 ? 2 : 5
    const Q = (pts: number[], col: number) => poly(p, pts, col, f, o, o)
    const R = (x: number, y: number, ww: number, hh: number, col: number) =>
      p.rect(
        Math.round(o + x * f),
        Math.round(o + y * f),
        Math.max(1, Math.round(ww * f)),
        Math.max(1, Math.round(hh * f)),
        col,
      )
    // leque plissado atrás da cabeça (silhueta grande e única)
    for (let Y = 0; Y < h; Y++)
      for (let X = 0; X < w; X++) {
        const bx = (X + 0.5 - o) / f
        const by = (Y + 0.5 - o) / f
        if (by > 21) continue
        const a = Math.atan2(by - 15, bx - 18)
        const dd = Math.hypot(bx - 18, by - 15)
        const sc = 0.82 + 0.18 * Math.abs(Math.cos(a * 4.5))
        if (dd > 17 * sc || dd < 5) continue
        const pleat = Math.floor((a + Math.PI) / (Math.PI / 9)) % 2
        const side = bx > 24
        let col: number = side ? (pleat ? P.blood1 : P.crimsonDeep) : pleat ? P.stone2 : P.stone3
        if (dd > 17 * sc - 2.2) col = side ? P.crimson : pleat ? P.crimson : P.red
        if (dd > 17 * sc - 1.2 && !side && pleat === 0) col = P.redHot
        if (burn > 0 && dd > 17 * sc - 1.6 && hash(X, Y) < (burn > 1 ? 0.6 : 0.3))
          col = burn > 1 && hash(Y, X) < 0.5 ? P.ember : P.emberDark
        p.dot(X, Y, col)
      }
    // boca por dentro (atrás de tudo): garganta em brasa
    if (d > 0) {
      Q([12, 24, 25, 24, 23, 27 + d, 14, 27 + d], P.blood0)
      Q([15, 25 + d * 0.4, 22, 25 + d * 0.4, 21, 27 + d, 16, 27 + d], P.crimsonDeep)
      R(17, 25 + d * 0.5, 3, 1, jaw === 2 ? P.redHot : P.crimson)
      if (jaw === 2) R(18, 25 + d * 0.5, 1, 1, P.emberBright)
    }
    // mandíbula: frente, lateral e dentes de baixo
    Q([12, 26 + d, 24, 26 + d, 22, 30 + d, 14, 30 + d], P.stone2)
    Q([13, 28.5 + d, 23, 28.5 + d, 22, 30 + d, 14, 30 + d], P.stone1)
    Q([24, 26 + d, 28, 27 + d, 26, 30 + d, 22, 30 + d], P.blood1)
    for (let x = 14; x <= 22; x += 2) R(x, 25 + d, 1, 1, P.stoneHi)
    // chifres varridos para trás
    Q([13, 8, 3, 0, 1, 0, 5, 2.5, 12, 10], P.stone3)
    Q([13, 8, 3, 0, 1, 0, 4, 1], P.stoneHi)
    Q([24, 8, 33, 0, 35, 0, 31, 3, 26, 10], P.crimsonDeep)
    Q([24, 8, 33, 0, 35, 0, 32, 1], P.crimson)
    // crânio: lateral grossa em granito e frente osso
    Q([25, 6, 31, 9, 31, 16, 27, 17, 28, 11], P.crimsonDeep)
    Q([28, 12, 31, 13, 31, 16, 27, 17], P.blood1)
    Q([11, 6, 25, 6, 28, 11, 27, 17, 9, 17, 8, 11], P.stone3)
    Q([11, 6, 25, 6, 26.5, 9, 9.5, 9], P.stoneHi)
    for (let x = 12; x < 24; x++) if (x % 4 !== 3) R(x, 7.4, 1, 1, P.stone3)
    // chanfro frente/lateral com highlight de 1 px
    Q([24.6, 6, 25.6, 6, 28.6, 11, 27.6, 11], P.stoneHi)
    // sobrancelhas raivosas
    Q([8, 10, 17.5, 13, 17.5, 14.6, 8, 12], P.stone0)
    Q([28, 10, 19, 13, 19, 14.6, 28, 12], P.stone0)
    // olhos em fenda
    if (eye === 3) {
      R(10, 14, 6, 1, P.void)
      R(20, 14, 6, 1, P.void)
    } else {
      Q([9, 12.6, 17, 14.6, 16.4, 16.4, 10, 15.4], P.void)
      Q([27, 12.6, 19.5, 14.6, 20, 16.4, 26, 15.4], P.void)
      const ec = eye === 2 ? P.white : eye === 1 ? P.redHot : P.red
      R(12, 14.4, 3, 1.2, ec)
      R(21, 14.4, 3, 1.2, ec)
      if (eye >= 1) {
        R(13, 14.4, 1, 1, eye === 2 ? P.white : P.sparkle)
        R(22, 14.4, 1, 1, eye === 2 ? P.white : P.sparkle)
      }
    }
    // focinho em dobra de origami, lateral escura
    Q([9, 17, 27, 17, 25, 25, 12, 25], P.stone3)
    Q([18.5, 17, 27, 17, 25, 25, 18.5, 25], P.stone2)
    Q([10.5, 21, 26, 21, 25, 25, 12, 25], P.stone2)
    Q([18.5, 21, 26, 21, 25, 25, 18.5, 25], P.stone1)
    Q([27, 17, 31, 18, 28, 25, 25, 25], P.blood1)
    Q([27, 17, 31, 18, 31, 19, 26.8, 18], P.crimsonDeep)
    Q([9, 17, 11, 17, 12.5, 24, 11, 23], P.stoneHi)
    // narinas e presas
    R(14, 22, 2, 1, P.void)
    R(21, 22, 2, 1, P.void)
    for (let x = 13; x <= 24; x += 2) R(x, 25, 1, 1, P.stoneHi)
    R(13, 25, 1, d > 0 ? 3 : 2, P.sparkle)
    R(23, 25, 1, d > 0 ? 3 : 2, P.stoneHi)
    if (burn > 1) {
      R(1, 0, 2, 1, P.ember)
      R(33, 0, 2, 1, P.emberBright)
    }
    p.outline(P.void, P.stone0)
    p.rim(P.redHot, 'r')
  })
}

/**
 * Disco de pescoço em três quartos (frente clara, crescente lateral carmim). Desenhado em 2 passes:
 * `shell` = só a silhueta escura 1 px maior (contorno do tubo inteiro), depois os discos sem contorno,
 * para o pescoço ler como um tubo liso e não como molas. kind 1 = faixa de manchete, 2 = toco queimado.
 */
function neckTex(r: number, kind: number, shell = false): Texture {
  const S = 2 * r + 5
  return bake(`hydra3-neck${r}-${kind}${shell ? 's' : ''}`, S, S, (p) => {
    const cx = r + 1.5
    const cy = r + 1.5
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - cx
        const dy = y + 0.5 - cy
        const sx = dx - 1.6
        const sy = dy - 0.8
        if (shell) {
          const R1 = r + 1
          if (dx * dx + dy * dy <= R1 * R1 || sx * sx + sy * sy <= R1 * R1) p.dot(x, y, P.void)
          continue
        }
        const inF = dx * dx + dy * dy <= r * r
        const inS = sx * sx + sy * sy <= r * r
        if (!inF && !inS) continue
        if (!inF) {
          p.dot(x, y, graniteAt(x, y, P.crimsonDeep, P.blood1, P.crimson))
          continue
        }
        const l = -(dx * 0.8 + dy * 0.3) / (r * 0.9)
        let col: number = l > 0.45 ? P.stoneHi : l > 0 ? P.stone3 : l > -0.5 ? P.stone2 : P.stone1
        if (kind === 1 && Math.abs(dy) <= 0.6) col = l > 0 ? P.red : P.crimson
        if (kind === 2) {
          const k = Math.hypot(dx, dy) / r
          col = k < 0.35 ? P.redHot : k < 0.6 ? P.ember : hash(x, y) < 0.3 ? P.emberDark : P.blood1
        }
        p.dot(x, y, col)
      }
  })
}

/** centros dos rasgos de dano no corpo (u: -1..1 na frente, v: 0 topo .. 1 chão) */
const RIFTS = [
  { u: -0.42, v: 0.42, s: 1 },
  { u: 0.36, v: 0.32, s: 1.1 },
  { u: -0.08, v: 0.62, s: 1.25 },
  { u: 0.62, v: 0.6, s: 0.9 },
  { u: -0.7, v: 0.7, s: 0.8 },
]

/**
 * Corpo em três quartos: monte de jornais em escamas (frente osso com hue shift) e lateral grossa em
 * granito carmim; espinhos de papel dobrado no dorso, garras no chão, rede de rachaduras com lábio
 * claro (lição 4) e, por `stage` (cabeças derrubadas), rasgos com o núcleo em brasa e papel chamuscado.
 */
function bodyTex(bw: number, bh: number, stage: number): Texture {
  return bake(`hydra2-body${bw}x${bh}-${stage}`, bw, bh, (p: Painter) => {
    const D = Math.max(4, Math.round(bw * 0.07))
    const fw = bw - D - 2
    const spikeH = Math.max(5, Math.round(bh * 0.2))
    const top0 = spikeH + Math.ceil(D / 2)
    const bot = bh - 2
    const Hd = bot - top0
    const yT = (x: number) => {
      const u = (x + 0.5 - fw / 2) / (fw / 2)
      const e = 1 - Math.abs(u) ** 2.4
      return top0 + Hd * (1 - Math.sqrt(Math.max(0, e)))
    }
    const isFront = (x: number, y: number) => x >= 1 && x < fw + 1 && y >= yT(x - 1) && y <= bot
    const kind = new Uint8Array(bw * bh) // 0 vazio, 1 frente, 2 lateral
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        if (isFront(x, y)) {
          kind[y * bw + x] = 1
          continue
        }
        for (let dd = 1; dd <= D; dd++)
          if (isFront(x - dd, Math.round(y + dd * 0.5)) && y <= bot) {
            kind[y * bw + x] = 2
            break
          }
      }
    const r = seeded(77)
    const STEP = [P.stone1, P.stone2, P.stone3, P.stoneHi]
    // rasgos abertos neste estágio
    const rifts = RIFTS.slice(0, stage).map((q, i) => ({
      x: 1 + ((q.u + 1) / 2) * fw,
      y: top0 + q.v * Hd,
      a: Math.max(2.2, fw * 0.03 * q.s * (1 + i * 0.1)),
      b: bh * 0.2 * q.s * (1 + i * 0.08),
    }))
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const kd = kind[y * bw + x]
        if (!kd) continue
        if (kd === 2) {
          // lateral: granito carmim pontilhado; chanfro claro na aresta de cima; base mais escura
          const up = y > 0 ? kind[(y - 1) * bw + x] : 0
          let col = graniteAt(x, y, P.crimsonDeep, P.blood1, P.crimson)
          if (y > bot - 3) col = graniteAt(x, y, P.blood1, P.blood0, P.crimsonDeep)
          if (!up) col = P.crimson
          p.dot(x, y, col)
          continue
        }
        const u = (x - 0.5 - fw / 2) / (fw / 2)
        const top = yT(x - 1)
        const v = (y - top) / Math.max(1, bot - top)
        // luz de cima-esquerda (lua/eclipse), sombra puxando para violeta
        let L = 0.68 - u * 0.32 - v * 0.72 - (y - top0) / (bh * 4)
        if (y - top < 1.2) L += 0.35
        let i = L > 0.62 ? 3 : L > 0.4 ? 2 : L > 0.16 ? 1 : 0
        // escamas de jornal (dragão de papel): fileiras curvas acompanham o domo, borda de baixo em arco
        const ry = y + u * u * 7
        const RH = 6
        const row = Math.floor(ry / RH)
        const inRow = ry - row * RH
        const SW = 11
        const sx = x + (row % 2) * 5.5 + hash(row, 3) * 3
        const col = Math.floor(sx / SW)
        const lx = (sx - col * SW + 0.5 - SW / 2) / (SW / 2)
        const arc = RH * 0.35 + RH * 0.65 * Math.sqrt(Math.max(0, 1 - lx * lx))
        if (inRow > arc + 0.2) i = Math.max(0, i - 1)
        else if (inRow > arc - 0.9) i = Math.max(0, i - 2)
        else if (inRow < 1.2 && lx < 0.3 && i < 3) i++
        else if (inRow >= 2 && inRow < 3 && Math.abs(lx) < 0.6 && Math.floor(sx) % 3 !== 0 && i >= 2) i--
        let c: number = STEP[i] ?? P.stone1
        if (inRow >= 1 && inRow < 2 && Math.abs(lx) < 0.7 && hash(row, col) < 0.14)
          c = i >= 2 ? P.red : P.crimson
        // luz vermelha do chão na base (núcleo e brasas)
        if (y > bot - 2) c = i >= 2 ? P.stone2 : P.blood1
        if (y === bot) c = P.crimsonDeep
        // chamuscado e rasgos (dano)
        for (const q of rifts) {
          const nx = (x - q.x - Math.sin((y - q.y) * 0.9) * q.a * 0.55) / q.a
          const ny = (y - q.y) / q.b
          const j = 1 + (hash(x, y) - 0.5) * 0.25 + Math.sin(ny * 5 + q.x) * 0.12
          const dd = Math.sqrt(nx * nx + ny * ny) / j
          if (dd < 1) {
            c = dd < 0.3 ? P.goldHi : dd < 0.55 ? P.emberBright : dd < 0.8 ? P.redHot : P.red
            if (dd < 0.15) c = P.white
            break
          }
          if (dd < 1.18) {
            c = P.void
            break
          }
          if (dd < 1.7 && hash(x + 7, y) < 1.7 - dd) c = dd < 1.4 ? P.emberDark : P.blood1
        }
        p.dot(x, y, c)
      }
    // rede de rachaduras: linha escura de 1 px e lábio claro do lado da luz
    for (let k = 0; k < 4; k++) {
      let x = 1 + fw * (0.15 + r() * 0.7)
      let y = yT(x) + 2
      const n = Math.round(Hd * (0.4 + r() * 0.4))
      for (let s = 0; s < n; s++) {
        const X = Math.round(x)
        const Y = Math.round(y)
        if (kind[Y * bw + X] === 1) {
          p.dot(X, Y, P.stone0)
          if (kind[Y * bw + X - 1] === 1) p.dot(X - 1, Y, P.stoneHi)
        }
        x += r() < 0.5 ? (r() < 0.5 ? 1 : -1) : 0
        y += 1
        if (r() < 0.1) x += r() < 0.5 ? 2 : -2
      }
    }
    // espinhos de papel dobrado no dorso (inclinados para trás, com face escura)
    const NS = 6
    for (let k = 0; k < NS; k++) {
      const xc = 1 + fw * (0.14 + (0.72 * k) / (NS - 1))
      const base = yT(xc) + 3
      const hgt = spikeH * (0.75 + 0.5 * Math.sin((k / (NS - 1)) * Math.PI)) + 2
      const hw = Math.max(3, fw * 0.045)
      const ax = xc + hw * 0.6
      const ay = base - hgt
      poly(p, [xc - hw, base, ax, ay, xc + hw, base], P.stone3)
      poly(p, [xc - hw, base, ax, ay, xc - hw * 0.1, base], P.stoneHi)
      poly(p, [ax, ay, xc + hw + 2, base - 1, xc + hw, base], P.crimsonDeep)
      p.dot(Math.round(ax), Math.round(ay), stage >= 3 && k % 2 === 0 ? P.ember : P.stoneHi)
    }
    // garras no chão (3 de cada lado), apontando para a frente
    for (const side of [0, 1]) {
      for (let k = 0; k < 3; k++) {
        const x0 = side ? fw - 2 - k * 5 : 3 + k * 5
        const yb = bh - 1
        poly(p, [x0 - 2, yb - 5, x0 + 3, yb - 5, x0 + (side ? -1 : 2), yb + 0.5], P.stone3)
        poly(p, [x0 - 2, yb - 5, x0, yb - 5, x0 + (side ? -1 : 2), yb + 0.5], P.stoneHi)
        p.dot(x0 + (side ? -1 : 2), yb, P.sparkle)
      }
    }
    // núcleo: fenda de brasa no peito desde o início (antecipa o ponto fraco)
    const hx = Math.round(1 + fw * 0.5)
    const hy = Math.round(top0 + Hd * 0.55)
    const sl = stage >= 4 ? 4 : 2
    p.rect(hx - sl, hy, sl * 2 + 1, 1, P.void)
    p.rect(hx - sl + 1, hy, sl * 2 - 1, 1, stage >= 2 ? P.redHot : P.red)
    p.dot(hx, hy, stage >= 2 ? P.sparkle : P.redGlow)
    p.outline(P.void, P.blood0)
    p.rim(P.redHot, 'r')
  })
}

/** monte de papel que sobra no chão depois da queda (permanência) */
function rubbleTex(w: number): Texture {
  const h = 10
  return bake(`hydra2-rubble${w}`, w, h, (p) => {
    const r = seeded(9)
    for (let k = 0; k < Math.round(w / 2.2); k++) {
      const x = r() * (w - 6)
      const t = 1 - Math.abs(x / (w - 6) - 0.5) * 2
      const y = h - 2 - r() * 6 * t
      const sw = 3 + Math.floor(r() * 5)
      const lit = r()
      p.rect(x, y, sw, 2, lit < 0.3 ? P.stoneHi : lit < 0.6 ? P.stone3 : lit < 0.85 ? P.stone2 : P.red)
      p.rect(x, y + 2, sw, 1, P.stone1)
    }
    for (let k = 0; k < 5; k++) p.dot(Math.round(r() * w), Math.round(h - 3 - r() * 3), P.ember)
    p.outline(P.void, P.blood0)
  })
}

const NECK_SEGS = 40

export default function chefe(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const shadow = new Graphics()
  const body = new Sprite()
  const bodyFlash = new Sprite()
  const rubble = new Sprite()
  const neckLayer = new Container()
  const shellLayer = new Container()
  const headLayer = new Container()
  const ghosts = [new Sprite(), new Sprite()]
  const glow = new Graphics()
  const aim = new Graphics()
  const bar = new Graphics()
  const beam = new Graphics()
  const warn = new Sprite()
  const timers = new Timers()
  const debris = new Debris(120)
  let embers: Embers
  let sparkles: Sparkles
  let booms: Explosions
  let pops: ScorePops
  let ribbons: Ribbons
  let rays: Rays
  let fly: FlyToHud
  let bossBar: BossBar
  let banner: Banner
  /** discos dos pescoços (pool fixo por cabeça) */
  let neckSpr: Sprite[][] = []
  let shellSpr: Sprite[][] = []
  let bodyTexs: Texture[] = []
  let neckR = { base: 7, tip: 4 }
  /** cabeças derrubadas de primeira, sem errar */
  let streak = 0
  let missedThis = false
  let heads: Head[] = []
  let round = 0
  let roundT = 0
  let ui: HTMLDivElement
  let claimEl: HTMLDivElement | null = null
  let opts: { b: HTMLButtonElement; ok: boolean }[] = []
  let busy = false
  let attacking = false
  let bodyX = 0
  let bodyY = 0
  let targetBodyY = 0
  let floorY = 0
  let bw = 120
  let bh = 34
  let neckH = 36
  let born = 0
  let flinchT = -10
  let dying = -1
  let sinkY = 0
  let over = false
  let hitY = 0
  let barTop = 0
  let stage = 0
  let beamUntil = -1
  let large = false
  let wideScr = false

  const dead = () => heads.reduce((n, hd) => n + (hd.alive ? 0 : 1), 0)

  function headRest(i: number) {
    const n = heads.length
    const spread = Math.min(c.W - BHW - 4, wideScr ? 300 : 250)
    const base = bodyX - spread / 2 + (spread / (n - 1)) * i
    const hd = heads[i]
    const ph = hd?.phase ?? 0
    const swayX = Math.sin(c.time * 1.6 + ph) * 3
    const swayY = Math.sin(c.time * 2.1 + ph * 1.7) * 2
    const arch = (1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)) * 8
    const active = i === round && hd?.alive
    // pressão: a cabeça ativa desce até 6 px conforme o tempo acaba
    const press = active && !busy ? (roundT / PER) * 6 : 0
    const fl = c.time - flinchT < 0.3 ? -Math.round(Math.sin(((c.time - flinchT) / 0.3) * Math.PI) * 4) : 0
    return { x: base + swayX, y: bodyY - neckH - arch + swayY + press + fl + sinkY }
  }

  /** posição atual da cabeça incluindo o bote */
  function headPos(i: number) {
    const p = headRest(i)
    const hd = heads[i]
    if (!hd) return p
    const t = c.time - hd.attackT
    if (t >= 0 && t < WIND + LUNGE + RECOVER) {
      const tx = c.W / 2
      const ty = hitY
      if (t < WIND) {
        // antecipação: recua 8 px para cima e treme 1 px
        const k = easeOutQuad(t / WIND)
        p.y -= 8 * k
        p.x += (p.x - tx) * 0.08 * k + (Math.floor(t * 30) % 2 ? 1 : -1)
      } else if (t < WIND + LUNGE) {
        const k = easeInQuad((t - WIND) / LUNGE)
        p.x = p.x + (tx - p.x) * 0.55 * k
        p.y = p.y - 8 + (ty - (p.y - 8)) * 0.8 * k
      } else {
        const k = easeOutQuad((t - WIND - LUNGE) / RECOVER)
        const lx = p.x + (tx - p.x) * 0.55
        const ly = p.y - 8 + (ty - (p.y - 8)) * 0.8
        p.x = lx + (p.x - lx) * k
        p.y = ly + (p.y - ly) * k
      }
    }
    return p
  }

  function attack() {
    const hd = heads[round]
    if (!hd?.alive || attacking) return
    attacking = true
    hd.attackT = c.time
    c.sfx('whoosh', { x: Math.round(headRest(round).x) })
    timers.after(WIND + LUNGE, () => {
      const p = headPos(round)
      c.fx.ring(Math.round(p.x), Math.round(p.y + 8), P.redHot, 22)
      c.fx.burst(Math.round(p.x), Math.round(p.y + 8), P.red, 10, 60)
      embers.blast(p.x, p.y + 8, 160, 60)
      // mordida: dentes faíscam no contato
      debris.burst(Math.round(p.x), Math.round(p.y + 10), [P.stoneHi, P.redHot], 6, 70, c.rnd, hitY + 6, 0.6)
      c.hit(Math.round(p.x), Math.round(p.y + 10))
    })
    timers.after(WIND + LUNGE + RECOVER * 0.6, () => {
      attacking = false
    })
  }

  /** raio dourado do fato: do botão escolhido até a cabeça, em zigue-zague de 1 px com halo */
  function drawBeam(from: { x: number; y: number }, to: { x: number; y: number }) {
    const g = beam
    g.clear()
    const n = 9
    let px = from.x
    let py = from.y
    for (let k = 1; k <= n; k++) {
      const t = k / n
      const j = k === n ? 0 : (c.rnd() - 0.5) * 10
      const x = Math.round(from.x + (to.x - from.x) * t + j)
      const y = Math.round(from.y + (to.y - from.y) * t)
      const steps = Math.max(Math.abs(x - px), Math.abs(y - py), 1)
      for (let s = 0; s <= steps; s++) {
        const X = Math.round(px + ((x - px) * s) / steps)
        const Y = Math.round(py + ((y - py) * s) / steps)
        if ((X + Y) % 2 === 0) g.rect(X - 2, Y, 1, 1).fill({ color: P.gold, alpha: 0.5 })
        g.rect(X - 1, Y, 3, 1).fill({ color: P.goldHi, alpha: 0.8 })
        g.rect(X, Y, 1, 1).fill(P.white)
      }
      px = x
      py = y
    }
  }

  function killHead(i: number, btn?: HTMLButtonElement) {
    const hd = heads[i]
    if (!hd) return
    hd.alive = false
    hd.dieT = c.time
    hd.dieReal = performance.now()
    hd.exploded = false
    const p = headPos(i)
    hd.x = p.x
    hd.y = p.y
    c.sfx('impact', { x: Math.round(hd.x) })
    // quadro de impacto já neste quadro (o hit-stop congela a simulação): cabeça e corpo em branco,
    // raio do fato até a cabeça; o vermelho entra no meio do congelamento
    const base = headTex(BHF, 2, 2, 0)
    hd.s.texture = solidTex(`h2b${BHF}`, base, P.white)
    bodyFlash.texture = solidTex(`hb${stage}`, body.texture, P.white)
    bodyFlash.visible = true
    bodyFlash.alpha = 0.4
    if (btn?.isConnected) {
      const r = domRect(c, btn)
      drawBeam({ x: r.cx, y: r.y }, { x: p.x, y: p.y + 6 })
      beamUntil = c.time + 0.12
      c.fx.ring(Math.round(r.cx), Math.round(r.y), P.goldHi, 16)
    }
    c.fx.ring(Math.round(p.x), Math.round(p.y), P.white, 18)
    window.setTimeout(() => {
      if (!hd.exploded && hd.s.parent) hd.s.texture = solidTex(`h2b${BHF}`, base, P.redHot)
    }, 110)
    // golpe pesado: congela 180 ms com a cabeça em branco e depois vermelho
    stop(c, 180)
    bossBar.hit()
    // assim que a simulação volta: explosão de papel
    timers.after(0.001, () => explodeHead(hd))
  }

  function explodeHead(hd: Head) {
    hd.exploded = true
    hd.s.visible = false
    bodyFlash.visible = false
    const x = Math.round(hd.x)
    const y = Math.round(hd.y)
    // 1 quadro branco e depois quase só fumaça; o papel voa em pedaços
    impact(c, P.redHot)
    booms.spawn(x, y, 12)
    c.fx.shake(4, 280)
    c.fx.ring(x, y, P.redHot, 30)
    c.fx.burst(x, y, P.stoneHi, 10, 90)
    debris.burst(x, y, [P.stoneHi, P.stone3, P.red, P.stone2], 18, 110, c.rnd, floorY, 2.6)
    // feixes finos verticais no ponto do golpe e moedas voando até o contador
    rays.spawn(x, y - 40, y + 30, P.goldHi, 3, 0.45)
    rays.spawn(x - 6, y - 24, y + 14, P.redHot, 1, 0.35)
    rays.spawn(x + 7, y - 30, y + 10, P.redHot, 1, 0.4)
    fly.send(x, y, 8)
    // pescoço desaba em pedaços
    const i = heads.indexOf(hd)
    const ax = anchorX(i)
    for (let s = 1; s < 8; s++) {
      const t = s / 8
      const nx = ax + (x - ax) * t
      const ny = bodyY - 8 + (y - (bodyY - 8)) * t
      debris.spawn(
        nx,
        ny,
        s % 2 ? P.stone3 : P.stone2,
        (c.rnd() - 0.5) * 40,
        -20 - c.rnd() * 30,
        4,
        3,
        2.4,
        floorY,
      )
    }
    embers.blast(x, y, 220, 90)
    sparkles.spawn(x - 10, y - 6, 12)
    sparkles.spawn(x + 12, y + 2, 8)
    sparkles.spawn(x, y - 14, 0)
    flinchT = c.time
    // fase visual de dano: o corpo abre mais um rasgo, a energia enfraquece
    stage = dead()
    body.texture = bodyTexs[Math.min(stage, bodyTexs.length - 1)] ?? body.texture
    ribbons.power = Math.max(0.25, 1 - stage * 0.17)
    const rf = RIFTS[stage - 1]
    if (rf) {
      const rx = Math.round(body.x + 1 + ((rf.u + 1) / 2) * (bw - Math.max(4, Math.round(bw * 0.07)) - 2))
      const ry = Math.round(body.y + bh * (0.25 + rf.v * 0.6))
      booms.spawn(rx, ry, 8)
      c.fx.burst(rx, ry, P.emberBright, 8, 70)
      rays.spawn(rx, ry - 50, ry, P.redHot, 3, 0.5)
    }
  }

  function anchorX(i: number) {
    const n = heads.length
    return bodyX - bw * 0.34 + ((bw * 0.64) / (n - 1)) * i
  }

  function measureUi() {
    if (!ui.isConnected) return
    const r = domRect(c, ui)
    const uiTop = r.y
    // corpo perto da interface; cabeças e barra de tempo sempre abaixo do HUD e da barra do chefe
    const minY = barTop + neckH + 8 + BHH / 2 + 12
    targetBodyY = Math.round(Math.max(minY, uiTop - bh / 2 - 10))
    hitY = Math.round(uiTop - 6)
  }

  function renderRound() {
    const r = ROUNDS[round]
    if (!r) return
    roundT = 0
    busy = false
    missedThis = false
    const choices = shuffle([{ t: r.right, ok: true }, ...r.wrong.map((t) => ({ t, ok: false }))], c.rnd)
    opts = choices.map((ch, k) => {
      const b = el('button', { class: 'boss-opt', 'aria-keyshortcuts': String(k + 1) }, ch.t)
      tactile(b)
      b.addEventListener('click', () => choose(ch.ok, b))
      return { b, ok: ch.ok }
    })
    claimEl = el(
      'div',
      { class: 'boss-claim px-frame px-frame--red' },
      el('small', null, `Cabeça ${round + 1} de ${ROUNDS.length} diz`),
      `“${r.claim}”`,
    )
    ui.replaceChildren(claimEl, ...opts.map((o) => o.b))
    const red = !matchMedia('(prefers-reduced-motion: reduce)').matches
    if (red) {
      claimEl.animate(
        [
          { transform: 'scale(0.9)', opacity: 0 },
          { transform: 'scale(1.04)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1)' },
        ],
        {
          duration: 220,
          easing: 'steps(5, end)',
        },
      )
      for (const [k, o] of opts.entries())
        o.b.animate(
          [
            { transform: 'translateY(8px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 160,
            delay: 80 + k * 70,
            easing: 'steps(4, end)',
            fill: 'backwards',
          },
        )
    }
    opts[0]?.b.focus({ preventScroll: true })
    measureUi()
  }

  function choose(ok: boolean, b: HTMLButtonElement) {
    if (busy || attacking || over) return
    if (ok) {
      busy = true
      b.classList.add('ok')
      goldPulse(b)
      for (const o of opts) if (o.b !== b) o.b.style.opacity = '0.45'
      if (claimEl) {
        claimEl.style.textDecoration = `line-through 3px #${P.red.toString(16)}`
        claimEl.style.opacity = '0.6'
      }
      const p = headPos(round)
      if (!missedThis) streak++
      else streak = 0
      pops.score(
        200 + Math.round((1 - roundT / PER) * 120),
        Math.round(p.x),
        Math.round(p.y) - 16,
        streak,
        embers,
      )
      killHead(round, b)
      timers.after(0.9, () => {
        round++
        if (round >= ROUNDS.length) defeat()
        else renderRound()
      })
    } else {
      b.classList.add('no')
      b.disabled = true
      missedThis = true
      streak = 0
      shakeEl(b)
      attack()
    }
  }

  function defeat() {
    over = true
    ui.remove()
    dying = c.time
    c.sfx('fanfare')
    // explosão em cascata: 11 estouros em 1,4 s pelo corpo, cada vez maiores; feixes sobem dos rasgos
    for (let k = 0; k < 11; k++)
      timers.after(k * 0.13, () => {
        const x = Math.round(bodyX + (c.rnd() - 0.5) * bw * 0.8)
        const y = Math.round(bodyY + sinkY + (c.rnd() - 0.6) * bh * 0.7)
        const big = k / 10
        booms.spawn(x, y, 6 + Math.round(big * 8))
        c.fx.burst(x, y, k % 2 ? P.goldHi : P.redHot, 6 + Math.round(big * 4), 60 + big * 50)
        c.fx.ring(x, y, k % 2 ? P.gold : P.red, 14 + Math.round(big * 22))
        debris.burst(x, y, [P.stoneHi, P.stone3, P.red], 6, 90 + big * 60, c.rnd, floorY, 2.2)
        rays.spawn(x, Math.max(c.top, y - 70 - big * 40), y, k % 2 ? P.goldHi : P.redHot, k > 6 ? 3 : 1, 0.5)
        c.fx.shake(2 + Math.round(big * 2), 160)
        embers.blast(x, y, 180, 70)
        if (k % 3 === 0) c.sfx('boom', { x })
        if (k % 2 === 0) stop(c, 40)
      })
    timers.after(1.5, () => {
      const x = Math.round(bodyX)
      const y = Math.round(bodyY + sinkY)
      stop(c, 200)
      impact(c, P.goldHi)
      booms.spawn(x, y, 24)
      joy(c, 3, 300)
      c.fx.ring(x, y, P.goldHi, 110)
      c.fx.ring(x, y, P.red, 70)
      c.fx.burst(x, y, P.sparkle, 16, 120)
      debris.burst(x, y, [P.stoneHi, P.stone3, P.red, P.gold], 30, 160, c.rnd, floorY, 3)
      for (let k = 0; k < 8; k++)
        sparkles.spawn(Math.round(x + (c.rnd() - 0.5) * c.W * 0.8), Math.round(y - c.rnd() * 60), 14)
      for (let k = 0; k < 5; k++)
        rays.spawn(Math.round(x + (k - 2) * bw * 0.18), c.top, y + 10, k % 2 ? P.redHot : P.goldHi, 3, 0.9)
      fly.send(x, y - 10, 14)
      banner.show(
        [
          { text: 'A GRANDE FAKE', size: 8, color: P.stoneHi },
          { text: 'CAIU', size: 16, color: P.goldHi },
        ],
        x,
        Math.round(Math.max(barTop + 30, y - bh - 20)),
        1.1,
      )
      body.visible = false
      bodyFlash.visible = false
      ribbons.power = 0
      bossBar.root.visible = false
      rubble.visible = true
      c.sfx('boom', { volume: 1.4 })
      stinger('win')
    })
    timers.after(2.6, () => c.finish())
  }

  /** pescoços: discos sombreados em três quartos ao longo de uma curva, afinando até a cabeça */
  function drawNecks() {
    for (let i = 0; i < heads.length; i++) {
      const hd = heads[i] as Head
      const list = neckSpr[i] ?? []
      const shells = shellSpr[i] ?? []
      const ax = anchorX(i)
      const ay = bodyY - bh * 0.18 + sinkY
      let hx: number
      let hy: number
      let reach = 1
      if (hd.alive) {
        const p = headPos(i)
        hx = p.x
        hy = p.y + 6
      } else {
        // toco queimado: um terço do caminho, caído para o lado
        const p = headRest(i)
        hx = ax + (p.x - ax) * 0.25 + (i < 2 ? -4 : i > 2 ? 4 : 0)
        hy = ay - neckH * 0.3
        reach = 1
      }
      const len = Math.hypot(hx - ax, hy - ay)
      const segN = hd.alive
        ? Math.min(NECK_SEGS, Math.max(9, Math.round(len / 2)))
        : Math.max(3, Math.round(len / 2))
      for (let s = 0; s < list.length; s++) {
        const spr = list[s] as Sprite
        if (s > segN || (!hd.alive && dying >= 0 && c.time - dying > 1.5)) {
          spr.visible = false
          ;(shells[s] as Sprite).visible = false
          continue
        }
        const t = (s / segN) * reach
        const ctrlX = ax + (hx - ax) * 0.3
        const ctrlY = ay - (ay - hy) * 0.9
        const x =
          (1 - t) * (1 - t) * ax +
          2 * (1 - t) * t * ctrlX +
          t * t * hx +
          (hd.alive ? Math.sin(t * 3 + c.time * 2 + hd.phase) * 2 * t * (1 - t) * 4 : 0)
        const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * ctrlY + t * t * hy
        const rr = Math.round(neckR.base + (neckR.tip - neckR.base) * t)
        const last = s === segN
        const kind = !hd.alive && last ? 2 : s % 6 === 3 ? 1 : 0
        spr.texture = neckTex(rr, kind)
        spr.visible = true
        spr.x = Math.round(x - rr - 2)
        spr.y = Math.round(y - rr - 2)
        const sh = shells[s] as Sprite
        sh.texture = neckTex(rr, 0, true)
        sh.visible = true
        sh.x = spr.x
        sh.y = spr.y
      }
    }
  }

  return {
    duration: 0,
    goal: 1500,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      bodyX = Math.round(c.W / 2)
      ui = el('div', { class: 'boss-ui' })
      // ancora a interface logo acima das habilidades, qualquer que seja a altura do HUD
      ui.style.bottom = `${Math.max(8, Math.round(innerHeight - c.bottom * c.css + 6))}px`
      c.layer.append(ui)
      heads = ROUNDS.map((_, i) => {
        const s = new Sprite()
        headLayer.addChild(s)
        return {
          alive: true,
          phase: i * 1.3,
          dieT: 0,
          dieReal: 0,
          exploded: false,
          s,
          attackT: -10,
          biteT: -10 - i,
          blinkT: -10 - i * 0.7,
          x: 0,
          y: 0,
        }
      })
      renderRound()
      // mede o espaço livre acima da pergunta e escolhe o tamanho da hidra
      const free = domRect(c, ui).y - c.top
      large = free >= 140
      wideScr = c.W > c.H && large
      HF = wideScr ? 1 : large ? 0.875 : 0.7
      BHF = wideScr ? 1.125 : large ? 1 : 0.8
      HW = headSize(HF).w
      HH = headSize(HF).h
      BHW = headSize(BHF).w
      BHH = headSize(BHF).h
      bh = wideScr ? 64 : large ? 60 : 40
      barTop = c.top + (large ? 2 : 0)
      neckR = wideScr ? { base: 8, tip: 5 } : large ? { base: 7, tip: 4 } : { base: 5, tip: 3 }
      neckH = large ? Math.min(96, Math.round(free * 0.36)) : 30
      bw = Math.round(
        Math.min(c.W * (wideScr ? 0.56 : large ? 0.8 : 0.74), wideScr ? 270 : large ? 200 : 210),
      )
      measureUi()
      bodyY = targetBodyY
      floorY = bodyY + Math.round(bh / 2) + 2
      bodyTexs = [0, 1, 2, 3, 4].map((s) => bodyTex(bw, bh, s))
      body.texture = bodyTexs[0] as Texture
      bodyFlash.visible = false
      rubble.texture = rubbleTex(Math.round(bw * 0.9))
      rubble.visible = false
      warn.texture = warnTex()
      warn.visible = false
      for (const g of ghosts) {
        g.visible = false
        g.alpha = 0.5
      }
      glow.blendMode = 'add'
      aim.blendMode = 'add'
      beam.blendMode = 'add'
      embers = new Embers(
        c,
        { x0: bodyX - bw / 2, y0: c.top, x1: bodyX + bw / 2, y1: floorY },
        { ambient: 30, sparks: 40 },
      ).listen()
      sparkles = new Sparkles(c.reduced)
      booms = new Explosions(c)
      pops = new ScorePops(c)
      ribbons = new Ribbons(c.reduced)
        .add(bw * 0.6, bh * 0.22, 0.1, 1.3, 0, 2.6)
        .add(bw * 0.5, bh * 0.42, -0.16, -0.95, 2.2, 2.2)
        .add(bw * 0.68, bh * 0.12, 0.05, 0.7, 4.1, 1.6)
      rays = new Rays(18)
      fly = new FlyToHud(c)
      bossBar = new BossBar(c, 'A GRANDE FAKE', ROUNDS.length)
      banner = new Banner(c)
      const bwBar = Math.min(c.W - 40, 150)
      bossBar.layout(Math.round(c.W / 2) - 4, barTop, bwBar)
      neckSpr = heads.map(() => {
        const list: Sprite[] = []
        for (let s = 0; s <= NECK_SEGS; s++) {
          const spr = new Sprite()
          spr.visible = false
          neckLayer.addChild(spr)
          list.push(spr)
        }
        return list
      })
      shellSpr = heads.map(() => {
        const list: Sprite[] = []
        for (let s = 0; s <= NECK_SEGS; s++) {
          const spr = new Sprite()
          spr.visible = false
          shellLayer.addChild(spr)
          list.push(spr)
        }
        return list
      })
      headLayer.sortableChildren = true
      root.addChild(
        shadow,
        rubble,
        ribbons.back,
        embers.root,
        shellLayer,
        neckLayer,
        body,
        bodyFlash,
        ribbons.front,
        rays.root,
        headLayer,
        ...ghosts,
        glow,
        aim,
        warn,
        bar,
        beam,
        debris.root,
        sparkles.root,
        booms.root,
        pops.root,
        fly.root,
        bossBar.root,
        banner.root,
      )
      born = c.time
      stinger('boss')
    },
    update(dt) {
      timers.update(dt)
      // acompanha a altura da interface (a pergunta muda de tamanho a cada rodada)
      bodyY += (targetBodyY - bodyY) * Math.min(1, dt * 6)
      floorY = Math.round(bodyY + bh / 2 + 2)
      // entrada: a hidra sobe do chão com overshoot
      const rise =
        c.time - born < 0.7 ? Math.round((1 - easeOutBack(clamp01((c.time - born) / 0.7))) * 40) : 0
      if (dying >= 0) sinkY = Math.round(easeInQuad(clamp01((c.time - dying) / 1.5)) * 18)
      else sinkY = rise
      if (!busy && !over && !attacking) {
        roundT += dt
        if (roundT > PER) {
          roundT = 0
          attack()
        }
      }
      const breathe = c.reduced ? 0 : Math.round(Math.sin(c.time * 2.4))
      const shake = c.time - flinchT < 0.3 ? (Math.floor(c.time * 30) % 2 ? 1 : -1) : 0
      body.x = Math.round(bodyX - bw / 2) + shake + (dying >= 0 ? (Math.floor(c.time * 25) % 2 ? 1 : -1) : 0)
      body.y = Math.round(bodyY - bh / 2) + sinkY + breathe
      if (dying >= 0 && body.visible) {
        // corpo esquentando: silhueta carmim a 3 Hz (sem clarão branco grande, WCAG 2.3.1)
        bodyFlash.texture = solidTex(`hc${stage}`, body.texture, P.crimson)
        bodyFlash.visible = Math.floor(c.time * 6) % 2 === 0
        bodyFlash.alpha = 0.7
      }
      bodyFlash.x = body.x
      bodyFlash.y = body.y
      rubble.x = Math.round(bodyX - rubble.width / 2)
      rubble.y = floorY - 8

      // sombra de contato pontilhada + luz vermelha do núcleo no chão
      shadow.clear()
      const sw = Math.round(bw * 0.96)
      for (let y = 0; y < 5; y++) {
        const w = sw - y * 12
        for (let x = 0; x < w; x++)
          if ((x + y) % 2 === 0) shadow.rect(Math.round(bodyX - w / 2) + x, floorY - 3 + y, 1, 1)
      }
      shadow.fill({ color: P.void, alpha: 0.9 })
      if (body.visible) {
        const gw = Math.round(bw * (0.5 + stage * 0.08))
        for (let x = 0; x < gw; x++)
          if (x % 2 === 0) shadow.rect(Math.round(bodyX - gw / 2) + x, floorY + 2 + ((x >> 1) % 2), 1, 1)
        shadow.fill({ color: stage >= 3 ? P.red : P.crimson, alpha: 0.55 })
      }

      // fitas de energia orbitando o corpo (frente e trás)
      ribbons.cx = bodyX + 2
      ribbons.cy = Math.round(bodyY + sinkY + bh * 0.08)
      if (dying >= 0 && body.visible) ribbons.power = Math.floor(c.time * 12) % 2 ? 0.9 : 0.3
      ribbons.update(c.time * (dying >= 0 ? 2.5 : 1))

      drawNecks()
      glow.clear()
      aim.clear()
      bar.clear()
      warn.visible = false
      if (c.time > beamUntil) beam.clear()
      for (let i = 0; i < heads.length; i++) {
        const hd = heads[i] as Head
        const active = i === round && !over
        if (!hd.alive) {
          // toco queimado solta faíscas
          if (!over && !c.reduced && c.rnd() < dt * 3) {
            const p = headRest(i)
            const ax = anchorX(i)
            embers.spark(ax + (p.x - ax) * 0.25, bodyY - bh * 0.18 - neckH * 0.3 + sinkY, 8, 0, -30)
          }
          continue
        }
        const p = headPos(i)
        const t = c.time - hd.attackT
        const winding = t >= 0 && t < WIND
        const lunging = t >= WIND && t < WIND + LUNGE
        // mordida ociosa e piscada das outras cabeças, para dar vida
        if (!active && c.time - hd.biteT > 3 + hd.phase && c.rnd() < dt * 0.5) hd.biteT = c.time
        if (c.time - hd.blinkT > 2.5 + hd.phase * 0.6 && c.rnd() < dt * 0.8) hd.blinkT = c.time
        const chomp = c.time - hd.biteT < 0.22
        const jaw = lunging || (t >= WIND + LUNGE && t < WIND + LUNGE + 0.12) ? 2 : winding || chomp ? 1 : 0
        const blink = !active && c.time - hd.blinkT < 0.12
        // a cabeça ativa respira a mandíbula em 2 quadros a 4 fps quando a pressão aperta
        const urgent = active && !busy && roundT > PER - 3
        const jaw2 = jaw === 0 && urgent && Math.floor(c.time * 4) % 2 === 0 ? 1 : jaw
        const eye = winding || lunging ? 2 : blink ? 3 : active ? 1 : 0
        const burn = stage >= 3 ? 2 : stage >= 1 ? 1 : 0
        const big = active
        const f = big ? BHF : HF
        hd.s.texture = headTex(f, jaw2, eye, burn)
        hd.s.visible = true
        hd.s.zIndex = active ? 10 : i
        const w = big ? BHW : HW
        const h = big ? BHH : HH
        hd.s.x = Math.round(p.x - w / 2)
        hd.s.y = Math.round(p.y - h / 2)
        hd.x = p.x
        hd.y = p.y
        // olhos: brilho em 3 camadas, mais forte na cabeça ativa e na antecipação
        const ey = Math.round(hd.s.y + 1 + EYE.y * f)
        const e1 = Math.round(hd.s.x + 1 + EYE.x1 * f)
        const e2 = Math.round(hd.s.x + 1 + EYE.x2 * f)
        if ((active || winding) && eye !== 3) {
          const core = winding ? P.white : P.sparkle
          energyDot(glow, e1, ey, core, P.redHot, P.crimson)
          energyDot(glow, e2, ey, core, P.redHot, P.crimson)
        }
        // telegrafia: "!" pisca acima da cabeça nos últimos 1,5 s e fixo na antecipação
        if (active && !busy && (winding || (roundT > PER - 1.5 && Math.floor(c.time * 8) % 2 === 0))) {
          warn.visible = true
          warn.x = Math.round(p.x - 4)
          warn.y = Math.round(hd.s.y - 22)
        }
        if (winding && !c.reduced) {
          // mira: linha pontilhada piscando até onde o bote vai bater + alvo no chão
          if (Math.floor(t * 20) % 2 === 0) {
            const tx = c.W / 2
            const n = 12
            for (let k = 1; k < n; k++) {
              const x = Math.round(p.x + (tx - p.x) * (k / n))
              const y = Math.round(p.y + 10 + (hitY - p.y - 10) * (k / n))
              aim.rect(x, y, 1, 1).fill({ color: P.redHot, alpha: 0.7 })
            }
          }
          const rr = 6 + Math.round((t / WIND) * 6)
          for (let a = 0; a < 20; a++) {
            const ang = (a / 20) * Math.PI * 2
            aim
              .rect(
                Math.round(c.W / 2 + Math.cos(ang) * rr),
                Math.round(hitY + Math.sin(ang) * rr * 0.4),
                1,
                1,
              )
              .fill({ color: a % 2 ? P.red : P.redHot, alpha: 0.8 })
          }
        }
        // smear do bote: duas silhuetas vermelhas no caminho (1 quadro cada)
        if (lunging) {
          const base = headTex(f, 2, 2, burn)
          for (const [k, g] of ghosts.entries()) {
            g.texture = solidTex(`h2${f}${burn}`, base, P.crimson)
            g.visible = true
            const back = (k + 1) * 0.33
            g.x = Math.round(hd.s.x + (headRest(i).x - p.x) * back)
            g.y = Math.round(hd.s.y + (headRest(i).y - 8 - p.y) * back)
          }
        }
        if (active && !busy) {
          // barra de tempo acima da cabeça
          const left = Math.max(0, 1 - roundT / PER)
          const bx = Math.round(p.x - 12)
          const by = Math.round(hd.s.y - 6)
          const low = left < 0.3
          bar.rect(bx - 1, by - 1, 26, 5).fill(P.void)
          bar.rect(bx, by, 24, 3).fill(P.blood0)
          bar
            .rect(bx, by, Math.round(24 * left), 3)
            .fill(low && Math.floor(c.time * 6) % 2 ? P.redHot : low ? P.red : P.gold)
          bar.rect(bx, by, Math.round(24 * left), 1).fill(low ? P.redGlow : P.goldHi)
        }
      }
      if (!heads.some((hd) => c.time - hd.attackT >= WIND && c.time - hd.attackT < WIND + LUNGE))
        for (const g of ghosts) g.visible = false

      // brasas e brilho saindo dos rasgos do corpo (mais com o dano)
      if (body.visible && !c.reduced && c.rnd() < dt * (8 + stage * 6))
        embers.spark(bodyX + (c.rnd() - 0.5) * bw * 0.5, bodyY + sinkY, 12, 0, -40)
      // estrela de 4 pontas nos nós das fitas, de vez em quando
      if (body.visible && !c.reduced && c.rnd() < dt * 1.2)
        sparkles.spawn(
          Math.round(bodyX + (c.rnd() - 0.5) * bw * 1.1),
          Math.round(bodyY + (c.rnd() - 0.5) * bh),
          8,
        )
      embers.update(dt, c.time)
      sparkles.update(dt)
      debris.update(dt)
      booms.update(dt)
      pops.update(dt)
      rays.update(dt)
      fly.update(dt)
      bossBar.update()
      banner.update(dt)
    },
    key(k, down) {
      if (!down) return
      const i = k === '1' ? 0 : k === '2' ? 1 : k === '3' ? 2 : -1
      const o = opts[i]
      if (o && !o.b.disabled) o.b.click()
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        const live = opts.filter((x) => !x.b.disabled)
        const cur = live.findIndex((x) => x.b === document.activeElement)
        const n = live[(cur + (k === 'ArrowDown' ? 1 : -1) + live.length) % live.length]
        n?.b.focus({ preventScroll: true })
      }
    },
    hint() {
      const o = opts.find((x) => x.ok)
      if (!o || busy || over) return false
      hintPulse(o.b)
      return true
    },
    clear() {
      const o = opts.find((x) => x.ok)
      if (!o || busy || over || attacking) return false
      choose(true, o.b)
      return true
    },
    dispose() {
      timers.clear()
      embers?.destroy()
      ui?.remove()
      root.destroy({ children: true })
      heads = []
    },
  }
}
