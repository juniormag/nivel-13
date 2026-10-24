// Escolha do parente: 5 cartas com retrato, nome e a preocupação em 1 linha; quem já foi convencido ganha selo.
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { sfx } from '../../audio/audio'
import type { Parente } from '../../content/tio'
import { rise, stagger } from '../../ui/motion'
import { Tap } from '../../ui/PixelButton'
import { Legal } from '../../ui/Shell'
import { Face } from './Face'
import { useTio } from './store'

export function Picker({
  parentes,
  onPick,
  onClose,
  fixture,
}: {
  parentes: Parente[]
  onPick: (p: Parente) => void
  onClose: () => void
  fixture?: boolean
}) {
  const convinced = useTio((s) => s.convinced)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        sfx('back')
        onClose()
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [onClose])
  return (
    <section className="tio-pick pf pf--hud pf--bracket pf--lift" aria-labelledby="tio-pick-h">
      <header className="tio-pick-head">
        <div className="eyebrow">Convence o Tio</div>
        <h1 id="tio-pick-h">Quem você vai convencer?</h1>
        <p>Seu parente mandou isso no grupo. Responde direito e ele muda de ideia.</p>
        <Tap
          className="btn btn--ghost tio-pick-close"
          aria-label="Voltar ao início"
          commit="back"
          onClick={onClose}
        >
          ✕
        </Tap>
      </header>
      {fixture && <p className="tio-fixture-note">Conteúdo de exemplo (só em desenvolvimento)</p>}
      {parentes.length === 0 ? (
        <p className="tio-empty">As conversas estão sendo checadas. Volte daqui a pouco.</p>
      ) : (
        <motion.ul className="tio-pick-list" variants={stagger(0.04, 0.05)} initial="hidden" animate="show">
          {parentes.map((p) => {
            const done = convinced.includes(p.id)
            return (
              <motion.li key={p.id} variants={rise}>
                <Tap
                  className={`tio-pcard pf pf--stone${done ? ' is-done' : ''}`}
                  aria-label={`${p.name}: ${p.worry}${done ? '. Já convencido' : ''}`}
                  onClick={() => onPick(p)}
                >
                  <Face id={p.id} expr={done ? 'pensando' : 'neutro'} className="tio-pcard-face" />
                  <span className="tio-pcard-txt">
                    <b>
                      {p.name}
                      {done && (
                        <span className="tio-seal" aria-hidden="true">
                          Convencido
                        </span>
                      )}
                    </b>
                    <span>{p.worry}</span>
                  </span>
                  <span className="tio-pcard-go" aria-hidden="true">
                    ▶
                  </span>
                </Tap>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
      <Legal className="tio-legal" />
    </section>
  )
}
