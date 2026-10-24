// Trilha: um tema por momento, todos em lá (menor na jornada, maior na vitória).
//   title   84 bpm  cadência andaluza Am·G·F·E, pads, lead dedilhado, zabumba e triângulo
//   game   116 bpm  baião: zabumba + bacalhau + triângulo, sanfona, baixo na célula do baião
//   boss   132 bpm  frevo + tamborzão do funk carioca, metais em tresillo, frígio (Bb)
//   victory 120 bpm hino curto em lá maior
//   map    100 bpm  aventura leve Am·F·C·G
//   daily  108 bpm  xote alegre C·G·Am·F
import * as I from './instruments'
import { melody, type Song, type Step } from './sequencer'

interface Chord {
  /** fundamental no baixo */
  b: number
  /** vozes do meio */
  v: number[]
}

const CH: Record<string, Chord> = {
  Am: { b: 45, v: [57, 60, 64] },
  A: { b: 45, v: [57, 61, 64] },
  G: { b: 43, v: [55, 59, 62] },
  F: { b: 41, v: [53, 57, 60] },
  E: { b: 40, v: [52, 56, 59] },
  D: { b: 38, v: [54, 57, 62] },
  C: { b: 36, v: [55, 60, 64] },
  Bb: { b: 46, v: [53, 58, 62] },
}

