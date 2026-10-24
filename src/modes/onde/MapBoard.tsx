// Mapa tocável do Onde Foi?: canvas L×L em escala inteira, mira que segue o dedo, lupa 2× acima do dedo,
// setas e Enter no teclado, e a revelação (linha pixel do toque até o ponto certo, alfinete caindo, anel).
// touch-action: none no mapa: tocar e arrastar nunca rola nem dá zoom na página.
import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/audio'
import { prefersReduced } from '../../ui/motion'
import { haptic } from '../../ui/prefs'
import { drawMap, type Mark } from './draw'
import { fromXY, type Pt, toXY, ufAt } from './geo'

/** Duração da linha da revelação; o alfinete cai logo depois. */
export const LINE_MS = 650
const DROP_MS = 140
const RING_MS = 520
const LOUPE = 17 // pixels lógicos de lado na lupa (ímpar: o centro é o ponto)

export interface RevealAnim {
  key: string
  guess: Pt
  target: Pt
  side: 'avanco' | 'caso'
}

export function MapBoard({
  L,
  S,
  marks,
  guess,
  highlight,
  interactive,
  reveal,
  onGuess,
  onConfirm,
  label,
  describedBy,
  className,
}: {
  L: number
  S: number
  /** o que já está no mapa (rodadas passadas, mapa final) */
  marks: Mark[]
  guess: Pt | null
  highlight?: string | null
  interactive: boolean
  reveal?: RevealAnim | null
  onGuess?: (p: Pt) => void
  onConfirm?: () => void
  label: string
  describedBy?: string
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<number | null>(null)
  const lastUf = useRef<string | null>(null)
  const anim = useRef<{ t0: number; key: string } | null>(null)
  const raf = useRef(0)
  const [loupe, setLoupe] = useState<{ x: number; y: number; below: boolean } | null>(null)

  const paint = useCallback(
    (now: number) => {
      const c = ref.current
      if (!c) return
      if (c.width !== L) c.width = L
      if (c.height !== L) c.height = L
      const g = c.getContext('2d')
      if (!g) return
      const all: Mark[] = marks.slice()
      let running = false
      if (reveal) {
        const a = anim.current
        const t = a && a.key === reveal.key ? now - a.t0 : Number.POSITIVE_INFINITY
        const line = Math.min(1, t / LINE_MS)
        const tp = t - LINE_MS
        const ringK = (tp - DROP_MS * 0.5) / RING_MS
        all.push({
          side: reveal.side,
          guess: reveal.guess,
          target: reveal.target,
          line,
          pin: tp >= 0,
          drop: tp >= 0 && tp < DROP_MS ? 8 * (1 - tp / DROP_MS) : 0,
          ring: ringK >= 0 && ringK <= 1 ? ringK : undefined,
        })
        running = Number.isFinite(t) && t < LINE_MS + DROP_MS + RING_MS
      } else if (guess) all.push({ side: 'avanco', guess })
      drawMap(g, L, { marks: all, highlight })
      // lupa: copia o canvas em volta do ponto (CSS amplia 2× a escala do mapa)
      const lc = loupeRef.current
      if (lc && guess && drag.current !== null) {
        const lg = lc.getContext('2d')
        if (lg) {
          const [gx, gy] = toXY(guess, L)
          const half = (LOUPE - 1) / 2
          lg.imageSmoothingEnabled = false
          lg.fillStyle = '#07050a'
          lg.fillRect(0, 0, LOUPE, LOUPE)
          lg.drawImage(c, Math.round(gx) - half, Math.round(gy) - half, LOUPE, LOUPE, 0, 0, LOUPE, LOUPE)
        }
      }
      return running
    },
    [L, marks, guess, highlight, reveal],
  )

  // revelação: começa a animação quando chega uma nova
  useEffect(() => {
    if (!reveal) {
      anim.current = null
      return
    }
    if (anim.current?.key === reveal.key) return
    anim.current = { t0: prefersReduced() ? -1e9 : performance.now(), key: reveal.key }
  }, [reveal])

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const loop = (now: number) => {
      if (paint(now)) raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [paint])

  const at = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(L - 0.01, ((clientX - r.left) / r.width) * L))
    const y = Math.max(0, Math.min(L - 0.01, ((clientY - r.top) / r.height) * L))
    return { p: fromXY(x, y, L), cx: clientX - r.left, cy: clientY - r.top, top: r.top }
  }

  const place = (p: Pt) => {
    const uf = ufAt(p)
    if (uf !== lastUf.current) {
      lastUf.current = uf
      if (drag.current !== null) sfx('tick', { volume: 0.35, x: (p.lon + 75) / 42 })
    }
    onGuess?.(p)
  }

  const showLoupe = (cx: number, cy: number, top: number) => {
    // acima do dedo; se não couber (topo da tela), vai para baixo
    const size = LOUPE * S * 2
    const below = top + cy - size - 56 < 8
    setLoupe({ x: cx, y: cy, below })
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button > 0) return
    const a = at(e.clientX, e.clientY)
    if (!a) return
    drag.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    haptic('move')
    sfx('select', { volume: 0.5 })
    place(a.p)
    showLoupe(a.cx, a.cy, a.top)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current !== e.pointerId) return
    const a = at(e.clientX, e.clientY)
    if (!a) return
    place(a.p)
    showLoupe(a.cx, a.cy, a.top)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current !== e.pointerId) return
    drag.current = null
    setLoupe(null)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return
    const step = e.shiftKey ? 5 : 1
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const mv = d[e.key]
    if (mv) {
      e.preventDefault()
      const [x, y] = guess ? toXY(guess, L) : [L * 0.55, L * 0.45]
      const nx = Math.max(0, Math.min(L - 0.01, x + mv[0]))
      const ny = Math.max(0, Math.min(L - 0.01, y + mv[1]))
      const p = fromXY(nx, ny, L)
      const uf = ufAt(p)
      if (uf !== lastUf.current) {
        lastUf.current = uf
        sfx('tick', { volume: 0.35 })
      }
      onGuess?.(p)
      return
    }
    if ((e.key === 'Enter' || e.key === ' ') && guess) {
      e.preventDefault()
      onConfirm?.()
    }
  }

  const css = L * S
  const lsize = LOUPE * S * 2
  return (
    <div
      ref={wrapRef}
      className={`onde-map${interactive ? ' is-live' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: css, height: css }}
      role="application"
      aria-roledescription="mapa"
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKey}
    >
      <canvas ref={ref} width={L} height={L} />
      <span className="onde-north" aria-hidden="true">
        N
      </span>
      {loupe && (
        <span
          className={`onde-loupe${loupe.below ? ' is-below' : ''}`}
          style={{
            width: lsize,
            height: lsize,
            left: Math.max(-8, Math.min(css - lsize + 8, loupe.x - lsize / 2)),
            top: loupe.below ? loupe.y + 56 : loupe.y - lsize - 56,
          }}
          aria-hidden="true"
        >
          <canvas ref={loupeRef} width={LOUPE} height={LOUPE} />
          <i className="onde-loupe-x" />
        </span>
      )}
    </div>
  )
}
