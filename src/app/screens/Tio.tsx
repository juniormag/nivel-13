// Convence o Tio (docs/MODOS-NOVOS.md §1): escolha do parente → conversa de 5 mensagens → resultado e share.
// `params.parente` (vindo do link ?t=<parente>) abre direto naquele parente. Voltar (botão ou gesto do
// Android) sai da conversa para a escolha, porque cada conversa entra no histórico com go('tio', ...).
import '../../modes/tio/tio.css'
import { useEffect } from 'react'
import { Chat } from '../../modes/tio/Chat'
import { POOL } from '../../modes/tio/content'
import { isParenteId, msgsOf } from '../../modes/tio/logic'
import { Picker } from '../../modes/tio/Picker'
import { levelsDone, useSave } from '../../state/save'
import { Screen } from '../../ui/Shell'
import { ev } from '../../viral/api'
import { go, useNav } from '../nav'

export default function Tio() {
  const params = useNav((s) => s.params)
  const id = isParenteId(params.parente) ? params.parente : null
  const parente = id ? POOL.parentes.find((p) => p.id === id) : undefined
  const msgs = parente ? msgsOf(POOL, parente.id) : []
  const run = typeof params.run === 'number' ? params.run : 0
  // mesmo fundo das folhas: o monumento esmaecido atrás da conversa
  const world = useSave((s) => levelsDone(s)) / 13

  useEffect(() => ev('papo_open', 'tio'), [])

  if (parente && msgs.length > 0)
    return (
      <Screen world={world} className="tio-scr tio-scr--chat">
        <Chat
          key={`${parente.id}-${run}`}
          parente={parente}
          msgs={msgs}
          fixture={POOL.fixture}
          onBack={() => (params.from === 'pick' ? history.back() : go('tio'))}
          onOther={() => go('tio')}
        />
      </Screen>
    )

  return (
    <Screen world={world} className="tio-scr tio-scr--pick">
      <Picker
        parentes={POOL.parentes}
        fixture={POOL.fixture}
        onPick={(p) => go('tio', { parente: p.id, run: Date.now(), from: 'pick' })}
        onClose={() => go('title')}
      />
    </Screen>
  )
}
