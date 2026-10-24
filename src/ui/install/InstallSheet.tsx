// Folha do tutorial de instalar: celular pixel em loop de ~4 s, passos numerados sincronizados e botões
// na zona do polegar. Dialog com foco preso; Esc, voltar do Android, toque fora e arrastar para baixo fecham.
// Movimento reduzido: sem loop; cada passo mostra o seu quadro parado.
import './install-sheet.css'
import { AnimatePresence, MotionConfig, motion, useDragControls } from 'motion/react'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBackClose } from '../../app/nav'
import { CONFIG } from '../../config'
import { chromeIntentUrl, copyText } from '../../share/caps'
import { useFocusTrap } from '../Dialog'
import { prefersReduced, steps } from '../motion'
import { PixelButton, PixelLink, Tap } from '../PixelButton'
import { haptic } from '../prefs'
import { toast } from '../Toast'
import { COPY, type StepCopy } from './copy'
import { PhoneDemo } from './PhoneDemo'
import { installUrl, setUrlParam } from './platform'
import { ADD, COMPASS, KEBAB, MEATBALL, SHARE, Sprite } from './sprites'
import { beatsOf, firstOf, keyOf, type Variant } from './timeline'
import { useIconSrc } from './useIcon'

export type CloseWhy = 'later' | 'ok' | 'done'

const GLYPH = { share: SHARE, add: ADD, kebab: KEBAB, meatball: MEATBALL, compass: COMPASS } as const

function useMedia(q: string) {
  const get = () => typeof matchMedia === 'function' && matchMedia(q).matches
  const [m, setM] = useState(get)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [q])
  return m
}

/** Roda o roteiro em loop; pausado ou em movimento reduzido, fica no quadro do passo escolhido. */
function useTimeline(variant: Variant, playing: boolean) {
  const beats = beatsOf(variant)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!playing) return
    const t = window.setTimeout(() => setI((k) => (k + 1) % beats.length), beats[i]?.ms ?? 600)
    return () => clearTimeout(t)
  }, [i, playing, beats])
  return [i, setI, beats] as const
}

