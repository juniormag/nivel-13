// Alternativa sem mapa (leitor de tela, mão trêmula, quem prefere lista): escolher a UF.
// O palpite vira o centro da UF e a pontuação segue pela distância desse centro até o ponto certo.
import { useEffect, useRef } from 'react'
import { Tap } from '../../ui/PixelButton'
import { REGIONS, UF_LIST } from './geo'

export function UfPicker({
  value,
  onPick,
  onClose,
}: {
  value: string | null
  onPick: (uf: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    const first =
      el?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? el?.querySelector<HTMLElement>('.onde-uf')
    first?.focus({ preventScroll: false })
  }, [])
  return (
    <div
      ref={ref}
      className="onde-ufs pf pf--hud"
      role="dialog"
      aria-modal="false"
      aria-labelledby="onde-ufs-h"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <header className="onde-ufs-head">
        <h3 id="onde-ufs-h">Escolha o estado</h3>
        <Tap
          className="btn btn--ghost onde-ufs-x"
          aria-label="Fechar a lista e voltar ao mapa"
          onClick={onClose}
        >
          ✕
        </Tap>
      </header>
      <p className="onde-ufs-note">Vale a distância do centro do estado até o lugar certo.</p>
      <div className="onde-ufs-body">
        {REGIONS.map((r) => (
          <section key={r} aria-label={r}>
            <h4>{r}</h4>
            <div className="onde-ufs-grid">
              {UF_LIST.filter((u) => u.region === r).map((u) => (
                <Tap
                  key={u.uf}
                  className="onde-uf"
                  aria-pressed={value === u.uf}
                  aria-label={u.name}
                  sound="select"
                  onClick={() => onPick(u.uf)}
                >
                  <b aria-hidden="true">{u.uf}</b>
                  <span aria-hidden="true">{u.name}</span>
                </Tap>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
