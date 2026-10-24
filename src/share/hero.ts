// Cena de fundo dos cards: o still do herói (cenário + monumento) em pixels lógicos.
// Ordem de tentativa: renderHeroStill (src/scene, do diretor de arte) → Backdrop + "13" em 2D
// (src/share/monument2d.ts). Os módulos de cena entram por import dinâmico, sem acoplar tipos:
// se a API de lá mudar, o card cai no próximo degrau em vez de quebrar.
import { canvas } from './kit'
import { draw13Monument, type MonumentInfo } from './monument2d'

export interface HeroOpts {
  progress?: number
  crown?: boolean
}

type HeroFn = (w: number, h: number, o?: HeroOpts) => Promise<HTMLCanvasElement>
type Loader = () => Promise<unknown>

// Só módulos com nome de still/herói (ou o índice) são candidatos; nada pesado é carregado à toa.
const heroMods = import.meta.glob(['../scene/*[Hh]ero*.ts', '../scene/*[Ss]till*.ts', '../scene/index.ts'])
const backdropMods = import.meta.glob('../scene/backdrop.ts')

const first = (m: Record<string, Loader>) => Object.values(m)[0]

let heroFn: Promise<HeroFn | null> | null = null
function findHero() {
  heroFn ??= (async () => {
    for (const load of Object.values(heroMods)) {
      try {
        const mod = (await load()) as { renderHeroStill?: unknown }
        if (typeof mod.renderHeroStill === 'function') return mod.renderHeroStill as HeroFn
      } catch {
        // módulo quebrado: tenta o próximo
      }
    }
    return null
  })()
  return heroFn
}

export interface Still {
  c: HTMLCanvasElement
  /** qual degrau desenhou: 'hero' (diretor de arte) ou '2d' (fallback local) */
  kind: 'hero' | '2d'
  /** geometria do monumento quando conhecida (só no degrau 2D) */
  info?: MonumentInfo
}

// Duas gerações da API do cenário (o diretor de arte está reescrevendo): aceitamos as duas.
interface BackdropAny {
  build?(w: number, h: number): void
  draw?(t: number, px?: number, py?: number): void
  drawBack?(g: CanvasRenderingContext2D, t: number, cam: { x: number; y: number }): void
  drawFront?(g: CanvasRenderingContext2D, cam: { x: number; y: number }): void
  L?: { baseY?: number; base?: { x: number; y: number } }
}

/** Cenário com o monumento 2D entre as camadas de trás e da frente. */
async function backdropWith13(w: number, h: number, o: HeroOpts): Promise<Still> {
  const { c, g } = canvas(w, h)
  const s = Math.min(w, h * 0.56)
  const draw13 = (baseY: number) =>
    draw13Monument(g, w / 2, baseY, s, { crown: o.crown ?? false, progress: o.progress ?? 1 })
  const load = first(backdropMods)
  try {
    if (!load) throw new Error('sem backdrop')
    const mod = (await load()) as { Backdrop?: new (a: unknown, b?: number) => BackdropAny }
    if (!mod.Backdrop) throw new Error('sem Backdrop')
    const cam = { x: 0, y: 0 }
    const probe = mod.Backdrop.prototype as BackdropAny
    if (typeof probe.drawBack === 'function') {
      const b = new mod.Backdrop(w, h)
      b.drawBack?.(g, 6, cam)
      const info = draw13(b.L?.base?.y ?? Math.round(h * 0.54))
      b.drawFront?.(g, cam)
      return { c, kind: '2d', info }
    }
    const b = new mod.Backdrop(c)
    b.build?.(w, h)
    b.draw?.(6)
    g.imageSmoothingEnabled = false
    return { c, kind: '2d', info: draw13(Math.round(h * (b.L?.baseY ?? 0.54))) }
  } catch {
    // céu liso: o card continua legível sem o cenário
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#07050a')
    grd.addColorStop(0.6, '#2a0a14')
    grd.addColorStop(1, '#0e0a14')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    return { c, kind: '2d', info: draw13(Math.round(h * 0.54)) }
  }
}

const cache = new Map<string, Promise<Still>>()

/** Still do herói em `w`×`h` pixels lógicos (cacheado; não altere o canvas devolvido). */
export function heroStill(w: number, h: number, o: HeroOpts = {}): Promise<Still> {
  const key = `${forced() ?? ''}|${w}x${h}|${o.progress ?? 1}|${o.crown ? 1 : 0}`
  let p = cache.get(key)
  if (!p) {
    p = renderStill(w, h, o)
    cache.set(key, p)
    p.catch(() => cache.delete(key))
  }
  return p
}

/** QA: `window.__n13HeroTier = '2d'` força o degrau local. */
const forced = () => (globalThis as { __n13HeroTier?: string }).__n13HeroTier

async function renderStill(w: number, h: number, o: HeroOpts): Promise<Still> {
  const fn = forced() ? null : await findHero()
  if (fn) {
    try {
      const src = await fn(w, h, o)
      const { c, g } = canvas(w, h)
      g.drawImage(src, 0, 0, w, h)
      return { c, kind: 'hero' }
    } catch {
      // segue para o degrau local
    }
  }
  return backdropWith13(w, h, o)
}
