// Clipe de vídeo (Reels, Story, Status) gravado do canvas com MediaRecorder.
// MP4 (H.264) quando o navegador grava MP4 (Safari 14.3+, Chrome 126+); senão WebM.
// Sem WebCodecs/Mediabunny por enquanto (sem dependência nova). Spec: docs/research/share.md §0.5.
import { css, sparkle } from './kit'
import { drawCrown, ember } from './monument2d'

const MIME_ORDER = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

/** Melhor formato gravável aqui, ou null. */
export function pickClipMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null
  return MIME_ORDER.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

/** O aparelho grava vídeo de canvas? (detecção por recurso) */
export function clipSupported() {
  return (
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickClipMime() !== null
  )
}

export const clipExt = (mime: string) => (mime.startsWith('video/mp4') ? 'mp4' : 'webm')

/**
 * Grava `seconds` segundos do que for pintado em `canvas` (quem chama anima o canvas nesse tempo).
 * `audio` opcional: trilhas de um MediaStreamDestination (o Safari gera vídeo vazio sem áudio às vezes).
 * Devolve null se não houver suporte ou se a gravação falhar.
 */
export async function recordClip(
  canvas: HTMLCanvasElement,
  seconds: number,
  audio?: MediaStream | null,
): Promise<Blob | null> {
  const mime = pickClipMime()
  if (!mime || typeof canvas.captureStream !== 'function') return null
  try {
    const stream = canvas.captureStream(30)
    for (const t of audio?.getAudioTracks() ?? []) stream.addTrack(t)
    const hasAudio = stream.getAudioTracks().length > 0
    // sem trilha de áudio, não peça codec de áudio
    const container = mime.split(';')[0] ?? mime
    const type = hasAudio
      ? mime
      : (MIME_ORDER.filter((m) => m.startsWith(container) && !/mp4a|opus/.test(m)).find((m) =>
          MediaRecorder.isTypeSupported(m),
        ) ?? container)
    const rec = new MediaRecorder(stream, {
      mimeType: type,
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 128_000,
    })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const done = new Promise<void>((res, rej) => {
      rec.onstop = () => res()
      rec.onerror = () => rej(new Error('MediaRecorder'))
    })
    rec.start(250)
    await new Promise((r) => setTimeout(r, seconds * 1000))
    rec.stop()
    await done
    for (const t of stream.getTracks()) t.stop()
    const blob = new Blob(chunks, { type: type.split(';')[0] })
    return blob.size > 1000 ? blob : null
  } catch {
    return null
  }
}

/** Fanfarra 8-bit sintetizada (impacto da coroa + arpejo), ligada a um MediaStreamDestination. */
function fanfare(impactAt: number): { stream: MediaStream; ctx: AudioContext } | null {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    void ctx.resume()
    const dest = ctx.createMediaStreamDestination()
    const master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(dest)
    const t0 = ctx.currentTime + 0.05
    const tone = (f: number, at: number, dur: number, type: OscillatorType, vol = 1) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(f, t0 + at)
      g.gain.setValueAtTime(0, t0 + at)
      g.gain.linearRampToValueAtTime(vol, t0 + at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + at + dur)
      o.connect(g).connect(master)
      o.start(t0 + at)
      o.stop(t0 + at + dur + 0.05)
    }
    // queda: glissando descendo
    const fall = ctx.createOscillator()
    const fg = ctx.createGain()
    fall.type = 'triangle'
    fall.frequency.setValueAtTime(1400, t0)
    fall.frequency.exponentialRampToValueAtTime(300, t0 + impactAt)
    fg.gain.setValueAtTime(0, t0)
    fg.gain.linearRampToValueAtTime(0.25, t0 + 0.15)
    fg.gain.linearRampToValueAtTime(0, t0 + impactAt)
    fall.connect(fg).connect(master)
    fall.start(t0)
    fall.stop(t0 + impactAt + 0.05)
    // impacto
    tone(70, impactAt, 0.5, 'sine', 1)
    tone(140, impactAt, 0.25, 'square', 0.25)
    // arpejo de vitória (dó maior) e acorde final
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      tone(f, impactAt + 0.12 + i * 0.09, 0.35, 'square', 0.35)
    })
    for (const f of [523.25, 659.25, 783.99]) tone(f, impactAt + 0.6, 1.4, 'triangle', 0.3)
    tone(2093, impactAt + 0.62, 0.6, 'square', 0.12)
    return { stream: dest.stream, ctx }
  } catch {
    return null
  }
}

