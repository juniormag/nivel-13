// Chiptune sintetizado na hora (WebAudio): nenhum arquivo de áudio para baixar.
// A trilha é um baião em 8-bit: zabumba no 1 e no "e" do 2, triângulo nas semicolcheias.
import { useSave } from '../state/save'

type Track = 'title' | 'game' | 'boss' | 'none'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let track: Track = 'none'
let nextTime = 0
let step = 0
let timer = 0

function ensure() {
  if (ctx) return ctx
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = useSave.getState().muted ? 0 : 0.5
  master.connect(ctx.destination)
  musicBus = ctx.createGain()
  musicBus.gain.value = 0.32
  musicBus.connect(master)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ctx
}

/** Precisa de um gesto do usuário (política de autoplay). */
let unlocked = false
let wanted: Track = 'none'

export function unlockAudio() {
  unlocked = true
  const c = ensure()
  if (c && c.state === 'suspended') void c.resume()
  if (wanted !== 'none' && track !== wanted) playMusic(wanted)
}

export function setMuted(m: boolean) {
  useSave.getState().patch({ muted: m })
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02)
}

function tone(
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  dest: AudioNode | null,
  slideTo?: number,
) {
  if (!ctx || !dest) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(dest)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(t: number, dur: number, vol: number, hp: number, dest: AudioNode | null) {
  if (!ctx || !dest || !noiseBuf) return
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = hp
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f)
  f.connect(g)
  g.connect(dest)
  s.start(t)
  s.stop(t + dur)
}

const N = (semi: number) => 220 * 2 ** (semi / 12) // 0 = A3

// Progressão em lá menor: Am · G · F · E (andaluza, dramática como a referência)
const CHORDS = [
  [0, 3, 7],
  [-2, 2, 5],
  [-4, 0, 3],
  [-5, -1, 2],
]
// Melodia em mixolídio nordestino (com a sétima abaixada e a sexta maior)
const MELODY: (number | null)[] = [
  12,
  null,
  10,
  12,
  15,
  null,
  14,
  12,
  10,
  null,
  7,
  null,
  9,
  10,
  12,
  null,
  10,
  null,
  9,
  10,
  12,
  null,
  7,
  5,
  7,
  null,
  null,
  3,
  5,
  null,
  7,
  null,
  8,
  null,
  7,
  8,
  12,
  null,
  10,
  8,
  7,
  null,
  5,
  null,
  3,
  5,
  7,
  null,
  4,
  null,
  7,
  8,
  11,
  null,
  9,
  null,
  8,
  null,
  7,
  null,
  null,
  null,
  null,
  null,
]

function schedule() {
  if (!ctx || track === 'none') return
  const bpm = track === 'title' ? 92 : track === 'boss' ? 132 : 116
  const s16 = 60 / bpm / 4
  while (nextTime < ctx.currentTime + 0.12) {
    const t = nextTime
    const bar = Math.floor(step / 16) % 4
    const i16 = step % 16
    const chord = CHORDS[bar] ?? CHORDS[0] ?? [0, 3, 7]
    const root = chord[0] ?? 0
    // zabumba: grave no 1 e no "e" do 2 (baião)
    if (i16 === 0 || i16 === 6) tone(N(root - 24), t, 0.22, 'triangle', 0.55, musicBus, N(root - 26))
    if (i16 === 10) tone(N(root - 12), t, 0.12, 'triangle', 0.35, musicBus)
    // triângulo
    if (track !== 'title' || i16 % 4 === 2)
      noise(t, i16 % 4 === 2 ? 0.06 : 0.025, i16 % 4 === 2 ? 0.16 : 0.06, 6000, musicBus)
    // caixa no boss
    if (track === 'boss' && (i16 === 4 || i16 === 12)) noise(t, 0.12, 0.22, 1200, musicBus)
    // acorde em arpejo
    if (track === 'title') {
      if (i16 % 4 === 0) {
        const n = chord[(i16 / 4) % 3] ?? root
        tone(N(n), t, s16 * 3.5, 'square', 0.05, musicBus)
      }
    } else if (i16 % 2 === 0) {
      const n = chord[(i16 / 2) % 3] ?? root
      tone(N(n), t, s16 * 1.4, 'square', 0.045, musicBus)
    }
    // melodia
    const m = MELODY[step % MELODY.length]
    if (m !== null && m !== undefined && (track !== 'title' || step % 2 === 0)) {
      tone(N(m), t, s16 * (track === 'title' ? 3 : 1.8), 'square', track === 'title' ? 0.07 : 0.06, musicBus)
    }
    nextTime += s16
    step++
  }
}

export function playMusic(t: Track) {
  wanted = t
  if (!unlocked || track === t) return
  track = t
  const c = ensure()
  if (!c) return
  clearInterval(timer)
  if (t === 'none') return
  nextTime = c.currentTime + 0.05
  step = 0
  timer = window.setInterval(schedule, 40)
}

export type Sfx = 'tap' | 'good' | 'bad' | 'coin' | 'level' | 'swipe' | 'power' | 'boom' | 'fanfare' | 'tick'

export function sfx(name: Sfx) {
  if (!unlocked) return
  const c = ensure()
  if (!c || !master) return
  const t = c.currentTime
  switch (name) {
    case 'tap':
      tone(880, t, 0.05, 'square', 0.12, master)
      break
    case 'tick':
      tone(1320, t, 0.03, 'square', 0.06, master)
      break
    case 'good':
      tone(N(12), t, 0.08, 'square', 0.14, master)
      tone(N(19), t + 0.06, 0.12, 'square', 0.14, master)
      break
    case 'coin':
      tone(N(26), t, 0.05, 'square', 0.12, master)
      tone(N(31), t + 0.05, 0.16, 'square', 0.12, master)
      break
    case 'bad':
      tone(160, t, 0.25, 'sawtooth', 0.16, master, 70)
      noise(t, 0.12, 0.2, 400, master)
      break
    case 'swipe':
      noise(t, 0.09, 0.12, 2500, master)
      break
    case 'power':
      tone(N(0), t, 0.3, 'square', 0.12, master, N(24))
      break
    case 'boom':
      noise(t, 0.5, 0.5, 80, master)
      tone(90, t, 0.4, 'triangle', 0.4, master, 40)
      break
    case 'level':
      ;[0, 4, 7, 12].forEach((s, i) => {
        tone(N(12 + s), t + i * 0.08, 0.14, 'square', 0.13, master)
      })
      break
    case 'fanfare':
      ;[0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => {
        tone(N(12 + s), t + i * 0.11, i === 7 ? 0.6 : 0.16, 'square', 0.13, master)
      })
      break
  }
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) void ctx.suspend()
  else void ctx.resume()
})