const prog = (names: string[]) => names.map((n) => CH[n] ?? { b: 45, v: [57, 60, 64] })
const at = <T>(a: T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T

function playLead(
  s: Step,
  line: ReturnType<typeof melody>,
  inst: (g: Step['g'], d: AudioNode, t: number, m: number, len: number, v?: number) => void,
  v = 1,
  transpose = 0,
) {
  const n = line[(s.bar * 16 + s.i) % line.length]
  if (n) inst(s.g, s.out.lead, s.t, n.m + transpose, n.len * s.s16, v)
}

// ---------------------------------------------------------------- título
const TITLE_P = prog(['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'])
const TITLE_L = melody(`
  A4 - - - C5 - E5 - - - - - D5 - C5 -
  B4 - - - - - G4 - - - B4 - D5 - - -
  C5 - - - A4 - - - C5 - F5 - - - E5 -
  E5 - - - - - - - G#4 - - - B4 - - -
  A5 - - - - - G5 - E5 - - - C5 - E5 -
  D5 - - - - - B4 - G4 - - - D5 - - -
  C5 - - - - - A4 - F5 - E5 - D5 - C5 -
  B4 - - - - - - - G#4 - - - - - . .
`)

const title: Song = {
  bpm: 84,
  bars: 8,
  swing: 0,
  gain: 1.12,
  gate: { harm: 0, bass: 0, perc: 0.15, lead: 0.3, extra: 0.55 },
  verb: { harm: 0.35, lead: 0.4, extra: 0.3, perc: 0.12 },
  tick(s) {
    const c = at(TITLE_P, s.bar)
    const { g, t, i, out, on } = s
    if (on.harm && i === 0) I.pad(g, out.harm, t, c.v, s.s16 * 16, 1)
    if (on.bass) {
      if (i === 0) I.bass(g, out.bass, t, c.b, s.s16 * 6)
      if (i === 6) I.bass(g, out.bass, t, c.b, s.s16 * 2, 0.6)
      if (i === 8) I.bass(g, out.bass, t, c.b + 7, s.s16 * 4, 0.8)
      if (i === 12) I.bass(g, out.bass, t, c.b + 12, s.s16 * 4, 0.7)
    }
    if (on.perc) {
      if (i === 0) I.zabumba(g, out.perc, t, 0.8)
      if (i === 6) I.zabumba(g, out.perc, t, 0.5)
      if (i === 10) I.bacalhau(g, out.perc, t, 0.5)
      if (i === 4 || i === 12) I.triangulo(g, out.perc, t, 0.6, true)
      if (s.I > 0.5 && i % 4 === 2) I.triangulo(g, out.perc, t, 0.3)
      // rufo de tímpano antes da volta
      if (s.I > 0.45 && s.bar === 7 && i >= 12) I.timp(g, out.perc, t, 40, 0.25 + (i - 12) * 0.12)
    }
    if (on.lead) playLead(s, TITLE_L, I.pluckLead, 1.4)
    if (on.extra && i % 2 === 0) {
      const pat = [0, 1, 2, 1, 2, 0, 1, 2]
      I.pluck(g, out.extra, t, at(c.v, at(pat, i / 2)) + 12, 0.7)
    }
  },
}

// ---------------------------------------------------------------- jornada (baião)
const GAME_P = prog(['Am', 'D', 'Am', 'G', 'F', 'G', 'Am', 'E'])
const GAME_L = melody(`
  E5 - - D5 E5 - G5 - E5 - - D5 C5 - A4 -
  F#5 - - E5 F#5 - A5 - F#5 - - E5 D5 - - -
  E5 - - D5 E5 - G5 - A5 - - G5 E5 - C5 -
  D5 - - C5 B4 - G4 - B4 - D5 - G5 - - -
  A5 - - G5 F5 - C5 - F5 - - E5 F5 - A5 -
  G5 - - F5 E5 - D5 - B4 - - D5 G5 - - -
  A5 - - G5 E5 - C5 - E5 - G5 - A5 - - -
  G#5 - - - B5 - - - G#5 - E5 - D5 - B4 -
`)
// triângulo por posição no tempo: fechado, fechado, ABERTO, fechado
const TRI_V = [0.6, 0.3, 0.8, 0.35]

const game: Song = {
  bpm: 116,
  bars: 8,
  swing: 0.06,
  gate: { perc: 0, bass: 0.1, harm: 0.3, lead: 0.4, extra: 0.65 },
  verb: { lead: 0.22, harm: 0.15, extra: 0.15, perc: 0.05 },
  tick(s) {
    const c = at(GAME_P, s.bar)
    const { g, t, i, out, on } = s
    if (on.perc) {
      const fill = s.I >= 0.5 && s.bar === 7 && i >= 12
      if (fill) I.zabumba(g, out.perc, t, 0.5 + (i - 12) * 0.12, i % 2 === 0)
      else if (i === 0 || i === 8) I.zabumba(g, out.perc, t, 1)
      else if (i === 3 || i === 11) I.zabumba(g, out.perc, t, 0.7)
      else if (i === 4 || i === 12) I.zabumba(g, out.perc, t, 0.45, false)
      if (i === 2 || i === 6 || i === 10 || i === 14) I.bacalhau(g, out.perc, t, 0.7)
      if (s.I >= 0.35 || i % 4 === 2) I.triangulo(g, out.perc, t, at(TRI_V, i), i % 4 === 2)
      if (s.I >= 0.85 && (i === 4 || i === 12)) I.snare(g, out.perc, t, 0.5)
      if (s.I >= 0.85 && s.bar === 0 && i === 0 && s.pass > 0) I.cymbal(g, out.perc, t, 0.7)
    }
    if (on.bass) {
      // célula do baião: colcheia pontuada, semicolcheia, colcheia
      if (i === 0 || i === 8) I.bass(g, out.bass, t, c.b, s.s16 * 3)
      if (i === 3 || i === 11) I.bass(g, out.bass, t, c.b - 5, s.s16)
      if (i === 4) I.bass(g, out.bass, t, c.b, s.s16 * 2, 0.8)
      if (i === 12) I.bass(g, out.bass, t, c.b + 12, s.s16 * 2, 0.8)
      if (i === 14 && s.I >= 0.6) I.bass(g, out.bass, t, c.b + 4, s.s16 * 2, 0.6)
    }
    if (on.harm) {
      if (i === 2 || i === 6 || i === 10 || i === 14) I.stab(g, out.harm, t, c.v, s.s16 * 1.4, 1)
      if (s.I >= 0.7 && (i === 7 || i === 15)) I.stab(g, out.harm, t, c.v, s.s16 * 0.8, 0.6)
    }
    if (on.lead) {
      playLead(s, GAME_L, I.sanfona, 1.3)
      if (s.I >= 0.8 && s.pass % 2 === 1) playLead(s, GAME_L, I.lead, 0.35, 12)
    }
    if (on.extra && i % 2 === 1) {
      const pat = [2, 1, 0, 1, 2, 1, 0, 2]
      I.pluck(g, out.extra, t, at(c.v, at(pat, (i - 1) / 2)) + 12, 0.9)
    }
  },
}

// ---------------------------------------------------------------- chefão (frevo + tamborzão)
const BOSS_P = prog(['Am', 'Bb', 'Am', 'E', 'F', 'G', 'E', 'E'])
const BOSS_L = melody(
  `
  A4 C5 E5 A5 - - G#5 A5 - - E5 - C5 - E5 -
  D5 F5 Bb5 - - A5 Bb5 - F5 - D5 - Bb4 - D5 -
  E5 - A5 - C6 - - B5 C6 - A5 - E5 - C5 -
  B4 - - G#4 B4 - E5 - G#5 - B5 - E6 - - -
  C6 - A5 - F5 - A5 C6 - - A5 - F5 - C5 -
  B5 - G5 - D5 - G5 B5 - - G5 - D5 - B4 -
  G#5 A5 G#5 F5 E5 - - - G#5 A5 G#5 F5 E5 - - -
  E5 F5 G#5 A5 B5 C6 D6 E6 - - - - . . . .
`,
  -12,
)
const TRESILLO = [0, 3, 6, 8, 11, 14]
const FREVO_ACC = [0.9, 0.3, 0.6, 0.3, 0.4, 0.3, 0.7, 0.9, 0.3, 0.3, 0.8, 0.3, 0.4, 0.3, 0.6, 0.9]

const boss: Song = {
  bpm: 132,
  bars: 8,
  swing: 0,
  gate: { perc: 0, bass: 0, harm: 0.3, lead: 0.35, extra: 0.6 },
  verb: { lead: 0.18, harm: 0.15, extra: 0.1, perc: 0.04 },
  tick(s) {
    const c = at(BOSS_P, s.bar)
    const { g, t, i, out, on } = s
    if (on.perc) {
      if (TRESILLO.includes(i)) I.kick(g, out.perc, t, i === 0 || i === 8 ? 1 : 0.75)
      if (i === 4 || i === 12) I.clap(g, out.perc, t, 0.9)
      if (s.I >= 0.3 && i % 2 === 0) I.hat(g, out.perc, t, i % 4 === 2 ? 0.9 : 0.5)
      if (s.I >= 0.5) I.snare(g, out.perc, t, at(FREVO_ACC, i) * 0.4)
      if (s.bar === 0 && i === 0) I.cymbal(g, out.perc, t, 0.8)
    }
    if (on.bass) {
      if (TRESILLO.includes(i)) I.bass(g, out.bass, t, c.b + (i === 3 || i === 11 ? 12 : 0), s.s16 * 2)
      else if (s.I >= 0.7 && i % 2 === 1) I.bass(g, out.bass, t, c.b + 12, s.s16 * 0.8, 0.5)
    }
    if (on.harm && (i === 0 || i === 3 || i === 6 || i === 10)) {
      for (const m of c.v) I.brassHit(g, out.harm, t, m, s.s16 * (i === 6 ? 3 : 1.5), 1)
    }
    if (on.lead) {
      playLead(s, BOSS_L, I.lead, 1.1)
      if (s.I >= 0.8) playLead(s, BOSS_L, I.brassHit, 0.8, -12)
    }
    if (on.extra) {
      if ([0, 2, 5, 8, 10, 13].includes(i)) I.agogo(g, out.extra, t, 1.6, i !== 5 && i !== 13)
    }
  },
}

// ---------------------------------------------------------------- vitória
const VIC_P = prog(['A', 'D', 'E', 'A'])
const VIC_L = melody(`
  A4 - C#5 - E5 - - - A5 - - - G#5 - A5 -
  F#5 - - - A5 - F#5 - D5 - - - E5 - F#5 -
  E5 - - - G#5 - B5 - E6 - - - D6 - B5 -
  C#6 - - - - - - - A5 - - - - - . .
`)

const victory: Song = {
  bpm: 120,
  bars: 4,
  swing: 0,
  gate: { perc: 0, bass: 0, harm: 0, lead: 0, extra: 0.5 },
  verb: { lead: 0.3, harm: 0.35, extra: 0.25, perc: 0.08 },
  tick(s) {
    const c = at(VIC_P, s.bar)
    const { g, t, i, out, on } = s
    if (on.harm && i === 0) I.pad(g, out.harm, t, [...c.v, (c.v[0] ?? 57) + 12], s.s16 * 16, 1)
    if (on.bass && i % 4 === 0) I.bass(g, out.bass, t, c.b + (i === 8 ? 7 : 0), s.s16 * 3)
    if (on.perc) {
      if (i === 0 || i === 8) I.kick(g, out.perc, t, 0.8)
      if (i === 4 || i === 12) I.snare(g, out.perc, t, 0.6)
      if (s.bar === 3 && i >= 12) I.snare(g, out.perc, t, 0.3 + (i - 12) * 0.1)
      if (i % 2 === 0) I.triangulo(g, out.perc, t, i % 4 === 2 ? 0.7 : 0.35, i % 4 === 2)
      if (s.bar === 0 && i === 0) I.cymbal(g, out.perc, t, 0.8)
    }
    if (on.lead) playLead(s, VIC_L, I.lead, 1.1)
    if (on.extra && i % 2 === 0) I.pluck(g, out.extra, t, at(c.v, i / 2) + 12, 0.6)
  },
}

// ---------------------------------------------------------------- mapa
const MAP_P = prog(['Am', 'F', 'C', 'G'])
const MAP_L = melody(`
  E5 - - - . . A4 - C5 - - - . . . .
  D5 - - - C5 - A4 - . . F4 - A4 - - -
  G5 - - - E5 - - - C5 - D5 - E5 - - -
  D5 - - - B4 - - - G4 - - - . . . .
`)

const map: Song = {
  bpm: 100,
  bars: 4,
  swing: 0.05,
  gain: 1.15,
  gate: { harm: 0, bass: 0, perc: 0.1, lead: 0.45, extra: 0.7 },
  verb: { harm: 0.25, lead: 0.3, extra: 0.2, perc: 0.06 },
  tick(s) {
    const c = at(MAP_P, s.bar)
    const { g, t, i, out, on } = s
    if (on.harm && i % 2 === 0) {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2]
      I.pluck(g, out.harm, t, at(c.v, at(pat, i / 2)) + 12, 1.4)
    }
    if (on.bass) {
      if (i === 0 || i === 8) I.bass(g, out.bass, t, c.b, s.s16 * 3, 0.85)
      if (i === 3 || i === 11) I.bass(g, out.bass, t, c.b - 5, s.s16, 0.6)
    }
    if (on.perc) {
      if (i === 0 || i === 8) I.zabumba(g, out.perc, t, 0.7)
      if (i === 3 || i === 11) I.zabumba(g, out.perc, t, 0.45)
      if (i % 4 === 2) I.triangulo(g, out.perc, t, 0.55, true)
      if (s.I >= 0.5 && i % 4 === 0) I.triangulo(g, out.perc, t, 0.3)
    }
    if (on.lead) playLead(s, MAP_L, I.lead, 0.9)
    if (on.extra && (i === 6 || i === 14)) I.stab(g, out.extra, t, c.v, s.s16 * 1.4, 0.8)
  },
}

