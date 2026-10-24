// Tira-teima (VIRAL-DESIGN §2.6). Com ?d= a partida acontece dentro do Chuta Aí (faixa "Fulano fez X"
// e comparação no fim); esta tela é o painel dos seus desafios: quantos aceitaram e quantos você venceu.
import '../../viral/viral.css'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { duelo, type MeuDuelo } from '../../lib/api'
import { total as sumTotal } from '../../lib/score'
import { dailyNumber, todayBR } from '../../lib/time'
import { useSave } from '../../state/save'
import { rise } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { ev } from '../../viral/api'
import { fmtInt } from '../../viral/format'
import { chuteUrl, duelText, myDuelToken, sendText } from '../../viral/share'
import { ViralPage } from '../../viral/ViralPage'
import { go, useNav } from '../nav'

export default function Duelo() {
  const params = useNav((s) => s.params)
  const save = useSave()
  const [mine, setMine] = useState<MeuDuelo[] | null>(null)
  const today = todayBR()
  const played = save.chute[today]

  useEffect(() => {
    // link de duelo aberto aqui: joga no Chuta Aí, que cuida da faixa e da comparação
    if (typeof params.d === 'string' && params.d) go('chuta', { d: params.d })
  }, [params.d])

  useEffect(() => {
    let alive = true
    void duelo.mine().then((r) => {
      if (alive && Array.isArray(r)) setMine(r)
    })
    return () => {
      alive = false
    }
  }, [])

  const accepts = mine?.reduce((a, d) => a + d.accepts, 0) ?? 0
  const wins = mine?.reduce((a, d) => a + d.wins, 0) ?? 0
  const n = dailyNumber(today)

  const challenge = async () => {
    if (!played) return
    ev('duel_create')
    const tot = sumTotal(played.s)
    await sendText(duelText(n, tot, chuteUrl(n, { duel: myDuelToken(n, played.s), s: 'duelo' })))
  }

  return (
    <ViralPage eyebrow="Chuta Aí!" title="Tira-teima" onClose={() => history.back()}>
      <motion.p variants={rise}>
        Desafie uma pessoa com as mesmas 5 rodadas de hoje. No fim, as duas grades lado a lado.
      </motion.p>
      {mine && mine.length > 0 && (
        <motion.div className="bigstat" variants={rise}>
          <div className="pf pf--hud">
            <b>{fmtInt(accepts)}</b>
            <span>{accepts === 1 ? 'aceitou' : 'aceitaram'}</span>
          </div>
          <div className="pf pf--hud">
            <b>{fmtInt(wins)}</b>
            <span>{wins === 1 ? 'vitória sua' : 'vitórias suas'}</span>
          </div>
        </motion.div>
      )}
      {save.duels.got.length > 0 && (
        <motion.p className="note" variants={rise}>
          Você já aceitou {save.duels.got.length} {save.duels.got.length === 1 ? 'desafio' : 'desafios'}.
        </motion.p>
      )}
      <motion.div className="actions" variants={rise}>
        {played ? (
          <PixelButton tone="red" wide onClick={() => void challenge()}>
            Desafiar alguém
          </PixelButton>
        ) : (
          <PixelButton tone="red" wide onClick={() => go('chuta')}>
            Jogar o de hoje primeiro ▶
          </PixelButton>
        )}
      </motion.div>
    </ViralPage>
  )
}
