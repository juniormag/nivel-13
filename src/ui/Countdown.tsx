// Contagem até a abertura das urnas (CONFIG.electionAt), atualizada a cada 30 s.
import { CONFIG } from '../config'
import { untilElection } from '../lib/time'
import { useNow } from './hooks'

export function useElectionCountdown() {
  const now = useNow(30000)
  return untilElection(now)
}

export function Countdown({
  prefix = 'Faltam ',
  done = 'Dia de votar',
  className,
}: {
  prefix?: string
  done?: string
  className?: string
}) {
  const c = useElectionCountdown()
  return (
    <time
      className={`countdown${className ? ` ${className}` : ''}`}
      dateTime={CONFIG.electionAt.toISOString()}
    >
      {c ? `${prefix}${c.label}` : done}
    </time>
  )
}

/** Contagem em blocos grandes (dias, horas, minutos), para a tela Votar. */
export function CountdownBlocks() {
  const c = useElectionCountdown()
  if (!c) return <p className="cd-done">Hoje é dia de votar.</p>
  const parts: [number, string][] = [
    [c.d, c.d === 1 ? 'dia' : 'dias'],
    [c.hh, 'horas'],
    [c.mm, 'min'],
  ]
  return (
    <div
      className="cd-blocks"
      role="timer"
      aria-label={`Faltam ${c.d} dias, ${c.hh} horas e ${c.mm} minutos para abrir as urnas`}
    >
      {parts.map(([n, l]) => (
        <span key={l} className="cd-block pf pf--stone" aria-hidden="true">
          <b>{String(n).padStart(2, '0')}</b>
          <small>{l}</small>
        </span>
      ))}
    </div>
  )
}
