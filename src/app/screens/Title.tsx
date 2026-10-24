// Tela de título: o HUD da referência sobre o monumento.
// Retrato, NÍVEL e XP no alto à esquerda; corações e "···" no alto à direita; atributos à direita;
// menu de comandos embaixo à esquerda; Q W E R ao centro; minimapa embaixo à direita.
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { playMusic } from '../../audio/audio'
import { FACTS } from '../../content/facts'
import { dailyNumber, todayBR } from '../../lib/time'
import type { SkillKind } from '../../state/play'
import { currentLevel, levelsDone, stats, useSave, XP_MAX, xpTotal } from '../../state/save'
import { CommandMenu, type MenuItem } from '../../ui/CommandMenu'
import { useElectionCountdown } from '../../ui/Countdown'
import { Hearts } from '../../ui/Hearts'
import { Minimap } from '../../ui/Minimap'
import { slideFrom } from '../../ui/motion'
import { Tap } from '../../ui/PixelButton'
import { Legal, PortraitFrame, Screen } from '../../ui/Shell'
import { SkillBar } from '../../ui/SkillBar'
import { StatBars } from '../../ui/StatBars'
import { SKILL_INFO } from '../../ui/skills'
import { toast } from '../../ui/Toast'
import { XPBar } from '../../ui/XPBar'
import { go } from '../nav'

export default function Title() {
  const s = useSave()
  const done = levelsDone(s)
  const lvl = currentLevel(s)
  const xp = xpTotal(s)
  const st = stats(s)
  const date = todayBR()
  const n = dailyNumber(date)
  const cd = useElectionCountdown()

  useEffect(() => playMusic('title'), [])

  const unlocked = (k: SkillKind) => done >= (SKILL_INFO.find((x) => x.kind === k)?.unlock ?? 99)
  const explain = (k: SkillKind) => {
    const sk = SKILL_INFO.find((x) => x.kind === k)
    if (!sk) return
    toast(unlocked(k) ? `${sk.label} (${sk.key}): ${sk.desc}` : `${sk.label}: libera com ${sk.unlock} fases`)
  }

  // Q W E R explicam a habilidade na tela de título
  useEffect(() => {
    const map: Record<string, SkillKind> = { q: 'checar', w: 'lembrar', e: 'foco', r: 'proteger' }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = map[e.key.toLowerCase()]
      if (k) explain(k)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const items: MenuItem[] = [
    {
      id: 'play',
      label: done === 0 ? 'Jogar' : done < 13 ? 'Continuar' : 'Rejogar',
      hint: done < 13 ? `${lvl}/13` : '13/13',
      hintLabel: done < 13 ? `fase ${lvl} de 13` : 'todas as 13 fases feitas',
      onSelect: () => go(s.onboarded ? 'map' : 'onboard'),
    },
    {
      id: 'chuta',
      label: 'Chuta Aí!',
      hint: `#${n}`,
      hintLabel: `desafio do dia número ${n}`,
      onSelect: () => go('chuta'),
    },
    { id: 'placar', label: 'Placar da virada', onSelect: () => go('placar') },
    {
      id: 'colecao',
      label: 'Coleção',
      hint: `${s.cards.length}/${FACTS.length}`,
      hintLabel: `${s.cards.length} de ${FACTS.length} cartas`,
      onSelect: () => go('colecao'),
    },
    {
      id: 'votar',
      label: 'Vou votar',
      hint: cd ? cd.label : 'hoje',
      hintLabel: cd ? `faltam ${cd.label}` : 'hoje é dia de votar',
      onSelect: () => go('votar'),
    },
  ]

  return (
    <Screen world={done / 13} dim={false} className="title">
      <div className="t-vignette" aria-hidden="true" />
      <h1 className="sr-only">Nível 13: a virada</h1>

      <motion.header className="t-player" variants={slideFrom(-10)} initial="hidden" animate="show">
        <PortraitFrame avatar={s.avatar} />
        <div className="t-player-info">
          <div className="t-level">
            NÍVEL <b>{lvl}</b>
          </div>
          <XPBar value={xp} max={XP_MAX} />
        </div>
      </motion.header>

      <motion.div className="t-topright" variants={slideFrom(10)} initial="hidden" animate="show">
        <Hearts n={3} max={3} label="3 vidas por fase" />
        <Tap className="dots" aria-label="Sobre, fontes e ajustes" onClick={() => go('sobre')}>
          <i />
          <i />
          <i />
        </Tap>
      </motion.div>

      <motion.div
        className="t-logo"
        aria-hidden="true"
        variants={slideFrom(0, -8)}
        initial="hidden"
        animate="show"
      >
        <span className="t-logo-1">Nível 13</span>
        <span className="t-logo-2">A virada</span>
      </motion.div>

      <motion.div className="t-stats" variants={slideFrom(12)} initial="hidden" animate="show">
        <StatBars
          stats={[
            { label: 'Fatos', value: st.fatos },
            { label: 'Memória', value: st.memoria },
            { label: 'Coragem', value: st.coragem },
            { label: 'Democracia', value: st.democracia },
          ]}
        />
      </motion.div>

      <CommandMenu className="t-menu" label="Menu principal" items={items} memory="title" />

      <SkillBar
        className="t-skills"
        skills={SKILL_INFO}
        state={(k) => (unlocked(k) ? 'ready' : 'locked')}
        onUse={explain}
        explainLocked
      />

      <motion.div className="t-mini" variants={slideFrom(12, 8)} initial="hidden" animate="show">
        <Minimap stars={s.stars} current={Math.min(12, done)} />
      </motion.div>

      <Legal className="t-legal" />
    </Screen>
  )
}