// ---------------------------------------------------------------- diário (xote)
const DAILY_P = prog(['C', 'G', 'Am', 'F'])
const DAILY_L = melody(`
  E5 - G5 - C6 - - - G5 - E5 - G5 - - -
  D5 - G5 - B5 - - - A5 - G5 - D5 - - -
  C5 - E5 - A5 - - - G5 - E5 - C5 - - -
  A4 - C5 - F5 - - - E5 - D5 - C5 - . .
`)

const daily: Song = {
  bpm: 108,
  bars: 4,
  swing: 0.08,
  gain: 1.1,
  gate: { perc: 0, bass: 0, harm: 0.2, lead: 0.35, extra: 0.6 },
  verb: { lead: 0.2, harm: 0.15, extra: 0.15, perc: 0.05 },
  tick(s) {
    const c = at(DAILY_P, s.bar)
    const { g, t, i, out, on } = s
    if (on.perc) {
      if (i === 0 || i === 6 || i === 8) I.zabumba(g, out.perc, t, i === 0 ? 0.9 : 0.6)
      if (i === 4 || i === 12) I.bacalhau(g, out.perc, t, 0.8)
      if (i % 2 === 0) I.triangulo(g, out.perc, t, i % 4 === 2 ? 0.7 : 0.35, i % 4 === 2)
    }
    if (on.bass) {
      if (i === 0 || i === 8) I.bass(g, out.bass, t, c.b, s.s16 * 3, 0.9)
      if (i === 6 || i === 12) I.bass(g, out.bass, t, c.b + 7, s.s16 * 2, 0.7)
    }
    if (on.harm && (i === 4 || i === 12)) I.stab(g, out.harm, t, c.v, s.s16 * 2.5, 0.9)
    if (on.lead) playLead(s, DAILY_L, I.sanfona, 1.2)
    if (on.extra && i % 2 === 1) I.pluck(g, out.extra, t, at(c.v, (i - 1) / 2) + 12, 0.5)
  },
}

export type Track = 'title' | 'game' | 'boss' | 'victory' | 'map' | 'daily' | 'none'

export const SONGS: Record<Exclude<Track, 'none'>, Song> = { title, game, boss, victory, map, daily }

/** Intensidade inicial de cada faixa (setIntensity muda depois). */
export const DEFAULT_INTENSITY: Record<Exclude<Track, 'none'>, number> = {
  title: 0.6,
  game: 0.5,
  boss: 0.7,
  victory: 0.7,
  map: 0.5,
  daily: 0.5,
}