export interface Clip {
  blob: Blob
  mime: string
  ext: 'mp4' | 'webm'
}

/** Fonte da cena do clipe: um canvas lógico que avança quadro a quadro. */
interface SceneSrc {
  canvas: HTMLCanvasElement
  frame(t: number, dt: number): void
  dispose(): void
}

/** A cena animada do diretor de arte: a coroa cai, quica e explode em dourado (World.celebrate). */
async function worldScene(W: number, H: number): Promise<SceneSrc | null> {
  const { findWorld } = await import('./hero')
  const World = await findWorld()
  if (!World) return null
  try {
    const low = document.createElement('canvas')
    const w = new World(low, W, H, { reduced: false, mobile: false })
    w.setProgress(1)
    await w.loadMonument()
    w.setProgress(1)
    let started = false
    return {
      canvas: low,
      frame(t, dt) {
        if (!started) {
          w.frame(0, 0)
          w.celebrate()
          started = true
        }
        w.frame(t, dt)
      },
      dispose: () => w.dispose(),
    }
  } catch {
    return null
  }
}

/** Fallback local: cenário com o "13" 2D e a coroa caindo com dois quiques. */
async function flatScene(W: number, H: number): Promise<SceneSrc> {
  const { still2d } = await import('./hero')
  const st = await still2d(W, H, { crown: false })
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const info = st.info
  const LAND = 1.1
  const burst = Array.from({ length: 46 }, (_, i) => {
    const r = Math.sin(i * 127.1 + 311.7) * 43758.5453
    const v = r - Math.floor(r)
    return { a: v * Math.PI * 2, v: 18 + ((v * 7.13) % 1) * 46, life: 0.5 + ((v * 3.7) % 1) * 0.9 }
  })
  return {
    canvas: c,
    frame(t) {
      if (!g) return
      g.imageSmoothingEnabled = false
      g.drawImage(st.c, 0, 0)
      if (!info) return
      const k = Math.min(1, t / LAND)
      // queda com dois quiques (como o World)
      const b =
        k < 0.6
          ? (k / 0.6) ** 2
          : k < 0.85
            ? 1 - Math.sin(((k - 0.6) / 0.25) * Math.PI) * 0.12
            : 1 - Math.sin(((k - 0.85) / 0.15) * Math.PI) * 0.04
      const y = info.crownY - (1 - b) * H * 0.45
      drawCrown(g, info.crownX, y, info.crownW, k >= 1)
      const dt = t - LAND
      if (dt > 0 && dt < 1.6)
        for (const p of burst) {
          if (dt > p.life) continue
          ember(
            g,
            info.crownX + Math.cos(p.a) * p.v * dt,
            info.crownY - 8 + Math.sin(p.a) * p.v * dt + 30 * dt * dt,
            dt / p.life,
          )
        }
      // brilhos piscando
      const f12 = Math.floor(t * 12)
      for (let i = 0; i < 5; i++) {
        const cyc = (f12 + i * 5) % 14
        if (cyc > 5) continue
        const r = Math.sin((i + 900) * 127.1) * 43758.5453
        const v = r - Math.floor(r)
        sparkle(g, W * (0.12 + v * 0.76), H * (0.2 + ((v * 5.3) % 1) * 0.3), [0, 1, 2, 3, 1, 0][cyc] ?? 0)
      }
    },
    dispose() {
      c.width = 0
    },
  }
}

