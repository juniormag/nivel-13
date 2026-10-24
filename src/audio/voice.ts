// Uma "voz" é um disparo de efeito: ganho próprio → pan → barramento de sfx, com envios de reverb.
// Guarda as fontes para poder ser roubada (limite de vozes) e se desmonta sozinha no fim.
import type { Graph } from './graph'
import { type NoiseP, noise, type ToneP, tone } from './synth'

export interface VoiceOpts {
  gain: number
  pan: number
  room: number
  hall: number
  prio: number
}

export class Voice {
  readonly g: Graph
  readonly out: GainNode
  readonly prio: number
  readonly born: number
  end = 0
  private readonly nodes: AudioNode[] = []
  private readonly sources: AudioScheduledSourceNode[] = []
  private alive = 0
  private dead = false

  constructor(g: Graph, dest: AudioNode, o: VoiceOpts) {
    this.g = g
    this.prio = o.prio
    this.born = g.ctx.currentTime
    const ctx = g.ctx
    this.out = ctx.createGain()
    this.out.gain.value = o.gain
    const pan = this.panner(o.pan)
    this.out.connect(pan)
    pan.connect(dest)
    this.nodes.push(this.out, pan)
    if (o.room > 0) this.send(pan, g.room, o.room)
    if (o.hall > 0) this.send(pan, g.hall, o.hall)
  }

  private panner(v: number): AudioNode {
    const ctx = this.g.ctx
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, v))
      return p
    }
    return ctx.createGain()
  }

  private send(from: AudioNode, to: AudioNode, amount: number) {
    const s = this.g.ctx.createGain()
    s.gain.value = amount
    from.connect(s)
    s.connect(to)
    this.nodes.push(s)
  }

  /** Sub-saída com pan próprio (detritos e faíscas espalhados no estéreo). */
  branch(pan: number, gain = 1): AudioNode {
    const ctx = this.g.ctx
    const gn = ctx.createGain()
    gn.gain.value = gain
    const p = this.panner(pan)
    gn.connect(p)
    p.connect(this.out)
    this.nodes.push(gn, p)
    return gn
  }

  /** Move o pan da voz inteira ao longo do tempo (whoosh que atravessa a tela). */
  sweepPan(from: number, to: number, t: number, dur: number) {
    const p = this.nodes[1]
    if (!(p && 'pan' in p)) return
    const pan = (p as StereoPannerNode).pan
    pan.setValueAtTime(Math.max(-1, Math.min(1, from)), t)
    pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, to)), t + dur)
  }

  private track(s: AudioScheduledSourceNode, end: number) {
    this.sources.push(s)
    this.alive++
    this.end = Math.max(this.end, end)
    s.onended = () => {
      this.alive--
      if (this.alive <= 0) this.dispose()
    }
  }

  tone(t: number, p: ToneP, dest: AudioNode = this.out) {
    const o = tone(this.g, dest, t, p)
    this.track(o, t + (p.a ?? 0.002) + (p.hold ?? 0) + p.d)
    return o
  }

  noise(t: number, p: NoiseP, dest: AudioNode = this.out) {
    const s = noise(this.g, dest, t, p)
    this.track(s, t + (p.a ?? 0.001) + (p.hold ?? 0) + p.d)
    return s
  }

  /** Corta rápido (roubo de voz), sem clique. */
  kill() {
    if (this.dead) return
    const now = this.g.ctx.currentTime
    const p = this.out.gain
    p.cancelScheduledValues(now)
    p.setValueAtTime(p.value, now)
    p.linearRampToValueAtTime(0, now + 0.025)
    for (const s of this.sources) {
      try {
        s.stop(now + 0.03)
      } catch {
        // já parou
      }
    }
    this.end = now + 0.03
  }

  private dispose() {
    if (this.dead) return
    this.dead = true
    for (const n of this.nodes) n.disconnect()
  }
}
