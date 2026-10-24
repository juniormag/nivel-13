// Folha de share do Onde Foi? no mesmo desenho da ShareSheet (src/share/share.css): prévia exata do PNG,
// Story/Feed, Compartilhar (Web Share com arquivo), Salvar, WhatsApp (texto com a grade) e Copiar link.
// O PNG é gerado ao abrir: no toque, navigator.share é a primeira chamada assíncrona.
import '../../share/share.css'
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CONFIG, responsavelText } from '../../config'
import {
  chromeIntentUrl,
  copyText,
  downloadBlob,
  shareCaps,
  shareFile,
  shareTextOnly,
  track,
  waUrl,
} from '../../share/caps'
import type { OndeCardData, OndeFormat } from './card'

interface Rendered {
  blob: Blob
  file: File
  url: string
}

const FORMATS: { f: OndeFormat; label: string; hint: string }[] = [
  { f: 'story', label: 'Story', hint: '9:16' },
  { f: 'feed', label: 'Feed', hint: '4:5' },
]

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function OndeShare({
  data,
  text,
  link,
  onClose,
}: {
  data: OndeCardData
  /** texto do WhatsApp (grade + link na última linha) */
  text: string
  link: string
  onClose: () => void
}) {
  const [format, setFormat] = useState<OndeFormat>('story')
  const [cards, setCards] = useState<Partial<Record<OndeFormat, Rendered>>>({})
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('')
  const [saveUrl, setSaveUrl] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const dataRef = useRef(data)
  dataRef.current = data
  const cur = cards[format]
  const caps = useMemo(() => shareCaps(cur?.file ?? null), [cur])

  useEffect(() => {
    let alive = true
    const made: Rendered[] = []
    ;(async () => {
      try {
        const mod = await import('./card')
        const order: OndeFormat[] = ['story', 'feed']
        for (const f of order) {
          const blob = await mod.makeOndeCard(dataRef.current, f)
          const file = new File([blob], mod.ondeCardName(dataRef.current.seed, f), { type: 'image/png' })
          const r = { blob, file, url: URL.createObjectURL(blob) }
          made.push(r)
          if (!alive) return
          setCards((c) => ({ ...c, [f]: r }))
        }
      } catch {
        if (alive) setFailed(true)
      }
    })()
    return () => {
      alive = false
      for (const r of made) URL.revokeObjectURL(r.url)
    }
  }, [])

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    track('share_open', 'onde')
    dialogRef.current?.focus()
    return () => prev?.focus?.()
  }, [])
  useEffect(() => {
    if (saveUrl) saveRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [saveUrl])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (saveUrl) setSaveUrl(null)
      else onClose()
      return
    }
    if (e.key !== 'Tab') return
    const root = saveUrl ? saveRef.current : dialogRef.current
    const items = root ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const save = (r: Rendered) => {
    track('save_click', `onde-${format}`)
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
      void shareTextOnly(text).then((r) => track(r === 'shared' ? 'share_done' : 'share_abort', 'onde-text'))
      return
    }
    void shareFile(cur.file).then((r) => {
      if (r === 'shared') {
        track('share_done', `onde-${format}`)
        setStatus('Pronto! Valeu por espalhar.')
      } else if (r === 'aborted') track('share_abort', `onde-${format}`)
      else {
        track('fallback_shown', `onde-${format}`)
        save(cur)
      }
    })
  }

  const label = FORMATS.find((x) => x.f === format)?.label ?? format
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
            Compartilhar <b>Seu mapa</b>
          </h2>
          <button type="button" className="btn btn--ghost share-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="share-body">
          <div className="share-preview" data-format={format} aria-busy={!cur && !failed}>
            {cur ? (
              <img
                src={cur.url}
                alt={`Prévia do card "Seu mapa" no formato ${label}, com os pinos, o total, o link, o rótulo de IA e o responsável`}
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
                    checked={format === x.f}
                    onChange={() => setFormat(x.f)}
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
              ) : !caps.share ? (
                'Salve a imagem e poste pelo celular, ou mande o texto no WhatsApp.'
              ) : (
                'Escolha Instagram (Story ou Feed), WhatsApp ou Status na lista do celular.'
              )}
            </p>
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
                onClick={() => cur && save(cur)}
              >
                Salvar imagem
              </button>
              <a
                className="btn"
                href={waUrl(text)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('wa_text_click', 'onde')}
              >
                WhatsApp
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => void copyText(link).then((ok) => setStatus(ok ? 'Link copiado' : link))}
              >
                Copiar link
              </button>
            </div>
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
          <img src={saveUrl} alt='Card "Seu mapa" para salvar' />
          <button type="button" className="btn btn--gold" onClick={() => setSaveUrl(null)}>
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}
