// Número que sobe até o valor (regra 33), com rótulo acessível estável.
import { fmt, useCountUp } from './hooks'

export function CountUp({
  value,
  className,
  label,
  ms = 320,
}: {
  value: number
  className?: string
  label?: string
  ms?: number
}) {
  const v = useCountUp(value, { ms })
  return (
    <div className={className} role="status" aria-label={label ? `${label}: ${fmt(value)}` : undefined}>
      <span aria-hidden={label ? true : undefined}>{fmt(v)}</span>
    </div>
  )
}
