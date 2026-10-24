// Chuta Aí! (VIRAL-DESIGN §2): 5 chutes sobre números reais do Brasil, revelação com fonte, resultado com
// share sem spoiler, Tira-teima (?d=) e Placar do Grupo (?g=). Primeira rodada interativa logo de cara.
import '../../viral/viral.css'
import { useCallback, useEffect, useState } from 'react'
import { playMusic } from '../../audio/audio'
import { total as sumTotal } from '../../lib/score'
import { levelsDone, useSave } from '../../state/save'
import { fmt, useCountUp } from '../../ui/hooks'
import { Tap } from '../../ui/PixelButton'
import { Screen } from '../../ui/Shell'
import { type ChuteStats, ev, pctFromTotals, viralApi } from '../../viral/api'
import { ChuteResult } from '../../viral/ChuteResult'
import { fmtInt, guessBucket } from '../../viral/format'
import { tier } from '../../viral/Reveal'
import { RoundView } from '../../viral/RoundView'
import { roundsFor } from '../../viral/rounds'
import { storeResult, useLanding } from '../../viral/store'
import { go, useNav } from '../nav'

export default function Chuta() {
  const params = useNav((s) => s.params)
  const [first] = useState(() => useLanding.getState().init(params))
  const landing = useLanding((s) => s.landing) ?? first
  const save = useSave()
  const { date, n, duel } = landing
  const rounds = roundsFor(date)
  const stored = save.chute[date]

  const [idx, setIdx] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [guesses, setGuesses] = useState<(number | null)[]>([])
  const [fresh, setFresh] = useState(false)
  const [stats, setStats] = useState<ChuteStats | null>(null)
  const [pct, setPct] = useState<number | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: conta a chegada uma vez
  useEffect(() => {
    playMusic('daily')
    ev('landing', [landing.surface ?? '-', duel ? 'd' : '', landing.group ? 'g' : ''].join(''))
    if (duel) ev('duel_land')
  }, [])

  useEffect(() => {
    let alive = true
    void viralApi.stats(date).then((st) => {
      if (!alive || !st) return
      setStats(st)
      if (stored) setPct((p) => p ?? pctFromTotals(st.totals, sumTotal(stored.s)))
    })
    return () => {
      alive = false
    }
  }, [date, stored])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) go('title')
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const onScored = useCallback(
    (sc: number, g: number | null) => {
      setScores((p) => {
        const next = p.slice()
        next[idx] = sc
        return next
      })
      setGuesses((p) => {
        const next = p.slice()
        next[idx] = g
        return next
      })
    },
    [idx],
  )

  const onNext = () => {
    if (idx < rounds.length - 1) {
      setIdx(idx + 1)
      return
    }
    const s = rounds.map((_, i) => scores[i] ?? 5)
    const g = rounds.map((_, i) => guesses[i] ?? null)
    storeResult(date, s, g)
    setFresh(true)
    const tot = sumTotal(s)
    ev('day_complete', Math.floor(tot / 100) * 100)
    const b = rounds.map((r, i) => guessBucket(r, g[i] ?? null))
    const via =
      duel || landing.group || landing.surface
        ? { s: landing.surface ?? undefined, d: duel?.code ?? duel?.raw, g: landing.group ?? undefined }
        : undefined
    if (duel?.code) void viralApi.respond(duel.code, s)
    void viralApi.chute(date, s, b, via).then((r) => {
      if (r) setPct(r.pct)
      else if (stats) setPct(pctFromTotals(stats.totals, tot))
    })
  }

  const world = levelsDone(save) / 13
  const running = sumTotal(scores.map((v) => v ?? 0))
  const shownTotal = useCountUp(running, { ms: 400 })

  if (stored) {
    return (
      <Screen world={world} className="cx-scr">
        <div className="cx-wrap cx-wrap--result">
          <div className="cx-body cx-body--result">
            <ChuteResult
              landing={landing}
              rounds={rounds}
              s={stored.s}
              guesses={stored.guesses}
              pct={pct}
              fresh={fresh}
            />
          </div>
        </div>
      </Screen>
    )
  }

  const round = rounds[idx]
  return (
    <Screen world={world} className="cx-scr">
      <div className="cx-wrap">
        <header className="cx-hud">
          <Tap
            className="btn btn--ghost cx-close"
            aria-label="Sair do Chuta Aí"
            sound="back"
            onClick={() => go('title')}
          >
            ✕
          </Tap>
          <div className="cx-hud-l">
            <h1 className="cx-title">
              Chuta Aí! <b>#{n}</b>
            </h1>
            <div className="cx-pips" role="img" aria-label={`Rodada ${idx + 1} de ${rounds.length}`}>
              {rounds.map((r, i) => {
                const s = scores[i]
                const cls = s !== undefined ? `is-${tier(s)}` : i === idx ? 'is-now' : ''
                return <i key={r.id} className={cls} />
              })}
            </div>
          </div>
          <div className="cx-hud-r" role="status" aria-label={`${fmt(running)} pontos`}>
            <span>Pontos</span>
            <b aria-hidden="true">{fmt(shownTotal)}</b>
          </div>
        </header>
        {duel && (
          <p className="cx-banner pf pf--red">
            <span aria-hidden="true">▶ </span>
            {duel.name || 'Quem te chamou'} fez {fmtInt(sumTotal(duel.s))}. Sua vez.
          </p>
        )}
        {round ? (
          <RoundView
            key={`${date}-${idx}`}
            round={round}
            index={idx}
            count={rounds.length}
            hist={stats?.hist[idx] ?? null}
            onScored={onScored}
            onNext={onNext}
          />
        ) : (
          <div className="cx-body">
            <p className="cx-empty pf pf--hud">As rodadas de hoje ainda não chegaram. Volte daqui a pouco.</p>
          </div>
        )}
      </div>
    </Screen>
  )
}
