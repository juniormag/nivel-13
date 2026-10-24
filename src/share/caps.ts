// Capacidades do aparelho e ações de compartilhar (docs/research/share.md §0.4 e §0.5).
// Detecção por recurso; o user agent só serve de dica para navegadores embutidos.
import { CONFIG } from '../config'

export interface Caps {
  /** navigator.share existe */
  share: boolean
  /** dá para compartilhar este arquivo (Web Share nível 2) */
  files: boolean
  ios: boolean
  android: boolean
  /** WebView do Android (Instagram, Facebook): sem Web Share e com download de blob instável */
  androidWebView: boolean
  /** navegador embutido de app (dica por UA): mostra "abrir no navegador" */
  inApp: boolean
  /** gravação de vídeo do canvas */
  clip: boolean
}

export function shareCaps(sample?: File | null): Caps {
  const nav = typeof navigator === 'undefined' ? null : navigator
  const ua = nav?.userAgent ?? ''
  const share = typeof nav?.share === 'function'
  let files = false
  if (sample && typeof nav?.canShare === 'function') {
    try {
      files = nav.canShare({ files: [sample] })
    } catch {
      files = false
    }
  }
  const ios =
    /iP(hone|ad|od)/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document)
  const android = /Android/.test(ua)
  const androidWebView = android && /; wv\)/.test(ua)
  const inApp = androidWebView || /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly/i.test(ua)
  return { share, files, ios, android, androidWebView, inApp, clip: false }
}

export type ShareResult = 'shared' | 'aborted' | 'failed'

/**
 * Compartilha um arquivo. Chame de forma síncrona dentro do toque (o Safari perde a ativação
 * entre awaits): o arquivo já tem que estar pronto. Só o arquivo vai: muitos destinos (Instagram)
 * ignoram o texto e, no iOS, misturar texto e arquivo pode derrubar o arquivo. O link está na arte.
 */
export function shareFile(file: File): Promise<ShareResult> {
  try {
    if (!navigator.canShare?.({ files: [file] })) return Promise.resolve('failed')
    return navigator.share({ files: [file] }).then(
      () => 'shared' as const,
      (e: unknown) => ((e as Error)?.name === 'AbortError' ? ('aborted' as const) : ('failed' as const)),
    )
  } catch {
    return Promise.resolve('failed')
  }
}

/** Compartilha só texto (com o link na última linha). */
export function shareTextOnly(text: string): Promise<ShareResult> {
  try {
    if (typeof navigator.share !== 'function') return Promise.resolve('failed')
    return navigator.share({ text }).then(
      () => 'shared' as const,
      (e: unknown) => ((e as Error)?.name === 'AbortError' ? ('aborted' as const) : ('failed' as const)),
    )
  } catch {
    return Promise.resolve('failed')
  }
}

/** Baixa o arquivo (Android e desktop). No iOS isto vai para Arquivos, não Fotos: use a prévia com toque longo. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

/** wa.me com texto (abre a lista de contatos; o primeiro link do texto vira prévia). */
export const waUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/** Android WebView → Chrome. */
export function chromeIntentUrl(url: string) {
  const u = new URL(url, location.href)
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fallback antigo (WebViews sem a Clipboard API)
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * Contadores agregados de share (VIRAL-DESIGN §5.5), sem id: `share_open`, `share_done`, `share_abort`,
 * `fallback_shown`, `save_click`, `wa_text_click`. Também dispara `n13:share` no window para quem quiser ouvir.
 */
export function track(e: string, k = '') {
  try {
    window.dispatchEvent(new CustomEvent('n13:share', { detail: { e, k } }))
    const body = new Blob([JSON.stringify({ e, k })], { type: 'application/json' })
    navigator.sendBeacon?.(`${CONFIG.apiBase}/ev`, body)
  } catch {
    // análise nunca atrapalha o share
  }
}
