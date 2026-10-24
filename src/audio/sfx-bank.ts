// Banco de efeitos: cada som é transiente (ruído curto) + corpo tonal (envelope de pitch) + cauda (reverb).
// Tudo em lá (maior nas vitórias, menor no perigo), afinado com a trilha.
import { hz } from './synth'
import type { Voice } from './voice'

export type Sfx =
  | 'tap'
  | 'good'
  | 'bad'
  | 'coin'
  | 'level'
  | 'swipe'
  | 'power'
  | 'boom'
  | 'fanfare'
  | 'tick'
  | 'whoosh'
  | 'stamp'
  | 'fire'
  | 'water'
  | 'shatter'
  | 'crown'
  | 'heart'
  | 'select'
  | 'back'
  | 'countdown'
  | 'go'
  | 'perfect'
  | 'stone'
  | 'spark'
  | 'star'
  | 'flip'
  | 'shield'
  | 'slowmo'
  | 'confirm'
  | 'error'
  | 'score'
  | 'total'
  | 'impact'

export type Stinger = 'win' | 'lose' | 'boss' | 'streak'

export interface PlayCtx {
  /** razão de pitch final (opts.pitch + combo + variação aleatória) */
  k: number
  /** semitons do combo já aplicados em k */
  ladder: number
  combo: number
  rnd: () => number
}

export interface Recipe {
  /** variação aleatória de pitch, em semitons (±). Sons tonais variam pouco para ficar no tom. */
  vary: number
  /** quanto o combo sobe, em semitons por acerto (0 = não sobe) */
  ladder: number
  /** teto da escada do combo, em degraus (padrão 12 = uma oitava) */
  ladderMax?: number
  /** som em degraus (combo, estrelas, contagem): a variação aleatória fica menor que meio tom
   * para a escada nunca descer */
  stepped?: boolean
  prio: number
  room: number
  hall: number
  gain?: number
  /** [ms, profundidade] de ducking na trilha */
  duck?: [number, number]
  /** intervalo mínimo entre dois disparos do mesmo som (ms) */
  gap?: number
  play(v: Voice, t: number, c: PlayCtx): void
}

const between = (r: () => number, a: number, b: number) => a + (b - a) * r()

// ---- blocos de timbre reutilizados ----

function brass(v: Voice, t: number, m: number, hold: number, g: number, dest?: AudioNode) {
  for (const det of [-8, 7]) {
    v.tone(
      t,
      {
        type: 'sawtooth',
        f: hz(m),
        detune: det,
        a: 0.03,
        hold,
        d: 0.32,
        g,
        lp: 600,
        lpTo: 3400,
        lpT: 0.07,
        q: 1.4,
        vib: 10,
        vibDelay: 0.22,
      },
      dest,
    )
  }
}

function choir(v: Voice, t: number, m: number, hold: number, g: number, dest?: AudioNode) {
  // vogal "ah": dois formantes sobre dente de serra com vibrato humano
  for (const [bp, q, gg, det] of [
    [760, 6, 1, -6],
    [1180, 7, 0.7, 6],
  ] as const) {
    v.tone(
      t,
      {
        type: 'sawtooth',
        f: hz(m),
        detune: det,
        a: 0.22,
        hold,
        d: 0.6,
        g: g * gg,
        bp,
        q,
        vib: 16,
        vibRate: 5.2,
        vibDelay: 0.1,
      },
      dest,
    )
  }
}

function bell(v: Voice, t: number, f: number, d: number, g: number, dest?: AudioNode) {
  const parts: [number, number, number][] = [
    [1, 1, 1],
    [2.76, 0.42, 0.5],
    [5.4, 0.22, 0.26],
    [8.93, 0.09, 0.14],
  ]
  for (const [r, gg, dd] of parts) {
    // parciais acima de 15 kHz não se ouvem no celular e passariam de Nyquist
    if (f * r < 15000) v.tone(t, { type: 'sine', f: f * r, d: d * dd, g: g * gg }, dest)
  }
}

function timpani(v: Voice, t: number, m: number, g: number) {
  v.tone(t, { type: 'sine', f: hz(m) * 1.06, to: hz(m), glide: 0.06, d: 0.7, g })
  v.tone(t, { type: 'triangle', f: hz(m) * 2.02, d: 0.25, g: g * 0.25 })
  v.noise(t, { filter: 'lowpass', f: 900, d: 0.06, g: g * 0.5 })
}

