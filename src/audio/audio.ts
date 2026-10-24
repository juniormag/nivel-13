// Áudio do Nível 13: chiptune moderno com DNA brasileiro, 100% sintetizado na hora (WebAudio).
// Nenhum arquivo para baixar. API pública (compatível com a anterior):
//   unlockAudio() · setMuted(m) · playMusic(track) · sfx(name, opts?)
// Novidades: setIntensity(0..1) · duck(ms) · hitstop(ms) · stinger(name) · faixas map/victory/daily.
import { useSave } from '../state/save'
import { buildGraph, duckGraph, type Graph } from './graph'
import { Seq } from './sequencer'
import { type Recipe, SFX, type Sfx, STINGERS, type Stinger } from './sfx-bank'
import { DEFAULT_INTENSITY, SONGS, type Track } from './songs'
import { Voice } from './voice'

export type { Sfx, Stinger, Track }

export interface SfxOpts {
  /** posição horizontal 0..1 (esquerda..direita) para o pan estéreo */
  x?: number
  /** deslocamento em semitons (+12 = uma oitava acima) */
  pitch?: number
  /** combo atual: 'good', 'coin' e 'perfect' sobem meio tom por acerto (até +12); 'star' sobe pela tríade */
  combo?: number
  /** 0..2, multiplica o volume (padrão 1) */
  volume?: number
}

const MAX_VOICES = 16
const LOOKAHEAD = 0.25
const TICK_MS = 30

let ctx: AudioContext | null = null
let graph: Graph | null = null
let unlocked = false
let muted = useSave.getState().muted
let hidden = typeof document !== 'undefined' && document.hidden
let wanted: Track = 'none'
let current: Track = 'none'
let intensity: number | null = null
let timer = 0
let gestures = false
const seqs: Seq[] = []
const voices: Voice[] = []
const lastAt = new Map<string, number>()

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function ensure(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC({ latencyHint: 'interactive' })
  } catch {
    return null
  }
  graph = buildGraph(ctx)
  graph.out.gain.value = muted ? 0 : 1
  return ctx
}

/** Liga ou desliga o contexto conforme aba visível, mudo e desbloqueio. */
function syncRun() {
  const c = ctx
  if (!c || !unlocked) return
  const want = !hidden && !muted
  if (want && c.state !== 'running') {
    c.resume().catch(() => {})
  } else if (!want && c.state === 'running') {
    // no mudo, deixa o fade de 150 ms terminar antes de suspender
    window.setTimeout(
      () => {
        if ((hidden || muted) && c.state === 'running') c.suspend().catch(() => {})
      },
      hidden ? 0 : 150,
    )
  }
}

/** Precisa de um gesto do usuário (política de autoplay). */
export function unlockAudio() {
  unlocked = true
  const c = ensure()
  if (!c) return
  // um sample de silêncio dentro do gesto destrava o iOS
  try {
    const s = c.createBufferSource()
    s.buffer = c.createBuffer(1, 1, c.sampleRate)
    s.connect(c.destination)
    s.start(0)
  } catch {
    // sem problema
  }
  syncRun()
  if (!gestures) {
    gestures = true
    // iOS e Android podem suspender o contexto (ligação, outro app): o próximo toque religa
    for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) {
      addEventListener(ev, () => ctx?.state !== 'running' && syncRun(), { passive: true, capture: true })
    }
  }
  if (wanted !== current) playMusic(wanted)
}

function applyMuted(m: boolean) {
  muted = m
  if (graph && ctx) graph.out.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.03)
  syncRun()
}

export function setMuted(m: boolean) {
  useSave.getState().patch({ muted: m })
  applyMuted(m)
}

useSave.subscribe((s) => {
  if (s.muted !== muted) applyMuted(s.muted)
})

// ---------------------------------------------------------------- trilha

function tick() {
  const c = ctx
  if (c?.state !== 'running') return
  const now = c.currentTime
  for (let i = seqs.length - 1; i >= 0; i--) {
    const s = seqs[i]
    if (!s) continue
    if (s.done(now)) {
      s.dispose()
      seqs.splice(i, 1)
    } else s.advance(now, now + LOOKAHEAD)
  }
  if (!seqs.length) {
    clearInterval(timer)
    timer = 0
  }
}

/** Troca de faixa no próximo compasso, com crossfade curto. */
export function playMusic(t: Track) {
  wanted = t
  if (!unlocked || t === current) return
  const c = ensure()
  const g = graph
  if (!c || !g) return
  current = t
  intensity = null
  const now = c.currentTime
  const live = seqs.filter((s) => s.stopAt === Number.POSITIVE_INFINITY)
  // uma troca ainda pendente (não começou) é cancelada já
  const started = live.filter((s) => s.start <= now + 0.02)
  for (const s of live) if (!started.includes(s)) s.release(now, 0.02)
  const main = started[started.length - 1]
  const at = main ? main.boundary(now) : now + 0.06
  for (const s of started) s.release(at, t === 'none' ? 0.25 : 0.09)
  if (t === 'none') return
  const seq = new Seq(g, SONGS[t], at, DEFAULT_INTENSITY[t], main ? 0.05 : 0.02)
  seqs.push(seq)
  seq.advance(now, now + LOOKAHEAD)
  if (!timer) timer = window.setInterval(tick, TICK_MS)
}

