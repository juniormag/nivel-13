// Folha das telas sociais (Papo, Plano, Grupo, Duelo): mundo ao fundo, moldura fina clara, Esc volta.
import { motion } from 'motion/react'
import { type ReactNode, useEffect } from 'react'
import { levelsDone, useSave } from '../state/save'
import { pageIn, stagger } from '../ui/motion'
import { Tap } from '../ui/PixelButton'
import { Legal, Screen } from '../ui/Shell'

export function ViralPage({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const save = useSave()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <Screen world={levelsDone(save) / 13} className="cx-scr">
      <div className="cx-wrap">
        <div className="cx-body cx-body--result">
          <motion.section
            className="cx-page pf pf--hud pf--bracket pf--lift"
            aria-labelledby="cx-page-h"
            variants={pageIn}
            initial="hidden"
            animate="show"
          >
            <header className="cx-page-head">
              <div className="eyebrow">{eyebrow}</div>
              <h1 id="cx-page-h">{title}</h1>
              <Tap className="btn btn--ghost cx-close" aria-label="Voltar" sound="back" onClick={onClose}>
                ✕
              </Tap>
            </header>
            <motion.div
              className="cx-page-body"
              variants={stagger(0.04, 0.06)}
              initial="hidden"
              animate="show"
            >
              {children}
            </motion.div>
            <Legal className="cx-legal" />
          </motion.section>
        </div>
      </div>
    </Screen>
  )
}
