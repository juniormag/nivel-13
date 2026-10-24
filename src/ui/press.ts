// Modelo de toque comum (x-craft.md §2, regra 1): retorno visual, som e vibração no pointer-down;
// a ação acontece no pointer-up dentro do alvo; arrastar mais de 8 px cancela.
// O visual "apertado" vem de [data-pressed] no CSS: desce 1 px lógico e troca o bisel, sem transição.
import { type KeyboardEvent, type MouseEvent, type PointerEvent, useRef, useState } from 'react'
import { type Sfx, sfx } from '../audio/audio'
import { type Haptic, haptic } from './prefs'

const SLOP = 8

export interface PressOpts {
  sound?: Sfx | null
  vibe?: Haptic | null
  disabled?: boolean
}

export function usePress<E extends HTMLElement>(
  onCommit: ((e: MouseEvent<E>) => void) | undefined,
  opts: PressOpts = {},
) {
  const { sound = 'tap', vibe = 'confirm', disabled } = opts
  const [pressed, setPressed] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const cancelled = useRef(false)

  const feedback = () => {
    if (sound) sfx(sound)
    if (vibe) haptic(vibe)
  }

  return {
    'data-pressed': pressed ? '' : undefined,
    onPointerDown: (e: PointerEvent<E>) => {
      if (disabled || e.button > 0) return
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      cancelled.current = false
      setPressed(true)
      feedback()
    },
    onPointerMove: (e: PointerEvent<E>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId || cancelled.current) return
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP) {
        cancelled.current = true
        setPressed(false)
      }
    },
    onPointerUp: () => {
      start.current = null
      setPressed(false)
    },
    onPointerCancel: () => {
      start.current = null
      cancelled.current = true
      setPressed(false)
    },
    onPointerLeave: () => {
      if (start.current) cancelled.current = true
      start.current = null
      setPressed(false)
    },
    onKeyDown: (e: KeyboardEvent<E>) => {
      if (disabled || e.repeat) return
      if (e.key === 'Enter' || e.key === ' ') {
        cancelled.current = false
        setPressed(true)
        feedback()
      }
    },
    onKeyUp: () => setPressed(false),
    onClick: (e: MouseEvent<E>) => {
      if (cancelled.current) {
        cancelled.current = false
        e.preventDefault()
        return
      }
      if (disabled) return
      onCommit?.(e)
    },
  }
}
