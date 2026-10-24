// "Seu mapa": os 6 pinos com as linhas, o total, a grade estilo MapTap e os botões de share.
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../../audio/audio'
import { CONFIG } from '../../config'
import type { Pin } from '../../content/onde'
import { track, waUrl } from '../../share/caps'
import { getSave } from '../../state/save'
import { useCountUp } from '../../ui/hooks'
import { rise, stagger } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { ev } from '../../viral/api'
import type { OndeCardData } from './card'
import type { Mark } from './draw'
import type { Pt } from './geo'
import {
  challengeText,
  fmtInt,
  fmtKm,
  gridLines,
  ONDE_MAX,
  ondeLink,
  ondeTotal,
  pinPt,
  seedLabel,
  shareText,
  weightOf,
} from './logic'
import { MapBoard } from './MapBoard'
import { OndeShare } from './OndeShare'

export interface EndRow {
  pin: Pin
  guess: Pt
  km: number
  s: number
}

export function EndView({
  seed,
  rows,
  vs,
  fresh,
  L,
  S,
  onAgain,
  onHome,
}: {
  seed: string
  rows: EndRow[]
  vs: number | null
  fresh: boolean
  L: number
  S: number
  onAgain: () => void
  onHome: () => void
}) {
  const [sharing, setSharing] = useState(false)
  const total = ondeTotal(rows.map((r) => r.s))
  const shown = useCountUp(total, { from: fresh ? 0 : total, ms: 600, tick: fresh ? 'tick' : null })
  const head = useRef<HTMLHeadingElement>(null)
  const ref = getSave().id
  const link = ondeLink(CONFIG.siteUrl, seed, { vs: total, ref, s: 'wa' })
  const sides = rows.map((r) => r.pin.side)
  const kms = rows.map((r) => r.km)
  const text = shareText(seed, sides, kms, total, link)
  const dare = challengeText(seed, total, ondeLink(CONFIG.siteUrl, seed, { vs: total, ref, s: 'wa_desafio' }))
  const lines = gridLines(sides, kms)

  useEffect(() => {
    head.current?.focus({ preventScroll: true })
    if (fresh) window.setTimeout(() => sfx('total'), 120)
  }, [fresh])

  const marks: Mark[] = useMemo(
    () =>
      rows.map((r) => ({
        side: r.pin.side,
        guess: r.guess,
        target: pinPt(r.pin),
        line: 1,
        pin: true,
        small: true,
      })),
    [rows],
  )
  const card: OndeCardData = useMemo(
    () => ({
      seed,
      total,
      marks: rows.map((r) => ({ side: r.pin.side, guess: r.guess, target: pinPt(r.pin) })),
    }),
    [seed, total, rows],
  )

  const rival =
    vs !== null
      ? total > vs
        ? `Quem te chamou fez ${fmtInt(vs)}. Você ganhou!`
        : total === vs
          ? `Empate em ${fmtInt(vs)}. Revanche?`
          : `Quem te chamou fez ${fmtInt(vs)}. Faltaram ${fmtInt(vs - total)}.`
      : null

  return (
    <motion.div className="onde-end" variants={stagger(0.05, 0.02)} initial="hidden" animate="show">
      <motion.header className="onde-end-head" variants={rise}>
        <p className="onde-end-kicker">Onde Foi? {seedLabel(seed)}</p>
        <h1 ref={head} tabIndex={-1}>
          Seu mapa
        </h1>
        <p className="onde-end-total">
          <b aria-hidden="true">{fmtInt(shown)}</b>
          <span aria-hidden="true">/{fmtInt(ONDE_MAX)}</span>
          <span className="sr-only">{`${total} de ${ONDE_MAX} pontos`}</span>
        </p>
        {rival && <p className="onde-end-rival pf pf--red">{rival}</p>}
      </motion.header>

      <div className="onde-end-main">
        <motion.div className="onde-end-map" variants={rise}>
          <MapBoard
            L={L}
            S={S}
            marks={marks}
            guess={null}
            interactive={false}
            label={`Seu mapa com os ${rows.length} pinos e as linhas do seu toque até o lugar certo`}
          />
        </motion.div>

        <div className="onde-end-side">
          <motion.div className="onde-end-cta" variants={rise}>
            <PixelButton tone="red" size="big" wide onClick={() => setSharing(true)}>
              Compartilhar
            </PixelButton>
            <a
              className="btn btn--gold btn--wide onde-wa"
              href={waUrl(dare)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track('wa_text_click', 'onde-desafio')
                ev('duel_create', 'onde')
              }}
            >
              Desafiar no WhatsApp
            </a>
          </motion.div>
          <motion.figure className="onde-grid pf pf--hud" variants={rise}>
            <figcaption className="sr-only">Texto que vai no WhatsApp</figcaption>
            <p>
              Onde Foi? {seedLabel(seed)} · {fmtInt(total)}/{fmtInt(ONDE_MAX)}
            </p>
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </motion.figure>

          <motion.ol className="onde-end-list" variants={rise} aria-label="Seus pinos">
            {rows.map((r, i) => (
              <li key={r.pin.id} className={`is-${r.pin.side}`}>
                <i className={`onde-dot is-${r.pin.side}`} aria-hidden="true" />
                <span className="onde-end-place">
                  <b>{r.pin.title}</b>
                  <small>{r.pin.place}</small>
                </span>
                <span className="onde-end-km">{fmtKm(r.km)}</span>
                <span className="onde-end-pts">+{fmtInt(r.s * weightOf(i))}</span>
              </li>
            ))}
          </motion.ol>

          <motion.div className="onde-end-row" variants={rise}>
            <PixelButton onClick={onAgain}>Jogar de novo</PixelButton>
            <Tap className="btn btn--ghost" commit="back" onClick={onHome}>
              Início
            </Tap>
          </motion.div>
        </div>
      </div>
      {sharing && <OndeShare data={card} text={text} link={link} onClose={() => setSharing(false)} />}
    </motion.div>
  )
}
