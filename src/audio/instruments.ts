// Instrumentos da trilha: chip moderno com percussão nordestina (zabumba, bacalhau, triângulo),
// sanfona em pulso desafinado (musette), metais de frevo e o tamborzão do funk.
import type { Graph } from './graph'
import { hz, noise, tone } from './synth'

type D = AudioNode

export const lead = (g: Graph, d: D, t: number, m: number, len: number, v = 1) => {
  tone(g, d, t, {
    type: 'p25',
    f: hz(m) * 0.995,
    to: hz(m),
    glide: 0.025,
    a: 0.008,
    hold: Math.max(0, len * 0.7 - 0.01),
    d: 0.09 + len * 0.25,
    g: 0.14 * v,
    lp: 4200,
    vib: len > 0.3 ? 16 : 0,
    vibDelay: 0.18,
    vibRate: 5.6,
  })
}

/** Lead dedilhado (título): ataque de viola, cauda longa. */
export const pluckLead = (g: Graph, d: D, t: number, m: number, len: number, v = 1) => {
  tone(g, d, t, {
    type: 'p25',
    f: hz(m),
    a: 0.004,
    d: 0.25 + len * 0.9,
    g: 0.16 * v,
    lp: 5200,
    lpTo: 900,
    lpT: 0.35 + len * 0.5,
    vib: len > 0.4 ? 14 : 0,
    vibDelay: 0.3,
    vibRate: 5,
  })
}

/** Sanfona: dois pulsos desafinados ±9 cents batem como a musette do acordeão. */
export const sanfona = (g: Graph, d: D, t: number, m: number, len: number, v = 1) => {
  for (const [type, det, gg] of [
    ['p25', -9, 0.08],
    ['p12', 9, 0.07],
  ] as const) {
    tone(g, d, t, {
      type,
      f: hz(m),
      detune: det,
      a: 0.012,
      hold: Math.max(0, len * 0.8),
      d: 0.07,
      g: gg * v,
      lp: 3600,
    })
  }
}

export const brassHit = (g: Graph, d: D, t: number, m: number, len: number, v = 1) => {
  for (const det of [-8, 8]) {
    tone(g, d, t, {
      type: 'sawtooth',
      f: hz(m),
      detune: det,
      a: 0.015,
      hold: len * 0.6,
      d: 0.08,
      g: 0.045 * v,
      lp: 900,
      lpTo: 3000,
      lpT: 0.04,
      q: 1.2,
    })
  }
}

export const bass = (g: Graph, d: D, t: number, m: number, len: number, v = 1) => {
  const hold = Math.max(0, len * 0.65)
  tone(g, d, t, { type: 'triangle', f: hz(m), a: 0.004, hold, d: 0.12, g: 0.42 * v })
  // harmônicos para o alto-falante do celular, que não reproduz o fundamental grave
  tone(g, d, t, { type: 'p25', f: hz(m), a: 0.004, hold, d: 0.08, g: 0.06 * v, lp: 850 })
}

export const pad = (g: Graph, d: D, t: number, ms: number[], len: number, v = 1) => {
  for (const m of ms) {
    for (const det of [-9, 9]) {
      tone(g, d, t, {
        type: 'sawtooth',
        f: hz(m),
        detune: det,
        a: Math.min(0.4, len * 0.3),
        hold: Math.max(0, len * 0.7),
        d: 0.6,
        g: 0.022 * v,
        lp: 1300,
        q: 0.4,
      })
    }
  }
}

export const pluck = (g: Graph, d: D, t: number, m: number, v = 1) => {
  tone(g, d, t, { type: 'p25', f: hz(m), a: 0.003, d: 0.22, g: 0.09 * v, lp: 3800, lpTo: 500, lpT: 0.16 })
}

export const stab = (g: Graph, d: D, t: number, ms: number[], len: number, v = 1) => {
  for (const m of ms) sanfona(g, d, t, m, len, v * 0.6)
}

