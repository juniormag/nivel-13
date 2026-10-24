// Carta do fato na revelação: lugar, distância contando, pontos, título, 2 linhas, selo de status
// exato (verde "good" ou vermelho "legal") e a fonte. Um toque segue.
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Pin } from '../../content/onde'
import { useCountUp } from '../../ui/hooks'
import { rise, stagger } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { ev } from '../../viral/api'
import { fmtInt, fmtKm, TOL_KM, verdict } from './logic'

export function FactReveal({
  pin,
  km,
  points,
  weight,
  last,
  ready,
  onNext,
  viaUf,
}: {
  pin: Pin
  km: number
  points: number
  weight: number
  last: boolean
  /** a linha já chegou: liberar o botão */
  ready: boolean
  onNext: () => void
  viaUf?: string | null
}) {
  const shownKm = useCountUp(Math.round(km), { from: 0, ms: 600 })
  const shownPts = useCountUp(points * weight, { from: 0, ms: 500 })
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (ready) btn.current?.focus({ preventScroll: true })
  }, [ready])
  const src = pin.sources[0]
  const tier = km <= TOL_KM ? 'is-bull' : points >= 70 ? 'is-good' : points >= 35 ? 'is-mid' : 'is-low'
  return (
    <motion.article
      className={`onde-fact pf pf--hud pf--bracket is-${pin.side}`}
      aria-labelledby="onde-fact-t"
      variants={stagger(0.05, 0)}
      initial="hidden"
      animate="show"
    >
      <motion.div className="onde-fact-score" variants={rise}>
        <span className="onde-fact-place">
          <i className={`onde-dot is-${pin.side}`} aria-hidden="true" />
          {pin.place}
        </span>
        <span className={`onde-fact-km ${tier}`}>
          <b>{fmtKm(shownKm)}</b>
          <em>{verdict(km)}</em>
        </span>
        <span className="onde-fact-pts">
          +{fmtInt(shownPts)}
          {weight > 1 && <small> ×{weight}</small>}
        </span>
      </motion.div>
      <p className="sr-only" aria-live="polite">
        {`${pin.place}. ${viaUf ? `Você escolheu ${viaUf}. ` : ''}Faltaram ${fmtKm(km)}. ${points * weight} pontos.`}
      </p>
      <motion.h3 id="onde-fact-t" className="onde-fact-title" variants={rise}>
        {pin.title}
      </motion.h3>
      <motion.p className={`onde-seal is-${pin.status.kind}`} variants={rise}>
        {pin.status.label}
      </motion.p>
      <motion.p className="onde-fact-body" variants={rise}>
        {pin.body}
      </motion.p>
      {src && (
        <motion.p className="onde-fact-src" variants={rise}>
          Fonte:{' '}
          <a
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => ev('source_open', `onde:${pin.id}`)}
          >
            {src.name}
          </a>{' '}
          <span>({src.date})</span>
        </motion.p>
      )}
      <motion.div className="onde-fact-cta" variants={rise}>
        <PixelButton
          ref={btn}
          tone={last ? 'gold' : 'red'}
          size="big"
          wide
          disabled={!ready}
          sound="select"
          onClick={onNext}
        >
          {last ? 'Ver seu mapa ▶' : 'Próximo ▶'}
        </PixelButton>
      </motion.div>
    </motion.article>
  )
}
