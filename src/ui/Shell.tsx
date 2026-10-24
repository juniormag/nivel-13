// Estrutura comum das telas: mundo ao fundo, folha emoldurada com título, rodapé legal.
import { MotionConfig, motion } from 'motion/react'
import { Component, type ReactNode, useEffect } from 'react'
import { go } from '../app/nav'
import { sfx } from '../audio/audio'
import { CONFIG, responsavelText } from '../config'
import { sprite } from '../lib/sprites'
import type { Avatar } from '../state/save'
import { pageIn, stagger, steps } from './motion'
import { Tap } from './PixelButton'
import type { FrameTone } from './PixelFrame'
import { PixelIcon } from './PixelIcon'
import { PixelWipe } from './PixelWipe'
import { WorldStage } from './WorldStage'

export const AVATAR_NAMES: Record<Avatar, string> = {
  coelho: 'Coelho',
  onca: 'Onça',
  arara: 'Arara',
  capivara: 'Capivara',
}

/** Se o mundo 3D falhar (GPU, WebGL), a interface continua de pé sobre o fundo escuro. */
class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('[WorldStage]', err)
  }
  render() {
    return this.state.failed ? <div className="world-fallback" aria-hidden="true" /> : this.props.children
  }
}

/** Raiz de toda tela: respeita prefers-reduced-motion em todo motion filho. */
export function Screen({
  world,
  celebrate,
  dim = true,
  className,
  children,
}: {
  /** progresso do monumento (0..1); sem valor, nada de mundo ao fundo */
  world?: number
  celebrate?: boolean
  dim?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <MotionConfig reducedMotion="user">
      {world !== undefined && (
        <WorldBoundary>
          <WorldStage progress={world} celebrate={celebrate} />
        </WorldBoundary>
      )}
      {world !== undefined && dim && <div className="world-dim" aria-hidden="true" />}
      <main className={`scr${className ? ` ${className}` : ''}`}>{children}</main>
      <PixelWipe />
    </MotionConfig>
  )
}

/** Folha emoldurada das telas secundárias (placar, coleção, votar, sobre...). */
export function Page({
  eyebrow,
  title,
  tone = 'stone',
  wide,
  onClose = () => go('title'),
  closeLabel = 'Voltar ao início',
  children,
  className,
}: {
  eyebrow?: ReactNode
  title: string
  tone?: FrameTone
  wide?: boolean
  onClose?: (() => void) | null
  closeLabel?: string
  children: ReactNode
  className?: string
}) {
  // Esc volta (pilha de telas: a tela anterior restaura o foco do item que abriu esta)
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        sfx('back')
        onClose()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.section
      className={`page pf pf--${tone} pf--lift${wide ? ' page--wide' : ''}${className ? ` ${className}` : ''}`}
      variants={pageIn}
      initial="hidden"
      animate="show"
      aria-labelledby="page-title"
    >
      <header className="page-head">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 id="page-title">{title}</h1>
        {onClose && (
          <Tap className="btn btn--ghost page-close" aria-label={closeLabel} commit="back" onClick={onClose}>
            ✕
          </Tap>
        )}
      </header>
      <motion.div className="page-body" variants={stagger(0.05, 0.08)} initial="hidden" animate="show">
        {children}
      </motion.div>
    </motion.section>
  )
}

export function Legal({ className }: { className?: string }) {
  return (
    <p className={`legal${className ? ` ${className}` : ''}`}>
      {CONFIG.aiLabel} · {responsavelText()}
    </p>
  )
}

/** Retrato do jogador em moldura com cantoneira (referência, alto à esquerda). */
export function PortraitFrame({ avatar, className }: { avatar: Avatar; className?: string }) {
  return (
    <span className={`portrait pf pf--hud pf--bracket${className ? ` ${className}` : ''}`}>
      <PixelIcon src={sprite(avatar)} label={`Seu personagem: ${AVATAR_NAMES[avatar]}`} />
    </span>
  )
}

/** Faixa de estrelas (0 a 3) com rótulo acessível. Com `reveal`, cada estrela cai com som em tríade. */
export function Stars({ n, reveal, className }: { n: number; reveal?: boolean; className?: string }) {
  useEffect(() => {
    if (!reveal) return
    const ts = Array.from({ length: n }, (_, k) =>
      window.setTimeout(() => sfx('star', { combo: k }), 420 + k * 200),
    )
    return () => {
      for (const t of ts) clearTimeout(t)
    }
  }, [reveal, n])
  return (
    <div className={`stars${className ? ` ${className}` : ''}`} role="img" aria-label={`${n} de 3 estrelas`}>
      {[0, 1, 2].map((k) => (
        <motion.span
          key={k}
          className={k < n ? '' : 'off'}
          initial={reveal && k < n ? { opacity: 0, scale: 1.6 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.42 + k * 0.2, duration: 0.15, ease: steps(3) }}
        >
          ★
        </motion.span>
      ))}
    </div>
  )
}