// ---- percussão ----

export const zabumba = (g: Graph, d: D, t: number, v = 1, open = true) => {
  if (open) {
    tone(g, d, t, { type: 'sine', f: 128, to: 52, glide: 0.13, d: 0.24, g: 0.85 * v })
    tone(g, d, t, { type: 'triangle', f: 250, to: 110, glide: 0.05, d: 0.06, g: 0.22 * v })
  } else {
    tone(g, d, t, { type: 'sine', f: 165, to: 95, glide: 0.04, d: 0.07, g: 0.5 * v })
  }
  noise(g, d, t, { filter: 'lowpass', f: 1100, d: 0.012, g: 0.3 * v })
}

/** Bacalhau: a vareta no couro de baixo da zabumba. */
export const bacalhau = (g: Graph, d: D, t: number, v = 1) => {
  noise(g, d, t, { f: 3200, q: 2.5, d: 0.02, g: 0.32 * v })
  tone(g, d, t, { type: 'square', f: 1750, d: 0.008, g: 0.04 * v })
}

export const triangulo = (g: Graph, d: D, t: number, v = 1, open = false) => {
  const dur = open ? 0.3 : 0.035
  tone(g, d, t, { type: 'sine', f: 5230, d: dur, g: 0.05 * v })
  tone(g, d, t, { type: 'sine', f: 7410, d: dur * 0.8, g: 0.035 * v })
  noise(g, d, t, { filter: 'highpass', f: 8500, d: open ? 0.06 : 0.018, g: 0.09 * v })
}

export const kick = (g: Graph, d: D, t: number, v = 1) => {
  tone(g, d, t, { type: 'sine', f: 170, to: 46, glide: 0.08, d: 0.3, g: 0.9 * v })
  tone(g, d, t, { type: 'triangle', f: 340, to: 90, glide: 0.03, d: 0.04, g: 0.25 * v })
  noise(g, d, t, { filter: 'lowpass', f: 3000, d: 0.008, g: 0.3 * v })
}

export const snare = (g: Graph, d: D, t: number, v = 1) => {
  noise(g, d, t, { f: 1900, q: 0.7, d: 0.12, g: 0.42 * v })
  tone(g, d, t, { type: 'triangle', f: 210, to: 165, d: 0.06, g: 0.25 * v })
}

export const clap = (g: Graph, d: D, t: number, v = 1) => {
  for (const dt of [0, 0.011, 0.022]) noise(g, d, t + dt, { f: 1300, q: 1.2, d: 0.012, g: 0.38 * v })
  noise(g, d, t + 0.03, { f: 1400, q: 0.9, d: 0.1, g: 0.3 * v })
}

export const hat = (g: Graph, d: D, t: number, v = 1) => {
  noise(g, d, t, { filter: 'highpass', f: 7500, d: 0.03, g: 0.13 * v })
}

export const agogo = (g: Graph, d: D, t: number, v = 1, high = true) => {
  const f = high ? 1170 : 780
  tone(g, d, t, { type: 'sine', f, d: 0.14, g: 0.09 * v })
  tone(g, d, t, { type: 'sine', f: f * 2.52, d: 0.05, g: 0.04 * v })
  tone(g, d, t, { type: 'square', f, d: 0.012, g: 0.03 * v, lp: 3000 })
}

export const cymbal = (g: Graph, d: D, t: number, v = 1) => {
  noise(g, d, t, { filter: 'highpass', f: 5200, d: 1.3, g: 0.14 * v, q: 0.5 })
}

export const timp = (g: Graph, d: D, t: number, m: number, v = 1) => {
  tone(g, d, t, { type: 'sine', f: hz(m) * 1.05, to: hz(m), glide: 0.06, d: 0.55, g: 0.6 * v })
  noise(g, d, t, { filter: 'lowpass', f: 800, d: 0.05, g: 0.25 * v })
}
