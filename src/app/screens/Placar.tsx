// TODO(agente): tela Placar. Substituir este placeholder.
import { go } from '../nav'

export default function Placar() {
  return (
    <main className="screen">
      <div className="sheet px-frame stack">
        <h2>Placar</h2>
        <button type="button" className="btn btn--red" onClick={() => go('play', { level: 1 })}>
          Jogar fase 1
        </button>
      </div>
    </main>
  )
}