function crash(v: Voice, t: number, g: number, d = 1.4) {
  v.noise(t, { filter: 'highpass', f: 4500, d, g, q: 0.5 })
  v.noise(t, { filter: 'bandpass', f: 9000, q: 0.6, d: d * 0.6, g: g * 0.7 })
}

function sparkle(v: Voice, t: number, c: PlayCtx, n: number, span: number, g: number, notes: number[]) {
  const L = v.branch(-0.55)
  const R = v.branch(0.55)
  for (let i = 0; i < n; i++) {
    const m = notes[Math.floor(c.rnd() * notes.length)] ?? 93
    const at = t + (i / n) * span + c.rnd() * 0.02
    v.tone(at, { type: 'sine', f: hz(m) * c.k, d: 0.14, g: g * (1 - (i / n) * 0.5) }, i % 2 ? L : R)
  }
}

function crackles(
  v: Voice,
  t: number,
  c: PlayCtx,
  n: number,
  span: number,
  lo: number,
  hi: number,
  g: [number, number],
) {
  const L = v.branch(-0.6)
  const R = v.branch(0.6)
  for (let i = 0; i < n; i++) {
    const at = t + c.rnd() ** 1.6 * span
    v.noise(
      at,
      {
        f: between(c.rnd, lo, hi),
        q: 3.5,
        d: between(c.rnd, 0.008, 0.04),
        g: between(c.rnd, g[0], g[1]),
      },
      c.rnd() < 0.5 ? L : R,
    )
  }
}

let tock = false

// ---- efeitos ----

