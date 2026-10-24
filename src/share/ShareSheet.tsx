// STUB do contrato: o growth-share-engineer substitui pela folha completa (prévia, Story, Feed, WhatsApp, Salvar).
import type { Moment } from './types'

export function ShareSheet({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  return (
    <div className="overlay-center" role="dialog" aria-label="Compartilhar">
      <div className="intro px-frame px-frame--gold">
        <h2>Compartilhar</h2>
        <p>{moment.kind}</p>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}

/** Texto pronto + link de corrente, sem imagem (WhatsApp). */
export async function shareText(text: string) {
  const { shareLink } = await import('../state/save')
  const full = `${text}\n${shareLink()}`
  try {
    if (navigator.share) {
      await navigator.share({ text: full })
      return
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener')
}
