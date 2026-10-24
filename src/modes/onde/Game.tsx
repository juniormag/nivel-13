// Partida do Onde Foi?: pista no topo, mapa no meio, Confirmar na zona do polegar, revelação com a linha,
// a distância, os pontos e o fato. 6 pinos alternando avanço e caso, cerca de 60 s. Semente do dia ou ?o=.
import './onde.css'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { hitstop, playMusic, sfx } from '../../audio/audio'
import { fmt } from '../../ui/hooks'
import { prefersReduced } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { haptic } from '../../ui/prefs'
import { ev } from '../../viral/api'
import type { Mark } from './draw'
import { type EndRow, EndView } from './EndView'
import { FactReveal } from './FactReveal'
import { type Pt, ufAt, ufInfo, ufNear } from './geo'
import {
  distanceKm,
  fmtKm,
  ondeTotal,
  pickPins,
  pinPoints,
  pinPt,
  randomSeed,
  seedLabel,
  sideLabel,
  weightOf,
} from './logic'
import { LINE_MS, MapBoard, type RevealAnim } from './MapBoard'
import { pinPool } from './pins'
import { getPlay, savePlay } from './store'
import { UfPicker } from './UfPicker'

type Phase = 'guess' | 'reveal' | 'end'

interface Result {
  guess: Pt
  km: number
  s: number
  uf: string | null
}

/** Altura reservada para a carta do fato abaixo do mapa (celular em pé) e para o topo. */
const HUD_H = 56
const CLUE_H = 112
const RESERVE = 276

const readViewport = () => ({ w: window.innerWidth, h: window.innerHeight })