export const SFX: Record<Sfx, Recipe> = {
  tap: {
    vary: 0.9,
    ladder: 0,
    prio: 1,
    room: 0.22,
    hall: 0,
    gap: 25,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 3500, d: 0.012, g: 0.22 })
      v.tone(t, { type: 'triangle', f: 1250 * k, to: 880 * k, glide: 0.035, d: 0.055, g: 0.42 })
      v.tone(t, { type: 'sine', f: 2500 * k, d: 0.022, g: 0.08 })
    },
  },

  tick: {
    vary: 0.9,
    gain: 1.6,
    ladder: 0,
    prio: 0,
    room: 0.12,
    hall: 0,
    gap: 40,
    play(v, t, { k }) {
      tock = !tock
      const f = (tock ? 1900 : 1560) * k
      v.tone(t, { type: 'p25', f, d: 0.028, g: 0.13, hp: 700 })
      v.noise(t, { f: 5200, q: 2, d: 0.01, g: 0.14 })
    },
  },

  // UI em camadas: clique agudo (atravessa o alto-falante do celular) + corpo tonal (carrega a nota).
  // Níveis: select (mover/hover, 6 dB abaixo) < tap (apertar) < confirm (sobe uma quarta) · back desce uma quarta.
  select: {
    vary: 0.8,
    ladder: 0,
    prio: 1,
    room: 0.15,
    hall: 0,
    gap: 30,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 4000, d: 0.006, g: 0.12 })
      v.tone(t, { type: 'triangle', f: hz(93) * k, to: hz(91) * k, d: 0.032, g: 0.13 })
    },
  },

  confirm: {
    vary: 0.55,
    ladder: 0,
    prio: 2,
    room: 0.3,
    hall: 0.04,
    gap: 40,
    gain: 1.6,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 4000, d: 0.006, g: 0.2 })
      v.tone(t, { type: 'sine', f: hz(69) * k, d: 0.05, g: 0.14 })
      v.tone(t, { type: 'p25', f: hz(88) * k, d: 0.05, g: 0.15, lp: 5500 })
      v.tone(t + 0.045, { type: 'p25', f: hz(93) * k, hold: 0.02, d: 0.12, g: 0.15, lp: 5500 })
    },
  },

  error: {
    vary: 0.6,
    ladder: 0,
    prio: 2,
    room: 0.2,
    hall: 0,
    gap: 120,
    gain: 1.4,
    play(v, t, { k }) {
      // zumbido grave em dois pulsos ("é-é"), sem drama
      v.noise(t, { filter: 'highpass', f: 3000, d: 0.006, g: 0.16 })
      for (const at of [0, 0.11]) {
        v.tone(t + at, { type: 'square', f: 92 * k, hold: 0.06, d: 0.04, g: 0.12, lp: 750 })
        v.tone(t + at, { type: 'square', f: 97.5 * k, hold: 0.06, d: 0.04, g: 0.12, lp: 750 })
      }
    },
  },

  back: {
    vary: 0.6,
    gain: 2,
    ladder: 0,
    prio: 1,
    room: 0.3,
    hall: 0,
    gap: 30,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 4000, d: 0.006, g: 0.12 })
      v.tone(t, { type: 'p25', f: hz(81) * k, d: 0.06, g: 0.15, lp: 2600 })
      v.tone(t + 0.05, { type: 'p25', f: hz(76) * k, to: hz(75) * k, d: 0.11, g: 0.14, lp: 2200 })
    },
  },

  good: {
    vary: 0.55,
    gain: 1.6,
    stepped: true,
    ladder: 1,
    prio: 2,
    room: 0.32,
    hall: 0.06,
    gap: 30,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { filter: 'highpass', f: 5000, d: 0.014, g: 0.22 })
      v.tone(t, { type: 'sine', f: hz(57) * k, to: hz(45) * k, d: 0.07, g: 0.28 })
      v.tone(t, { type: 'p25', f: hz(81) * k * 1.02, to: hz(81) * k, glide: 0.02, d: 0.07, g: 0.2 })
      v.tone(t + 0.055, { type: 'p25', f: hz(88) * k, d: 0.17, g: 0.2, vib: 14, vibDelay: 0.06, lp: 6000 })
      if (c.combo >= 6) v.tone(t + 0.055, { type: 'sine', f: hz(100) * k, d: 0.2, g: 0.07 })
    },
  },

  coin: {
    vary: 0.55,
    gain: 2.2,
    stepped: true,
    ladder: 1,
    prio: 2,
    room: 0.28,
    hall: 0.1,
    gap: 28,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { filter: 'highpass', f: 7000, d: 0.008, g: 0.2 })
      v.tone(t, { type: 'p12', f: hz(83) * k, d: 0.06, g: 0.22 })
      v.tone(t + 0.06, { type: 'p12', f: hz(88) * k, hold: 0.04, d: 0.28, g: 0.22 })
      v.tone(t + 0.06, { type: 'sine', f: hz(88) * k * 2.76, d: 0.22, g: 0.04 })
      if (c.combo >= 8) v.tone(t + 0.06, { type: 'sine', f: hz(100) * k, d: 0.25, g: 0.06 })
    },
  },

  perfect: {
    vary: 0.55,
    gain: 1.8,
    stepped: true,
    ladder: 1,
    prio: 3,
    room: 0.2,
    hall: 0.3,
    duck: [160, 0.7],
    gap: 40,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { filter: 'highpass', f: 6000, d: 0.012, g: 0.25 })
      v.tone(t, { type: 'sine', f: hz(57) * k, to: hz(45) * k, d: 0.09, g: 0.3 })
      // acorde maior dedilhado (lá, dó#, mi, lá)
      for (const [i, m] of [81, 85, 88, 93].entries()) {
        v.tone(t + i * 0.014, { type: 'p25', f: hz(m) * k, hold: 0.04, d: 0.32, g: 0.1, lp: 7000 })
      }
      bell(v, t + 0.05, hz(105) * k, 0.7, 0.07)
      v.noise(t + 0.03, { f: 6000, to: 12000, q: 1.5, a: 0.04, d: 0.3, g: 0.07 })
    },
  },

  bad: {
    vary: 0.9,
    ladder: 0,
    prio: 4,
    room: 0.18,
    hall: 0.05,
    duck: [120, 0.35],
    gap: 60,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 2000, d: 0.012, g: 0.3 })
      // pancada grave
      v.tone(t, { type: 'sine', f: 150 * k, to: 42 * k, glide: 0.16, d: 0.24, g: 0.95 })
      // trinco (ruído distorcido)
      v.noise(t, { f: 950 * k, to: 320, q: 0.9, d: 0.12, g: 0.6, shape: true })
      // zumbido dissonante (segunda menor)
      v.tone(t + 0.01, { type: 'sawtooth', f: 98 * k, d: 0.17, g: 0.17, lp: 900 })
      v.tone(t + 0.01, { type: 'sawtooth', f: 104 * k, d: 0.17, g: 0.17, lp: 900 })
    },
  },

  swipe: {
    vary: 1.2,
    gain: 2,
    ladder: 0,
    prio: 1,
    room: 0.1,
    hall: 0.03,
    gap: 35,
    play(v, t, { k }) {
      v.noise(t, { f: 700 * k, to: 4800 * k, q: 1.6, a: 0.03, d: 0.11, g: 0.5 })
      v.noise(t, { filter: 'highpass', f: 6000, a: 0.04, d: 0.06, g: 0.08 })
    },
  },

  whoosh: {
    vary: 1.2,
    ladder: 0,
    prio: 1,
    room: 0.05,
    hall: 0.14,
    gap: 60,
    play(v, t, { k }) {
      v.noise(t, {
        f: 300 * k,
        pts: [
          [0.16, 2400 * k],
          [0.42, 600 * k],
        ],
        q: 1.3,
        a: 0.13,
        hold: 0.04,
        d: 0.25,
        g: 0.62,
      })
      v.noise(t, { filter: 'lowpass', f: 420, a: 0.12, d: 0.25, g: 0.24 })
      v.sweepPan(-0.5, 0.5, t, 0.42)
    },
  },

  power: {
    vary: 0.6,
    gain: 2.2,
    ladder: 0,
    prio: 3,
    room: 0.15,
    hall: 0.25,
    duck: [260, 0.6],
    gap: 80,
    play(v, t, { k }) {
      // arpejo relâmpago de chip (lá maior subindo duas oitavas)
      for (const [i, m] of [69, 73, 76, 81, 85, 88, 93].entries()) {
        v.tone(t + i * 0.028, { type: 'p25', f: hz(m) * k, d: i === 6 ? 0.22 : 0.05, g: 0.15 })
      }
      v.tone(t, {
        type: 'sawtooth',
        f: 110 * k,
        to: 880 * k,
        glide: 0.3,
        d: 0.32,
        g: 0.12,
        lp: 500,
        lpTo: 5000,
        lpT: 0.3,
        q: 6,
      })
      v.noise(t + 0.05, { filter: 'highpass', f: 8000, a: 0.1, d: 0.25, g: 0.06 })
    },
  },

  boom: {
    vary: 1.2,
    ladder: 0,
    prio: 5,
    room: 0.18,
    hall: 0.32,
    duck: [450, 0.25],
    gap: 90,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { filter: 'lowpass', f: 8000, d: 0.025, g: 0.6 })
      v.tone(t, { type: 'sine', f: 95 * k, to: 28 * k, glide: 0.6, d: 0.85, g: 1 })
      v.noise(t, { filter: 'lowpass', f: 2600 * k, to: 160, q: 0.7, a: 0.004, d: 1, g: 0.85, shape: true })
      v.noise(t + 0.01, { f: 1400 * k, q: 1, d: 0.12, g: 0.4 })
      crackles(v, t + 0.07, c, 12, 0.85, 1400, 5200, [0.07, 0.2])
    },
  },

  level: {
    vary: 0.55,
    gain: 1.8,
    ladder: 0,
    prio: 4,
    room: 0.15,
    hall: 0.32,
    duck: [650, 0.45],
    gap: 200,
    play(v, t, c) {
      const k = c.k
      const notes = [81, 85, 88, 93, 88, 93, 97]
      const L = v.branch(-0.4, 0.38)
      const R = v.branch(0.4, 0.38)
      for (const [i, m] of notes.entries()) {
        const last = i === notes.length - 1
        const at = t + i * 0.065
        const p = { type: 'p25' as const, f: hz(m) * k, d: last ? 0.5 : 0.11, g: 0.17, vib: last ? 18 : 0 }
        v.tone(at, p)
        // eco pingue-pongue
        v.tone(at + 0.13, p, i % 2 ? L : R)
      }
      for (const m of [69, 73, 76]) {
        v.tone(t + 0.39, { type: 'p12', f: hz(m) * k, a: 0.02, hold: 0.2, d: 0.45, g: 0.07 })
      }
      sparkle(v, t + 0.3, c, 14, 0.6, 0.06, [93, 95, 97, 100, 102, 105])
      v.noise(t + 0.3, { filter: 'highpass', f: 9000, a: 0.2, d: 0.5, g: 0.05 })
    },
  },

  fanfare: {
    vary: 0,
    ladder: 0,
    prio: 6,
    room: 0.1,
    hall: 0.45,
    duck: [2700, 0.15],
    gap: 1500,
    play(v, t, c) {
      const k = c.k
      const B = (at: number, ms: number[], hold: number, g: number) => {
        for (const m of ms) brass(v, t + at, m, hold, g)
      }
      // anacruse em tercina
      for (const at of [0, 0.09, 0.18]) brass(v, t + at, 76, 0.03, 0.09)
      // I · IV · V · I
      B(0.3, [57, 64, 69, 73, 76], 0.42, 0.055)
      timpani(v, t + 0.3, 45, 0.55)
      crash(v, t + 0.3, 0.18)
      B(0.95, [57, 62, 66, 69, 74], 0.2, 0.055)
      B(1.28, [59, 64, 68, 71, 76], 0.2, 0.055)
      for (let i = 0; i < 6; i++) timpani(v, t + 1.28 + i * 0.055, 40, 0.18 + i * 0.05)
      B(1.62, [57, 64, 69, 73, 76, 81], 0.95, 0.05)
      timpani(v, t + 1.62, 45, 0.6)
      crash(v, t + 1.62, 0.22, 1.8)
      // coro sintético: o nível 13 canta
      for (const m of [69, 73, 76]) choir(v, t + 1.55, m, 1.0, 0.05)
      sparkle(v, t + 1.7, { ...c, k }, 16, 0.9, 0.05, [93, 97, 100, 105])
    },
  },

  // Contagem de pontos estilo Balatro: cada degrau é uma ficha batendo, meio tom acima (combo = degrau).
  score: {
    vary: 0.45,
    ladder: 1,
    ladderMax: 24,
    stepped: true,
    prio: 2,
    room: 0.25,
    hall: 0.04,
    gap: 30,
    gain: 1.5,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 5000, d: 0.006, g: 0.22 })
      v.noise(t, { f: 2200 * k, q: 4, d: 0.02, g: 0.28 })
      v.tone(t, { type: 'p12', f: hz(81) * k * 1.018, to: hz(81) * k, glide: 0.015, d: 0.05, g: 0.17 })
      v.tone(t, { type: 'sine', f: hz(93) * k, d: 0.06, g: 0.06 })
    },
  },

  // O total pousa: pancada + acorde brilhante + chama subindo
  total: {
    vary: 0.3,
    ladder: 0,
    prio: 4,
    room: 0.15,
    hall: 0.3,
    duck: [380, 0.45],
    gap: 300,
    gain: 1.2,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { filter: 'highpass', f: 2500, d: 0.01, g: 0.4 })
      v.tone(t, { type: 'sine', f: 120 * k, to: 45, glide: 0.12, d: 0.22, g: 0.8 })
      v.noise(t, { filter: 'lowpass', f: 1600, to: 300, d: 0.12, g: 0.35, shape: true })
      for (const [i, m] of [81, 88, 93, 97].entries()) {
        v.tone(t + 0.01 + i * 0.012, { type: 'p25', f: hz(m) * k, hold: 0.06, d: 0.35, g: 0.09, vib: 14 })
      }
      v.noise(t + 0.02, { f: 700, to: 2600, q: 0.9, a: 0.08, d: 0.35, g: 0.18 })
      sparkle(v, t + 0.1, c, 8, 0.4, 0.05, [93, 97, 100, 105])
    },
  },

  // Impacto "quadro branco": estalo seco de 8 ms e soco grave, depois cauda de fumaça (ruído escuro caindo)
  impact: {
    vary: 0.8,
    ladder: 0,
    prio: 4,
    room: 0.2,
    hall: 0.18,
    duck: [90, 0.3],
    gap: 50,
    gain: 1.3,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 1500, d: 0.008, g: 0.7 })
      v.tone(t, { type: 'square', f: 2400 * k, d: 0.004, g: 0.18 })
      v.tone(t, { type: 'sine', f: 180 * k, to: 50 * k, glide: 0.06, d: 0.09, g: 0.9 })
      v.noise(t + 0.012, { filter: 'lowpass', f: 1800 * k, to: 200, a: 0.01, d: 0.45, g: 0.35, rate: 0.5 })
      v.noise(t + 0.02, { f: 520 * k, q: 0.6, a: 0.03, d: 0.33, g: 0.14 })
    },
  },

  stamp: {
    vary: 0.8,
    ladder: 0,
    prio: 3,
    room: 0.34,
    hall: 0.04,
    duck: [90, 0.6],
    gap: 80,
    play(v, t, { k }) {
      v.tone(t, { type: 'sine', f: 130 * k, to: 52 * k, glide: 0.08, d: 0.15, g: 0.85 })
      v.noise(t, { filter: 'lowpass', f: 1800 * k, d: 0.05, g: 0.6 })
      v.tone(t, { type: 'triangle', f: 320 * k, d: 0.045, g: 0.22 })
      v.noise(t + 0.012, { filter: 'highpass', f: 3500, d: 0.06, g: 0.14 })
    },
  },

  fire: {
    vary: 1,
    gain: 1.6,
    ladder: 0,
    prio: 1,
    room: 0.12,
    hall: 0.06,
    gap: 70,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { f: 550 * k, to: 1300 * k, q: 0.7, a: 0.06, hold: 0.1, d: 0.33, g: 0.36 })
      v.noise(t, { filter: 'lowpass', f: 300, a: 0.05, d: 0.4, g: 0.3 })
      v.tone(t, { type: 'sawtooth', f: 70 * k, to: 140 * k, a: 0.05, d: 0.38, g: 0.1, lp: 420 })
      crackles(v, t + 0.02, c, 7, 0.45, 2500, 6000, [0.12, 0.28])
    },
  },

  water: {
    vary: 1,
    gain: 1.6,
    ladder: 0,
    prio: 1,
    room: 0.2,
    hall: 0.05,
    gap: 70,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { f: 2600 * k, to: 650, q: 0.8, a: 0.005, d: 0.3, g: 0.5 })
      v.noise(t + 0.05, { filter: 'highpass', f: 5000, a: 0.05, d: 0.38, g: 0.07 })
      for (let i = 0; i < 5; i++) {
        const f = between(c.rnd, 480, 1150) * k
        v.tone(t + 0.04 + i * between(c.rnd, 0.04, 0.07), {
          type: 'sine',
          f,
          to: f * 1.9,
          d: 0.05,
          g: 0.13,
        })
      }
    },
  },

  shatter: {
    vary: 0.8,
    ladder: 0,
    prio: 3,
    room: 0.2,
    hall: 0.24,
    duck: [140, 0.55],
    gap: 80,
    play(v, t, c) {
      const k = c.k
      v.noise(t, { filter: 'highpass', f: 2500, d: 0.13, g: 0.5 })
      v.tone(t, { type: 'sine', f: 220 * k, to: 90 * k, d: 0.08, g: 0.32 })
      const outs = [v.branch(-0.7), v.branch(0), v.branch(0.7)]
      for (let i = 0; i < 16; i++) {
        const at = t + c.rnd() ** 2 * 0.35
        v.tone(
          at,
          {
            type: c.rnd() < 0.5 ? 'sine' : 'triangle',
            f: between(c.rnd, 2200, 7500) * k,
            d: between(c.rnd, 0.05, 0.25),
            g: between(c.rnd, 0.04, 0.1),
          },
          outs[i % 3],
        )
      }
    },
  },

  crown: {
    vary: 0,
    ladder: 0,
    prio: 5,
    room: 0.05,
    hall: 0.5,
    duck: [1500, 0.35],
    gap: 1000,
    play(v, t, c) {
      const k = c.k
      // glissando em lá maior pentatônico subindo duas oitavas
      const up = [81, 83, 85, 88, 90, 93, 95, 97, 100, 102, 105]
      for (const [i, m] of up.entries())
        v.tone(t + i * 0.038, { type: 'p12', f: hz(m) * k, d: 0.09, g: 0.08 })
      for (const m of [81, 85, 88, 93]) bell(v, t + 0.45, hz(m) * k, 1.7, 0.075)
      for (const m of [69, 73, 76]) choir(v, t + 0.38, m, 0.7, 0.04)
      v.noise(t + 0.4, { filter: 'highpass', f: 9000, a: 0.2, d: 1, g: 0.04 })
      sparkle(v, t + 0.5, c, 10, 1, 0.04, [100, 102, 105, 107])
    },
  },

  heart: {
    vary: 0.6,
    ladder: 0,
    prio: 3,
    room: 0.3,
    hall: 0.1,
    gap: 120,
    play(v, t, { k }) {
      // tum-tum quentinho + carrilhão subindo uma terça maior
      v.tone(t, { type: 'sine', f: 72, to: 48, d: 0.1, g: 0.65 })
      v.tone(t + 0.16, { type: 'sine', f: 66, to: 46, d: 0.1, g: 0.45 })
      v.tone(t + 0.04, { type: 'triangle', f: hz(81) * k, hold: 0.03, d: 0.28, g: 0.2 })
      v.tone(t + 0.13, { type: 'triangle', f: hz(85) * k, hold: 0.05, d: 0.4, g: 0.2, vib: 12 })
      v.tone(t + 0.13, { type: 'sine', f: hz(97) * k, d: 0.35, g: 0.05 })
    },
  },

  countdown: {
    vary: 0.55,
    gain: 1.6,
    ladder: 0,
    prio: 3,
    room: 0.2,
    hall: 0.08,
    gap: 200,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 5000, d: 0.01, g: 0.15 })
      v.tone(t, { type: 'square', f: hz(81) * k, hold: 0.07, d: 0.09, g: 0.12, lp: 3600 })
      v.tone(t, { type: 'sine', f: hz(69) * k, hold: 0.07, d: 0.12, g: 0.22 })
    },
  },

  go: {
    vary: 0.55,
    ladder: 0,
    prio: 4,
    room: 0.15,
    hall: 0.22,
    duck: [300, 0.5],
    gap: 300,
    play(v, t, { k }) {
      v.noise(t, { f: 600, to: 6000, q: 1.2, a: 0.02, d: 0.2, g: 0.3 })
      v.tone(t, { type: 'sine', f: 120, to: 50, d: 0.18, g: 0.6 })
      for (const m of [81, 88, 93]) {
        v.tone(t, { type: 'p25', f: hz(m) * k, hold: 0.16, d: 0.3, g: 0.11, vib: 14, vibDelay: 0.12 })
      }
    },
  },

  stone: {
    vary: 0.7,
    ladder: 0,
    prio: 4,
    room: 0.3,
    hall: 0.16,
    duck: [220, 0.5],
    gap: 120,
    play(v, t, c) {
      const k = c.k
      v.tone(t, { type: 'sine', f: 92 * k, to: 38 * k, glide: 0.25, d: 0.32, g: 0.95 })
      v.tone(t, { type: 'triangle', f: 180 * k, to: 70 * k, d: 0.1, g: 0.3 })
      v.noise(t, { filter: 'lowpass', f: 520 * k, to: 240, q: 2, a: 0.008, d: 0.36, g: 0.5, shape: true })
      crackles(v, t + 0.03, c, 9, 0.4, 1200, 3200, [0.08, 0.2])
    },
  },

  spark: {
    vary: 1,
    gain: 1.2,
    ladder: 0,
    prio: 1,
    room: 0.2,
    hall: 0.08,
    gap: 50,
    play(v, t, c) {
      const k = c.k
      const curve = Array.from({ length: 24 }, () => between(c.rnd, 200, 2400) * k)
      v.tone(t, { type: 'sawtooth', f: 900 * k, curve, glide: 0.12, d: 0.13, g: 0.15, hp: 800 })
      v.noise(t, { filter: 'highpass', f: 4000, d: 0.02, g: 0.35 })
      v.tone(t, { type: 'sine', f: 3500 * k, to: 1200 * k, d: 0.06, g: 0.08 })
    },
  },

  star: {
    vary: 0.55,
    stepped: true,
    ladder: 0,
    prio: 4,
    room: 0.15,
    hall: 0.3,
    duck: [300, 0.6],
    gap: 120,
    play(v, t, c) {
      // estrela 1, 2, 3 = lá, dó#, mi (combo 0, 1, 2); continua subindo pela tríade
      const triad = [0, 4, 7]
      const m = 81 + (triad[c.combo % 3] ?? 0) + 12 * Math.floor(c.combo / 3)
      const k = c.k
      v.noise(t, { f: 1500, to: 9000, q: 1, a: 0.02, d: 0.12, g: 0.2 })
      v.tone(t, { type: 'sine', f: 110, to: 55, d: 0.12, g: 0.4 })
      v.tone(t + 0.02, { type: 'p12', f: hz(m) * k, hold: 0.06, d: 0.4, g: 0.17, vib: 12 })
      bell(v, t + 0.02, hz(m + 12) * k, 0.9, 0.07)
      sparkle(v, t + 0.08, c, 6, 0.3, 0.05, [m + 12, m + 19, m + 24])
    },
  },

  flip: {
    vary: 1,
    gain: 2,
    ladder: 0,
    prio: 1,
    room: 0.22,
    hall: 0,
    gap: 40,
    play(v, t, { k }) {
      v.noise(t, { f: 1800 * k, to: 3600 * k, q: 1.2, a: 0.005, d: 0.05, g: 0.38 })
      v.noise(t + 0.045, { f: 2600 * k, q: 1.4, d: 0.03, g: 0.2 })
      v.tone(t + 0.04, { type: 'triangle', f: 600 * k, d: 0.03, g: 0.12 })
    },
  },

  shield: {
    vary: 0.6,
    ladder: 0,
    prio: 4,
    room: 0.18,
    hall: 0.2,
    duck: [140, 0.55],
    gap: 100,
    play(v, t, { k }) {
      v.noise(t, { filter: 'highpass', f: 3000, d: 0.015, g: 0.3 })
      v.tone(t, { type: 'sine', f: 130, to: 60, d: 0.12, g: 0.55 })
      bell(v, t, 1480 * k, 0.6, 0.13)
      v.tone(t + 0.04, { type: 'p25', f: hz(76) * k, to: hz(81) * k, glide: 0.08, d: 0.22, g: 0.1, vib: 20 })
    },
  },

  slowmo: {
    vary: 0.6,
    gain: 1.2,
    ladder: 0,
    prio: 3,
    room: 0.1,
    hall: 0.3,
    duck: [450, 0.5],
    gap: 400,
    play(v, t, { k }) {
      // fita perdendo velocidade: tudo desce junto
      v.tone(t, {
        type: 'sawtooth',
        f: 440 * k,
        to: 110 * k,
        glide: 0.45,
        d: 0.48,
        g: 0.12,
        lp: 1800,
        lpTo: 380,
      })
      v.tone(t, { type: 'sine', f: 220 * k, to: 55 * k, glide: 0.45, d: 0.5, g: 0.35 })
      v.noise(t, { filter: 'lowpass', f: 5000, to: 300, a: 0.03, d: 0.45, g: 0.22 })
    },
  },
}

