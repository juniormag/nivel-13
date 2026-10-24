// Diálogo modal pixel: prende o foco, fecha com Esc ou tocando fora, devolve o foco ao sair.
// Abre em 180 ms e fecha em 120 ms (fechar mais rápido que abrir).
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { sfx } from '../audio/audio'
import { fade, pop } from './motion'
import { Tap } from './PixelButton'
import type { FrameTone } from './PixelFrame'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function useFocusTrap(open: boolean, onClose: () => void) {
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const back = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      const el = box.current
      if (!el) return
      const first =
        el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? el).focus({ preventScroll: true })
    }, 20)
    const onKey = (e: KeyboardEvent) => {
      const el = box.current
      if (!el) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        sfx('back')
        close.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (!list.length) {
        e.preventDefault()
        return
      }
      const first = list[0] as HTMLElement
      const last = list[list.length - 1] as HTMLElement
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      if (back && document.contains(back)) back.focus({ preventScroll: true })
    }
  }, [open])
  return box
}

export function Dialog({
  open,
  onClose,
  title,
  hideTitle,
  tone = 'stone',
  wide,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  hideTitle?: boolean
  tone?: FrameTone
  wide?: boolean
  children: ReactNode
  className?: string
}) {
  const box = useFocusTrap(open, onClose)
  const id = useId()
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="dlg-scrim"
          variants={fade}
          initial="hidden"
          animate="show"
          exit="exit"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            className={`dlg pf pf--${tone} pf--lift${wide ? ' dlg--wide' : ''}${className ? ` ${className}` : ''}`}
            variants={pop}
          >
            <h2 id={id} className={hideTitle ? 'sr-only' : 'dlg-title'}>
              {title}
            </h2>
            <Tap className="btn btn--ghost dlg-close" aria-label="Fechar" commit="back" onClick={onClose}>
              ✕
            </Tap>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
