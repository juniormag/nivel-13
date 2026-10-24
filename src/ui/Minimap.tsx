// Minimapa da referência: Brasil em pixel escuro, rota tracejada, fases feitas em dourado,
// ponto atual vermelho com anel branco que pulsa, seta "N" e o nome do lugar.
import { useEffect, useRef } from 'react'
import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import { LEVELS } from '../content/levels'
import { hex } from '../lib/palette'

const SIZE = 64

function pos(lon: number, lat: number, size: number): [number, number] {
  return [
    Math.round(((lon - LON0) / (LON1 - LON0)) * size),
    Math.round(((lat - LAT0) / (LAT1 - LAT0)) * size),
  ]
}

let landCache: HTMLCanvasElement | null = null
function land(size: number) {
  if (landCache && landCache.width === size) return landCache
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) return c
  const inside = (i: number, j: number) =>
    inBrazil(LON0 + ((i + 0.5) / size) * (LON1 - LON0), LAT0 + ((j + 0.5) / size) * (LAT1 - LAT0))
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      if (!inside(i, j)) continue
      const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)
      // borda clara do lado da luz (alto/esquerda), interior em pedra escura com textura
      g.fillStyle = edge
        ? !inside(i - 1, j) || !inside(i, j - 1)
          ? hex('stone2')
          : hex('stone1')
        : (i * 3 + j * 5) % 11 === 0
          ? hex('stone1')
          : (i + j) % 2 === 0
            ? hex('hazeDark')
            : hex('stone0')
      g.fillRect(i, j, 1, 1)
    }
  landCache = c
  return c
}

export function Minimap({
  stars,
  current,
  className,
}: {
  stars: number[]
  current: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = SIZE
    c.height = SIZE
    const g = c.getContext('2d')
    if (!g) return
    g.imageSmoothingEnabled = false
    g.fillStyle = hex('night')
    g.fillRect(0, 0, SIZE, SIZE)
    g.drawImage(land(SIZE), 0, 0)
    // rota: tracejado em pedra clara, feito em dourado
    LEVELS.forEach((l, i) => {
      const next = LEVELS[i + 1]
      if (!next) return
      const [x0, y0] = pos(l.lon, l.lat, SIZE)
      const [x1, y1] = pos(next.lon, next.lat, SIZE)
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
      g.fillStyle = (stars[i + 1] ?? 0) > 0 ? hex('gold1') : hex('stone3')
      for (let s = 0; s <= n; s += 2)
        g.fillRect(Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n), 1, 1)
    })
    LEVELS.forEach((l, i) => {
      if (i === current) return
      const [x, y] = pos(l.lon, l.lat, SIZE)
      const done = (stars[i] ?? 0) > 0
      g.fillStyle = hex('void')
      g.fillRect(x - 1, y - 1, 3, 3)
      g.fillStyle = done ? hex('gold') : hex('stone2')
      g.fillRect(x, y, 1, 1)
      if (done) {
        g.fillRect(x - 1, y, 3, 1)
        g.fillRect(x, y - 1, 1, 3)
      }
    })
  }, [stars, current])

  const lv = LEVELS[Math.min(current, LEVELS.length - 1)]
  const [cx, cy] = lv ? pos(lv.lon, lv.lat, SIZE) : [0, 0]
  const leftPct = (cx / SIZE) * 100
  const topPct = (cy / SIZE) * 100
  const labelLeft = leftPct > 55
  return (
    <figure
      className={`minimap pf pf--hud${className ? ` ${className}` : ''}`}
      aria-label={lv ? `Próxima fase em ${lv.where}` : 'Mapa'}
    >
      <canvas ref={ref} />
      <span className="mm-north" aria-hidden="true">
        <b>N</b>
        <i />
      </span>
      {lv && (
        <>
          <span className="mm-dot" style={{ left: `${leftPct}%`, top: `${topPct}%` }} aria-hidden="true" />
          <span
            className={`mm-label${labelLeft ? ' is-left' : ''}`}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            aria-hidden="true"
          >
            {lv.where}
          </span>
        </>
      )}
    </figure>
  )
}
