// STUB do contrato: o pixel-art-director substitui pelo mundo do título em nível de referência.
// Contrato: <WorldStage progress={0..1} celebrate={boolean} /> ocupa a tela inteira atrás do HUD.
import { useEffect, useRef } from 'react'
import { applyFit, computeFit } from '../lib/pixel'
import { Backdrop } from '../scene/backdrop'

export interface WorldStageProps {
  progress: number
  celebrate?: boolean
}

export function WorldStage({ progress, celebrate }: WorldStageProps) {
  const bgRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const bg = bgRef.current
    const gl = glRef.current
    if (!bg || !gl) return
    let raf = 0
    let alive = true
    const fit = computeFit()
    applyFit(bg, fit)
    applyFit(gl, fit)
    const b = new Backdrop(bg)
    b.resize(fit)
    let mon: import('../scene/monument').Monument | null = null
    import('../scene/monument').then(({ Monument }) => {
      if (!alive) return
      mon = new Monument(gl)
      mon.resize(fit, b.L)
      mon.setProgress(progress)
      if (celebrate) mon.celebrate()
    })
    const t0 = performance.now()
    const frame = (now: number) => {
      const t = (now - t0) / 1000 + 4
      b.draw(t)
      mon?.update(t, 0, 0)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      mon?.dispose()
    }
  }, [progress, celebrate])
  return (
    <div className="world-stage" aria-hidden="true">
      <canvas ref={bgRef} />
      <canvas ref={glRef} />
    </div>
  )
}
