// Entrada de tela em pontilhado Bayer 4×4: 8 degraus em 160 ms, só com a cor --void da paleta
// (x-craft §2, regra 9). Com movimento reduzido, corte seco.
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../audio/audio'
import { hex } from '../lib/palette'
import { BAYER4 } from '../lib/pixel'
import { prefersReduced } from './motion'

const CELL = 4
const STEPS = 8
const MS = 160

export function PixelWipe() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [done, setDone] = useState(() => prefersReduced())
  useEffect(() => {
    if (done) return
    const c = ref.current
    const g = c?.getContext('2d')
    if (!c || !g) {
      setDone(true)
      return
    }
    c.width = Math.ceil(innerWidth / CELL)
    c.height = Math.ceil(innerHeight / CELL)
    const tile = document.createElement('canvas')
    tile.width = 4
    tile.height = 4
    const tg = tile.getContext('2d')
    sfx('whoosh')
    let raf = 0
    let last = -1
    const t0 = performance.now()
    const draw = (now: number) => {
      // degrau pelo tempo decorrido: se a thread travar, a cortina termina no próximo quadro
      const step = Math.min(STEPS, Math.floor((now - t0) / (MS / STEPS)))
      if (step !== last && tg) {
        last = step
        const t = step / STEPS
        tg.clearRect(0, 0, 4, 4)
        tg.fillStyle = hex('void')
        BAYER4.forEach((v, i) => {
          if (v >= t) tg.fillRect(i % 4, Math.floor(i / 4), 1, 1)
        })
        g.clearRect(0, 0, c.width, c.height)
        const pat = g.createPattern(tile, 'repeat')
        if (pat) {
          g.fillStyle = pat
          g.fillRect(0, 0, c.width, c.height)
        }
      }
      if (step >= STEPS || now - t0 > MS * 3) setDone(true)
      else raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [done])
  if (done) return null
  return <canvas ref={ref} className="pixel-wipe" />
}
