// Só em dev: window.__sfx para ouvir e medir cada som.
//   __sfx('coin', { combo: 3, x: 0.2 })      toca (destrava o áudio se preciso)
//   __sfx.music('boss'); __sfx.intensity(0.9)
//   await __sfx.render('boom')               mede offline: pico, pico cru, RMS, LUFS aprox., duração
//   await __sfx.renderAll()                  tabela de todos os efeitos e stingers
//   await __sfx.renderMusic('game', 8, 0.6)  mede a trilha
//   __sfx.panel()  ou  abra a página com ?sfx  painel com botões

import {
  audioState,
  duck,
  hitstop,
  playMusic,
  SFX_NAMES,
  type Sfx,
  type SfxOpts,
  STINGER_NAMES,
  type Stinger,
  setIntensity,
  setMuted,
  sfx,
  stinger,
  type Track,
  trigger,
  unlockAudio,
} from './audio'
import { buildGraph, type Graph } from './graph'
import { Seq } from './sequencer'
import { type Recipe, SFX, STINGERS } from './sfx-bank'
import { SONGS } from './songs'

const SR = 48000
const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -120)
const r1 = (v: number) => Math.round(v * 10) / 10

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Analysis {
  peak: number
  rms: number
  /** loudness: média quadrática dos dois canais (com filtro K vira LUFS aproximado) */
  ms: number
  /** maior janela de 400 ms */
  momentary: number
  /** até onde passa de -60 dBFS (s) */
  dur: number
}

function analyze(buf: AudioBuffer, from = 0): Analysis {
  const chans = [buf.getChannelData(0), buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0)]
  const n = buf.length
  const start = Math.floor(from * buf.sampleRate)
  let peak = 0
  let sum = 0
  let last = 0
  const thr = 10 ** (-60 / 20)
  for (const d of chans) {
    for (let i = start; i < n; i++) {
      const a = Math.abs(d[i] ?? 0)
      if (a > peak) peak = a
      if (a > thr && i > last) last = i
      sum += (d[i] ?? 0) ** 2
    }
  }
  const ms = sum / Math.max(1, n - start)
  const win = Math.floor(0.4 * buf.sampleRate)
  const hop = Math.floor(0.1 * buf.sampleRate)
  let momentary = 0
  for (let s = start; s + win <= n; s += hop) {
    let w = 0
    for (const d of chans) for (let i = s; i < s + win; i++) w += (d[i] ?? 0) ** 2
    momentary = Math.max(momentary, w / win)
  }
  return { peak, rms: Math.sqrt(ms / 2), ms, momentary, dur: last / buf.sampleRate }
}

const lufs = (ms: number) => -0.691 + 10 * Math.log10(Math.max(ms, 1e-12))

function recipeOf(name: string): Recipe | undefined {
  return (SFX as Record<string, Recipe>)[name] ?? (STINGERS as Record<string, Recipe>)[name]
}

async function offline(seconds: number, raw: boolean, k: boolean, fill: (g: Graph) => void) {
  const oc = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR)
  const g = buildGraph(oc, { raw, kweight: k })
  fill(g)
  return oc.startRendering()
}

/** O compressor do Chrome começa "fechado": damos 1 s de silêncio antes de medir, como no jogo. */
const SETTLE = 1

export async function render(name: string, opts: SfxOpts = {}, seconds = 4.5) {
  const r = recipeOf(name)
  if (!r) throw new Error(`som desconhecido: ${name}`)
  const go = (g: Graph) => trigger(g, r, SETTLE, opts, seeded(13))
  const [full, raw, k] = await Promise.all([
    offline(seconds + SETTLE, false, false, go),
    offline(seconds + SETTLE, true, false, go),
    offline(seconds + SETTLE, false, true, go),
  ])
  const a = analyze(full, SETTLE - 0.05)
  const b = analyze(raw, SETTLE - 0.05)
  const c = analyze(k, SETTLE - 0.05)
  return {
    name,
    peakDb: r1(db(a.peak)),
    rawPeakDb: r1(db(b.peak)),
    rmsDb: r1(db(a.rms)),
    momentaryLufs: r1(lufs(c.momentary)),
    durS: Math.round((a.dur - SETTLE) * 100) / 100,
    clips: a.peak >= 10 ** (-1 / 20),
  }
}

export async function renderAll() {
  const rows = []
  for (const n of [...SFX_NAMES, ...STINGER_NAMES]) rows.push(await render(n))
  return rows
}

export async function renderMusic(track: Exclude<Track, 'none'>, seconds = 8, intensity = 0.6) {
  const go = (g: Graph) => {
    const s = new Seq(g, SONGS[track], 0.05, intensity)
    s.advance(0, seconds)
  }
  const [full, k] = await Promise.all([offline(seconds, false, false, go), offline(seconds, false, true, go)])
  const a = analyze(full, 0.5)
  const c = analyze(k, 0.5)
  return {
    track,
    intensity,
    peakDb: r1(db(a.peak)),
    rmsDb: r1(db(a.rms)),
    lufs: r1(lufs(c.ms)),
    clips: a.peak >= 10 ** (-1 / 20),
  }
}

