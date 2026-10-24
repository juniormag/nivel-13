// Uma rodada do Chuta Aí: pergunta → chute → suspense de 600 ms com a agulha varrendo do chute até a
// resposta (tique subindo) → hit-stop de 60 ms → revelação. Tempo suave: uma barra que enche em ~18 s e
// não pune ninguém (público 55+, VIRAL-DESIGN §2.3).
import { motion } from 'motion/react'
import { type CSSProperties, useCallback, useEffect, useId, useRef, useState } from 'react'
import { hitstop, sfx } from '../audio/audio'
import { roundScore, WEIGHTS } from '../lib/score'
import { sprite } from '../lib/sprites'
import { prefersReduced, rise, stagger } from '../ui/motion'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import { getPrefs, haptic } from '../ui/prefs'
import { ev } from './api'
import { ChoiceButtons } from './ChoiceButtons'
import { Chute } from './Chute'
import { fmtValue, startValue, unitCaption, valueToPos } from './format'
import { Reveal } from './Reveal'
import type { NumberRound, PlayRound } from './rounds'

type Phase = 'input' | 'sweep' | 'reveal'

const SWEEP_MS = 600
const CHOICE_MS = 420
const HITSTOP_MS = 60

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function RoundView({
  round,
  index,
  count,
  hist,
  onScored,
  onNext,
}: {
  round: PlayRound
  index: number
  count: number
  hist: number[] | null
  onScored: (score: number, guess: number | null) => void
  onNext: () => void
}) {
  const qid = useId()
  const [phase, setPhase] = useState<Phase>('input')
  const [value, setValue] = useState(() => (round.kind === 'number' ? startValue(round) : 0))
  const [picked, setPicked] = useState<number | null>(null)
  const [needle, setNeedle] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [nextOn, setNextOn] = useState(false)
  const [fx, setFx] = useState<'bull' | 'miss' | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const raf = useRef(0)
  const t0 = useRef(performance.now())
  const w = WEIGHTS[index] ?? 1

  useEffect(() => {
    ev('round_start', index)
    return () => cancelAnimationFrame(raf.current)
  }, [index])

  useEffect(() => {
    if (phase !== 'reveal') return
    const t = window.setTimeout(() => setNextOn(true), prefersReduced() ? 250 : 800)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (fx !== 'bull') return
    const t = window.setTimeout(() => setFx(null), 700)
    return () => clearTimeout(t)
  }, [fx])

  useEffect(() => {
    if (nextOn) nextRef.current?.focus({ preventScroll: true })
  }, [nextOn])

  const land = useCallback(
    (sc: number, guess: number | null) => {
      sfx('impact', { volume: 0.7 })
      hitstop(HITSTOP_MS)
      haptic(sc >= 70 ? 'success' : 'confirm')
      window.setTimeout(() => {
        setScore(sc)
        setPhase('reveal')
        onScored(sc, guess)
        const p = getPrefs()
        if (sc === 100 && p.flashes) setFx('bull')
        else if (sc < 35 && p.shake > 0) setFx('miss')
        const secs = Math.round((performance.now() - t0.current) / 1000)
        ev('round_lock', `${index}:${secs < 10 ? '0-9' : secs < 20 ? '10-19' : '20+'}`)
      }, HITSTOP_MS)
    },
    [index, onScored],
  )

  const lockNumber = () => {
    if (phase !== 'input' || round.kind !== 'number') return
    const r: NumberRound = round
    const guess = value
    const sc = roundScore(r, guess)
    setPhase('sweep')
    sfx('confirm')
    haptic('confirm')
    const from = valueToPos(r, guess)
    const to = valueToPos(r, r.answer)
    if (prefersReduced()) {
      setNeedle(to)
      setShown(r.answer)
      land(sc, guess)
      return
    }
    const start = performance.now()
    let lastTick = 0
    const lerpV = (k: number) =>
      r.scale === 'log'
        ? Math.exp(Math.log(guess) + (Math.log(r.answer) - Math.log(guess)) * k)
        : guess + (r.answer - guess) * k
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / SWEEP_MS)
      const e = easeInOut(k)
      setNeedle(from + (to - from) * e)
      setShown(k >= 1 ? r.answer : lerpV(e))
      if (now - lastTick > 55 && k < 1) {
        lastTick = now
        sfx('score', { pitch: Math.round(k * 12), volume: 0.6, x: from + (to - from) * e })
      }
      if (k < 1) raf.current = requestAnimationFrame(step)
      else land(sc, guess)
    }
    setNeedle(from)
    raf.current = requestAnimationFrame(step)
  }

  const pick = useCallback(
    (i: number) => {
      if (phase !== 'input' || round.kind !== 'choice') return
      setPicked(i)
      setPhase('sweep')
      const sc = roundScore(round, i)
      if (prefersReduced()) {
        land(sc, i)
        return
      }
      let k = 0
      const tick = window.setInterval(() => {
        k++
        sfx('score', { pitch: k * 3, volume: 0.6 })
      }, CHOICE_MS / 5)
      window.setTimeout(() => {
        clearInterval(tick)
        land(sc, i)
      }, CHOICE_MS)
    },
    [phase, round, land],
  )

  const locked = phase !== 'input'
  const revealed = phase === 'reveal'
  const last = index === count - 1

  return (
    <>
      <div className="cx-body">
        <motion.section
          className={`cx-card pf pf--hud pf--bracket${fx === 'miss' ? ' is-shake' : ''}`}
          aria-labelledby={qid}
          variants={stagger(0.04, 0)}
          initial="hidden"
          animate="show"
          onAnimationEnd={() => setFx((f) => (f === 'miss' ? null : f))}
        >
          <span className={`cx-soft${locked ? ' is-paused' : ''}`} aria-hidden="true">
            <i />
          </span>
          <motion.header className="cx-card-head" variants={rise}>
            <PixelIcon src={sprite(round.icon)} className="cx-ico" />
            <span className="cx-theme">{round.theme}</span>
            <span className="cx-weight" title={`vale ${w} vezes`}>
              ×{w}
            </span>
          </motion.header>
          <motion.h2 id={qid} className="cx-q" variants={rise}>
            {round.q}
          </motion.h2>

          {round.kind === 'number' ? (
            <>
              <motion.div
                className={`cx-big${revealed ? ' is-answer' : ''}${revealed && score === 100 ? ' is-bull' : ''}`}
                variants={rise}
              >
                <span className="cx-big-k">
                  {revealed ? 'Resposta' : phase === 'sweep' ? 'E a resposta é' : 'Seu chute'}
                </span>
                <output className="cx-big-v" aria-live={revealed ? 'polite' : 'off'}>
                  {fmtValue(round, revealed ? round.answer : (shown ?? value))}
                </output>
                {unitCaption(round) && <span className="cx-big-u">{unitCaption(round)}</span>}
                {fx === 'bull' && <Sparks />}
              </motion.div>
              <motion.div variants={rise}>
                <Chute
                  round={round}
                  value={value}
                  onChange={setValue}
                  onSubmit={lockNumber}
                  locked={locked}
                  needle={needle}
                  revealed={revealed}
                  labelledBy={qid}
                  autoFocus
                />
              </motion.div>
            </>
          ) : (
            <motion.div
              variants={rise}
              className={revealed && score === 100 ? 'cx-choice-wrap is-bull' : 'cx-choice-wrap'}
            >
              <ChoiceButtons
                round={round}
                picked={picked}
                onPick={pick}
                locked={locked}
                revealed={revealed}
                labelledBy={qid}
                autoFocus
              />
              {fx === 'bull' && <Sparks />}
            </motion.div>
          )}

          {revealed && (
            <Reveal
              round={round}
              index={index}
              guess={round.kind === 'number' ? value : picked}
              score={score}
              hist={hist}
            />
          )}
          {fx === 'bull' && <span className="cx-flash" aria-hidden="true" />}
        </motion.section>
      </div>

      <div className="cx-cta">
        {round.kind === 'number' && !revealed && (
          <PixelButton tone="red" size="big" wide onClick={lockNumber} disabled={locked} sound={null}>
            Chutar ▶
          </PixelButton>
        )}
        {round.kind === 'choice' && !revealed && (
          <p className="cx-cta-hint" aria-hidden="true">
            {locked ? '...' : 'Toque numa opção'}
          </p>
        )}
        {revealed && (
          <motion.div
            className="cx-next"
            initial={{ opacity: 0, y: 6 }}
            animate={nextOn ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <PixelButton
              ref={nextRef}
              tone={last ? 'gold' : 'red'}
              size="big"
              wide
              disabled={!nextOn}
              sound="select"
              onClick={onNext}
            >
              {last ? 'Ver resultado ▶' : 'Próxima ▶'}
            </PixelButton>
          </motion.div>
        )}
      </div>
    </>
  )
}

/** Partículas douradas do 🎯: 12 pixels saindo do número, 520 ms. Só com movimento liberado. */
function Sparks() {
  if (prefersReduced()) return null
  return (
    <span className="cx-sparks" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.3
        const d = 46 + (i % 3) * 18
        return (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: partículas fixas
            key={i}
            style={
              {
                '--dx': `${Math.round(Math.cos(a) * d)}px`,
                '--dy': `${Math.round(Math.sin(a) * d * 0.7)}px`,
                animationDelay: `${(i % 4) * 20}ms`,
              } as CSSProperties
            }
          />
        )
      })}
    </span>
  )
}
