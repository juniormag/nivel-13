// Entrar no movimento: compromisso de votar, declaração anônima e o checklist do dia.
// Nenhuma recompensa ligada à escolha: não vale ponto, XP nem prêmio.
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { sfx } from '../../audio/audio'
import { CONFIG } from '../../config'
import { api } from '../../lib/api'
import { ShareSheet, shareText } from '../../share/ShareSheet'
import { levelsDone, type Movimento, useSave } from '../../state/save'
import { CountdownBlocks } from '../../ui/Countdown'
import { rise } from '../../ui/motion'
import { PixelButton, PixelLink, Tap } from '../../ui/PixelButton'
import { Page, Screen } from '../../ui/Shell'
import { go } from '../nav'

const OPTIONS: [Movimento, string, string][] = [
  ['vou', 'Vou votar 13', 'Já decidi e vou lá no domingo.'],
  ['virei', 'Virei meu voto para o 13', 'Mudei de ideia vendo os fatos.'],
  ['pensando', 'Ainda estou pensando', 'Quero ver mais fatos antes.'],
]

const CHECKLIST: [string, string][] = [
  ['🪪', 'Documento oficial com foto (RG, CNH, carteira de trabalho, passaporte) ou o e-Título com foto.'],
  ['🕗', 'Urnas abertas das 8h às 17h, horário de Brasília.'],
  ['📍', 'Confira seu local de votação no app e-Título ou no site do TSE.'],
  ['📵', 'Celular fica com o mesário: é proibido na cabine.'],
  ['📝', 'Pode levar a "cola" em papel com o número.'],
]

export default function Votar() {
  const save = useSave()
  const choice = save.movimento
  const [share, setShare] = useState(false)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const pick = (k: Movimento) => {
    if (k === choice) return
    save.patch({ movimento: k })
    sfx('good')
    void api.movimento(k)
  }
  const move = (i: number) => {
    const n = (i + OPTIONS.length) % OPTIONS.length
    const opt = OPTIONS[n]
    if (!opt) return
    pick(opt[0])
    refs.current[n]?.focus()
  }
  const focusIdx = Math.max(
    0,
    OPTIONS.findIndex(([k]) => k === choice),
  )

  return (
    <Screen world={levelsDone(save) / 13} className="scr--page">
      <Page eyebrow="Segundo turno" title="Entrar no movimento" tone="red">
        <motion.div variants={rise}>
          <CountdownBlocks />
        </motion.div>
        <motion.p variants={rise}>Segundo turno: {CONFIG.electionLabel}.</motion.p>
        <motion.div className="vote-opts" role="radiogroup" aria-label="Sua escolha" variants={rise}>
          {OPTIONS.map(([k, label, sub], i) => (
            <Tap
              key={k}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="radio"
              sound={null}
              aria-checked={choice === k}
              tabIndex={i === focusIdx ? 0 : -1}
              className="vopt"
              onClick={() => pick(k)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') move(i + 1)
                else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') move(i - 1)
                else return
                e.preventDefault()
              }}
            >
              <span className="radio" aria-hidden="true" />
              <b>{label}</b>
              <small>{sub}</small>
            </Tap>
          ))}
        </motion.div>
        <motion.p className="note" variants={rise}>
          Sua escolha entra só na contagem por estado, sem nome. Você pode mudar quando quiser. Não vale
          prêmio nem ponto.
        </motion.p>
        {choice === 'pensando' && (
          <motion.div className="actions" variants={rise} initial="hidden" animate="show">
            <PixelButton tone="red" onClick={() => go('map')}>
              Ver os fatos nas 13 fases
            </PixelButton>
            <PixelButton onClick={() => go('colecao')}>Ler todas as cartas</PixelButton>
          </motion.div>
        )}
        {(choice === 'vou' || choice === 'virei') && (
          <motion.div className="actions" variants={rise} initial="hidden" animate="show">
            <PixelButton tone="red" onClick={() => setShare(true)}>
              Gerar meu card
            </PixelButton>
            <PixelButton
              onClick={() =>
                void shareText(
                  'Domingo é dia de votar. Bora junto? Antes, joga isso aqui: 13 fases, tudo com fonte.',
                )
              }
            >
              Chamar alguém para votar
            </PixelButton>
          </motion.div>
        )}
        <motion.h2 variants={rise}>Checklist do dia</motion.h2>
        <motion.ul className="plist check" variants={rise}>
          {CHECKLIST.map(([ico, t]) => (
            <li key={t}>
              <span className="ico" aria-hidden="true">
                {ico}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </motion.ul>
        <motion.div className="actions" variants={rise}>
          <PixelLink href="https://www.tse.jus.br/" target="_blank" rel="noopener noreferrer">
            Site do TSE ↗
          </PixelLink>
        </motion.div>
      </Page>
      {share && (choice === 'vou' || choice === 'virei') && (
        <ShareSheet moment={{ kind: 'movimento', escolha: choice }} onClose={() => setShare(false)} />
      )}
    </Screen>
  )
}
