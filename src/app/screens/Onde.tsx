// Onde Foi? (docs/MODOS-NOVOS.md §2): MapTap do Brasil. Uma pista, um toque no mapa, pontos pela distância.
// params.seed (link ?o=<semente>) repete a mesma partida; sem semente, vale a do dia. params.vs é o total
// de quem desafiou (opcional). A partida remonta a cada semente nova (Jogar de novo).

import { OndeGame } from '../../modes/onde/Game'
import { dailySeed, normSeed } from '../../modes/onde/logic'
import { Screen } from '../../ui/Shell'
import { go, useNav } from '../nav'

export default function Onde() {
  const params = useNav((s) => s.params)
  const seed = normSeed(params.seed) ?? dailySeed()
  const raw = params.vs
  const n =
    typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '') ? Number(raw) : Number.NaN
  const vs = Number.isFinite(n) && n >= 0 ? Math.min(1000, Math.round(n)) : null
  return (
    <Screen className="onde-scr">
      <OndeGame
        key={seed}
        seed={seed}
        vs={vs}
        onHome={() => go('title')}
        onAgain={(s) => go('onde', { seed: s })}
      />
    </Screen>
  )
}
