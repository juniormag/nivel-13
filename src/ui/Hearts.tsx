// Corações pixel (11×10 lógicos). Ao perder um, ele pisca branco por 2 quadros, treme ±1 px e some.
import { useEffect, useRef, useState } from 'react'
import { sprite } from '../lib/sprites'
import { PixelIcon } from './PixelIcon'

export function Hearts({
  n,
  max = 3,
  label,
  className,
}: {
  n: number
  max?: number
  label?: string
  className?: string
}) {
  const prev = useRef(n)
  const [lost, setLost] = useState<number | null>(null)
  useEffect(() => {
    if (n < prev.current) {
      setLost(n)
      const t = window.setTimeout(() => setLost(null), 360)
      prev.current = n
      return () => clearTimeout(t)
    }
    prev.current = n
  }, [n])
  return (
    <div
      className={`hearts${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={label ?? `${n} de ${max} vidas`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa de cada coração
          key={i}
          className={`heart-slot${i === lost ? ' is-lost' : ''}${i < n ? ' is-full' : ''}`}
        >
          <PixelIcon src={sprite(i < n ? 'heart' : 'heartOff')} className="heart" />
        </span>
      ))}
    </div>
  )
}
