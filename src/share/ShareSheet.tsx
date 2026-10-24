// Folha de compartilhar: prévia exata do PNG, Story/Feed, Compartilhar (Web Share com arquivo),
// Salvar, WhatsApp, Copiar link e, no nível 13, o vídeo para Reels. Spec: docs/research/share.md §0.
// O PNG é gerado assim que a folha abre: no toque, navigator.share é a primeira chamada (ativação do iOS).
import './share.css'
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CONFIG, responsavelText } from '../config'
import { shareLink } from '../state/save'
import {
  chromeIntentUrl,
  copyText,
  downloadBlob,
  shareCaps,
  shareFile,
  shareTextOnly,
  track,
  waUrl,
} from './caps'
import { type Clip, clipSupported, makeVictoryClip } from './clip'
import { momentLink, momentText, withSurface } from './text'
import type { Format, Moment } from './types'

interface Rendered {
  blob: Blob
  file: File
  url: string
}

const FORMATS: { f: Format; label: string; hint: string }[] = [
  { f: 'story', label: 'Story', hint: '9:16' },
  { f: 'feed', label: 'Feed', hint: '4:5' },
]

function titleOf(m: Moment) {
  switch (m.kind) {
    case 'stars3':
      return `Fase ${m.level}`
    case 'ir':
      return 'Sua economia'
    case 'nivel13':
      return 'Nível 13'
    case 'daily':
      return `Desafio #${m.n}`
    case 'movimento':
      return 'Meu voto'
    case 'convite':
      return 'Convite'
    case 'chute':
      return `Chuta Aí #${m.n}`
    case 'plano':
      return 'Meu plano'
  }
}

