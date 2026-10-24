// Habilidades Q W E R da referência: ladrilho quadrado com moldura fina e cantoneira, ícone com brilho,
// nome embaixo e tecla numa caixinha. No toque o ladrilho vira botão de 44 px ou mais e a tecla vai ao canto.
import { motion } from 'motion/react'
import type { Ref } from 'react'
import { skillIcon } from '../lib/sprites'
import type { SkillKind } from '../state/play'
import { rise, stagger } from './motion'
import { PixelIcon } from './PixelIcon'
import { usePress } from './press'
import type { SkillInfo } from './skills'

/** na: liberada, mas este minijogo não usa essa habilidade */
export type SkillState = 'ready' | 'used' | 'locked' | 'idle' | 'na'

export function SkillBar({
  skills,
  state,
  onUse,
  disabled,
  explainLocked,
  ref,
  className,
  label = 'Habilidades',
}: {
  skills: SkillInfo[]
  state: (k: SkillKind) => SkillState
  onUse?: (k: SkillKind) => void
  disabled?: boolean
  /** bloqueadas também respondem ao toque (tela de título explica a habilidade) */
  explainLocked?: boolean
  ref?: Ref<HTMLDivElement>
  className?: string
  label?: string
}) {
  return (
    <motion.div
      ref={ref}
      className={`skills${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={label}
      variants={stagger(0.05, 0.2)}
      initial="hidden"
      animate="show"
    >
      {skills.map((s) => {
        const st = state(s.kind)
        const off = disabled || (st === 'locked' && !explainLocked) || st === 'used' || st === 'na' || !onUse
        return <SkillItem key={s.kind} s={s} st={st} off={!!off} onUse={onUse} />
      })}
    </motion.div>
  )
}

function SkillItem({
  s,
  st,
  off,
  onUse,
}: {
  s: SkillInfo
  st: SkillState
  off: boolean
  onUse?: (k: SkillKind) => void
}) {
  const locked = st === 'locked'
  const press = usePress<HTMLButtonElement>(() => onUse?.(s.kind), { disabled: off })
  const aria = locked
    ? `${s.label}, tecla ${s.key}. Libera ao completar ${s.unlock} fases`
    : st === 'used'
      ? `${s.label}, tecla ${s.key}. Já usada nesta fase`
      : st === 'na'
        ? `${s.label}, tecla ${s.key}. Não serve nesta fase`
        : `${s.label}, tecla ${s.key}. ${s.desc}`
  return (
    <motion.button
      type="button"
      variants={rise}
      className={`skill is-${st}`}
      aria-label={aria}
      aria-disabled={off || undefined}
      title={aria}
      {...press}
    >
      <span className="skill-tile">
        <PixelIcon src={skillIcon(s.kind)} className="skill-icon" />
        {locked && (
          <span className="skill-lock" aria-hidden="true">
            FASE {s.unlock}
          </span>
        )}
        <span className="skill-corner" aria-hidden="true">
          {s.key}
        </span>
      </span>
      <span className="skill-name" aria-hidden="true">
        {s.label}
      </span>
      <span className="kbd skill-key" aria-hidden="true">
        {s.key}
      </span>
    </motion.button>
  )
}
