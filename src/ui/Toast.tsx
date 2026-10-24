// Aviso curto no alto da tela. `toast('texto')` funciona de qualquer lugar; o host se monta sozinho.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { create } from 'zustand'
import { steps } from './motion'

interface ToastState {
  items: { id: number; text: string; tone: 'stone' | 'gold' | 'red' }[]
}
const useToasts = create<ToastState>(() => ({ items: [] }))
let seq = 0
let mounted = false

function ToastHost() {
  const items = useToasts((s) => s.items)
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <ToastItem key={t.id} id={t.id} text={t.text} tone={t.tone} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ id, text, tone }: { id: number; text: string; tone: string }) {
  useEffect(() => {
    const t = window.setTimeout(
      () => useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      2600,
    )
    return () => clearTimeout(t)
  }, [id])
  return (
    <motion.div
      className={`toast pf pf--${tone} pf--lift`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: steps(4) } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.1, ease: steps(2) } }}
    >
      {text}
    </motion.div>
  )
}

export function toast(text: string, tone: 'stone' | 'gold' | 'red' = 'stone') {
  if (!mounted) {
    mounted = true
    const el = document.createElement('div')
    el.className = 'toast-root'
    document.body.append(el)
    createRoot(el).render(<ToastHost />)
  }
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id: ++seq, text, tone }] }))
}
