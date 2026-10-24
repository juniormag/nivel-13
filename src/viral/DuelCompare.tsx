// Fim do Tira-teima: grade x grade, coroa pixel em quem venceu, Revanche e Desafiar outra pessoa.
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { sfx, stinger } from '../audio/audio'
import { total as sumTotal } from '../lib/score'
import { rise, stagger, steps } from '../ui/motion'
import { PixelButton } from '../ui/PixelButton'
import { ev } from './api'
import { fmtInt } from './format'
import { ScoreTile, TIER_LABEL, tier } from './Reveal'

export function Crown({ className }: { className?: string }) {
  // 11×7 pixels, dourado com brilho (conquista)
  const rows = [
    'k....k....k',
    'kk..kkk..kk',
    'kkkkkkkkkkk',
    'kgkkkgkkkgk',
    'kkkkkkkkkkk',
    '.kkkkkkkkk.',
    '.hhhhhhhhh.',
  ]
  return (
    <svg className={className} viewBox="0 0 11 7" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === '.' ? null : (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: grade fixa
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={c === 'g' ? 'var(--sparkle)' : c === 'h' ? 'var(--gold-1)' : 'var(--gold)'}
            />
          ),
        ),
      )}
    </svg>
  )
}

export function DuelCompare({
  me,
  them,
  onRematch,
  onChallenge,
}: {
  me: { s: number[] }
  them: { s: number[]; name: string }
  onRematch: () => void
  onChallenge: () => void
}) {
  const a = sumTotal(me.s)
  const b = sumTotal(them.s)
  const win = a > b ? 'me' : a < b ? 'them' : 'tie'
  const theirName = them.name || 'Quem te chamou'

  useEffect(() => {
    ev('duel_complete', win)
    const t = window.setTimeout(() => (win === 'me' ? stinger('win') : sfx('flip')), 380)
    return () => clearTimeout(t)
  }, [win])

  const col = (who: 'me' | 'them', name: string, s: number[], tot: number) => (
    <motion.div className={`cx-duel-col${win === who ? ' is-win' : ''}`} variants={rise}>
      <div className="cx-duel-crown">{win === who && <Crown />}</div>
      <div className="cx-duel-name">{name}</div>
      <div className="cx-duel-total">{fmtInt(tot)}</div>
      <div className="cx-duel-grid">
        {s.map((v, i) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa da grade
            key={i}
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.12, ease: steps(3) }}
          >
            <ScoreTile s={v} size="sm" label={`Rodada ${i + 1}: ${TIER_LABEL[tier(v)]}`} />
          </motion.span>
        ))}
      </div>
    </motion.div>
  )

  return (
    <motion.section className="cx-duel pf pf--red" aria-labelledby="cx-duel-h" variants={stagger(0.05, 0)}>
      <motion.h2 id="cx-duel-h" variants={rise}>
        Tira-teima
      </motion.h2>
      <motion.p className="cx-duel-verdict" variants={rise} role="status">
        {win === 'me'
          ? 'Você venceu!'
          : win === 'them'
            ? `${theirName} venceu desta vez.`
            : 'Empate. Ninguém cede.'}
      </motion.p>
      <div className="cx-duel-cols">
        {col('me', 'Você', me.s, a)}
        <div className="cx-duel-x" aria-hidden="true">
          x
        </div>
        {col('them', theirName, them.s, b)}
      </div>
      <motion.div className="actions" variants={rise}>
        <PixelButton tone="red" onClick={onRematch}>
          Revanche
        </PixelButton>
        <PixelButton onClick={onChallenge}>Desafiar outra pessoa</PixelButton>
      </motion.div>
    </motion.section>
  )
}