function useReducedMotion() {
  const [r, setR] = useState(() => matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setR(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return r
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'

type ClipState =
  | { st: 'idle' }
  | { st: 'rec'; p: number }
  | { st: 'done'; clip: Clip; file: File; url: string }
  | { st: 'fail' }

export function ShareSheet({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const key = JSON.stringify(moment)
  const momentRef = useRef(moment)
  momentRef.current = moment
  const [format, setFormat] = useState<Format>('story')
  const [cards, setCards] = useState<Record<string, Rendered>>({})
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('')
  const [saveUrl, setSaveUrl] = useState<string | null>(null)
  const [clip, setClip] = useState<ClipState>({ st: 'idle' })
  const [showVideo, setShowVideo] = useState(false)
  const cache = useRef(new Map<string, Rendered>())
  const dialogRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const reduced = useReducedMotion()
  const cur = cards[`${key}|${format}`]
  const caps = useMemo(() => shareCaps(cur?.file ?? null), [cur])
  const canClip = moment.kind === 'nivel13' && clipSupported()
  const title = titleOf(moment)

  // pré-render: o formato escolhido primeiro, o outro logo depois
  useEffect(() => {
    let alive = true
    setFailed(false)
    const order = [format, ...FORMATS.map((x) => x.f).filter((f) => f !== format)]
    ;(async () => {
      try {
        const mod = await import('./cards')
        for (const f of order) {
          const k = `${key}|${f}`
          let r = cache.current.get(k)
          if (!r) {
            const blob = await mod.makeCard(momentRef.current, f)
            const file = new File([blob], mod.cardFileName(momentRef.current, f), { type: 'image/png' })
            r = { blob, file, url: URL.createObjectURL(blob) }
            cache.current.set(k, r)
          }
          if (!alive) return
          const done = r
          setCards((c) => (c[k] === done ? c : { ...c, [k]: done }))
        }
      } catch {
        if (alive) setFailed(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [key, format])

  // libera blobs ao fechar
  useEffect(() => {
    const store = cache.current
    return () => {
      for (const r of store.values()) URL.revokeObjectURL(r.url)
      store.clear()
    }
  }, [])
  useEffect(() => {
    if (clip.st !== 'done') return
    const url = clip.url
    return () => URL.revokeObjectURL(url)
  }, [clip])

  // foco: entra no diálogo e volta para quem abriu
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    track('share_open', momentRef.current.kind)
    dialogRef.current?.focus()
    return () => prev?.focus?.()
  }, [])
  useEffect(() => {
    if (saveUrl) saveRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [saveUrl])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (saveUrl) setSaveUrl(null)
        else onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = saveUrl ? saveRef.current : dialogRef.current
      const items = root ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first?.focus()
      }
    },
    [onClose, saveUrl],
  )

  const link = momentLink(moment)
  const waText = `${momentText(moment)}\n${withSurface(link, 'wa')}`

  const save = (r: Rendered, kind: string) => {
    track('save_click', kind)
    // iOS: download vai para Arquivos; o certo é tocar e segurar → Salvar em Fotos.
    // WebView do Android: download de blob é instável; o toque longo funciona.
    if (caps.ios || caps.androidWebView) {
      setSaveUrl(r.url)
      return
    }
    downloadBlob(r.blob, r.file.name)
    setStatus('Imagem salva. Abra o Instagram ou o WhatsApp e poste.')
  }

  const onShare = () => {
    if (!cur) return
    if (!caps.files) {
      // sem arquivo: compartilha o texto com o link (passo 2 da cadeia de fallback)
      void shareTextOnly(waText).then((r) => track(r === 'shared' ? 'share_done' : 'share_abort', 'text'))
      return
    }
    // primeira chamada assíncrona do toque: navigator.share
    void shareFile(cur.file).then((r) => {
      if (r === 'shared') {
        track('share_done', format)
        setStatus('Pronto! Valeu por espalhar.')
      } else if (r === 'aborted') track('share_abort', format)
      else {
        track('fallback_shown', format)
        save(cur, format)
      }
    })
  }

  const onCopy = () => {
    const url = withSurface(link, 'link')
    void copyText(url).then((ok) => setStatus(ok ? 'Link copiado' : url))
  }

  const onRecord = () => {
    if (clip.st === 'rec') return
    setClip({ st: 'rec', p: 0 })
    setStatus('Gravando o vídeo…')
    let last = -1
    void makeVictoryClip((p) => {
      const step = Math.floor(p * 10)
      if (step !== last) {
        last = step
        setClip({ st: 'rec', p })
      }
    }).then((c) => {
      if (!c) {
        setClip({ st: 'fail' })
        setStatus('Não deu para gravar o vídeo neste aparelho. A imagem continua aqui.')
        return
      }
      const file = new File([c.blob], `nivel-13-reels.${c.ext}`, {
        type: c.blob.type || c.mime.split(';')[0],
      })
      setClip({ st: 'done', clip: c, file, url: URL.createObjectURL(c.blob) })
      setShowVideo(true)
      setStatus(
        c.ext === 'mp4' ? 'Vídeo pronto' : 'Vídeo pronto (WebM: o Instagram pode recusar; salve e confira)',
      )
    })
  }

  const videoCanShare = useMemo(() => (clip.st === 'done' ? shareCaps(clip.file).files : false), [clip])

  const onShareVideo = () => {
    if (clip.st !== 'done') return
    void shareFile(clip.file).then((r) => {
      track(r === 'shared' ? 'share_done' : r === 'aborted' ? 'share_abort' : 'fallback_shown', 'video')
      if (r === 'failed') {
        downloadBlob(clip.clip.blob, clip.file.name)
        setStatus('Vídeo salvo.')
      }
    })
  }

  const onSaveVideo = () => {
    if (clip.st !== 'done') return
    track('save_click', 'video')
    downloadBlob(clip.clip.blob, clip.file.name)
    setStatus(caps.ios ? 'No iPhone, use Compartilhar → Salvar vídeo.' : 'Vídeo salvo.')
  }

  const fmtLabel = FORMATS.find((x) => x.f === format)?.label ?? format
  const busy = !cur && !failed

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: o fundo fecha com clique; Esc e o botão Fechar também
    <div
      className="share-overlay"
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="share-sheet px-frame px-frame--gold"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
      >
        <div className="share-head">
          <h2 id={titleId}>
            Compartilhar <b>{title}</b>
          </h2>
          <button type="button" className="btn btn--ghost share-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="share-body">
          <div className="share-preview" data-format={format} aria-busy={busy}>
            {showVideo && clip.st === 'done' ? (
              <video
                src={clip.url}
                controls
                playsInline
                muted
                loop
                autoPlay={!reduced}
                aria-label="Prévia do vídeo do nível 13"
              />
            ) : cur ? (
              <img
                src={cur.url}
                alt={`Prévia do card "${title}" no formato ${fmtLabel}, com o link do jogo, o rótulo de IA e o responsável`}
                draggable={false}
              />
            ) : (
              <div className="share-wait">
                {failed ? (
                  'Não deu para gerar a imagem.'
                ) : (
                  <>
                    <span className="share-spin" aria-hidden="true" />
                    Gerando a imagem…
                  </>
                )}
              </div>
            )}
          </div>

          <div className="share-side">
            <fieldset className="share-formats">
              <legend className="sr-only">Formato da imagem</legend>
              {FORMATS.map((x) => (
                <label key={x.f}>
                  <input
                    type="radio"
                    name={`${titleId}-fmt`}
                    value={x.f}
                    checked={format === x.f && !showVideo}
                    onChange={() => {
                      setShowVideo(false)
                      setFormat(x.f)
                    }}
                  />
                  {x.label} <small>{x.hint}</small>
                </label>
              ))}
            </fieldset>

            <p id={descId} className="share-note">
              {caps.androidWebView ? (
                <>
                  Este navegador do app não manda a imagem direto. Salve a imagem (toque e segure) ou{' '}
                  <a href={chromeIntentUrl(location.href)}>abra no Chrome</a>.
                </>
              ) : caps.inApp && !caps.files ? (
                'Para postar a imagem, toque em ⋯ e escolha Abrir no navegador. Ou salve a imagem.'
              ) : !caps.share && (caps.android || caps.ios) ? (
                'Este navegador não abre a lista do celular. Salve a imagem e poste no Instagram ou no WhatsApp.'
              ) : !caps.share ? (
                'No computador: salve a imagem e poste pelo celular, ou copie o link.'
              ) : (
                'Escolha Instagram (Story ou Feed), WhatsApp ou Status na lista do celular.'
              )}
            </p>

            {showVideo && clip.st === 'done' ? (
              <div className="share-actions">
                {videoCanShare && (
                  <button type="button" className="btn btn--red share-main" onClick={onShareVideo}>
                    Compartilhar vídeo
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${videoCanShare ? 'btn--gold' : 'btn--red share-main'}`}
                  onClick={onSaveVideo}
                >
                  Salvar vídeo
                </button>
                <button type="button" className="btn" onClick={() => setShowVideo(false)}>
                  Ver imagem
                </button>
              </div>
            ) : (
              <div className="share-actions">
                {(caps.files || caps.share) && (
                  <button type="button" className="btn btn--red share-main" disabled={!cur} onClick={onShare}>
                    {cur ? 'Compartilhar' : 'Gerando…'}
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${caps.files || caps.share ? 'btn--gold' : 'btn--red share-main'}`}
                  disabled={!cur}
                  onClick={() => cur && save(cur, format)}
                >
                  Salvar imagem
                </button>
                <a
                  className="btn"
                  href={waUrl(waText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('wa_text_click', moment.kind)}
                >
                  WhatsApp
                </a>
                <button type="button" className="btn" onClick={onCopy}>
                  Copiar link
                </button>
                {canClip &&
                  (clip.st === 'done' ? (
                    <button type="button" className="btn" onClick={() => setShowVideo(true)}>
                      Ver vídeo
                    </button>
                  ) : (
                    <button type="button" className="btn" disabled={clip.st === 'rec'} onClick={onRecord}>
                      {clip.st === 'rec' ? `Gravando ${Math.round(clip.p * 100)}%` : 'Vídeo (Reels)'}
                    </button>
                  ))}
              </div>
            )}

            {clip.st === 'rec' && (
              <div
                className="share-progress"
                role="progressbar"
                aria-label="Gravando o vídeo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(clip.p * 100)}
              >
                <i style={{ width: `${Math.round(clip.p * 100)}%` }} />
              </div>
            )}

            <p className="share-status" role="status" aria-live="polite">
              {status}
            </p>
            <p className="share-legal">
              {CONFIG.aiLabel}. {responsavelText()}.
            </p>
          </div>
        </div>
      </div>

      {saveUrl && (
        <div ref={saveRef} className="share-save" role="dialog" aria-modal="true" aria-label="Salvar imagem">
          <p>Toque e segure a imagem e escolha "Salvar em Fotos"</p>
          <img src={saveUrl} alt={`Card "${title}" para salvar`} />
          <button type="button" className="btn btn--gold" onClick={() => setSaveUrl(null)}>
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Texto pronto + link de corrente, sem imagem (WhatsApp). Sem await antes de `navigator.share`
 * (o Safari perde a ativação do toque). Sem Web Share, abre o wa.me na hora.
 */
export async function shareText(text: string) {
  const full = `${text}\n${withSurface(shareLink(), 'wa')}`
  if (typeof navigator.share !== 'function') {
    track('wa_text_click', 'text')
    window.open(waUrl(full), '_blank', 'noopener')
    return
  }
  track('share_open', 'text')
  const r = await shareTextOnly(full)
  if (r === 'shared') track('share_done', 'text')
  else if (r === 'aborted') track('share_abort', 'text')
  else {
    track('wa_text_click', 'text')
    window.open(waUrl(full), '_blank', 'noopener')
  }
}
