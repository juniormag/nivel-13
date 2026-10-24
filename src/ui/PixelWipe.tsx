// Entrada de tela em pontilhado Bayer 4×4: 8 degraus em 160 ms, só com a cor --void da paleta
// (x-craft §2, regra 9). Com movimento reduzido, corte seco.
import { useEffect, useRef, useState } from 'react'
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
    let step = 0
    let timer = 0
    const draw = () => {
      if (!tg) return
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
      step++
      if (step > STEPS) setDone(true)
      else timer = window.setTimeout(draw, MS / STEPS)
    }
    draw()
    return () => clearTimeout(timer)
  }, [done])
  if (done) return null
  return <canvas ref={ref} className="pixel-wipe" aria-hidden="true" />
}
