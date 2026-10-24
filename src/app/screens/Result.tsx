// Depois de cada fase: estrelas, XP subindo e a carta (ou cartas) de fato conquistada.
// Momentos de compartilhar: 3 estrelas e, na fase 3, a economia do IR.
import { AnimatePresence, motion } from 'motion/react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { playMusic, sfx, stinger } from '../../audio/audio'
import { factById } from '../../content/facts'
import { LEVELS } from '../../content/levels'
import { ShareSheet } from '../../share/ShareSheet'
import type { Moment } from '../../share/types'
import { levelsDone, useSave, XP_MAX, xpTotal } from '../../state/save'
import { FactCard } from '../../ui/FactCard'
import { fmt } from '../../ui/hooks'
import { Banner, Corners, IconTile, StarRow, useBeats } from '../../ui/LevelCard'
import { pop, prefersReduced, rise, stagger } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { haptic } from '../../ui/prefs'
import { Screen } from '../../ui/Shell'
import { XPBar } from '../../ui/XPBar'
import { go, useNav } from '../nav'

// src/games/ir.ts é do gameplay-engineer; se ainda não existir, o card do IR só não aparece.
type IrMod = { economiaIR?: (salario: number) => { ano: number } }
const irLoader = import.meta.glob<IrMod>('../../games/ir.ts')['../../games/ir.ts']

function useEconomiaAno(monthly: number | null, enabled: boolean) {
  const [ano, setAno] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled || monthly === null || !irLoader) return
    let alive = true
    irLoader()
      .then((m) => {
        if (alive && m.economiaIR) setAno(m.economiaIR(monthly).ano)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [monthly, enabled])
  return ano
}

const cardKey = (lv: { n: number } | undefined, i: number) => (lv ? `${lv.n}:${i}` : '')

/**
 * XP que viaja: 6 orbes de ouro saem das estrelas e caem na ponta da barra em arco, em degraus;
 * cada chegada toca uma moeda em escada. Chama onLand quando o último chega (ou já, sem movimento).
 */
function useXpFlight(
  run: boolean,
  from: RefObject<HTMLElement | null>,
  to: RefObject<HTMLElement | null>,
  layer: RefObject<HTMLElement | null>,
  onLand: () => void,
) {
  const land = useRef(onLand)
  land.current = onLand
  useEffect(() => {
    if (!run) return
    const a = from.current?.getBoundingClientRect()
    const b = to.current?.getBoundingClientRect()
    const host = layer.current
    const hb = host?.getBoundingClientRect()
    if (!a || !b || !host || !hb || prefersReduced() || typeof Element.prototype.animate !== 'function') {
      land.current()
      return
    }
    const ax = Math.round(a.left + a.width / 2 - hb.left)
    const ay = Math.round(a.top + a.height / 2 - hb.top)
    const bx = Math.round(b.left + b.width - 6 - hb.left)
    const by = Math.round(b.top + b.height / 2 - hb.top)
    const els: HTMLElement[] = []
    const timers: number[] = []
    const N = 6
    for (let i = 0; i < N; i++) {
      const el = document.createElement('i')
      el.className = 'mt-orb'
      el.style.left = `${ax}px`
      el.style.top = `${ay}px`
      host.appendChild(el)
      els.push(el)
      const sx = (i - (N - 1) / 2) * 10
      const dx = bx - ax
      const dy = by - ay
      el.animate(
        [
          { transform: 'translate(0px, 0px)', opacity: 0 },
          { transform: `translate(${sx}px, -18px)`, opacity: 1, offset: 0.2 },
          {
            transform: `translate(${Math.round(dx * 0.6 + sx)}px, ${Math.round(dy * 0.4 - 26)}px)`,
            offset: 0.6,
          },
          { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 },
        ],
        { duration: 560, delay: i * 70, easing: 'steps(14, end)', fill: 'forwards' },
      )
      timers.push(
        window.setTimeout(
          () => {
            el.remove()
            sfx('coin', { combo: i })
            if (i === N - 1) land.current()
          },
          560 + i * 70,
        ),
      )
    }
    return () => {
      for (const t of timers) clearTimeout(t)
      for (const el of els) el.remove()
    }
  }, [run, from, to, layer])
}

