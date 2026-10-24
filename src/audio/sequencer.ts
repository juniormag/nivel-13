// Sequenciador com lookahead: agenda semicolcheias um pouco à frente do relógio do áudio.
// Cada faixa tem camadas (percussão, baixo, harmonia, melodia, extra) que entram e saem com a intensidade.
import type { Graph } from './graph'
import { midi } from './synth'

export type Layer = 'perc' | 'bass' | 'harm' | 'lead' | 'extra'
export const LAYERS: Layer[] = ['perc', 'bass', 'harm', 'lead', 'extra']

export interface Step {
  g: Graph
  /** hora desta semicolcheia (já com swing) */
  t: number
  /** segundos por semicolcheia */
  s16: number
  /** compasso dentro da música (0..bars-1) e semicolcheia no compasso (0..15) */
  bar: number
  i: number
  /** quantas vezes a música já deu a volta */
  pass: number
  /** intensidade 0..1 */
  I: number
  out: Record<Layer, AudioNode>
  on: Record<Layer, boolean>
  rnd: () => number
}

export interface Song {
  bpm: number
  bars: number
  /** atraso das semicolcheias pares-fracas, em fração da semicolcheia */
  swing: number
  /** intensidade mínima para cada camada tocar */
  gate: Record<Layer, number>
  /** envio de cada camada para o salão */
  verb?: Partial<Record<Layer, number>>
  /** ganho da faixa */
  gain?: number
  tick(s: Step): void
}

export class Seq {
  readonly song: Song
  readonly start: number
  readonly s16: number
  readonly out: GainNode
  private readonly g: Graph
  private readonly layers: Record<Layer, GainNode>
  private readonly on: Record<Layer, boolean>
  private readonly offSince: Record<Layer, number>
  private readonly nodes: AudioNode[] = []
  private step = 0
  private I: number
  stopAt = Number.POSITIVE_INFINITY

  constructor(g: Graph, song: Song, start: number, intensity: number, fadeIn = 0.03) {
    this.g = g
    this.song = song
    this.start = start
    this.s16 = 60 / song.bpm / 4
    this.I = intensity
    const ctx = g.ctx
    this.out = ctx.createGain()
    const gain = song.gain ?? 1
    this.out.gain.setValueAtTime(0.0001, Math.max(0, start - 0.01))
    this.out.gain.setTargetAtTime(gain, start, fadeIn)
    this.out.connect(g.music)
    this.nodes.push(this.out)
    const layers = {} as Record<Layer, GainNode>
    const on = {} as Record<Layer, boolean>
    const offSince = {} as Record<Layer, number>
    for (const l of LAYERS) {
      const n = ctx.createGain()
      on[l] = intensity >= song.gate[l]
      n.gain.value = on[l] ? 1 : 0
      offSince[l] = on[l] ? Number.POSITIVE_INFINITY : -10
      n.connect(this.out)
      const v = song.verb?.[l] ?? 0
      if (v > 0) {
        const s = ctx.createGain()
        s.gain.value = v
        n.connect(s)
        s.connect(g.hall)
        this.nodes.push(s)
      }
      layers[l] = n
      this.nodes.push(n)
    }
    this.layers = layers
    this.on = on
    this.offSince = offSince
  }

  private grid(step: number) {
    return this.start + step * this.s16
  }

  /** Próxima semicolcheia ainda não agendada. */
  get next() {
    return this.grid(this.step)
  }

  get barDur() {
    return this.s16 * 16
  }

  setIntensity(I: number, now: number) {
    this.I = I
    for (const l of LAYERS) {
      const want = I >= this.song.gate[l]
      if (want === this.on[l]) continue
      this.on[l] = want
      // entra rápido e sai devagar, como um músico que para de tocar
      this.layers[l].gain.setTargetAtTime(want ? 1 : 0, now, want ? 0.08 : 0.5)
      this.offSince[l] = want ? Number.POSITIVE_INFINITY : now
    }
  }

  advance(now: number, until: number) {
    // travou o main thread? pula para frente em vez de despejar notas atrasadas
    if (this.grid(this.step) < now - 0.08) this.step = Math.ceil((now - this.start) / this.s16)
    const song = this.song
    const out = this.layers as Record<Layer, AudioNode>
    while (this.grid(this.step) < until && this.grid(this.step) < this.stopAt) {
      const step = this.step
      const i = step % 16
      const absBar = Math.floor(step / 16)
      const t = this.grid(step) + (step % 2 ? song.swing * this.s16 : 0)
      const on = {} as Record<Layer, boolean>
      // uma camada que acabou de sair continua agendando enquanto o fade dela soa
      for (const l of LAYERS) on[l] = this.on[l] || t < this.offSince[l] + 1.5
      if (t >= now - 0.01) {
        song.tick({
          g: this.g,
          t,
          s16: this.s16,
          bar: absBar % song.bars,
          i,
          pass: Math.floor(absBar / song.bars),
          I: this.I,
          out,
          on,
          rnd: Math.random,
        })
      }
      this.step++
    }
  }

  /** Hora do próximo compasso (ou tempo, se o compasso estiver longe) ainda não agendado. */
  boundary(now: number, maxWait = 1.4) {
    const from = Math.max(now + 0.03, this.next)
    const bar = this.barDur
    const atBar = this.start + Math.ceil((from - this.start - 1e-4) / bar) * bar
    if (atBar - now <= maxWait) return atBar
    const beat = this.s16 * 4
    return this.start + Math.ceil((from - this.start - 1e-4) / beat) * beat
  }

  /** Para de agendar em `at` e some com a cauda. */
  release(at: number, tau = 0.09) {
    this.stopAt = at
    const p = this.out.gain
    p.cancelScheduledValues(at)
    p.setTargetAtTime(0, at, tau)
  }

  done(now: number) {
    return now > this.stopAt + 2
  }

  dispose() {
    for (const n of this.nodes) n.disconnect()
  }
}

/** "A4 - - . C#5" → uma entrada por semicolcheia: nota com duração em semicolcheias, ou null. */
export function melody(src: string, transpose = 0): ({ m: number; len: number } | null)[] {
  const toks = src.trim().split(/\s+/)
  const out: ({ m: number; len: number } | null)[] = []
  let last: { m: number; len: number } | null = null
  for (const tk of toks) {
    if (tk === '-') {
      if (last) last.len++
      out.push(null)
    } else if (tk === '.') {
      last = null
      out.push(null)
    } else {
      last = { m: midi(tk) + transpose, len: 1 }
      out.push(last)
    }
  }
  return out
}
