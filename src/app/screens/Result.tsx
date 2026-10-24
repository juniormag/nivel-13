// Depois de cada fase: estrelas, XP subindo e a carta (ou cartas) de fato conquistada.
// Momentos de compartilhar: 3 estrelas e, na fase 3, a economia do IR.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { playMusic, stinger } from '../../audio/audio'
import { factById } from '../../content/facts'
import { LEVELS } from '../../content/levels'
import { ShareSheet } from '../../share/ShareSheet'
import type { Moment } from '../../share/types'
import { levelsDone, useSave, XP_MAX, xpTotal } from '../../state/save'
import { FactCard } from '../../ui/FactCard'
import { fmt } from '../../ui/hooks'
import { pop, rise, stagger } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { Screen, Stars } from '../../ui/Shell'
import { XPBar } from '../../ui/XPBar'
import { go, useNav } from '../nav'

// src/games/ir.ts é do gameplay-engineer; se ainda não existir, o card do IR só não aparece.
type IrMod = { economiaIR?: (salario: number) => { ano: number } }
const irLoader = import.meta.glob<IrMod>('../../games/ir.ts')['../../games/ir.ts']

function useEconomiaAno(monthly: number | null, enabled: boolean) {
  const [ano, setAno] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled || monthly === null || !irLoader) return
    let alive = true
    irLoader()
      .then((m) => {
        if (alive && m.economiaIR) setAno(m.economiaIR(monthly).ano)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [monthly, enabled])
  return ano
}

const cardKey = (lv: { n: number } | undefined, i: number) => (lv ? `${lv.n}:${i}` : '')

export default function Result() {
  const params = useNav((s) => s.params)
  const n = Number(params.level ?? 1)
  const lv = LEVELS[n - 1]
  const save = useSave()
  const [i, setI] = useState(0)
  const [share, setShare] = useState<Moment | null>(null)
  const next = useRef<HTMLButtonElement>(null)
  const ano = useEconomiaAno(save.irMonthly, lv?.kind === 'ir')

  useEffect(() => {
    if (!lv) {
      go('map')
      return
    }
    playMusic('victory')
    stinger('win')
  }, [lv])
  // a cada carta, o foco vai para a próxima ação
  const card = cardKey(lv, i)
  useEffect(() => {
    if (!card) return
    const t = window.setTimeout(() => next.current?.focus({ preventScroll: true }), 260)
    return () => clearTimeout(t)
  }, [card])

  if (!lv) return null
  const facts = lv.facts.map(factById).filter((f) => !!f)
  const f = facts[i]
  const isLast = i >= facts.length - 1
  const stars = save.stars[n - 1] ?? 0
  const score = save.best[n - 1] ?? 0
  const done = levelsDone(save)

  return (
    <Screen world={done / 13} className="scr--page">
      <motion.div className="res" variants={stagger(0.06, 0.05)} initial="hidden" animate="show">
        <motion.header className="res-head" variants={rise}>
          <div className="eyebrow">
            Fase {n} concluída · {done}/13
          </div>
          <h1>{lv.title}</h1>
          <Stars n={stars} reveal />
          <div className="res-xp">
            <XPBar value={xpTotal(save)} max={XP_MAX} label="Experiência total" sound />
          </div>
        </motion.header>

        {facts.length > 1 && (
          <motion.div className="res-pager" variants={rise} aria-live="polite">
            Carta {i + 1} de {facts.length}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {f && (
            <motion.div
              key={f.id}
              variants={pop}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ width: '100%' }}
            >
              <FactCard fact={f} />
            </motion.div>
          )}
        </AnimatePresence>

        {(stars === 3 || (ano !== null && ano > 0)) && (
          <motion.div className="res-share pf pf--red" variants={rise}>
            {ano !== null && ano > 0 ? (
              <p>
                Sua conta: a isenção deixa <b>R$ {fmt(Math.round(ano))}</b> por ano no seu bolso.
              </p>
            ) : (
              <p>Três estrelas. Mostre para quem duvida que você chega ao nível 13.</p>
            )}
            {ano !== null && ano > 0 && (
              <PixelButton tone="gold" onClick={() => setShare({ kind: 'ir', perYear: ano })}>
                Compartilhar minha economia
              </PixelButton>
            )}
            {stars === 3 && (
              <PixelButton
                tone={ano ? 'stone' : 'gold'}
                onClick={() => setShare({ kind: 'stars3', level: n, title: lv.title, score })}
              >
                Compartilhar
              </PixelButton>
            )}
          </motion.div>
        )}

        <motion.div className="actions res-nav" variants={rise}>
          <PixelButton tone="ghost" commit="back" onClick={() => go('map')}>
            Mapa
          </PixelButton>
          {isLast ? (
            <PixelButton
              ref={next}
              tone="red"
              size="big"
              onClick={() => (n < 13 ? go('play', { level: n + 1 }) : go('final'))}
            >
              {n < 13 ? `Fase ${n + 1} ▶` : 'Final ▶'}
            </PixelButton>
          ) : (
            <PixelButton ref={next} tone="red" size="big" onClick={() => setI((k) => k + 1)}>
              Próxima carta ▶
            </PixelButton>
          )}
        </motion.div>
      </motion.div>
      {share && <ShareSheet moment={share} onClose={() => setShare(null)} />}
    </Screen>
  )
}