export default function Result() {
  const params = useNav((s) => s.params)
  const n = Number(params.level ?? 1)
  const lv = LEVELS[n - 1]
  const save = useSave()
  const [i, setI] = useState(0)
  const [share, setShare] = useState<Moment | null>(null)
  const next = useRef<HTMLButtonElement>(null)
  const ano = useEconomiaAno(save.irMonthly, lv?.kind === 'ir')
  // vindo da vitória, as estrelas já bateram lá: aqui elas só brilham. XP ganho vem por parâmetro.
  const seen = !!params.seen
  const gained = Math.max(0, Number(params.xp ?? 0) || 0)
  const nStars = lv ? (save.stars[n - 1] ?? 0) : 0
  const starTimes = seen ? [] : [380, 740, 1100].slice(0, Math.max(1, nStars))
  const flyAt = (starTimes[starTimes.length - 1] ?? 200) + 280
  const beats = useBeats([...starTimes, flyAt, flyAt + 900])
  const flying = gained > 0 && beats.stage >= starTimes.length + 1 && !beats.skipped
  const [landed, setLanded] = useState(false)
  const starsRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  useXpFlight(flying, starsRef, barRef, layerRef, () => {
    setLanded(true)
    haptic('success')
  })
  const xpLanded = landed || beats.skipped || gained === 0

  useEffect(() => {
    if (!lv) {
      go('map')
      return
    }
    playMusic('victory')
    stinger('win')
  }, [lv])
  // a cada carta, o foco vai para a próxima ação
  const card = cardKey(lv, i)
  useEffect(() => {
    if (!card) return
    const t = window.setTimeout(() => next.current?.focus({ preventScroll: true }), 260)
    return () => clearTimeout(t)
  }, [card])

  if (!lv) return null
  const facts = lv.facts.map(factById).filter((f) => !!f)
  const f = facts[i]
  const isLast = i >= facts.length - 1
  const stars = nStars
  const score = save.best[n - 1] ?? 0
  const done = levelsDone(save)

  return (
    <Screen world={done / 13} className="scr--page">
      <motion.div className="res" variants={stagger(0.06, 0.05)} initial="hidden" animate="show">
        <motion.header
          className="res-head mt-res-head"
          variants={rise}
          onPointerDownCapture={beats.onPointerDownCapture}
        >
          <Corners />
          <div className="mt-res-banner">
            <Banner size="sm">Fase {n} concluída</Banner>
            <span className="mt-res-count">{done}/13</span>
          </div>
          <h1>{lv.title}</h1>
          <div ref={starsRef} className={seen ? 'mt-glint' : ''}>
            <StarRow
              n={stars}
              landed={seen ? stars : beats.stage}
              instant={seen || beats.skipped}
              size="mid"
            />
          </div>
          <div className={`res-xp mt-res-xp${landed ? ' is-land' : ''}`} ref={barRef}>
            <XPBar
              value={xpLanded ? xpTotal(save) : xpTotal(save) - gained}
              max={XP_MAX}
              label="Experiência total"
              sound
            />
            {gained > 0 && (
              <span className={`mt-xpchip${xpLanded ? ' mt-xpchip--pop' : ' is-wait'}`}>
                +{fmt(gained)} XP
              </span>
            )}
          </div>
          <div ref={layerRef} className="mt-orbs" aria-hidden="true" />
        </motion.header>

        {facts.length > 1 && (
          <motion.div className="res-pager" variants={rise} aria-live="polite">
            Carta {i + 1} de {facts.length}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {f && (
            <motion.div
              key={f.id}
              variants={pop}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ width: '100%' }}
              className="mt-reward"
            >
              <div className="mt-reward-kicker">
                <IconTile name="cards" tone="gold" />
                <span>{i === 0 ? 'Fato conquistado' : 'Mais um fato'}</span>
              </div>
              <div className="mt-reward-card">
                <Corners />
                <FactCard fact={f} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(stars === 3 || (ano !== null && ano > 0)) && (
          <motion.div className="res-share pf pf--red" variants={rise}>
            {ano !== null && ano > 0 ? (
              <p>
                Sua conta: a isenção deixa <b>R$ {fmt(Math.round(ano))}</b> por ano no seu bolso.
              </p>
            ) : (
              <p>Três estrelas. Mostre para quem duvida que você chega ao nível 13.</p>
            )}
            {ano !== null && ano > 0 && (
              <PixelButton tone="gold" onClick={() => setShare({ kind: 'ir', perYear: ano })}>
                Compartilhar minha economia
              </PixelButton>
            )}
            {stars === 3 && (
              <PixelButton
                tone={ano ? 'stone' : 'gold'}
                onClick={() => setShare({ kind: 'stars3', level: n, title: lv.title, score })}
              >
                Compartilhar
              </PixelButton>
            )}
          </motion.div>
        )}

        <motion.div className="actions res-nav" variants={rise}>
          <PixelButton tone="ghost" commit="back" onClick={() => go('map')}>
            Mapa
          </PixelButton>
          {isLast ? (
            <PixelButton
              ref={next}
              tone="red"
              size="big"
              onClick={() => (n < 13 ? go('play', { level: n + 1 }) : go('final'))}
            >
              {n < 13 ? `Fase ${n + 1} ▶` : 'Final ▶'}
            </PixelButton>
          ) : (
            <PixelButton ref={next} tone="red" size="big" onClick={() => setI((k) => k + 1)}>
              Próxima carta ▶
            </PixelButton>
          )}
        </motion.div>
      </motion.div>
      {share && <ShareSheet moment={share} onClose={() => setShare(null)} />}
    </Screen>
  )
}
