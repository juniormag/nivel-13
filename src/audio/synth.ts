// Primitivas de síntese: um oscilador com envelope e um ruído filtrado.
// Cada chamada cria poucos nós e para sozinha; o chamador decide para onde vai.
import type { Graph } from './graph'

export type Wave = OscillatorType | 'p12' | 'p25'

export interface ToneP {
  type?: Wave
  /** Hz */
  f: number
  /** glide até este Hz */
  to?: number
  /** duração do glide (padrão: a + hold + d) */
  glide?: number
  /** curva de frequência arbitrária ao longo do glide (Hz) */
  curve?: number[]
  /** ataque, sustentação e queda (s) */
  a?: number
  hold?: number
  d: number
  /** ganho de pico */
  g: number
  detune?: number
  /** vibrato: profundidade em cents, taxa em Hz, atraso em s */
  vib?: number
  vibRate?: number
  vibDelay?: number
  lp?: number
  lpTo?: number
  lpT?: number
  q?: number
  hp?: number
  bp?: number
  /** passa pela distorção "crunch" */
  shape?: boolean
}

export interface NoiseP {
  a?: number
  hold?: number
  d: number
  g: number
  filter?: BiquadFilterType
  f: number
  to?: number
  /** pontos extras da varredura do filtro: [segundos desde t, Hz] */
  pts?: [number, number][]
  q?: number
  /** velocidade de leitura do buffer (muda a cor do ruído) */
  rate?: number
  shape?: boolean
  /** segundo filtro passa-alta */
  hp?: number
}

const MIN = 1e-4

function env(p: AudioParam, t: number, a: number, hold: number, d: number, g: number) {
  p.setValueAtTime(0, t)
  p.linearRampToValueAtTime(g, t + a)
  if (hold > 0) p.setValueAtTime(g, t + a + hold)
  p.exponentialRampToValueAtTime(Math.max(g * 1e-3, MIN * 0.1), t + a + hold + d)
  p.setValueAtTime(0, t + a + hold + d + 0.002)
}

function shaper(g: Graph) {
  const s = g.ctx.createWaveShaper()
  s.curve = g.crunch
  return s
}

/** Liga uma cadeia de nós e devolve o primeiro. */
function chain(nodes: AudioNode[], dest: AudioNode) {
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    if (a && b) a.connect(b)
  }
  nodes[nodes.length - 1]?.connect(dest)
  return nodes[0]
}

export function tone(g: Graph, dest: AudioNode, t: number, p: ToneP): OscillatorNode {
  const ctx = g.ctx
  const a = p.a ?? 0.002
  const hold = p.hold ?? 0
  const end = t + a + hold + p.d
  const o = ctx.createOscillator()
  if (p.type === 'p12') o.setPeriodicWave(g.p12)
  else if (p.type === 'p25') o.setPeriodicWave(g.p25)
  else o.type = p.type ?? 'square'
  // nada acima de Nyquist (pitch alto + combo alto não pode estourar)
  const top = ctx.sampleRate * 0.45
  const fq = (v: number) => Math.min(top, Math.max(1, v))
  o.frequency.setValueAtTime(fq(p.f), t)
  const gl = p.glide ?? end - t
  if (p.curve && p.curve.length > 1) {
    o.frequency.setValueCurveAtTime(p.curve.map(fq), t, gl)
  } else if (p.to !== undefined && p.to > 0) {
    o.frequency.exponentialRampToValueAtTime(fq(p.to), t + gl)
  }
  if (p.detune) o.detune.value = p.detune
  const nodes: AudioNode[] = []
  if (p.hp) {
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = p.hp
    nodes.push(f)
  }
  if (p.bp) {
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = p.bp
    f.Q.value = p.q ?? 1
    nodes.push(f)
  }
  if (p.lp) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.Q.value = p.q ?? 0.7
    f.frequency.setValueAtTime(p.lp, t)
    if (p.lpTo) f.frequency.exponentialRampToValueAtTime(p.lpTo, t + (p.lpT ?? end - t))
    nodes.push(f)
  }
  if (p.shape) nodes.push(shaper(g))
  const v = ctx.createGain()
  env(v.gain, t, a, hold, p.d, p.g)
  nodes.push(v)
  const first = chain(nodes, dest)
  if (first) o.connect(first)
  o.start(t)
  o.stop(end + 0.01)
  if (p.vib) {
    const lfo = ctx.createOscillator()
    lfo.frequency.value = p.vibRate ?? 5.5
    const depth = ctx.createGain()
    const vd = p.vibDelay ?? 0.12
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(0, t + vd)
    depth.gain.linearRampToValueAtTime(p.vib, t + vd + 0.15)
    lfo.connect(depth)
    depth.connect(o.detune)
    lfo.start(t)
    lfo.stop(end + 0.01)
  }
  return o
}

export function noise(g: Graph, dest: AudioNode, t: number, p: NoiseP): AudioBufferSourceNode {
  const ctx = g.ctx
  const a = p.a ?? 0.001
  const hold = p.hold ?? 0
  const end = t + a + hold + p.d
  const s = ctx.createBufferSource()
  s.buffer = g.noise
  s.loop = true
  s.playbackRate.value = p.rate ?? 1
  const f = ctx.createBiquadFilter()
  f.type = p.filter ?? 'bandpass'
  f.Q.value = p.q ?? 0.8
  f.frequency.setValueAtTime(p.f, t)
  if (p.pts) {
    for (const [dt, hz] of p.pts) f.frequency.exponentialRampToValueAtTime(hz, t + dt)
  } else if (p.to) {
    f.frequency.exponentialRampToValueAtTime(p.to, end)
  }
  const nodes: AudioNode[] = [f]
  if (p.hp) {
    const h = ctx.createBiquadFilter()
    h.type = 'highpass'
    h.frequency.value = p.hp
    nodes.push(h)
  }
  if (p.shape) nodes.push(shaper(g))
  const v = ctx.createGain()
  env(v.gain, t, a, hold, p.d, p.g)
  nodes.push(v)
  const first = chain(nodes, dest)
  if (first) s.connect(first)
  // começa num ponto aleatório do buffer: nunca o mesmo ruído duas vezes
  s.start(t, Math.random() * 1.5)
  s.stop(end + 0.01)
  return s
}

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** "A4" → 69, "C#5" → 73, "Bb3" → 58 */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!m) throw new Error(`nota inválida: ${name}`)
  const pc = PC[m[1] ?? 'C'] ?? 0
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return 12 * (Number(m[3]) + 1) + pc + acc
}
