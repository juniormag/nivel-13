// Revelação de uma rodada: pontos contando (400 ms), selo da nota, distância, texto com fonte tocável e
// "Brasil chutou" quando a API tiver o histograma. Nunca "vermelho de fracasso": erro é de todo mundo.
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { sfx } from '../audio/audio'
import { WEIGHTS } from '../lib/score'
import { useCountUp } from '../ui/hooks'
import { rise, stagger } from '../ui/motion'
import { ev } from './api'
import { distanceText, fmtValue, guessBucket } from './format'
import type { PlayRound } from './rounds'

export const tier = (s: number) => (s === 100 ? 'bull' : s >= 70 ? 'good' : s >= 35 ? 'mid' : 'low')
export const TIER_LABEL: Record<string, string> = {
  bull: 'Na mosca',
  good: 'Perto',
  mid: 'Mais ou menos',
  low: 'Longe',
}

export function ScoreTile({
  s,
  size = 'md',
  label,
}: {
  s: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}) {
  const t = tier(s)
  const cls = `cx-tile cx-tile--${t} cx-tile--${size}`
  return label ? (
    <span className={cls} role="img" aria-label={label}>
      {t === 'bull' && <i />}
    </span>
  ) : (
    <span className={cls} aria-hidden="true">
      {t === 'bull' && <i />}
    </span>
  )
}

export function Reveal({
  round,
  index,
  guess,
  score,
  hist,
}: {
  round: PlayRound
  index: number
  guess: number | null
  score: number
  /** 21 faixas (−10..10) desta rodada, quando houver */
  hist: number[] | null
}) {
  const mine = round.kind === 'number' ? guessBucket(round, guess) + 10 : null
  const w = WEIGHTS[index] ?? 1
  const pts = useCountUp(score * w, { from: 0, ms: 400 })
  const t = tier(score)

  useEffect(() => {
    // pitch sobe com a nota: o ouvido entende a régua
    if (t === 'bull') {
      sfx('perfect')
      window.setTimeout(() => sfx('star', { pitch: 7 }), 90)
    } else if (t === 'good') sfx('good', { pitch: 2 })
    else if (t === 'mid') sfx('coin')
    else sfx('error', { volume: 0.5 }) // suave: errar é de todo mundo
  }, [t])

  let line: string
  if (round.kind === 'number') {
    const d = guess === null ? '' : distanceText(round, guess)
    line =
      guess === null
        ? 'Sem chute nesta.'
        : d
          ? `Você chutou ${fmtValue(round, guess)}: ${d}.`
          : `Você chutou ${fmtValue(round, guess)}. Na mosca!`
  } else {
    line =
      guess === round.correct
        ? `Você marcou ${round.options[guess] ?? ''}. Certo!`
        : `Você marcou ${round.options[guess ?? -1] ?? '...'}.`
  }

  const src = round.sources[0]
  const crowd = crowdLine(round, hist)

  return (
    <motion.div className="cx-reveal" variants={stagger(0.06, 0.02)} initial="hidden" animate="show">
      <motion.div className="cx-pts" variants={rise}>
        <ScoreTile s={score} size="lg" />
        <div className="cx-pts-num">
          <b aria-hidden="true">+{pts}</b>
          <span className="sr-only">
            {TIER_LABEL[t]}: {score * w} pontos
          </span>
          <small aria-hidden="true">
            {TIER_LABEL[t]} · {score}/100 ×{w}
          </small>
        </div>
      </motion.div>
      <motion.p className="cx-dist" variants={rise}>
        {line}
      </motion.p>
      <motion.p className="cx-fact" variants={rise}>
        {round.reveal}
      </motion.p>
      {src && (
        <motion.a
          variants={rise}
          className="cx-src"
          href={src.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ev('source_open', round.id)}
        >
          <span className="cx-src-k">Fonte</span>
          <span className="cx-src-n">
            {src.name} · {src.date}
          </span>
          <span aria-hidden="true">↗</span>
          <span className="sr-only">(abre em nova aba)</span>
        </motion.a>
      )}
      {crowd && (
        <motion.div className={`cx-crowd${round.kind === 'number' ? '' : ' cx-crowd--text'}`} variants={rise}>
          {round.kind === 'number' && <Histogram hist={crowd.hist} mine={mine} />}
          <p>
            <span className="cx-crowd-k">Brasil chutou</span> {crowd.text}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

function crowdLine(round: PlayRound, hist: number[] | null) {
  if (!hist || hist.length !== 21) return null
  const n = hist.reduce((a, b) => a + b, 0)
  if (n < 10) return null
  const of10 = (x: number) => Math.round((x / n) * 10)
  if (round.kind === 'choice') {
    const right = hist[10] ?? 0
    return { hist, text: `${of10(right)} em cada 10 acertaram.` }
  }
  const below = hist.slice(0, 10).reduce((a, b) => a + b, 0)
  const above = hist.slice(11).reduce((a, b) => a + b, 0)
  const near = hist[10] ?? 0
  const text =
    above >= below && above >= near
      ? `${of10(above)} em cada 10 chutaram acima.`
      : below >= near
        ? `${of10(below)} em cada 10 chutaram abaixo.`
        : `${of10(near)} em cada 10 chutaram perto.`
  return { hist, text }
}

function Histogram({ hist, mine }: { hist: number[]; mine: number | null }) {
  const max = Math.max(1, ...hist)
  return (
    <div className="cx-hist" aria-hidden="true">
      {hist.map((v, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: faixas fixas −10..10
          key={i}
          className={i === 10 ? 'is-real' : i === mine ? 'is-me' : undefined}
          style={{ height: `${Math.max(2, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  )
}
