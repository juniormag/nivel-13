// TODO(agente): tela Colecao. Substituir este placeholder.
import { go } from '../nav'

export default function Colecao() {
  return (
    <main className="screen">
      <div className="sheet px-frame stack">
        <h2>Colecao</h2>
        <button type="button" className="btn btn--red" onClick={() => go('play', { level: 1 })}>
          Jogar fase 1
        </button>
      </div>
    </main>
  )
}
