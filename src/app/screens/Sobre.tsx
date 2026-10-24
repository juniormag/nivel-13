// TODO(agente): tela Sobre. Substituir este placeholder.
import { go } from '../nav'

export default function Sobre() {
  return (
    <main className="screen">
      <div className="sheet px-frame stack">
        <h2>Sobre</h2>
        <button type="button" className="btn btn--red" onClick={() => go('play', { level: 1 })}>
          Jogar fase 1
        </button>
      </div>
    </main>
  )
}
