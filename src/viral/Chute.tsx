// Slider do chute: régua pixel segmentada, polegar de 48 px, botões −/+ de 48 px com repetição ao segurar,
// setas/PageUp/PageDown/Home/End no teclado e aria-valuetext com unidade. Depois do "Chutar", a mesma régua
// mostra a agulha da resposta (varredura feita por quem chama) e a faixa da nota cheia.
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import { sfx } from '../audio/audio'
import { haptic } from '../ui/prefs'
import { fmtValue, posToValue, stepValue, valueText, valueToPos } from './format'
import type { NumberRound } from './rounds'

const SEGMENTS = 10

export function Chute({
  round,
  value,
  onChange,
  onSubmit,
  locked,
  needle,
  revealed,
  labelledBy,
  autoFocus,
}: {
  round: NumberRound
  value: number
  onChange: (v: number) => void
  onSubmit: () => void
  locked: boolean
  /** posição 0..1 da agulha da resposta durante a varredura e na revelação */
  needle: number | null
  revealed: boolean
  labelledBy: string
  autoFocus?: boolean
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<number | null>(null)
  const [touched, setTouched] = useState(false)
  const [hint, setHint] = useState(false)
  const lastSeg = useRef(-1)
  const pos = valueToPos(round, value)

  // polegar fantasma: balança uma vez se ninguém tocou em 2 s (VIRAL-DESIGN §2.3)
  useEffect(() => {
    if (touched || locked) return
    const t = window.setTimeout(() => setHint(true), 2000)
    return () => clearTimeout(t)
  }, [touched, locked])

  useEffect(() => {
    if (autoFocus && matchMedia('(hover: hover) and (pointer: fine)').matches) sliderRef.current?.focus()
  }, [autoFocus])

  const set = (v: number) => {
    if (locked || v === value) return
    const seg = Math.floor(valueToPos(round, v) * SEGMENTS)
    if (seg !== lastSeg.current) {
      lastSeg.current = seg
      sfx('select', { volume: 0.45, pitch: seg, x: valueToPos(round, v) })
    }
    onChange(v)
  }

  const fromPointer = (clientX: number) => {
    const el = railRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    set(posToValue(round, (clientX - r.left) / Math.max(1, r.width)))
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (locked || e.button > 0) return
    setTouched(true)
    setHint(false)
    dragging.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    haptic('move')
    fromPointer(e.clientX)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current !== e.pointerId) return
    fromPointer(e.clientX)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === e.pointerId) dragging.current = null
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = stepValue(round, value, 1, e.shiftKey)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = stepValue(round, value, -1, e.shiftKey)
    else if (e.key === 'PageUp') next = stepValue(round, value, 1, true)
    else if (e.key === 'PageDown') next = stepValue(round, value, -1, true)
    else if (e.key === 'Home') next = round.min
    else if (e.key === 'End') next = round.max
    else if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
      return
    }
    if (next === null) return
    e.preventDefault()
    setTouched(true)
    setHint(false)
    set(next)
  }

  const tolBand = (() => {
    if (!revealed) return null
    const a = round.scale === 'log' ? round.answer / round.tol : round.answer - round.tol
    const b = round.scale === 'log' ? round.answer * round.tol : round.answer + round.tol
    const l = valueToPos(round, a)
    const r = valueToPos(round, b)
    return { left: `${l * 100}%`, width: `${Math.max(0.6, (r - l) * 100)}%` }
  })()

  return (
    <div className={`cx-chute${locked ? ' is-locked' : ''}`}>
      <div className="cx-slide-row">
        <Stepper dir={-1} round={round} value={value} onStep={set} disabled={locked} onUse={() => setTouched(true)} />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a área de toque estende o slider (alvo de 48 px) */}
        <div
          className="cx-rail-hit"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div
            ref={(el) => {
              sliderRef.current = el
              railRef.current = el
            }}
            className="cx-rail"
            role="slider"
            tabIndex={locked ? -1 : 0}
            aria-labelledby={labelledBy}
            aria-valuemin={round.min}
            aria-valuemax={round.max}
            aria-valuenow={value}
            aria-valuetext={valueText(round, value)}
            aria-disabled={locked || undefined}
            onKeyDown={onKey}
          >
            <div className="cx-segs" aria-hidden="true">
              {Array.from({ length: SEGMENTS }, (_, i) => {
                const fill = Math.max(0, Math.min(1, pos * SEGMENTS - i))
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: segmentos fixos da régua
                  <i key={i}>
                    <b style={{ width: `${fill * 100}%` }} />
                  </i>
                )
              })}
            </div>
            {tolBand && <span className="cx-tol" style={tolBand} aria-hidden="true" />}
            <span
              className={`cx-thumb${hint && !touched ? ' is-hint' : ''}`}
              style={{ left: `${pos * 100}%` }}
              aria-hidden="true"
            />
            {needle !== null && (
              <span className={`cx-needle${revealed ? ' is-done' : ''}`} style={{ left: `${needle * 100}%` }} aria-hidden="true">
                <em>REAL</em>
              </span>
            )}
          </div>
        </div>
        <Stepper dir={1} round={round} value={value} onStep={set} disabled={locked} onUse={() => setTouched(true)} />
      </div>
      <div className="cx-scale" aria-hidden="true">
        <span>{fmtValue(round, round.min)}</span>
        <span>{fmtValue(round, round.max)}</span>
      </div>
    </div>
  )
}

/** −/+ de 48 px: passo no pointer-down, repete depois de 380 ms segurando. */
function Stepper({
  dir,
  round,
  value,
  onStep,
  disabled,
  onUse,
}: {
  dir: 1 | -1
  round: NumberRound
  value: number
  onStep: (v: number) => void
  disabled: boolean
  onUse: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const timer = useRef(0)
  const cur = useRef(value)
  cur.current = value
  const stop = () => {
    clearTimeout(timer.current)
    clearInterval(timer.current)
    setPressed(false)
  }
  useEffect(() => stop, [])
  const once = () => {
    const v = stepValue(round, cur.current, dir)
    cur.current = v
    onStep(v)
  }
  return (
    <button
      type="button"
      className="cx-step"
      aria-label={dir > 0 ? 'Aumentar' : 'Diminuir'}
      tabIndex={-1}
      disabled={disabled}
      data-pressed={pressed ? '' : undefined}
      onPointerDown={(e) => {
        if (disabled || e.button > 0) return
        setPressed(true)
        onUse()
        haptic('move')
        once()
        timer.current = window.setTimeout(() => {
          timer.current = window.setInterval(once, 70)
        }, 380)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(e) => {
        // teclado (detail 0) ou leitor de tela: um passo por clique
        if (e.detail === 0) once()
      }}
    >
      <span aria-hidden="true">{dir > 0 ? '+' : '−'}</span>
    </button>
  )
}
