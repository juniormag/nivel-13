// Convite para jogar como app (tela inicial). Montado uma vez no App.
// Hora certa: nunca no primeiro carregamento nem numa fase; depois de uma vitória (resultado) ou, da
// segunda visita em diante, no título. "Agora não" esconde por 3 dias; "Já instalei", para sempre.
// Android/Chrome com o evento nativo: "Instalar o app" chama o pedido do navegador.
// iOS, Android sem o evento e apps de mensagem: abre o tutorial animado (InstallSheet, carregado sob demanda).
import './install.css'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { type Screen, useNav } from '../../app/nav'
import { ev } from '../../viral/api'
import { PixelButton, Tap } from '../PixelButton'
import { haptic } from '../prefs'
import { toast } from '../Toast'
import { BANNER } from './copy'
import type { CloseWhy } from './InstallSheet'
import {
  detectPath,
  hasUrlParam,
  iosMajor,
  markDone,
  type Path,
  promptNative,
  readMem,
  setUrlParam,
  snooze,
  useInstall,
} from './platform'
import { Sparkle } from './sprites'
import type { Variant } from './timeline'
import { useIconSrc } from './useIcon'

const InstallSheet = lazy(() => import('./InstallSheet'))

/** Telas onde o convite pode aparecer (nunca durante uma fase). */
const SPOTS: Screen[] = ['title', 'result']
/** espera a tela assentar: no resultado, as estrelas e o XP terminam antes */
const DELAY: Partial<Record<Screen, number>> = { title: 1800, result: 3000 }

/** uma vez por sessão */
let shownThisSession = false

const variantOf = (p: Path): Variant =>
  p === 'ios' ? (iosMajor() >= 26 ? 'ios26' : 'ios') : p === 'desktop' ? 'android' : p

const modalOpen = () => !!document.querySelector('[aria-modal="true"]')

export function InstallPrompt() {
  const screen = useNav((s) => s.screen)
  const deferred = useInstall((s) => s.deferred)
  const standalone = useInstall((s) => s.standalone)
  const installed = useInstall((s) => s.installed)
  const [path] = useState(detectPath)
  const variant = variantOf(path)
  const desktop = path === 'desktop'
  const inapp = path.startsWith('inapp')
  const [banner, setBanner] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [sheetMounted, setSheetMounted] = useState(false)
  const allowed = !standalone && !installed && (!desktop || !!deferred)

  const openSheet = () => {
    setSheetMounted(true)
    setSheet(true)
    ev('install', `sheet:${variant}`)
  }

  // Vindo do WhatsApp/Instagram com ?instalar: no navegador de verdade, o caminho aparece logo
  const fromLink = useRef(hasUrlParam())
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez, no boot
  useEffect(() => {
    if (!fromLink.current || inapp || standalone) return
    // a marca só cai quando o timer roda (o StrictMode monta, desmonta e monta de novo)
    const t = window.setTimeout(() => {
      fromLink.current = false
      setUrlParam(false)
      if (useNav.getState().screen === 'play') return
      shownThisSession = true
      if (path === 'ios') openSheet()
      else if (!desktop || useInstall.getState().deferred) setBanner(true)
    }, 900)
    return () => clearTimeout(t)
  }, [])

  // hora certa
  useEffect(() => {
    if (banner || sheet || shownThisSession || !allowed || !SPOTS.includes(screen)) return
    const m = readMem()
    if (m.done || m.snooze > Date.now()) return
    if (screen === 'title' && m.v < 2) return
    let t = 0
    const tick = () => {
      // outra folha aberta (compartilhar, diálogo): espera ela fechar
      if (modalOpen()) {
        t = window.setTimeout(tick, 1200)
        return
      }
      shownThisSession = true
      setBanner(true)
      ev('install', desktop ? 'chip' : 'banner')
    }
    t = window.setTimeout(tick, DELAY[screen] ?? 2000)
    return () => clearTimeout(t)
  }, [screen, allowed, banner, sheet, desktop])

  // saiu da tela (foi jogar): o convite some sem contar como "Agora não"
  useEffect(() => {
    if (banner && !SPOTS.includes(screen)) setBanner(false)
  }, [screen, banner])
  useEffect(() => {
    if (!allowed) setBanner(false)
  }, [allowed])

  // instalou (Chrome avisa): comemora uma vez
  useEffect(() => {
    if (!installed) return
    setSheet(false)
    haptic('success')
    toast('Pronto! O Nível 13 está na sua tela inicial.', 'gold')
  }, [installed])

  const later = () => {
    setBanner(false)
    snooze()
    ev('install', 'later')
  }

  const primary = async () => {
    setBanner(false)
    if (useInstall.getState().deferred) {
      const r = await promptNative()
      if (r === 'accepted') {
        markDone()
        haptic('success')
      } else if (r === 'dismissed') snooze()
      return
    }
    openSheet()
  }

  const closeSheet = (why: CloseWhy) => {
    setSheet(false)
    if (why === 'done') {
      markDone()
      ev('install', 'done')
      toast('Boa! Jogue pelo ícone do 13.', 'gold')
    } else snooze()
  }

  const native = !!deferred
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {banner && (
          <Banner
            key="banner"
            desktop={desktop}
            screen={screen}
            native={native}
            inapp={inapp}
            onPrimary={primary}
            onLater={later}
          />
        )}
      </AnimatePresence>
      {sheetMounted && (
        <Suspense fallback={null}>
          <InstallSheet open={sheet} variant={variant} onClose={closeSheet} />
        </Suspense>
      )}
    </MotionConfig>
  )
}

