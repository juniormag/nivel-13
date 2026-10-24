// Desafio do Dia: 5 mensagens iguais para o Brasil inteiro, uma tentativa por dia, resultado em emoji.
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { playMusic } from '../../audio/audio'
import { STATEMENTS, type Statement } from '../../content/statements'
import { api } from '../../lib/api'
import { hashStr, mulberry32, shuffle } from '../../lib/rng'
import { dailyNumber, msToNextDay, todayBR } from '../../lib/time'
import { ShareSheet, shareText } from '../../share/ShareSheet'
import { getSave, levelsDone, useSave } from '../../state/save'
import { useNow } from '../../ui/hooks'
import { rise, steps } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { Page, Screen } from '../../ui/Shell'
import { go } from '../nav'
import type { CustomRun } from './Play'

export function dailyStatements(date = todayBR()): Statement[] {
  return shuffle(STATEMENTS, mulberry32(hashStr(`nivel13:${date}`))).slice(0, 5)
}

const emoji = (grid: string) => [...grid].map((c) => (c === '1' ? '🟩' : '🟥')).join('')

function startRun(date: string, n: number, list: Statement[]) {
  const marks: boolean[] = []
  const run: CustomRun = {
    kind: 'swipe',
    opts: { statements: list, perCard: 12, onAnswer: (_s: Statement, ok: boolean) => marks.push(ok) },
    title: 'Fato ou Fake',
    sub: `Desafio #${n}`,
    intro: 'Arraste a mensagem: esquerda é fake, direita é fato. Tem 12 segundos cada.',
    how: ['← Fake', 'Fato →'],
    hearts: 0,
    onEnd: () => {
      const grid = list.map((_, i) => (marks[i] ? '1' : '0')).join('')
      getSave().recordDaily(date, grid)
      void api.daily(date, marks.filter(Boolean).length)
      go('daily')
    },
  }
  go('play', { custom: run })
}

export default function Daily() {
  const save = useSave()
  const date = todayBR()
  const n = dailyNumber(date)
  const res = save.daily.results[date]
  const list = dailyStatements(date)
  const [share, setShare] = useState(false)
  const [avg, setAvg] = useState('')
  useNow(60000)

  useEffect(() => {
    playMusic('title')
    if (!res) return
    let alive = true
    void api.stats().then((s) => {
      if (alive && s?.daily && s.daily.plays > 0)
        setAvg(
          `Hoje: ${s.daily.plays.toLocaleString('pt-BR')} jogaram, média ${s.daily.avg.toFixed(1).replace('.', ',')}/5.`,
        )
    })
    return () => {
      alive = false
    }
  }, [res])

  const streak = save.daily.streak
  const world = levelsDone(save) / 13

  if (!res) {
    return (
      <Screen world={world} className="scr--page">
        <Page eyebrow={`Desafio do dia #${n}`} title="Fato ou fake?" tone="red">
          <motion.p variants={rise}>
            5 mensagens, as mesmas para o Brasil inteiro. Uma tentativa por dia. Depois, compare com seus
            amigos.
          </motion.p>
          <motion.div className="grid5" aria-hidden="true" variants={rise}>
            {list.map((s) => (
              <i key={s.id} style={{ background: 'var(--stone-0)', boxShadow: '0 0 0 2px var(--stone-1)' }} />
            ))}
          </motion.div>
          {streak > 0 && (
            <motion.p className="streak" variants={rise}>
              Sequência atual: {streak} {streak === 1 ? 'dia' : 'dias'}
            </motion.p>
          )}
          <motion.div className="actions actions--end" variants={rise}>
            <PixelButton tone="ghost" commit="back" onClick={() => go('title')}>
              Voltar
            </PixelButton>
            <PixelButton tone="red" size="big" onClick={() => startRun(date, n, list)}>
              Jogar ▶
            </PixelButton>
          </motion.div>
        </Page>
      </Screen>
    )
  }

  const hits = [...res].filter((c) => c === '1').length
  const textShare = `Nível 13 · Desafio #${n}\n${emoji(res)} ${hits}/5${streak > 1 ? ` · 🔥 ${streak} dias` : ''}`
  const ms = msToNextDay()

  return (
    <Screen world={world} className="scr--page">
      <Page eyebrow={`Desafio do dia #${n}`} title={`${hits}/5 fatos`} tone="gold">
        <motion.div className="grid5" role="img" aria-label={`${hits} de 5 acertos`} variants={rise}>
          {[...res].map((c, i) => (
            <motion.i
              // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa da grade
              key={i}
              className={c === '1' ? 'ok' : ''}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.15, ease: steps(3) }}
            />
          ))}
        </motion.div>
        {streak > 1 && (
          <motion.p className="streak" variants={rise}>
            🔥 {streak} dias seguidos
          </motion.p>
        )}
        {avg && (
          <motion.p className="note" variants={rise}>
            {avg}
          </motion.p>
        )}
        <motion.div className="actions" variants={rise}>
          <PixelButton tone="red" wide onClick={() => void shareText(textShare)}>
            Mandar no WhatsApp
          </PixelButton>
          <PixelButton wide onClick={() => setShare(true)}>
            Card para o story
          </PixelButton>
        </motion.div>
        <motion.h2 variants={rise}>As mensagens de hoje</motion.h2>
        <motion.ul className="plist stmt" variants={rise}>
          {list.map((s, i) => (
            <li key={s.id}>
              <span
                className={`mark${res[i] === '1' ? ' ok' : ''}`}
                role="img"
                aria-label={res[i] === '1' ? 'Acertou' : 'Errou'}
              />
              <div>
                <div>{s.text}</div>
                <span className="exp">
                  <span className={`verdict ${s.fato ? 'fato' : 'fake'}`}>{s.fato ? 'FATO' : 'FAKE'}</span>
                  {s.exp}
                </span>
              </div>
            </li>
          ))}
        </motion.ul>
        <motion.p className="note" variants={rise}>
          Próximo desafio em {Math.floor(ms / 3600000)}h
          {String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}.
        </motion.p>
      </Page>
      {share && (
        <ShareSheet
          moment={{ kind: 'daily', n, grid: [...res].map((c) => c === '1'), streak }}
          onClose={() => setShare(false)}
        />
      )}
    </Screen>
  )
}
