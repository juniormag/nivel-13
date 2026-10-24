// Barra de XP vermelha com moldura clara fina (referência): trilho escuro, preenchimento --red,
// brilho de 1 px no alto. O número e a barra sobem até o valor (regra 33).
import { fmt, useCountUp } from './hooks'

const lastShown = new Map<string, number>()

export function XPBar({
  value,
  max,
  label = 'Experiência',
  showText = true,
  sound,
  className,
}: {
  value: number
  max: number
  label?: string
  showText?: boolean
  /** som de contagem ('score' por passo e 'total' no fim) */
  sound?: boolean
  className?: string
}) {
  // sobe a partir do último valor mostrado nesta sessão (na primeira vez, de zero)
  const from = lastShown.get(label) ?? 0
  const v = useCountUp(value, { from, ms: 600, tick: sound ? 'score' : null, done: sound ? 'total' : null })
  lastShown.set(label, v)
  const pct = Math.max(0, Math.min(100, (v / max) * 100))
  return (
    <div className={`xp${className ? ` ${className}` : ''}`}>
      <div
        className="xp-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${fmt(value)} de ${fmt(max)} XP`}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      {showText && (
        <div className="xp-text" aria-hidden="true">
          {fmt(v)} / {fmt(max)} XP
        </div>
      )}
    </div>
  )
}
