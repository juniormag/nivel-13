// Coleção de cartas. "Modo leitura" mostra todas, para quem prefere ler a jogar.
import { motion } from 'motion/react'
import { useState } from 'react'
import { FACTS, type Fact } from '../../content/facts'
import { levelsDone, useSave } from '../../state/save'
import { Dialog } from '../../ui/Dialog'
import { FactCard, factArt } from '../../ui/FactCard'
import { rise, stagger } from '../../ui/motion'
import { Tap } from '../../ui/PixelButton'
import { PixelIcon } from '../../ui/PixelIcon'
import { Page, Screen } from '../../ui/Shell'
import { XPBar } from '../../ui/XPBar'

export default function Colecao() {
  const save = useSave()
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<Fact | null>(null)
  const have = save.cards.length

  return (
    <Screen world={levelsDone(save) / 13} className="scr--page">
      <Page eyebrow={`${have} de ${FACTS.length} cartas`} title="Coleção de fatos" wide>
        <motion.div className="col-progress" variants={rise}>
          <div className="res-xp">
            <XPBar value={have} max={FACTS.length} label="Cartas conquistadas" showText={false} />
          </div>
          <Tap className="switch chip" role="switch" aria-checked={all} onClick={() => setAll((v) => !v)}>
            <span className="knob" aria-hidden="true" />
            Modo leitura
          </Tap>
        </motion.div>
        <motion.ul className="cards" variants={stagger(0.03, 0.1)} initial="hidden" animate="show">
          {FACTS.map((f) => {
            const show = all || save.cards.includes(f.id)
            return (
              <motion.li key={f.id} variants={rise}>
                <Tap
                  className="ccard"
                  disabled={!show}
                  aria-label={show ? `Carta: ${f.title}` : 'Carta bloqueada'}
                  onClick={() => setOpen(f)}
                >
                  <PixelIcon src={factArt(f)} />
                  <span>{show ? f.title : '???'}</span>
                  <small>{f.kicker.split(' · ')[0] ?? ''}</small>
                </Tap>
              </motion.li>
            )
          })}
        </motion.ul>
      </Page>
      <Dialog
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.title ?? 'Carta'}
        hideTitle
        className="dlg--card"
      >
        {open && <FactCard fact={open} />}
      </Dialog>
    </Screen>
  )
}