/** Intensidade da trilha 0..1: camadas entram e saem (percussão, baixo, harmonia, melodia, extra). */
export function setIntensity(v: number) {
  intensity = clamp(v, 0, 1)
  if (!ctx) return
  const now = ctx.currentTime
  for (const s of seqs) if (s.stopAt === Number.POSITIVE_INFINITY) s.setIntensity(intensity, now)
}

/** Abaixa a trilha por `ms` (os efeitos continuam). */
export function duck(ms: number, depth = 0.4) {
  if (graph) duckGraph(graph, ms, clamp(depth, 0, 1))
}

/** Hit-stop sonoro: corta a trilha quase toda por um instante. */
export function hitstop(ms: number) {
  if (graph) duckGraph(graph, ms, 0.1, 0.004)
}

// ---------------------------------------------------------------- efeitos

/** Dispara uma receita num grafo qualquer (ao vivo ou offline). */
export function trigger(g: Graph, r: Recipe, t: number, o: SfxOpts = {}, rnd: () => number = Math.random) {
  const combo = Math.max(0, Math.floor(o.combo ?? 0))
  const ladder = Math.min(combo, r.ladderMax ?? 12) * r.ladder
  // ±3–5% a cada disparo (em semitons = log-uniforme); em degraus, menos de meio tom para a escada só subir
  const vary = r.stepped && combo > 0 ? Math.min(r.vary, 0.45) : r.vary
  const semis = (o.pitch ?? 0) + ladder + (rnd() * 2 - 1) * vary
  const db = (rnd() * 2 - 1) * (r.vary ? 2 : 0.5)
  const v = new Voice(g, g.sfx, {
    gain: (r.gain ?? 1) * clamp(o.volume ?? 1, 0, 2) * 10 ** (db / 20),
    pan: o.x === undefined ? 0 : (clamp(o.x, 0, 1) * 2 - 1) * 0.7,
    room: r.room,
    hall: r.hall,
    prio: r.prio,
  })
  r.play(v, t, { k: 2 ** (semis / 12), ladder, combo, rnd })
  if (r.duck) duckGraph(g, r.duck[0], r.duck[1])
  return v
}

function fire(key: string, r: Recipe, o?: SfxOpts) {
  if (!unlocked || muted || hidden) return
  const c = ctx
  const g = graph
  // 'suspended' logo após o gesto também vale: o resume() é assíncrono e o som sai assim que ele termina
  if (!c || !g || c.state === 'closed') return
  const now = c.currentTime
  const last = lastAt.get(key) ?? -1
  if (r.gap && now - last < r.gap / 1000) return
  lastAt.set(key, now)
  // limite de vozes: rouba a de menor prioridade (e mais velha); se todas valem mais, este som cede
  for (let i = voices.length - 1; i >= 0; i--) if ((voices[i]?.end ?? 0) < now) voices.splice(i, 1)
  if (voices.length >= MAX_VOICES) {
    let vi = 0
    for (let i = 1; i < voices.length; i++) {
      const a = voices[i]
      const b = voices[vi]
      if (a && b && (a.prio < b.prio || (a.prio === b.prio && a.born < b.born))) vi = i
    }
    const victim = voices[vi]
    if (!victim || victim.prio > r.prio) return
    victim.kill()
    voices.splice(vi, 1)
  }
  voices.push(trigger(g, r, now + 0.002, o))
}

export function sfx(name: Sfx, opts?: SfxOpts) {
  const r = SFX[name]
  if (r) fire(name, r, opts)
}

/** Frase curta por cima da trilha (abaixa a música enquanto toca). */
export function stinger(name: Stinger, opts?: SfxOpts) {
  const r = STINGERS[name]
  if (r) fire(`stinger:${name}`, r, opts)
}

export const SFX_NAMES = Object.keys(SFX) as Sfx[]
export const STINGER_NAMES = Object.keys(STINGERS) as Stinger[]

/** Estado para depuração (página de audição em dev). */
export function audioState() {
  return {
    state: ctx?.state ?? 'none',
    unlocked,
    muted,
    hidden,
    track: current,
    intensity: intensity ?? (current === 'none' ? 0 : DEFAULT_INTENSITY[current]),
    voices: voices.length,
    sequences: seqs.length,
    sampleRate: ctx?.sampleRate ?? 0,
    baseLatency: ctx?.baseLatency ?? 0,
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden
    syncRun()
  })
  addEventListener('pagehide', () => {
    hidden = true
    syncRun()
  })
  addEventListener('pageshow', () => {
    hidden = document.hidden
    syncRun()
  })
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  void import('./dev').then((m) => m.install())
}