/**
 * Vídeo de ~6 s do nível 13 (1080×1920, 30 fps) para Reels/Story/Status: a cena animada (a coroa cai
 * no 13, quica e explode em dourado), com o HUD, o link, o rótulo de IA e o responsável o tempo todo;
 * depois do pouso entra a manchete "CHEGUEI AO NÍVEL 13". Chame a partir de um toque (áudio).
 */
export async function makeVictoryClip(onProgress?: (p: number) => void, seconds = 6): Promise<Clip | null> {
  if (!clipSupported()) return null
  const { nivel13ClipLayers, SCALE } = await import('./cards')
  const { quantize, shade } = await import('./kit')
  const L = await nivel13ClipLayers('story')
  const src = (await worldScene(L.W, L.sceneH)) ?? (await flatScene(L.W, L.sceneH))
  const K = SCALE
  const out = document.createElement('canvas')
  out.width = L.W * K
  out.height = L.H * K
  // o Safari só captura canvas que está no documento
  Object.assign(out.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '2px',
    height: '2px',
    opacity: '0.01',
    pointerEvents: 'none',
    zIndex: '-1',
  })
  out.setAttribute('aria-hidden', 'true')
  document.body.appendChild(out)
  const g = out.getContext('2d')
  const lc = document.createElement('canvas')
  lc.width = L.W
  lc.height = L.H
  const lg = lc.getContext('2d', { willReadFrequently: true })
  if (!g || !lg) {
    out.remove()
    src.dispose()
    return null
  }
  g.imageSmoothingEnabled = false
  lg.imageSmoothingEnabled = false
  const REVEAL = 1.7
  const FPS = 15
  const total = Math.round(seconds * FPS)

  // 1) quadros offline em 15 fps (cadência de efeito da direção de arte): estável em qualquer aparelho
  const frames: { img: CanvasImageSource; fine: HTMLCanvasElement }[] = []
  for (let i = 0; i < total; i++) {
    const t = i / FPS
    src.frame(t, 1 / FPS)
    const layer = t >= REVEAL ? L.final : L.base
    lg.fillStyle = css('void')
    lg.fillRect(0, 0, L.W, L.H)
    lg.drawImage(src.canvas, 0, L.drop)
    for (const op of layer.ops) shade(lg, op.x, op.y, op.w, op.h, op.amount)
    lg.drawImage(layer.art, 0, 0)
    quantize(lg, L.W, L.H)
    let img: CanvasImageSource
    if (typeof createImageBitmap === 'function') img = await createImageBitmap(lc)
    else {
      const copy = document.createElement('canvas')
      copy.width = L.W
      copy.height = L.H
      copy.getContext('2d')?.drawImage(lc, 0, 0)
      img = copy
    }
    frames.push({ img, fine: layer.fine })
    onProgress?.((i / total) * 0.5)
    // devolve o controle à página de vez em quando
    if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0))
  }
  src.dispose()

  // 2) reprodução em tempo real para o MediaRecorder (só ampliação ×6)
  const draw = (t: number) => {
    const f = frames[Math.min(frames.length - 1, Math.floor(t * FPS))]
    if (!f) return
    g.drawImage(f.img, 0, 0, L.W * K, L.H * K)
    g.drawImage(f.fine, 0, 0, L.W * K, L.H * K)
  }
  const audio = fanfare(1.1)
  let raf = 0
  const start = performance.now()
  const loop = () => {
    const t = (performance.now() - start) / 1000
    draw(Math.min(t, seconds))
    onProgress?.(0.5 + Math.min(1, t / seconds) * 0.5)
    if (t < seconds + 0.5) raf = requestAnimationFrame(loop)
  }
  draw(0)
  raf = requestAnimationFrame(loop)
  try {
    const blob = await recordClip(out, seconds, audio?.stream)
    if (!blob) return null
    const mime = blob.type || pickClipMime() || 'video/webm'
    return { blob, mime, ext: clipExt(mime) }
  } finally {
    cancelAnimationFrame(raf)
    void audio?.ctx.close()
    for (const f of frames) if ('close' in f.img && typeof f.img.close === 'function') f.img.close()
    out.remove()
    out.width = 0
    out.height = 0
    lc.width = 0
  }
}
