// Atributos com barras segmentadas: 10 segmentos com 1 px de vão, enchendo um de cada vez.
import { motion } from 'motion/react'
import { useCountUp } from './hooks'
import { steps } from './motion'

export interface Stat {
  label: string
  value: number
}

function Row({ s, i }: { s: Stat; i: number }) {
  const v = useCountUp(s.value, { from: 0, ms: 480 })
  const on = Math.round(s.value / 10)
  return (
    <li className="stat">
      <span className="stat-label">{s.label}</span>
      <span className="stat-bar" aria-hidden="true">
        {Array.from({ length: 10 }, (_, k) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: segmento fixo
          <i key={k}>
            {k < on && (
              <motion.b
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.06 + k * 0.035, duration: 0.05, ease: steps(1) }}
              />
            )}
          </i>
        ))}
      </span>
      <span className="stat-num" aria-hidden="true">
        {v}
      </span>
      <span className="sr-only">{s.value} de 99</span>
    </li>
  )
}

export function StatBars({
  stats,
  label = 'Atributos',
  className,
}: {
  stats: Stat[]
  label?: string
  className?: string
}) {
  return (
    <ul className={`stats${className ? ` ${className}` : ''}`} aria-label={label}>
      {stats.map((s, i) => (
        <Row key={s.label} s={s} i={i} />
      ))}
    </ul>
  )
}
