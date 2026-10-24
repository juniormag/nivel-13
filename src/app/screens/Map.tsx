// Mapa da jornada: o Brasil em pixel com as 13 fases, do Sertão a Brasília.
// ←/→ (ou ↑/↓) escolhe a fase, Enter joga, Esc volta. Toque no nó escolhe; toque de novo joga.
// A lista de fases também existe em texto (sr-only) para leitor de tela.
import { useCallback, useEffect, useRef, useState } from 'react'
import { playMusic, sfx } from '../../audio/audio'
import { LEVELS } from '../../content/levels'
import { computeFit, type PixelFit } from '../../lib/pixel'
import { JourneyMap } from '../../scene/journey'
import { levelsDone, useSave } from '../../state/save'
import { PixelButton } from '../../ui/PixelButton'
import { Screen, Stars } from '../../ui/Shell'
import { go } from '../nav'

export default function JourneyScreen() {
  const save = useSave()
  const done = levelsDone(save)
  const unlocked = (i: number) => i <= done
  const [sel, setSel] = useState(Math.min(12, done))
  const ref = useRef<HTMLCanvasElement>(null)
  const mapRef = useRef<JourneyMap | null>(null)
  const fitRef = useRef<PixelFit | null>(null)
  const redrawRef = useRef<() => void>(() => {})
  const state = useRef({ sel, done, stars: save.stars, avatar: save.avatar })
  state.current = { sel, done, stars: save.stars, avatar: save.avatar }

  useEffect(() => playMusic('title'), [])

  const select = useCallback((i: number) => {
    const n = Math.max(0, Math.min(12, i))
    setSel((cur) => {
      if (cur !== n) sfx('select')
      return n
    })
  }, [])

  const play = useCallback((i: number) => {
    if (i > state.current.done) {
      sfx('bad')
      return
    }
    sfx('go')
    go('play', { level: i + 1 })
  }, [])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const map = new JourneyMap(canvas)
    mapRef.current = map
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const layout = () => {
      const fit = computeFit(330)
      fitRef.current = fit
      // topo: barra (≈60 px CSS); embaixo: painel (≈150 px CSS)
      map.layout(fit.W, fit.H, 64 / fit.css, 170 / fit.css)
      canvas.style.width = `${fit.W * fit.css}px`
      canvas.style.height = `${fit.H * fit.css}px`
    }
    layout()
    let raf = 0
    const t0 = performance.now()
    const frame = (now: number) => {
      const s = state.current
      map.draw((now - t0) / 1000, s.sel, s.done, s.stars, s.avatar, reduced)
      if (!reduced) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const redraw = () => {
      if (reduced) raf = requestAnimationFrame(frame)
    }
    const onResize = () => {
      layout()
      redraw()
    }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(frame)
    }
    addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    redrawRef.current = redraw
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // movimento reduzido: redesenha só quando a seleção muda
  // biome-ignore lint/correctness/useExhaustiveDependencies: redesenha quando a seleção muda
  useEffect(() => {
    redrawRef.current()
  }, [sel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t?.closest('.sr-only')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        select(state.current.sel + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        select(state.current.sel - 1)
      } else if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) {
        e.preventDefault()
        play(state.current.sel)
      } else if (e.key === 'Escape') {
        sfx('back')
        go('title')
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [select, play])

  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const fit = fitRef.current
    const map = mapRef.current
    if (!fit || !map) return
    const r = e.currentTarget.getBoundingClientRect()
    const i = map.hit((e.clientX - r.left) / fit.css, (e.clientY - r.top) / fit.css)
    if (i < 0) return
    if (i === state.current.sel) play(i)
    else select(i)
  }

  const l = LEVELS[sel]
  const stars = save.stars[sel] ?? 0
  const can = unlocked(sel)

  return (
    <Screen className="scr--map">
      <canvas
        ref={ref}
        className="map-canvas"
        role="img"
        aria-label="Mapa do Brasil com as 13 fases"
        onPointerDown={onCanvas}
      />
      <div className="topbar" style={{ position: 'fixed', zIndex: 2 }}>
        <PixelButton size="sm" commit="back" aria-label="Voltar ao início" onClick={() => go('title')}>
          <span aria-hidden="true">◀</span> Início
        </PixelButton>
        <h1
          style={{
            flex: 1,
            textAlign: 'center',
            letterSpacing: '0.14em',
            fontSize: 14,
            margin: 0,
            fontWeight: 400,
          }}
        >
          Jornada
        </h1>
        <span className="countdown">
          <span aria-hidden="true">{done}/13</span>
          <span className="sr-only">{done} de 13 fases concluídas</span>
        </span>
      </div>
      {l && (
        <section
          className="map-panel pf pf--red"
          aria-live="polite"
          style={{ position: 'fixed', top: 'auto', bottom: 'calc(14px + var(--safe-b, 0px))', zIndex: 2 }}
        >
          <div>
            <div className="lvl">Fase {l.n} de 13</div>
            <h3>{l.title}</h3>
            <div className="where">{l.where}</div>
            {stars > 0 && <Stars n={stars} />}
          </div>
          {can ? (
            <PixelButton tone="red" size="big" onClick={() => play(sel)} autoFocus>
              {stars > 0 ? 'Rejogar ▶' : 'Jogar ▶'}
            </PixelButton>
          ) : (
            <div className="small" style={{ maxWidth: 140, textAlign: 'right', color: 'var(--stone-3)' }}>
              Complete a fase {sel} para liberar
            </div>
          )}
        </section>
      )}
      <ol className="sr-only" aria-label="Fases da jornada">
        {LEVELS.map((lv, i) => (
          <li key={lv.n}>
            <button type="button" disabled={!unlocked(i)} onClick={() => play(i)} onFocus={() => setSel(i)}>
              {`Fase ${lv.n}: ${lv.title}, ${lv.where}${(save.stars[i] ?? 0) > 0 ? `, concluída com ${save.stars[i]} estrelas` : unlocked(i) ? ', liberada' : ', trancada'}`}
            </button>
          </li>
        ))}
      </ol>
    </Screen>
  )
}
