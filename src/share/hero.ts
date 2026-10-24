// Cena de fundo dos cards: o still do herói (cenário + monumento) em pixels lógicos.
// Ordem de tentativa: renderHeroStill (src/scene, do diretor de arte) → Backdrop + "13" em 2D
// (src/share/monument2d.ts). Os módulos de cena entram por import dinâmico, sem acoplar tipos:
// se a API de lá mudar, o card cai no próximo degrau em vez de quebrar.
import { canvas } from './kit'
import { draw13Monument, type MonumentInfo } from './monument2d'

export interface HeroOpts {
  progress?: number
  crown?: boolean
  /** false = só o cenário (o degrau do diretor de arte pode ignorar) */
  monument?: boolean
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
  const p = heroFn
  // falha não fica em cache: o módulo pode estar só sendo recarregado
  void p.then((fn) => {
    if (!fn && heroFn === p) heroFn = null
  })
  return p
}

export interface Still {
  c: HTMLCanvasElement
  /** qual degrau desenhou: 'hero' (diretor de arte) ou '2d' (fallback local) */
  kind: 'hero' | '2d'
  /** geometria exata do monumento (só no degrau 2D) */
  info?: MonumentInfo
  /** pé do monumento (y) e pixels por unidade do monumento (o "1" tem 8 unidades) */
  base: number
  ppu: number
}

const layoutMods = import.meta.glob('../scene/layout.ts')

/** Layout da cena (src/scene/layout.ts) com fallback para os números de lá. */
export async function sceneLayout(w: number, h: number): Promise<{ base: number; ppu: number }> {
  const load = first(layoutMods)
  try {
    if (load) {
      const mod = (await load()) as {
        layoutFor?: (w: number, h: number) => { base?: { y: number }; ppu?: number }
      }
      const L = mod.layoutFor?.(w, h)
      if (L?.base && L.ppu) return { base: L.base.y, ppu: L.ppu }
    }
  } catch {
    // usa o cálculo local
  }
  const ppu = Math.max(10, Math.floor((w * 0.64) / 10))
  return { base: Math.round(Math.min(h * 0.46, ppu * 15.5)), ppu }
}

// Duas gerações da API do cenário (o diretor de arte está reescrevendo): aceitamos as duas.
interface BackdropAny {
  build?(w: number, h: number): void
  draw?(t: number, px?: number, py?: number): void
  drawBack?(g: CanvasRenderingContext2D, t: number, cam: { x: number; y: number }): void
  drawFront?(g: CanvasRenderingContext2D, cam: { x: number; y: number }): void
  L?: { baseY?: number; base?: { x: number; y: number }; ppu?: number }
}

/** Cenário com o monumento 2D entre as camadas de trás e da frente. */
async function backdropWith13(w: number, h: number, o: HeroOpts): Promise<Still> {
  const { c, g } = canvas(w, h)
  const lay = await sceneLayout(w, h)
  // mesmo tamanho do monumento 3D: o "1" com ~8 unidades de altura
  const s = lay.ppu * 20
  const draw13 = (baseY: number) =>
    o.monument === false
      ? undefined
      : draw13Monument(g, w / 2, baseY, s, { crown: o.crown ?? false, progress: o.progress ?? 1 })
  const done = (info: MonumentInfo | undefined, base: number): Still => ({
    c,
    kind: '2d',
    info,
    base,
    ppu: lay.ppu,
  })
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
      const base = b.L?.base?.y ?? lay.base
      const info = draw13(base)
      b.drawFront?.(g, cam)
      return done(info, base)
    }
    const b = new mod.Backdrop(c)
    b.build?.(w, h)
    b.draw?.(6)
    g.imageSmoothingEnabled = false
    const base = Math.round(h * (b.L?.baseY ?? 0.54))
    return done(draw13(base), base)
  } catch {
    // céu liso: o card continua legível sem o cenário
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#07050a')
    grd.addColorStop(0.6, '#2a0a14')
    grd.addColorStop(1, '#0e0a14')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    return done(draw13(lay.base), lay.base)
  }
}

const cache = new Map<string, Promise<Still>>()

/** Still do herói em `w`×`h` pixels lógicos (cacheado; não altere o canvas devolvido). */
export function heroStill(w: number, h: number, o: HeroOpts = {}): Promise<Still> {
  const key = `${forced() ?? ''}|${w}x${h}|${o.progress ?? 1}|${o.crown ? 1 : 0}|${o.monument === false ? 0 : 1}`
  let p = cache.get(key)
  if (!p) {
    const made = renderStill(w, h, o)
    p = made
    cache.set(key, made)
    // o degrau local não fica em cache: na próxima, tenta o still do diretor de arte de novo
    made.then(
      (st) => {
        if (st.kind !== 'hero' && cache.get(key) === made) cache.delete(key)
      },
      () => cache.delete(key),
    )
  }
  return p
}

/** Só o degrau local (cenário + "13" 2D), sem passar pelo still do diretor de arte. */
export function still2d(w: number, h: number, o: HeroOpts = {}): Promise<Still> {
  return backdropWith13(w, h, o)
}

/** Classe World do diretor de arte (src/scene), para o clipe animado; null se não existir. */
export interface WorldLike {
  frame(t: number, dt: number): void
  setProgress(p: number, animate?: boolean): void
  celebrate(): void
  loadMonument(): Promise<void>
  dispose(): void
}
export type WorldCtor = new (
  canvas: HTMLCanvasElement,
  W: number,
  H: number,
  opts?: { reduced?: boolean; mobile?: boolean; still?: boolean },
) => WorldLike

export async function findWorld(): Promise<WorldCtor | null> {
  if (forced()) return null
  for (const load of Object.values(heroMods)) {
    try {
      const mod = (await load()) as { World?: unknown }
      const W = mod.World
      if (typeof W !== 'function') continue
      const proto = (W as { prototype?: Partial<WorldLike> }).prototype
      if (typeof proto?.frame === 'function' && typeof proto.celebrate === 'function') return W as WorldCtor
    } catch {
      // tenta o próximo
    }
  }
  return null
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
      return { c, kind: 'hero', ...(await sceneLayout(w, h)) }
    } catch {
      // segue para o degrau local
    }
  }
  return backdropWith13(w, h, o)
}
