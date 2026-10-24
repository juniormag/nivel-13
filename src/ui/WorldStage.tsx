// O mundo do título, em tela cheia atrás do HUD.
// Contrato: <WorldStage progress={0..1} celebrate={boolean} />.
// Primeira pintura só com o cenário 2D; o three (monumento) carrega depois, em chunk separado.
// Pausa com a aba escondida, cai para 30 fps fixos se o aparelho não segura 60, respeita movimento reduzido.
import { useEffect, useRef } from 'react'
import { computeFit, type PixelFit } from '../lib/pixel'
import { World } from '../scene/world'

export interface WorldStageProps {
  progress: number
  celebrate?: boolean
}

/** lado menor ≈ 420 px lógicos: 720×450 (escala 2) no desktop, 390 de largura (escala 3) no celular */
const TARGET = 420

export function WorldStage({ progress, celebrate }: WorldStageProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const progRef = useRef(progress)
  progRef.current = progress

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const mq = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches
    const reduced = mq('(prefers-reduced-motion: reduce)')
    const mobile = mq('(pointer: coarse)')
    let fit: PixelFit = computeFit(TARGET)
    const world = new World(canvas, fit.W, fit.H, { reduced, mobile })
    worldRef.current = world
    world.palcheck = import.meta.env.DEV && location.search.includes('palcheck')
    world.setProgress(progRef.current)
    const style = () => {
      canvas.style.width = `${fit.W * fit.css}px`
      canvas.style.height = `${fit.H * fit.css}px`
    }
    style()

    let raf = 0
    let running = false
    const t0 = performance.now()
    let last = t0
    let slow = 0
    let half = false
    let skip = false
    const clock = (now: number) => (now - t0) / 1000 + 4
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = (now - last) / 1000
      // 30 fps fixos quando o quadro passa de 20 ms por 1 s seguido
      if (!half) {
        slow = dt > 0.02 ? slow + dt : 0
        if (slow > 1) half = true
      }
      if (half) {
        skip = !skip
        if (skip) return
      }
      last = now
      world.frame(clock(now), dt)
    }
    const start = () => {
      if (running || reduced) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const still = () => world.frame(clock(performance.now()), 0)

    // primeira pintura: só o cenário
    still()
    let alive = true
    const idle = window.setTimeout(() => {
      world.loadMonument().then(() => {
        if (!alive) return
        if (reduced) still()
      })
    }, 60)
    start()

    const onVis = () => (document.hidden ? stop() : start())
    const onResize = () => {
      fit = computeFit(TARGET)
      world.resize(fit.W, fit.H)
      style()
      if (reduced) world.loadMonument().then(() => alive && still())
    }
    let px = 0
    let py = 0
    let pt = 0
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / fit.css
      const y = e.clientY / fit.css
      const now = performance.now()
      const dt = Math.max(0.008, (now - pt) / 1000)
      world.pointerMove(
        x,
        y,
        Math.max(-400, Math.min(400, (x - px) / dt)),
        Math.max(-400, Math.min(400, (y - py) / dt)),
      )
      px = x
      py = y
      pt = now
    }
    const onDown = (e: PointerEvent) => {
      onMove(e)
      world.tap(e.clientX / fit.css, e.clientY / fit.css)
      if (reduced) still()
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') world.pointerLeave()
    }
    const onLeave = () => world.pointerLeave()
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) world.tilt(e.gamma, e.beta)
    }
    document.addEventListener('visibilitychange', onVis)
    addEventListener('resize', onResize)
    if (!reduced) {
      addEventListener('pointermove', onMove, { passive: true })
      addEventListener('pointerup', onUp, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
      addEventListener('deviceorientation', onTilt, { passive: true })
    }
    addEventListener('pointerdown', onDown, { passive: true })
    return () => {
      alive = false
      window.clearTimeout(idle)
      stop()
      document.removeEventListener('visibilitychange', onVis)
      removeEventListener('resize', onResize)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      removeEventListener('deviceorientation', onTilt)
      removeEventListener('pointerdown', onDown)
      world.dispose()
      worldRef.current = null
    }
  }, [])

  useEffect(() => {
    worldRef.current?.setProgress(progress, true)
  }, [progress])

  useEffect(() => {
    if (celebrate) worldRef.current?.celebrate()
  }, [celebrate])

  return (
    <div className="world-stage" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  )
}