// ---- stingers: frases curtas por cima da trilha ----

export const STINGERS: Record<Stinger, Recipe> = {
  win: {
    vary: 0,
    ladder: 0,
    prio: 6,
    room: 0.05,
    hall: 0.45,
    duck: [1700, 0.18],
    play(v, t) {
      // V → I com a terça em cima
      for (const m of [64, 68, 71, 76]) brass(v, t, m, 0.12, 0.06)
      for (const m of [57, 64, 69, 73, 81]) brass(v, t + 0.24, m, 0.75, 0.055)
      timpani(v, t + 0.24, 45, 0.5)
      crash(v, t + 0.24, 0.16, 1.4)
      for (const [i, m] of [81, 85, 88, 93].entries()) {
        v.tone(t + 0.3 + i * 0.06, { type: 'p25', f: hz(m), d: 0.2, g: 0.08 })
      }
    },
  },
  lose: {
    vary: 0,
    ladder: 0,
    prio: 6,
    room: 0.1,
    hall: 0.38,
    duck: [1800, 0.2],
    play(v, t) {
      // descida em lá menor, fechando o filtro (triste, sem drama)
      const line = [76, 74, 72, 71]
      for (const [i, m] of line.entries()) {
        v.tone(t + i * 0.2, { type: 'p25', f: hz(m), hold: 0.1, d: 0.12, g: 0.13, lp: 3000 - i * 500 })
      }
      v.tone(t + 0.8, {
        type: 'p25',
        f: hz(69),
        to: hz(68),
        glide: 0.9,
        hold: 0.5,
        d: 0.5,
        g: 0.13,
        lp: 1600,
        lpTo: 500,
        vib: 25,
        vibDelay: 0.2,
      })
      v.tone(t + 0.8, { type: 'triangle', f: hz(45), hold: 0.5, d: 0.5, g: 0.35 })
      v.tone(t, { type: 'sine', f: 80, to: 45, d: 0.25, g: 0.4 })
    },
  },
  boss: {
    vary: 0,
    ladder: 0,
    prio: 6,
    room: 0.05,
    hall: 0.5,
    duck: [2000, 0.15],
    play(v, t, c) {
      // entrada do chefão: impacto + cluster de metais em lá/si bemol
      v.tone(t, { type: 'sine', f: 70, to: 30, glide: 0.8, d: 1.1, g: 0.9 })
      v.noise(t, { filter: 'lowpass', f: 1800, to: 120, d: 1.2, g: 0.6, shape: true })
      for (const m of [33, 45, 46, 52]) brass(v, t + 0.02, m, 0.9, 0.06)
      for (const m of [57, 58]) brass(v, t + 0.6, m + 12, 0.6, 0.04)
      crash(v, t, 0.2, 2)
      crackles(v, t + 0.1, c, 8, 1, 800, 3000, [0.05, 0.14])
    },
  },
  streak: {
    vary: 0,
    ladder: 0,
    prio: 5,
    room: 0.1,
    hall: 0.35,
    duck: [1000, 0.35],
    play(v, t, c) {
      // sequência do diário: escala subindo + sino + brilho
      for (const [i, m] of [69, 71, 73, 76, 78, 81].entries()) {
        v.tone(t + i * 0.05, { type: 'p12', f: hz(m), d: 0.08, g: 0.13 })
      }
      bell(v, t + 0.3, hz(93), 1.2, 0.1)
      for (const m of [81, 85, 88]) v.tone(t + 0.3, { type: 'p25', f: hz(m), hold: 0.25, d: 0.4, g: 0.07 })
      sparkle(v, t + 0.35, c, 10, 0.6, 0.05, [93, 97, 100, 105])
    },
  },
}