export default function InstallSheet({
  open,
  variant,
  onClose,
}: {
  open: boolean
  variant: Variant
  onClose: (why: CloseWhy) => void
}) {
  const later = () => onClose('later')
  const box = useFocusTrap(open, later)
  useBackClose(open, later)
  const inapp = variant.startsWith('inapp')

  // dentro do app de mensagem: o "Abrir no navegador" leva a URL atual, então ela já vai com ?instalar
  useEffect(() => {
    if (!open || !inapp) return
    setUrlParam(true)
    return () => setUrlParam(false)
  }, [open, inapp])

  const wide = useMedia('(min-width: 720px) and (min-height: 600px)')
  const short = useMedia('(max-height: 520px)')
  // escala inteira do celular: 3 px por pixel lógico só quando sobra altura
  const tall = useMedia(wide ? '(min-height: 760px)' : '(min-height: 940px) and (min-width: 370px)')
  const u = tall && !short ? 3 : 2
  const reduced = prefersReduced()
  const [paused, setPaused] = useState(false)
  const [phase, setPhase, beats] = useTimeline(variant, open && !paused && !reduced)
  const step = beats[phase]?.step ?? 0
  const drag = useDragControls()
  const titleId = useId()
  const ledeId = useId()
  const copy = COPY[variant]
  const icon = useIconSrc()
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([])

  const goStep = (k: number) => setPhase(reduced || paused ? keyOf(beats, k) : firstOf(beats, k))
  // movimento reduzido: começa parado no passo 1
  useEffect(() => {
    if (open && reduced) setPhase(keyOf(beats, 0))
  }, [open, reduced, beats, setPhase])

  const onStepsKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const d =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0
    if (!d) return
    e.preventDefault()
    const k = (step + d + 3) % 3
    goStep(k)
    stepRefs.current[k]?.focus()
  }

  const link = installUrl(`${CONFIG.siteUrl}/`)
  const copyLink = async () => {
    const ok = await copyText(link)
    if (ok) haptic('success')
    toast(
      ok
        ? `Link copiado. Cole no ${variant === 'inapp-android' ? 'Chrome' : 'Safari'}.`
        : 'Não deu para copiar.',
      ok ? 'gold' : 'red',
    )
  }

  return createPortal(
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            className="inst-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.16, ease: steps(4) } }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: steps(3) } }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) later()
            }}
          >
            <motion.div
              ref={box}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={ledeId}
              tabIndex={-1}
              className={`inst-sheet pf pf--stone pf--lift${wide ? ' is-wide' : ''}${short ? ' is-short' : ''}`}
              initial={wide ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
              animate={
                wide
                  ? { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: steps(5) } }
                  : { y: 0, transition: { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } }
              }
              exit={
                wide
                  ? { opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: steps(3) } }
                  : { y: '100%', transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }
              }
              drag={wide ? false : 'y'}
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 650) later()
              }}
            >
              {!wide && (
                <div className="inst-handle" onPointerDown={(e) => drag.start(e)} aria-hidden="true">
                  <span />
                </div>
              )}
              <header className="inst-head" onPointerDown={(e) => !wide && drag.start(e)}>
                <img className="inst-head-icon" src={icon} alt="" width={64} height={64} draggable={false} />
                <div className="inst-head-text">
                  <p className="inst-eyebrow">{copy.eyebrow}</p>
                  <h2 id={titleId} className="inst-title">
                    {copy.title}
                  </h2>
                </div>
                <Tap
                  className="btn btn--ghost inst-x"
                  aria-label="Fechar"
                  commit="back"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={later}
                >
                  ✕
                </Tap>
              </header>
              <p id={ledeId} className="inst-lede">
                {copy.lede}
              </p>

              <div className="inst-body">
                <div className="inst-stage">
                  <PhoneDemo variant={variant} phase={phase} u={u} reduced={reduced} />
                  {!reduced && (
                    <Tap
                      className="btn btn--ghost inst-pause"
                      aria-label={paused ? 'Continuar animação' : 'Pausar animação'}
                      aria-pressed={paused}
                      vibe={null}
                      onClick={() => setPaused((p) => !p)}
                    >
                      <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
                    </Tap>
                  )}
                </div>

                <ol className="inst-steps" aria-label="Passos" onKeyDown={onStepsKey}>
                  {copy.steps.map((s, k) => (
                    <li key={s.text}>
                      <Tap
                        ref={(el) => {
                          stepRefs.current[k] = el
                        }}
                        className={`inst-step${k === step ? ' is-on' : ''}`}
                        aria-current={k === step ? 'step' : undefined}
                        tabIndex={k === step ? 0 : -1}
                        vibe="move"
                        onClick={() => goStep(k)}
                      >
                        {k === step && (
                          <motion.span
                            layoutId="inst-band"
                            className="inst-band"
                            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                            aria-hidden="true"
                          />
                        )}
                        <span className="inst-num" aria-hidden="true">
                          {k + 1}
                        </span>
                        <StepText s={s} n={k + 1} />
                      </Tap>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="inst-actions">
                {variant === 'inapp-android' ? (
                  <>
                    <PixelButton tone="stone" onClick={copyLink}>
                      Copiar link
                    </PixelButton>
                    <PixelLink tone="red" href={chromeIntentUrl(link)} onClick={() => onClose('ok')}>
                      Abrir no Chrome
                    </PixelLink>
                  </>
                ) : variant === 'inapp-ios' ? (
                  <>
                    <PixelButton tone="ghost" commit="back" onClick={() => onClose('ok')}>
                      Entendi
                    </PixelButton>
                    <PixelButton tone="red" size="big" onClick={copyLink}>
                      Copiar link
                    </PixelButton>
                  </>
                ) : (
                  <>
                    <PixelButton tone="ghost" onClick={() => onClose('done')}>
                      Já instalei
                    </PixelButton>
                    <PixelButton tone="red" size="big" data-autofocus onClick={() => onClose('ok')}>
                      Entendi
                    </PixelButton>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  )
}

function StepText({ s, n }: { s: StepCopy; n: number }) {
  const g = s.icon ? GLYPH[s.icon] : null
  return (
    <span className="inst-step-text">
      <span className="sr-only">Passo {n}: </span>
      <span className="inst-step-main">
        {s.text}
        {g && (
          <span className="inst-step-glyph">
            <Sprite rows={g} px={2} />
          </span>
        )}
      </span>
      <span className="inst-step-hint">{s.hint}</span>
    </span>
  )
}