function Banner({
  desktop,
  screen,
  native,
  inapp,
  onPrimary,
  onLater,
}: {
  desktop: boolean
  screen: Screen
  native: boolean
  inapp: boolean
  onPrimary: () => void
  onLater: () => void
}) {
  const icon = useIconSrc()
  const [landed, setLanded] = useState(false)
  const action = native ? BANNER.install : BANNER.how
  if (desktop)
    return (
      <motion.aside
        className="inst-chip pf pf--gold pf--lift"
        data-screen={screen}
        aria-label={BANNER.title}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 460, damping: 34 } }}
        exit={{ opacity: 0, y: 8, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
      >
        <img src={icon} alt="" width={32} height={32} className="inst-chip-icon" draggable={false} />
        <span className="inst-chip-text">{BANNER.title}</span>
        <PixelButton tone="red" size="sm" onClick={onPrimary}>
          {BANNER.install}
        </PixelButton>
        <Tap className="btn btn--ghost inst-chip-x" aria-label={BANNER.later} commit="back" onClick={onLater}>
          ✕
        </Tap>
      </motion.aside>
    )
  return (
    <motion.aside
      className="inst-banner pf pf--gold pf--lift"
      aria-label={BANNER.title}
      initial={{ y: '-130%' }}
      animate={{ y: 0, transition: { type: 'spring', stiffness: 420, damping: 30, mass: 0.9 } }}
      exit={{ y: '-130%', transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
      onAnimationComplete={() => setLanded(true)}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.1 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -36 || info.velocity.y < -500) onLater()
      }}
    >
      <span className="inst-banner-icon">
          <motion.img
            src={icon}
            alt=""
            width={64}
            height={64}
            draggable={false}
            style={{ originY: 1 }}
            initial={false}
            animate={landed ? { scaleX: [1, 1.18, 0.94, 1], scaleY: [1, 0.82, 1.08, 1] } : undefined}
            transition={{ duration: 0.36, times: [0, 0.25, 0.6, 1], ease: 'easeOut' }}
          />
          {landed && <Sparkle x={60} y={4} px={2} delay={0.12} />}
        </span>
        <div className="inst-banner-text">
          <p className="inst-banner-title">{BANNER.title}</p>
          <p className="inst-banner-sub">{inapp ? BANNER.subInApp : BANNER.sub}</p>
        </div>
      <div className="inst-banner-actions">
        <PixelButton tone="ghost" size="sm" commit="back" onClick={onLater}>
          {BANNER.later}
        </PixelButton>
        <PixelButton tone="red" onClick={onPrimary}>
          {action}
        </PixelButton>
      </div>
    </motion.aside>
  )
}
