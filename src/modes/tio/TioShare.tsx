// Folha de compartilhar do Convence o Tio. O ShareSheet de src/share só aceita os momentos do tipo
// Moment (fechado, dono: growth-share-engineer); esta folha usa o mesmo CSS (share.css), as mesmas
// ações (src/share/caps.ts) e o mesmo contrato: PNG pronto antes do toque, navigator.share como a
// primeira chamada do clique, fallback de salvar e WhatsApp com texto, rótulo de IA e responsável.
import '../../share/share.css'
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CONFIG, responsavelText } from '../../config'
import { copyText, downloadBlob, shareCaps, shareFile, shareTextOnly, track, waUrl } from '../../share/caps'
import { makeTioCard, type TioCardData, type TioFormat, tioCardName } from './card'

interface Rendered {
  blob: Blob
  file: File
  url: string
}

const FORMATS: { f: TioFormat; label: string; hint: string }[] = [
  { f: 'story', label: 'Story', hint: '9:16' },
  { f: 'feed', label: 'Feed', hint: '4:5' },
]
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function TioShare({
  data,
  text,
  link,
  onClose,
}: {
  data: TioCardData
  /** texto do WhatsApp (com o link na última linha) */
  text: string
  /** link do desafio para "Copiar link" */
  link: string
  onClose: () => void
}) {
  const [format, setFormat] = useState<TioFormat>('story')
  const [cards, setCards] = useState<Partial<Record<TioFormat, Rendered>>>({})
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('')
  const [saveUrl, setSaveUrl] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const dataRef = useRef(data)
  const cur = cards[format]
  const caps = useMemo(() => shareCaps(cur?.file ?? null), [cur])

  // pré-render dos dois formatos (o escolhido primeiro)
  useEffect(() => {
    let alive = true
    const made: Rendered[] = []
    ;(async () => {
      try {
        for (const f of ['story', 'feed'] as const) {
          const blob = await makeTioCard(dataRef.current, f)
          const r = {
            blob,
            file: new File([blob], tioCardName(dataRef.current, f), { type: 'image/png' }),
            url: URL.createObjectURL(blob),
          }
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
    track('share_open', 'tio')
    dialogRef.current?.focus()
    return () => prev?.focus?.()
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      if (saveUrl) setSaveUrl(null)
      else onClose()
      return
    }
    if (e.key !== 'Tab') return
    const root = dialogRef.current
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
    track('save_click', 'tio')
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
      void shareTextOnly(text).then((r) => track(r === 'shared' ? 'share_done' : 'share_abort', 'tio_text'))
      return
    }
    void shareFile(cur.file).then((r) => {
      if (r === 'shared') {
        track('share_done', `tio_${format}`)
        setStatus('Pronto! Valeu por espalhar.')
      } else if (r === 'aborted') track('share_abort', `tio_${format}`)
      else save(cur)
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
            Compartilhar <b>resultado</b>
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
                alt={`Prévia do card no formato ${label}: ${text.split('\n')[0] ?? ''}, com o link, o rótulo de IA e o responsável`}
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
              {!caps.share
                ? 'Salve a imagem e poste no Instagram ou no WhatsApp, ou mande o texto.'
                : 'Escolha Instagram (Story ou Feed), WhatsApp ou Status na lista do celular.'}
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
                onClick={() => track('wa_text_click', 'tio')}
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
        <div className="share-save" role="dialog" aria-modal="true" aria-label="Salvar imagem">
          <p>Toque e segure a imagem e escolha "Salvar em Fotos"</p>
          <img src={saveUrl} alt="Card do resultado para salvar" />
          <button type="button" className="btn btn--gold" onClick={() => setSaveUrl(null)}>
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}
