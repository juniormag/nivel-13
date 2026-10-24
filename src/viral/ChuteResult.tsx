// Resultado do Chuta Aí: total contando, grade, percentil, sequência, painel de share que não bloqueia
// (Mandar no grupo · Tira-teima · Card · Copiar), duelo lado a lado, placar do grupo, Papo e Plano.
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { go } from '../app/nav'
import { sfx, stinger } from '../audio/audio'
import { CONFIG } from '../config'
import { MAX_TOTAL, total as sumTotal } from '../lib/score'
import { msToNextDay, todayBR } from '../lib/time'
import { ShareSheet } from '../share/ShareSheet'
import { getSave, useSave } from '../state/save'
import { fmt, useCountUp, useNow } from '../ui/hooks'
import { rise, stagger, steps } from '../ui/motion'
import { PixelButton } from '../ui/PixelButton'
import { toast } from '../ui/Toast'
import { ev, viralApi } from './api'
import { DuelCompare } from './DuelCompare'
import { fmtValue } from './format'
import { GroupJoin } from './GroupJoin'
import { ScoreTile, TIER_LABEL, tier } from './Reveal'
import { type PlayRound, roundsFor } from './rounds'
import { chuteUrl, copyText, duelText, groupText, myDuelToken, rematchText, sendText } from './share'
import type { Landing } from './store'

const ELECTION_DAY = CONFIG.electionAt.toISOString().slice(0, 10)

