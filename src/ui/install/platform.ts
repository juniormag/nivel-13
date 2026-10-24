// Instalar como app: detecção de plataforma, evento beforeinstallprompt e memória no aparelho.
// O listener entra na importação do módulo (antes do React montar): o Chrome dispara o evento cedo.
import { create } from 'zustand'
import { shareCaps } from '../../share/caps'
import { ev } from '../../viral/api'

/** Evento do Chrome/Edge/Samsung Internet (não tipado no DOM padrão). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

/**
 * Caminho de instalação:
 * - `ios`: Safari (ou Chrome/Edge/Firefox do iOS) pelo botão Compartilhar.
 * - `android`: navegador do Android sem o evento nativo (menu ⋮).
 * - `inapp-ios` / `inapp-android`: navegador interno de WhatsApp, Instagram, Facebook: abrir no navegador primeiro.
 * - `desktop`: só com o evento nativo (Chrome/Edge); nos outros não aparece nada.
 */
export type Path = 'ios' | 'android' | 'inapp-ios' | 'inapp-android' | 'desktop'

export function detectPath(): Path {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const caps = shareCaps()
  const inApp = caps.inApp || /WhatsApp|Instagram|FBAN|FBAV|FB_IAB/i.test(ua)
  if (caps.ios) return inApp ? 'inapp-ios' : 'ios'
  if (caps.android) return inApp ? 'inapp-android' : 'android'
  return 'desktop'
}

/** Safari 26 tirou o Compartilhar da barra: fica dentro do ⋯. */
export function iosMajor(): number {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const m = /Version\/(\d+)/.exec(ua) ?? /OS (\d+)_/.exec(ua)
  return m ? Number(m[1]) : 0
}

export function isStandalone(): boolean {
  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true
    return (
      typeof matchMedia === 'function' &&
      (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)
    )
  } catch {
    return false
  }
}

// ---------- memória: localStorage 'nivel13:install' ----------
export const INSTALL_KEY = 'nivel13:install'
const DAY = 86_400_000
/** visita nova depois de 30 min sem abrir */
const NEW_VISIT = 30 * 60_000

export interface InstallMem {
  /** visitas */
  v: number
  /** última vez aberto (ms) */
  t: number
  /** "Agora não": esconde até este instante (ms) */
  snooze: number
  /** "Já instalei" ou instalação confirmada: nunca mais */
  done: boolean
  /** evento 'standalone' já contado neste aparelho */
  sa: boolean
}

const blank = (): InstallMem => ({ v: 0, t: 0, snooze: 0, done: false, sa: false })

export function readMem(): InstallMem {
  try {
    const raw = localStorage.getItem(INSTALL_KEY)
    if (!raw) return blank()
    const p = JSON.parse(raw) as Partial<InstallMem>
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)
    return { v: num(p.v), t: num(p.t), snooze: num(p.snooze), done: p.done === true, sa: p.sa === true }
  } catch {
    return blank()
  }
}

export function writeMem(p: Partial<InstallMem>) {
  const next = { ...readMem(), ...p }
  try {
    localStorage.setItem(INSTALL_KEY, JSON.stringify(next))
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  return next
}

/** "Agora não": 3 dias sem banner. */
export const snooze = () => writeMem({ snooze: Date.now() + 3 * DAY })
/** "Já instalei" ou instalou: para sempre. */
export const markDone = () => writeMem({ done: true })

// ---------- estado vivo ----------
interface InstallState {
  deferred: BeforeInstallPromptEvent | null
  /** instalou nesta sessão (appinstalled) */
  installed: boolean
  standalone: boolean
  /** pedidos de abrir o tutorial vindos de um botão (o InstallPrompt escuta) */
  openReq: number
}

export const useInstall = create<InstallState>(() => ({
  deferred: null,
  installed: false,
  standalone: false,
  openReq: 0,
}))

let booted = false
/** Conta a visita, marca o modo app e começa a ouvir o Chrome. Chamado uma vez na importação. */
function boot() {
  if (booted || typeof window === 'undefined') return
  booted = true
  const standalone = isStandalone()
  useInstall.setState({ standalone })
  const now = Date.now()
  const m = readMem()
  writeMem({ v: now - m.t > NEW_VISIT ? m.v + 1 : Math.max(1, m.v), t: now })
  if (standalone && !m.sa) {
    writeMem({ sa: true, done: true })
    ev('install', 'standalone')
  }
  addEventListener('beforeinstallprompt', (e) => {
    // segura o mini-infobar do Chrome: quem decide a hora é o jogo
    e.preventDefault()
    useInstall.setState({ deferred: e as BeforeInstallPromptEvent })
  })
  addEventListener('appinstalled', () => {
    markDone()
    useInstall.setState({ installed: true, deferred: null })
    ev('install', 'installed')
  })
}
boot()

/** Abre o pedido nativo (Chrome/Edge/Samsung). Precisa vir de um toque. */
export async function promptNative(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = useInstall.getState().deferred
  if (!e) return 'unavailable'
  // o evento só serve uma vez
  useInstall.setState({ deferred: null })
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    ev('install', outcome)
    return outcome
  } catch {
    return 'unavailable'
  }
}

// ---------- link para abrir fora do app de mensagem ----------
/** Quem abre com ?instalar vê o passo a passo logo de cara (vindo do WhatsApp/Instagram). */
export const INSTALL_PARAM = 'instalar'

export function installUrl(href = location.href) {
  try {
    const u = new URL(href)
    u.searchParams.set(INSTALL_PARAM, '1')
    return u.toString()
  } catch {
    return href
  }
}

/** Troca a URL da aba sem recarregar (o "Abrir no navegador" do app leva a URL atual). */
export function setUrlParam(on: boolean) {
  try {
    const u = new URL(location.href)
    if (on) u.searchParams.set(INSTALL_PARAM, '1')
    else u.searchParams.delete(INSTALL_PARAM)
    if (u.href !== location.href) history.replaceState(history.state, '', u.pathname + u.search + u.hash)
  } catch {
    /* ignora */
  }
}

export const hasUrlParam = () => {
  try {
    return new URLSearchParams(location.search).has(INSTALL_PARAM)
  } catch {
    return false
  }
}

/** Botão fixo (título): pedido nativo quando o Chrome deixa; senão abre o tutorial. Precisa vir de um toque. */
export async function requestInstall() {
  ev('install', 'home')
  if (useInstall.getState().deferred) {
    const r = await promptNative()
    if (r === 'accepted') markDone()
    if (r !== 'unavailable') return
  }
  useInstall.setState((s) => ({ openReq: s.openReq + 1 }))
}
