// Nível 13: o monumento se completa, a coroa desce e a conquista vira card.
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { playMusic, sfx } from '../../audio/audio'
import { api } from '../../lib/api'
import { ShareSheet, shareText } from '../../share/ShareSheet'
import { getSave, useSave, XP_MAX, xpTotal } from '../../state/save'
import { rise, stagger } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { Legal, PortraitFrame, Screen } from '../../ui/Shell'
import { XPBar } from '../../ui/XPBar'
import { go, useNav } from '../nav'

export default function Final() {
  const save = useSave()
  const [celebrate, setCelebrate] = useState(false)
  const [share, setShare] = useState(false)
  // "Seguir com 1 estrela" depois de perder o chefão também chega aqui: aí não dá para dizer que derrubou
  const lost = !!useNav((s) => s.params.lost) || (save.stars[12] ?? 0) <= 1

  useEffect(() => {
    playMusic('title')
    if (!getSave().finishedAt) {
      getSave().patch({ finishedAt: Date.now() })
      void api.complete()
    }
    const t = window.setTimeout(() => {
      setCelebrate(true)
      sfx('fanfare')
    }, 1400)
    // a coroa pousa cerca de 1,2 s depois da celebração começar (WorldStage)
    const c = window.setTimeout(() => sfx('crown'), 2600)
    return () => {
      clearTimeout(t)
      clearTimeout(c)
    }
  }, [])

  return (
    <Screen world={1} celebrate={celebrate} dim={false} className="title">
      <div className="t-vignette" aria-hidden="true" />
      <div className="fin">
        <motion.header className="fin-head" variants={stagger(0.12, 0.2)} initial="hidden" animate="show">
          <motion.div className="eyebrow" variants={rise}>
            Você chegou ao
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { delay: 0.35, duration: 0.22, ease: (t: number) => Math.floor(t * 5) / 5 },
            }}
          >
            NÍVEL 13
          </motion.h1>
        </motion.header>

        <motion.section
          className="fin-card pf pf--gold pf--lift"
          aria-label="Conquista"
          variants={stagger(0.06, 1.6)}
          initial="hidden"
          animate="show"
        >
          <motion.div className="fin-player" variants={rise}>
            <PortraitFrame avatar={save.avatar} />
            <div className="res-xp">
              <XPBar value={xpTotal(save)} max={XP_MAX} />
            </div>
          </motion.div>
          <motion.p variants={rise}>
            {lost
              ? 'Você passou pelas 13 fases. A Grande Fake ainda está de pé: a revanche fica aqui embaixo.'
              : 'Você derrubou a Grande Fake com fatos.'}{' '}
            Agora a fase mais importante é fora do jogo: levar isso para quem você conhece e votar.
          </motion.p>
          <motion.div variants={rise}>
            <PixelButton tone="red" wide size="big" onClick={() => setShare(true)}>
              Compartilhar minha conquista
            </PixelButton>
          </motion.div>
          <motion.div className="fin-row" variants={rise}>
            <PixelButton
              onClick={() =>
                void shareText('Joguei o Nível 13: 13 fases curtas, tudo com fonte. Duvido você terminar:')
              }
            >
              Desafiar no WhatsApp
            </PixelButton>
            <PixelButton tone="gold" onClick={() => go('votar')}>
              Entrar no movimento
            </PixelButton>
          </motion.div>
          {lost && (
            <motion.div variants={rise}>
              <PixelButton wide onClick={() => go('play', { level: 13 })}>
                Revanche com a Grande Fake ▶
              </PixelButton>
            </motion.div>
          )}
          <motion.div variants={rise}>
            <PixelButton tone="ghost" commit="back" wide onClick={() => go('title')}>
              Início
            </PixelButton>
          </motion.div>
        </motion.section>
        <Legal />
      </div>
      {share && <ShareSheet moment={{ kind: 'nivel13' }} onClose={() => setShare(false)} />}
    </Screen>
  )
}