export function ChuteResult({
  landing,
  rounds,
  s,
  guesses,
  pct,
  fresh,
}: {
  landing: Landing
  rounds: PlayRound[]
  s: number[]
  guesses: (number | null)[]
  pct: number | null
  fresh: boolean
}) {
  const save = useSave()
  const { n, date, duel, group } = landing
  const tot = sumTotal(s)
  const shown = useCountUp(tot, { from: fresh ? 0 : tot, ms: 600, tick: fresh })
  const [card, setCard] = useState(false)
  const themes = rounds.map((r) => r.theme)
  // código do servidor (pré-criado aqui: o navigator.share tem de ser a 1ª coisa assíncrona do toque);
  // sem backend, o token v1 do cliente faz o mesmo papel
  const [code, setCode] = useState<string | null>(null)
  const token = code ?? myDuelToken(n, s)
  useEffect(() => {
    let alive = true
    void viralApi.duelCode(date, s).then((c) => {
      if (alive && c) setCode(c)
    })
    return () => {
      alive = false
    }
  }, [date, s])
  const streak = date === todayBR() ? save.daily.streak : 0
  const headRef = useRef<HTMLHeadingElement>(null)
  useNow(60000)

  useEffect(() => {
    headRef.current?.focus({ preventScroll: true })
    if (!fresh) return
    const t = window.setTimeout(() => sfx('total'), 620)
    const st = streak > 1 ? window.setTimeout(() => stinger('streak'), 1300) : 0
    return () => {
      clearTimeout(t)
      clearTimeout(st)
    }
  }, [fresh, streak])

  const hookTheme = useMemo(() => {
    let worst = -1
    s.forEach((v, i) => {
      if (v < 35 && (worst < 0 || v < (s[worst] ?? 100))) worst = i
    })
    const bull = s.indexOf(100)
    return themes[worst >= 0 ? worst : bull >= 0 ? bull : 0] ?? ''
  }, [s, themes])

  const share = async (kind: 'group' | 'duel' | 'rematch') => {
    ev('share_open', kind === 'group' ? 'text' : 'duel')
    if (kind !== 'group') {
      if (!save.duels.made.includes(token))
        save.patch({ duels: { ...save.duels, made: [...save.duels.made, token] } })
      ev('duel_create')
    }
    const link = chuteUrl(n, {
      duel: token,
      group,
      s: kind === 'group' ? (group ? 'wa_grupo' : 'wa') : 'duelo',
    })
    const text =
      kind === 'group'
        ? groupText(n, s, tot, themes, link)
        : kind === 'rematch' && duel
          ? rematchText(n, { s, total: tot }, { s: duel.s, total: sumTotal(duel.s), name: duel.name }, link)
          : duelText(n, tot, link)
    const r = await sendText(text)
    ev(r === 'abort' ? 'share_abort' : r === 'wa' ? 'wa_text_click' : 'share_done', kind)
  }

  const copy = async () => {
    const ok = await copyText(groupText(n, s, tot, themes, chuteUrl(n, { duel: token, group, s: 'link' })))
    toast(ok ? 'Copiado. É só colar no grupo.' : 'Não deu para copiar aqui.', ok ? 'gold' : 'stone')
  }

  const tomorrow = useMemo(() => {
    const d = new Date(`${todayBR()}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    return roundsFor(d.toISOString().slice(0, 10))[0]?.theme ?? null
  }, [])
  const ms = msToNextDay()
  const showPlano = todayBR() <= ELECTION_DAY

  return (
    <motion.div className="cx-result" variants={stagger(0.05, 0.02)} initial="hidden" animate="show">
      <motion.header className="cx-res-head pf pf--hud pf--bracket" variants={rise}>
        <div className="eyebrow">
          Chuta Aí! #{n}
          {date !== todayBR() && ' · arquivo'}
        </div>
        <h1
          ref={headRef}
          tabIndex={-1}
          className="cx-res-total"
          aria-label={`${fmt(tot)} de ${fmt(MAX_TOTAL)} pontos`}
        >
          <b aria-hidden="true">{fmt(shown)}</b>
          <small aria-hidden="true">/{fmt(MAX_TOTAL)}</small>
        </h1>
        <div
          className="cx-res-grid"
          role="img"
          aria-label={s.map((v, i) => `rodada ${i + 1}: ${TIER_LABEL[tier(v)]}`).join(', ')}
        >
          {s.map((v, i) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa da grade
              key={i}
              initial={fresh ? { opacity: 0, y: 6, scale: 0.94 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.35 + i * 0.09, duration: 0.15, ease: steps(3) }}
              onAnimationStart={() => {
                if (fresh) window.setTimeout(() => sfx('star', { combo: i }), 350 + i * 90)
              }}
            >
              <ScoreTile s={v} />
            </motion.span>
          ))}
        </div>
        <dl className="cx-res-stats">
          {pct !== null && (
            <div>
              <dt>Melhor que</dt>
              <dd>
                <span className="cx-bar" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, k) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: segmentos fixos
                    <i key={k} className={k < Math.round(pct / 10) ? 'on' : undefined} />
                  ))}
                </span>
                <b>{pct}%</b>
                <span className="sr-only"> do Brasil hoje</span>
              </dd>
            </div>
          )}
          {streak > 0 && (
            <div>
              <dt>Sequência</dt>
              <dd>
                <b className="cx-streak">
                  {streak} {streak === 1 ? 'dia' : 'dias'}
                </b>
              </dd>
            </div>
          )}
        </dl>
      </motion.header>

      {duel && (
        <DuelCompare
          me={{ s }}
          them={{ s: duel.s, name: duel.name }}
          onRematch={() => void share('rematch')}
          onChallenge={() => void share('duel')}
        />
      )}

      <motion.section className="cx-share pf pf--hud" aria-labelledby="cx-share-h" variants={rise}>
        <h2 id="cx-share-h">Desafie a família</h2>
        <p className="cx-share-sub">
          Sem spoiler: vai a grade e uma pergunta. Quem recebe chuta antes de abrir.
        </p>
        <PixelButton tone={duel ? 'stone' : 'red'} size="big" wide onClick={() => void share('group')}>
          Mandar no grupo
        </PixelButton>
        <div className="cx-share-row">
          {!duel && <PixelButton onClick={() => void share('duel')}>Tira-teima</PixelButton>}
          <PixelButton onClick={() => setCard(true)}>Card</PixelButton>
          <PixelButton onClick={() => void copy()}>Copiar</PixelButton>
        </div>
      </motion.section>

      {group && <GroupJoin code={group} date={date} />}

      <motion.section className="cx-next-steps" variants={rise} aria-label="Depois do jogo">
        <button type="button" className="cx-link-card pf pf--hud" onClick={() => go('papo')}>
          <span className="cx-lc-k">Papo de Almoço</span>
          <span className="cx-lc-t">Tem alguém que você quer chamar pra conversar?</span>
          <span className="cx-lc-go" aria-hidden="true">
            ▶
          </span>
        </button>
        {showPlano && (
          <button type="button" className="cx-link-card pf pf--hud" onClick={() => go('plano')}>
            <span className="cx-lc-k">Meu plano de domingo</span>
            <span className="cx-lc-t">
              {save.plano ? 'Ver o meu plano' : 'Que horas, qual documento e com quem.'}
            </span>
            <span className="cx-lc-go" aria-hidden="true">
              ▶
            </span>
          </button>
        )}
        {save.groups.length > 0 && !group && (
          <button
            type="button"
            className="cx-link-card pf pf--hud"
            onClick={() => go('grupo', { code: save.groups[0] })}
          >
            <span className="cx-lc-k">Placar do grupo</span>
            <span className="cx-lc-t">Veja quem já jogou hoje.</span>
            <span className="cx-lc-go" aria-hidden="true">
              ▶
            </span>
          </button>
        )}
      </motion.section>

      <motion.section className="cx-answers" aria-labelledby="cx-ans-h" variants={rise}>
        <h2 id="cx-ans-h">As respostas de hoje</h2>
        <ol>
          {rounds.map((r, i) => {
            const g = guesses[i] ?? null
            const v = s[i] ?? 5
            const src = r.sources[0]
            const ans = r.kind === 'number' ? fmtValue(r, r.answer) : (r.options[r.correct] ?? '')
            const mine =
              g === null ? 'sem chute' : r.kind === 'number' ? fmtValue(r, g) : (r.options[g] ?? '')
            return (
              <li key={r.id}>
                <ScoreTile s={v} size="sm" label={TIER_LABEL[tier(v)]} />
                <div>
                  <p className="cx-ans-q">{r.q}</p>
                  <p className="cx-ans-a">
                    <b>{ans}</b> <span>· você: {mine}</span>
                  </p>
                  {src && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => ev('source_open', r.id)}
                    >
                      {src.name} ↗<span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </motion.section>

      <motion.p className="cx-teaser" variants={rise}>
        {tomorrow ? `Amanhã: um número sobre ${tomorrow}. ` : 'Amanhã tem mais. '}
        Em {Math.floor(ms / 3600000)}h{String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}.
      </motion.p>

      <motion.div className="cx-res-foot" variants={rise}>
        <PixelButton tone="ghost" onClick={() => go('title')}>
          Voltar ao início
        </PixelButton>
        {getSave().stars.every((x) => x === 0) && (
          <PixelButton onClick={() => go(getSave().onboarded ? 'map' : 'onboard')}>
            Jogar a jornada ▶
          </PixelButton>
        )}
      </motion.div>

      {card && (
        <ShareSheet
          moment={{ kind: 'chute', n, s, total: tot, theme: hookTheme }}
          onClose={() => setCard(false)}
        />
      )}
    </motion.div>
  )
}
