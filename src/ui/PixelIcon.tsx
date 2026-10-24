// Mostra um canvas de pixel art (sprite, retrato, ícone) ampliado sem suavização.
import { useEffect, useRef } from 'react'

export function PixelIcon({ src, className, label }: { src: HTMLCanvasElement; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = src.width
    c.height = src.height
    c.getContext('2d')?.drawImage(src, 0, 0)
  }, [src])
  return <canvas ref={ref} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
}