/** Trilha + rajada de efeitos por cima: mede o pior caso do master. */
export async function renderScene(track: Exclude<Track, 'none'> = 'boss', seconds = 6) {
  const names: Sfx[] = ['good', 'coin', 'perfect', 'bad', 'boom', 'shatter', 'stone', 'level', 'fanfare']
  const go = (g: Graph) => {
    const s = new Seq(g, SONGS[track], 0.05, 1)
    s.advance(0, seconds)
    const rnd = seeded(7)
    for (let i = 0; i < 40; i++) {
      const n = names[i % names.length] ?? 'good'
      trigger(g, SFX[n], 0.3 + i * 0.12, { combo: i, x: rnd() }, rnd)
    }
  }
  const full = await offline(seconds, false, false, go)
  const a = analyze(full)
  return { track, peakDb: r1(db(a.peak)), rmsDb: r1(db(a.rms)), clips: a.peak >= 10 ** (-1 / 20) }
}

const TRACKS: Track[] = ['title', 'map', 'game', 'boss', 'victory', 'daily', 'none']

function panel() {
  if (document.getElementById('sfx-panel')) return
  const box = document.createElement('div')
  box.id = 'sfx-panel'
  box.style.cssText =
    'position:fixed;right:8px;bottom:8px;z-index:99999;max-width:360px;max-height:70vh;overflow:auto;' +
    'background:#120c10ee;color:#f3e9e4;font:12px/1.3 monospace;padding:8px;border:1px solid #e3242b;border-radius:6px'
  const row = (label: string, items: string[], on: (n: string) => void) => {
    const p = document.createElement('div')
    p.style.margin = '4px 0'
    p.textContent = `${label}: `
    for (const n of items) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = n
      b.style.cssText = 'margin:2px;padding:4px 6px;background:#2a1a20;color:inherit;border:1px solid #5a2a30'
      b.onclick = () => {
        unlockAudio()
        on(n)
      }
      p.appendChild(b)
    }
    box.appendChild(p)
  }
  let combo = 0
  row('sfx', SFX_NAMES, (n) => sfx(n as Sfx, { combo, x: Math.random() }))
  row('stinger', STINGER_NAMES, (n) => stinger(n as Stinger))
  row('trilha', TRACKS, (n) => playMusic(n as Track))
  const ctl = document.createElement('div')
  ctl.innerHTML =
    '<label>intensidade <input id="sfx-int" type="range" min="0" max="1" step="0.05" value="0.6"></label> ' +
    '<label>combo <input id="sfx-combo" type="number" min="0" max="20" value="0" style="width:3em"></label> ' +
    '<button type="button" id="sfx-x">fechar</button>'
  box.appendChild(ctl)
  document.body.appendChild(box)
  const int = document.getElementById('sfx-int') as HTMLInputElement | null
  int?.addEventListener('input', () => setIntensity(Number(int.value)))
  const cb = document.getElementById('sfx-combo') as HTMLInputElement | null
  cb?.addEventListener('input', () => {
    combo = Number(cb.value)
  })
  document.getElementById('sfx-x')?.addEventListener('click', () => box.remove())
}

export function install() {
  const api = Object.assign(
    (name: Sfx, opts?: SfxOpts) => {
      unlockAudio()
      sfx(name, opts)
    },
    {
      /** o módulo de áudio vivo (o mesmo que o jogo usa) */
      api: {
        sfx,
        stinger,
        playMusic,
        setIntensity,
        setMuted,
        duck,
        hitstop,
        unlockAudio,
        audioState,
        SFX_NAMES,
      },
      list: SFX_NAMES,
      stingers: STINGER_NAMES,
      tracks: TRACKS,
      stinger: (n: Stinger) => {
        unlockAudio()
        stinger(n)
      },
      music: (t: Track) => {
        unlockAudio()
        playMusic(t)
      },
      intensity: setIntensity,
      duck,
      hitstop,
      state: audioState,
      render,
      renderAll,
      renderMusic,
      renderScene,
      panel,
      /** toca todos os efeitos em sequência */
      demo: async (gap = 900) => {
        unlockAudio()
        for (const n of SFX_NAMES) {
          sfx(n)
          await new Promise((r) => setTimeout(r, gap))
        }
      },
    },
  )
  ;(window as unknown as { __sfx: typeof api }).__sfx = api
  if (new URLSearchParams(location.search).has('sfx')) {
    if (document.body) panel()
    else addEventListener('DOMContentLoaded', panel, { once: true })
  }
}
