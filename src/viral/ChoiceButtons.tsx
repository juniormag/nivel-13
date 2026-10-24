// Opções grandes (Fato ou Fake e escolhas de 2 a 4). Um toque escolhe e trava: o retorno vem no
// pointer-down (usePress) e a escolha no soltar. Teclado: setas movem o foco, 1 a 4 escolhem direto.
import { useEffect, useRef } from 'react'
import { Tap } from '../ui/PixelButton'
import type { ChoiceRound } from './rounds'

export function ChoiceButtons({
  round,
  picked,
  onPick,
  locked,
  revealed,
  labelledBy,
  autoFocus,
}: {
  round: ChoiceRound
  picked: number | null
  onPick: (i: number) => void
  locked: boolean
  revealed: boolean
  labelledBy: string
  autoFocus?: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && matchMedia('(hover: hover) and (pointer: fine)').matches) refs.current[0]?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key)
      if (k >= 1 && k <= round.options.length && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onPick(k - 1)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [locked, onPick, round.options.length])

  const move = (i: number) => {
    const n = round.options.length
    refs.current[(i + n) % n]?.focus()
  }

  const isFatoFake = round.options.length === 2 && round.options[0] === 'Fato'
  return (
    <div
      className={`cx-choices cx-choices--${round.options.length}${isFatoFake ? ' is-ff' : ''}`}
      role="group"
      aria-labelledby={labelledBy}
    >
      {round.options.map((o, i) => {
        const state = revealed
          ? i === round.correct
            ? ' is-right'
            : i === picked
              ? ' is-miss'
              : ' is-off'
          : picked === i
            ? ' is-picked'
            : ''
        return (
          <Tap
            key={o}
            ref={(el) => {
              refs.current[i] = el
            }}
            className={`cx-opt${state}`}
            aria-pressed={picked === i}
            aria-disabled={locked || undefined}
            sound={locked ? null : 'select'}
            vibe={locked ? null : 'confirm'}
            onClick={() => {
              if (!locked) onPick(i)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i + 1)
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i - 1)
              else return
              e.preventDefault()
            }}
          >
            <span className="cx-opt-key" aria-hidden="true">
              {i + 1}
            </span>
            <span className="cx-opt-label">{o}</span>
            {revealed && i === round.correct && (
              <span className="cx-opt-mark">
                <span aria-hidden="true">✓</span>
                <span className="sr-only">resposta certa</span>
              </span>
            )}
          </Tap>
        )
      })}
    </div>
  )
}