function useViewport() {
  const [vp, setVp] = useState(readViewport)
  useEffect(() => {
    const on = () => setVp(readViewport())
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  return vp
}

/** Escala inteira (CSS px por pixel lógico) e lado L da grade do mapa. */
export function boardSize(w: number, h: number, end = false) {
  const wide = w >= 900 && w > h * 1.1
  let size: number
  if (end) size = wide ? Math.min(h - 200, w - 520) : Math.min(w - 32, Math.round(h * 0.5))
  else if (wide) size = Math.min(h - HUD_H - 40, w - 470 - 64)
  else size = Math.min(w - 16, h - HUD_H - CLUE_H - RESERVE)
  size = Math.max(160, size)
  const S = size >= 640 ? 5 : size >= 450 ? 4 : size >= 270 ? 3 : 2
  return { wide, S, L: Math.floor(size / S) }
}

/** Reabrir uma partida guardada: só pino ainda publicável (se um sair da revisão, some do mapa). */
const pinById = (id: string) => pinPool().find((p) => p.id === id)

export function OndeGame({
  seed,
  vs,
  onHome,
  onAgain,
}: {
  seed: string
  vs: number | null
  onHome: () => void
  onAgain: (seed: string) => void
}) {
  const pins = useMemo(() => pickPins(seed, pinPool()), [seed])
  const [stored] = useState(() => getPlay(seed))
  const [phase, setPhase] = useState<Phase>(stored ? 'end' : 'guess')
  const [fresh, setFresh] = useState(false)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [guess, setGuess] = useState<Pt | null>(null)
  const [pickedUf, setPickedUf] = useState<string | null>(null)
  const [list, setList] = useState(false)
  const [ready, setReady] = useState(false)
  const [reveal, setReveal] = useState<RevealAnim | null>(null)
  const timers = useRef<number[]>([])
  const vp = useViewport()
  const qid = useId()
  const statusId = useId()

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  // biome-ignore lint/correctness/useExhaustiveDependencies: conta a chegada uma vez
  useEffect(() => {
    playMusic('map')
    ev('landing', vs !== null ? 'onde-d' : 'onde')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.share-overlay')) onHome()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onHome])

  const pin = pins[idx]
  const done = results.length
  const running = ondeTotal(results.map((r) => r.s))

  const onGuess = useCallback((p: Pt) => {
    setGuess(p)
    setPickedUf(null)
  }, [])

  const pickUf = (uf: string) => {
    const u = ufInfo(uf)
    if (!u) return
    setGuess(u.center)
    setPickedUf(uf)
    setList(false)
  }

  const confirm = () => {
    if (phase !== 'guess' || !pin || !guess) return
    const target = pinPt(pin)
    const km = distanceKm(guess, target)
    const s = pinPoints(km)
    setResults((r) => [...r, { guess, km, s, uf: pickedUf }])
    setPhase('reveal')
    setReady(false)
    setList(false)
    setReveal({ key: `${seed}:${idx}`, guess, target, side: pin.side })
    sfx('confirm')
    haptic('confirm')
    ev('round_lock', `onde:${idx}`)
    const reduced = prefersReduced()
    if (!reduced) {
      for (let k = 0; k < 8; k++)
        timers.current.push(
          window.setTimeout(() => sfx('score', { pitch: k * 2, volume: 0.5 }), (LINE_MS / 8) * k),
        )
    }
    const land = reduced ? 0 : LINE_MS
    timers.current.push(
      window.setTimeout(() => {
        sfx(s >= 90 ? 'perfect' : s >= 50 ? 'good' : 'stamp', { volume: 0.8 })
        if (!reduced) hitstop(60)
        haptic(s >= 70 ? 'success' : 'confirm')
      }, land),
    )
    timers.current.push(window.setTimeout(() => setReady(true), land + (reduced ? 150 : 350)))
  }

  const next = () => {
    if (phase !== 'reveal') return
    clearTimers()
    if (idx < pins.length - 1) {
      setIdx(idx + 1)
      setGuess(null)
      setPickedUf(null)
      setReveal(null)
      setReady(false)
      setPhase('guess')
      return
    }
    savePlay(seed, {
      ids: pins.map((p) => p.id),
      s: results.map((r) => r.s),
      km: results.map((r) => Math.round(r.km)),
      g: results.map((r) => [r.guess.lon, r.guess.lat]),
    })
    const tot = ondeTotal(results.map((r) => r.s))
    ev('day_complete', `onde:${Math.floor(tot / 100) * 100}`)
    setFresh(true)
    setReveal(null)
    setPhase('end')
  }

  // ---------------------------------------------------------------- fim
  if (phase === 'end') {
    const src = stored && !fresh ? stored : null
    const rows: EndRow[] = src
      ? src.ids.flatMap((id, i) => {
          const p = pinById(id)
          const g = src.g[i]
          return p && g
            ? [{ pin: p, guess: { lon: g[0], lat: g[1] }, km: src.km[i] ?? 0, s: src.s[i] ?? 5 }]
            : []
        })
      : results.flatMap((r, i) => {
          const p = pins[i]
          return p ? [{ pin: p, guess: r.guess, km: r.km, s: r.s }] : []
        })
    const b = boardSize(vp.w, vp.h, true)
    return (
      <div className="onde-wrap onde-wrap--end">
        <header className="onde-hud onde-hud--end">
          <Tap
            className="btn btn--ghost onde-close"
            aria-label="Sair do Onde Foi?"
            commit="back"
            onClick={onHome}
          >
            ✕
          </Tap>
        </header>
        <EndView
          seed={seed}
          rows={rows}
          vs={vs}
          fresh={fresh}
          L={b.L}
          S={b.S}
          onAgain={() => onAgain(randomSeed())}
          onHome={onHome}
        />
      </div>
    )
  }

  // ---------------------------------------------------------------- partida
  const b = boardSize(vp.w, vp.h)
  const marks: Mark[] = results
    .slice(0, phase === 'reveal' ? done - 1 : done)
    .map((_, i) => ({ side: pins[i]?.side ?? 'avanco', target: pins[i] ? pinPt(pins[i]) : null, past: true }))
  const cur = phase === 'reveal' ? results[done - 1] : undefined
  const ufHere = guess ? (pickedUf ?? ufNear(guess)) : null
  const ufName = ufHere ? (ufInfo(ufHere)?.name ?? ufHere) : null

  if (!pin) {
    return (
      <div className="onde-wrap">
        <header className="onde-hud">
          <h1 className="onde-title">Onde Foi?</h1>
          <Tap
            className="btn btn--ghost onde-close"
            aria-label="Sair do Onde Foi?"
            commit="back"
            onClick={onHome}
          >
            ✕
          </Tap>
        </header>
        <p className="onde-empty pf pf--hud">Os pinos de hoje ainda não chegaram. Volte daqui a pouco.</p>
      </div>
    )
  }

  return (
    <div className={`onde-wrap${b.wide ? ' is-wide' : ''}`}>
      <header className="onde-hud">
        <div className="onde-hud-l">
          <h1 className="onde-title">
            Onde Foi? <b>{seedLabel(seed)}</b>
          </h1>
          <div className="onde-pips" role="img" aria-label={`Pino ${idx + 1} de ${pins.length}`}>
            {pins.map((p, i) => (
              <i
                key={p.id}
                className={`is-${p.side}${i < done ? ' is-done' : ''}${i === idx && phase === 'guess' ? ' is-now' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="onde-hud-r" role="status" aria-label={`${running} pontos`}>
          <span>Pontos</span>
          <b aria-hidden="true">{fmt(running)}</b>
        </div>
        <Tap
          className="btn btn--ghost onde-close"
          aria-label="Sair do Onde Foi?"
          commit="back"
          onClick={onHome}
        >
          ✕
        </Tap>
      </header>

      <div className="onde-play">
        <section className={`onde-clue pf pf--hud pf--bracket is-${pin.side}`} aria-labelledby={qid}>
          <div className="onde-clue-head">
            <span className={`onde-side is-${pin.side}`}>
              <i aria-hidden="true" />
              {sideLabel(pin.side)}
            </span>
            <span className="onde-step">
              {idx + 1}/{pins.length}
              {weightOf(idx) > 1 && <em> · vale ×{weightOf(idx)}</em>}
            </span>
          </div>
          <h2 id={qid} className="onde-q">
            {pin.clue}
          </h2>
        </section>

        <div className="onde-stage" style={{ minHeight: b.L * b.S }}>
          <MapBoard
            L={b.L}
            S={b.S}
            marks={marks}
            guess={phase === 'guess' ? guess : null}
            highlight={phase === 'guess' ? pickedUf : (cur?.uf ?? null)}
            interactive={phase === 'guess'}
            reveal={reveal}
            onGuess={onGuess}
            onConfirm={confirm}
            label="Mapa do Brasil. Toque e arraste para pôr o alfinete onde foi. No teclado, as setas movem o alfinete e Enter confirma."
            describedBy={statusId}
          />
          <p id={statusId} className="sr-only" aria-live="polite">
            {phase === 'guess' ? (ufName ? `Alfinete: ${ufName}` : 'Nenhum alfinete ainda') : ''}
          </p>
          {list && phase === 'guess' && (
            <UfPicker value={pickedUf} onPick={pickUf} onClose={() => setList(false)} />
          )}
        </div>

        <div className="onde-dock">
          {phase === 'guess' && (
            <>
              <ol className="onde-trail" aria-label="Seus pinos até agora">
                {pins.map((p, i) => {
                  const r = results[i]
                  return (
                    <li
                      key={p.id}
                      className={`is-${p.side}${r ? ' is-done' : ''}${i === idx ? ' is-now' : ''}`}
                    >
                      <i className="onde-sw" aria-hidden="true" />
                      {r ? fmtKm(r.km) : i === idx ? 'agora' : `${i + 1}`}
                      <span className="sr-only">{` ${sideLabel(p.side)}`}</span>
                    </li>
                  )
                })}
              </ol>
              <div className="onde-dock-foot">
                <p className="onde-hint">
                  {vs !== null && idx === 0 && !guess
                    ? `Quem te chamou fez ${fmt(vs)}. Sua vez.`
                    : guess
                      ? `📍 ${pickedUf || ufAt(guess) ? ufName : `perto de ${ufName}`} · arraste para ajustar`
                      : 'Toque no mapa onde aconteceu'}
                </p>
                <div className="onde-dock-row">
                  <Tap
                    className="btn onde-listbtn"
                    aria-expanded={list}
                    onClick={() => setList((v) => !v)}
                    sound="select"
                  >
                    {list ? 'Mapa' : 'Lista'}
                    <span className="sr-only"> de estados</span>
                  </Tap>
                  <PixelButton tone="red" size="big" wide disabled={!guess} onClick={confirm} sound={null}>
                    Confirmar ▶
                  </PixelButton>
                </div>
              </div>
            </>
          )}
          {phase === 'reveal' && cur && (
            <FactReveal
              key={pin.id}
              pin={pin}
              km={cur.km}
              points={cur.s}
              weight={weightOf(idx)}
              last={idx === pins.length - 1}
              ready={ready}
              onNext={next}
              viaUf={cur.uf ? (ufInfo(cur.uf)?.name ?? cur.uf) : null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
