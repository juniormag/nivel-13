// Grafo de áudio: barramentos, cadeia do master, reverbs gerados e formas de onda.
// Funciona com AudioContext (ao vivo) e OfflineAudioContext (medição em dev).
//
//   música ─► duck ─┐
//   sfx ────────────┼─► bus ─► passa-alta 25 Hz ─► compressor ─► limiter ─► clip suave ─► out (mudo) ─► saída
//   sala (IR 0,45 s) ┤
//   salão (IR 2,4 s) ┘

export interface Graph {
  ctx: BaseAudioContext
  /** volume final; o mudo mexe aqui */
  out: GainNode
  /** soma antes da dinâmica */
  bus: GainNode
  music: GainNode
  /** ducking e hit-stop da trilha */
  duck: GainNode
  sfx: GainNode
  /** envio para a sala curta (UI) */
  room: GainNode
  /** envio para o salão (stingers, fanfarra, trilha) */
  hall: GainNode
  noise: AudioBuffer
  p12: PeriodicWave
  p25: PeriodicWave
  crunch: Float32Array<ArrayBuffer>
  duckUntil: number
  duckDepth: number
}

export interface GraphOpts {
  /** sem compressor, limiter e clip: mede o quanto cada som empurra o barramento */
  raw?: boolean
  /** filtro K (BS.1770 aproximado) depois do master, só para medir loudness */
  kweight?: boolean
}

/** Teto do clip suave: nada sai acima disto (≈ -1,3 dBFS). */
export const CEILING = 0.86

function softClipCurve(n = 2048) {
  const c = new Float32Array(new ArrayBuffer(n * 4))
  const knee = 0.6
  const top = 0.9
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const a = Math.abs(x)
    const y = a <= knee ? a : knee + (top - knee) * Math.tanh((a - knee) / (top - knee))
    c[i] = Math.sign(x) * y
  }
  return c
}

function crunchCurve(n = 1024) {
  const c = new Float32Array(new ArrayBuffer(n * 4))
  const k = 6
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) / 1.2
  }
  return c
}

function pulseWave(ctx: BaseAudioContext, duty: number) {
  const n = 48
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let k = 1; k < n; k++) {
    re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI)
    im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI)
  }
  return ctx.createPeriodicWave(re, im)
}

/** Resposta ao impulso: reflexões iniciais + cauda de ruído que escurece com o tempo. */
function impulse(
  ctx: BaseAudioContext,
  seconds: number,
  opts: { pre: number; decay: number; dampFrom: number; dampTo: number; early: number[] },
) {
  const sr = ctx.sampleRate
  const len = Math.max(1, Math.floor(sr * seconds))
  const buf = ctx.createBuffer(2, len, sr)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let lp = 0
    const pre = Math.floor(opts.pre * sr)
    for (let i = pre; i < len; i++) {
      const tt = (i - pre) / (len - pre)
      const env = Math.exp(-opts.decay * tt) * (1 - tt)
      const coef = opts.dampFrom + (opts.dampTo - opts.dampFrom) * tt
      lp = coef * lp + (1 - coef) * (Math.random() * 2 - 1)
      d[i] = lp * env
    }
    // reflexões iniciais, diferentes por canal (abre o estéreo)
    for (const [j, e] of opts.early.entries()) {
      const at = Math.floor((e + (ch ? 0.0017 * (j + 1) : 0)) * sr)
      if (at < len) d[at] = (d[at] ?? 0) + (j % 2 ? -1 : 1) * 0.6 * 0.8 ** j
    }
  }
  return buf
}

export function buildGraph(ctx: BaseAudioContext, opts: GraphOpts = {}): Graph {
  const out = ctx.createGain()
  out.gain.value = 1
  const bus = ctx.createGain()
  bus.gain.value = 1

  if (opts.raw) {
    bus.connect(out)
  } else {
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 25
    hp.Q.value = 0.6
    // Cola: compressor suave (o DynamicsCompressor aplica ganho de compensação sozinho)
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 10
    comp.ratio.value = 2.5
    comp.attack.value = 0.005
    comp.release.value = 0.22
    const trim = ctx.createGain()
    trim.gain.value = 0.62
    // Limiter: rápido e duro
    const lim = ctx.createDynamicsCompressor()
    lim.threshold.value = -4
    lim.knee.value = 0
    lim.ratio.value = 20
    lim.attack.value = 0.001
    lim.release.value = 0.09
    // Clip suave por último: garante o teto mesmo com transiente mais rápido que o limiter
    const clip = ctx.createWaveShaper()
    clip.curve = softClipCurve()
    clip.oversample = 'none'
    bus.connect(hp)
    hp.connect(comp)
    comp.connect(trim)
    trim.connect(lim)
    lim.connect(clip)
    clip.connect(out)
  }

  if (opts.kweight) {
    const shelf = ctx.createBiquadFilter()
    shelf.type = 'highshelf'
    shelf.frequency.value = 1681
    shelf.gain.value = 4
    const rlb = ctx.createBiquadFilter()
    rlb.type = 'highpass'
    rlb.frequency.value = 38
    rlb.Q.value = 0.5
    out.connect(shelf)
    shelf.connect(rlb)
    rlb.connect(ctx.destination)
  } else {
    out.connect(ctx.destination)
  }

  const music = ctx.createGain()
  music.gain.value = 0.52
  const duck = ctx.createGain()
  duck.gain.value = 1
  music.connect(duck)
  duck.connect(bus)

  const sfx = ctx.createGain()
  sfx.gain.value = 1.1
  sfx.connect(bus)

  const room = ctx.createGain()
  const roomConv = ctx.createConvolver()
  roomConv.buffer = impulse(ctx, 0.45, {
    pre: 0.004,
    decay: 5,
    dampFrom: 0.15,
    dampTo: 0.7,
    early: [0.007, 0.011, 0.017, 0.023, 0.031],
  })
  const roomRet = ctx.createGain()
  roomRet.gain.value = 0.5
  room.connect(roomConv)
  roomConv.connect(roomRet)
  roomRet.connect(bus)

  const hall = ctx.createGain()
  const hallConv = ctx.createConvolver()
  hallConv.buffer = impulse(ctx, 2.4, {
    pre: 0.022,
    decay: 4.2,
    dampFrom: 0.3,
    dampTo: 0.88,
    early: [0.019, 0.027, 0.041, 0.053],
  })
  const hallRet = ctx.createGain()
  hallRet.gain.value = 0.42
  hall.connect(hallConv)
  hallConv.connect(hallRet)
  hallRet.connect(bus)

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  return {
    ctx,
    out,
    bus,
    music,
    duck,
    sfx,
    room,
    hall,
    noise,
    p12: pulseWave(ctx, 0.125),
    p25: pulseWave(ctx, 0.25),
    crunch: crunchCurve(),
    duckUntil: 0,
    duckDepth: 1,
  }
}

/** Abaixa a trilha (não os efeitos) por `ms`. Pedidos sobrepostos ficam com o mais fundo e o mais longo. */
export function duckGraph(g: Graph, ms: number, depth = 0.4, attack = 0.012) {
  const now = g.ctx.currentTime
  const until = now + ms / 1000
  const active = g.duckUntil > now
  const d = active ? Math.min(depth, g.duckDepth) : depth
  const end = Math.max(until, active ? g.duckUntil : 0)
  g.duckUntil = end
  g.duckDepth = d
  const p = g.duck.gain
  p.cancelScheduledValues(now)
  p.setTargetAtTime(d, now, attack / 3)
  p.setTargetAtTime(1, end, 0.12)
}
