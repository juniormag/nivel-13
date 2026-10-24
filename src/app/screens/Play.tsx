// Tela de fase: hospeda o Runner (PixiJS) e desenha o HUD, as habilidades e os overlays em React.
import { useEffect, useRef, useState } from 'react'
import { playMusic, sfx, stinger } from '../../audio/audio'
import { LEVELS, type GameKind, type Level } from '../../content/levels'
import { Runner } from '../../engine/runner'
import type { MicroGame } from '../../engine/types'
import { loadGame } from '../../games'
import { getSave, levelsDone, useSave } from '../../state/save'
import { type SkillKind, usePlay } from '../../state/play'
import { CountUp } from '../../ui/CountUp'
import { Hearts } from '../../ui/Hearts'
import { fmt, useCountUp } from '../../ui/hooks'
import { Banner, Corners, IconTile, LevelCard, SegBar, StarRow, tipIcon, useBeats } from '../../ui/LevelCard'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { SkillBar } from '../../ui/SkillBar'
import { go, useNav } from '../nav'

export interface CustomRun {
  kind: GameKind
  opts?: unknown
  title: string
  sub: string
  intro: string
  how: string[]
  hearts: number
  onEnd: (score: number, success: boolean) => void
}

export const SKILLS: { kind: SkillKind; label: string; key: string; unlock: number; desc: string }[] = [
  { kind: 'checar', label: 'Checar', key: 'Q', unlock: 0, desc: 'Desmonta as ameaças da tela' },
  { kind: 'lembrar', label: 'Lembrar', key: 'W', unlock: 3, desc: 'Mostra a resposta certa' },
  { kind: 'foco', label: 'Foco', key: 'E', unlock: 6, desc: 'Câmera lenta por 4 segundos' },
  { kind: 'proteger', label: 'Proteger', key: 'R', unlock: 9, desc: 'Escudo contra o próximo golpe' },
]

export const starsFor = (score: number, goal: number) => (score >= goal ? 3 : score >= goal * 0.6 ? 2 : 1)
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Play() {
  const params = useNav((s) => s.params)
  const custom = params.custom as CustomRun | undefined
  const level: Level | undefined = custom ? undefined : LEVELS[Number(params.level ?? 1) - 1]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const skillsRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<Runner | null>(null)
  const gameRef = useRef<MicroGame | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [goFlash, setGoFlash] = useState(0)
  const [end, setEnd] = useState<EndInfo | null>(null)
  const [runKey, setRunKey] = useState(0)
  const phase = usePlay((s) => s.phase)
  const hearts = usePlay((s) => s.hearts)
  const maxHearts = usePlay((s) => s.maxHearts)
  const score = usePlay((s) => s.score)
  const timeLeft = usePlay((s) => s.timeLeft)
  const duration = usePlay((s) => s.duration)
  const used = usePlay((s) => s.used)
  const slow = usePlay((s) => s.slow)
  const shield = usePlay((s) => s.shield)
  const done = useSave((s) => levelsDone(s))

  useEffect(() => {
    if (!custom && !level) {
      go('map')
      return
    }
    let disposed = false
    usePlay.setState({ phase: 'loading' })
    setEnd(null)
    playMusic(level?.n === 13 ? 'boss' : 'game')
    ;(async () => {
      const kind = custom?.kind ?? (level as Level).kind
      const game = await loadGame(kind, custom?.opts)
      if (disposed || !canvasRef.current || !layerRef.current) return
      gameRef.current = game
      const r = new Runner({
        canvas: canvasRef.current,
        layer: layerRef.current,
        game,
        theme: level?.theme ?? LEVELS[1]?.theme ?? { top: '#0a0a14', mid: '#1a1430', ground: '#141020' },
        level: level?.n,
        hearts: custom ? custom.hearts : 3,
        reduced: reducedMotion(),
        safeArea: () => ({
          top: topRef.current?.getBoundingClientRect().bottom ?? 40,
          bottom: custom ? innerHeight - 8 : (skillsRef.current?.getBoundingClientRect().top ?? innerHeight - 80),
        }),
        onEnd: ({ success, score: sc }) => {
          if (custom) {
            custom.onEnd(sc, success)
            return
          }
          const lv = level as Level
          const stars = success ? starsFor(sc, game.goal) : 0
          let firstTime = false
          if (success) firstTime = getSave().completeLevel(lv.n, stars, sc, lv.facts).firstTime
          if (success && lv.n === 13 && firstTime) {
            go('final')
            return
          }
          const { timeLeft: left, duration: dur } = usePlay.getState()
          setEnd({ success, score: sc, stars, firstTime, timeLeft: left, duration: dur, goal: game.goal })
        },
      })
      await r.init()
      if (disposed) {
        r.destroy()
        return
      }
      runnerRef.current = r
    })().catch((err) => {
      console.error(err)
      go('map')
    })
    return () => {
      disposed = true
      runnerRef.current?.destroy()
      runnerRef.current = null
      layerRef.current?.replaceChildren()
    }
    // runKey reinicia a fase
  }, [runKey, custom, level])

  // teclado
  useEffect(() => {
    const map: Record<string, SkillKind> = { q: 'checar', w: 'lembrar', e: 'foco', r: 'proteger' }
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const r = runnerRef.current
      if (!r) return
      if (down && (e.key === 'Escape' || e.key === 'p')) {
        const ph = usePlay.getState().phase
        if (ph === 'run') r.pause()
        else if (ph === 'pause') r.resume()
        return
      }
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const s = map[k]
      if (down && s && !custom) {
        triggerSkill(s)
        return
      }
      if (k.startsWith('Arrow')) e.preventDefault()
      r.key(k, down)
    }
    const kd = (e: KeyboardEvent) => onKey(e, true)
    const ku = (e: KeyboardEvent) => onKey(e, false)
    addEventListener('keydown', kd)
    addEventListener('keyup', ku)
    const vis = () => document.hidden && runnerRef.current?.pause()
    document.addEventListener('visibilitychange', vis)
    return () => {
      removeEventListener('keydown', kd)
      removeEventListener('keyup', ku)
      document.removeEventListener('visibilitychange', vis)
    }
  })

  const unlocked = (k: SkillKind) => done >= (SKILLS.find((s) => s.kind === k)?.unlock ?? 99)
  const supported = (k: SkillKind) => {
    const g = gameRef.current
    if (!g) return false
    return k === 'checar' ? !!g.clear : k === 'lembrar' ? !!g.hint : true
  }
  function triggerSkill(k: SkillKind) {
    if (!unlocked(k) || usePlay.getState().used.includes(k)) return
    runnerRef.current?.useSkill(k)
  }

  function startCountdown() {
    const reduce = reducedMotion()
    let n = reduce ? 1 : 3
    usePlay.setState({ phase: 'count' })
    const tick = () => {
      if (n === 0) {
        setCount(null)
        setGoFlash((g) => g + 1)
        sfx('go')
        void runnerRef.current?.start()
        return
      }
      // escada: 3, 2, 1 sobem dois semitons cada
      sfx('countdown', { pitch: (3 - n) * 2 })
      setCount(n)
      n--
      window.setTimeout(tick, 420)
    }
    tick()
  }

  const title = custom?.title ?? level?.title ?? ''
  const low = duration > 0 && timeLeft < 5

  return (
    <div className="play-root">
      <canvas ref={canvasRef} className="play-canvas" />
      <div ref={layerRef} className="g-layer" />
      <div className="play-hud">
        <div ref={topRef} className="play-top">
          <Hearts n={hearts} max={maxHearts} />
          <div className="play-mid">
            <div className="play-title">
              {custom ? `${custom.sub} · ` : `Fase ${level?.n} · `}
              <b>{title}</b>
            </div>
            <div
              className={`timer${low ? ' low' : ''}`}
              style={{ visibility: duration ? 'visible' : 'hidden' }}
              aria-hidden="true"
            >
              <i style={{ width: `${duration ? (timeLeft / duration) * 100 : 100}%` }} />
            </div>
          </div>
          <div className="play-right">
            <CountUp value={score} className="score" label="Pontos" />
            <Tap className="pause-btn" aria-label="Pausar" onClick={() => runnerRef.current?.pause()}>
              <i />
              <i />
            </Tap>
          </div>
        </div>
        {!custom && (
          <SkillBar
            ref={skillsRef}
            className="play-skills"
            skills={SKILLS}
            disabled={phase !== 'run'}
            state={(k) =>
              !unlocked(k) ? 'locked' : used.includes(k) ? 'used' : supported(k) ? 'ready' : 'na'
            }
            onUse={triggerSkill}
          />
        )}
        {(slow || shield) && <div className={`status-glow${shield ? ' shield' : ''}`} aria-hidden="true" />}
      </div>

      {phase === 'intro' && (
        <LevelCard
          n={level?.n}
          kicker={custom ? custom.sub : `Fase ${level?.n} de 13`}
          title={title}
          where={level?.where}
          intro={custom?.intro ?? level?.intro ?? ''}
          how={custom?.how ?? level?.how ?? []}
          best={level ? (getSave().stars[level.n - 1] ?? 0) : 0}
          onStart={startCountdown}
          onBack={() => go(custom ? 'title' : 'map')}
        />
      )}
      {count !== null && (
        <div className="overlay-center mt-count-ov" aria-live="assertive">
          <div className={`mt-count mt-count--${count}`} key={count}>
            <i className="mt-count-ring" aria-hidden="true" />
            <span className="count">{count}</span>
          </div>
        </div>
      )}
      {goFlash > 0 && count === null && phase !== 'intro' && (
        <div className="mt-go" key={goFlash} aria-hidden="true" onAnimationEnd={() => setGoFlash(0)}>
          <span>Vai!</span>
        </div>
      )}
      {phase === 'pause' && (
        <div className="overlay-center mt-ov">
          <div className="mt-card mt-card--pause" role="dialog" aria-labelledby="pause-t">
            <Corners />
            <div className="mt-kicker mt-kicker--stone">{custom ? custom.sub : `Fase ${level?.n} · ${title}`}</div>
            <h2 id="pause-t" className="mt-title mt-title--icon">
              <IconTile name="pause" />
              Pausa
            </h2>
            <ul className="mt-tips mt-tips--still">
              {(custom?.how ?? level?.how ?? []).slice(0, 2).map((h, i) => (
                <li key={h}>
                  <IconTile name={tipIcon(h, i)} tone={i === 0 ? 'red' : 'gold'} />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <div className="mt-actions">
              {/* biome-ignore lint/a11y/noAutofocus: continuar é a ação esperada */}
              <PixelButton tone="red" size="big" wide autoFocus onClick={() => runnerRef.current?.resume()}>
                Continuar ▶
              </PixelButton>
              {!custom && (
                <PixelButton wide onClick={() => setRunKey((k) => k + 1)}>
                  Recomeçar
                </PixelButton>
              )}
              <PixelButton tone="ghost" commit="back" onClick={() => go(custom ? 'title' : 'map')}>
                {custom ? 'Sair' : 'Voltar ao mapa'}
              </PixelButton>
            </div>
          </div>
        </div>
      )}
      {end && level &&
        (end.success ? (
          <WinCard level={level} end={end} />
        ) : (
          <LoseCard level={level} end={end} retry={() => setRunKey((k) => k + 1)} />
        ))}
    </div>
  )
}

interface EndInfo {
  success: boolean
  score: number
  stars: number
  firstTime: boolean
  timeLeft: number
  duration: number
  goal: number
}

const xpFor = (stars: number) => 500 + stars * 166

/** Vitória como evento: faixa bate, estrelas batem uma a uma, pontos sobem, XP aparece. */
function WinCard({ level, end }: { level: Level; end: EndInfo }) {
  // faixa, estrela 1, 2, 3, pontos, fim
  const beats = useBeats([60, 420, 800, 1180, 1500, 2050])
  const { stage, skipped } = beats
  const pts = useCountUp(stage >= 5 ? end.score : 0, { from: 0, ms: 520, tick: skipped ? null : 'score', done: skipped ? null : 'total' })
  const xp = end.firstTime ? xpFor(end.stars) : 0
  useEffect(() => {
    if (stage === 1 && !skipped) sfx('stamp')
  }, [stage, skipped])
  return (
    <div
      className={`overlay-center mt-ov mt-ov--win${skipped ? ' is-skip' : ''}`}
      onPointerDownCapture={beats.onPointerDownCapture}
    >
      <i className="mt-rays" aria-hidden="true" />
      <div className="mt-card mt-card--win" role="dialog" aria-labelledby="end-t">
        <Corners />
        <div className={`mt-win-banner${stage >= 1 ? ' is-in' : ''}`}>
          <Banner>Fase concluída</Banner>
        </div>
        <div className="mt-kicker mt-kicker--stone">Fase {level.n} de 13</div>
        <h2 id="end-t" className="mt-title">
          {level.title}
        </h2>
        <StarRow n={end.stars} landed={Math.max(0, stage - 1)} instant={skipped} />
        <div className={`mt-tally${stage >= 5 ? ' is-in' : ''}`}>
          <div className="mt-pts" role="status" aria-label={`${fmt(end.score)} pontos`}>
            <b aria-hidden="true">{fmt(pts)}</b>
            <span aria-hidden="true">pontos</span>
          </div>
          {xp > 0 && <div className="mt-xpchip">+{fmt(xp)} XP</div>}
        </div>
        <div className="mt-actions">
          {/* biome-ignore lint/a11y/noAutofocus: próxima ação óbvia */}
          <PixelButton
            tone="red"
            size="big"
            wide
            autoFocus
            className={beats.done ? 'is-ready' : ''}
            onClick={() => go('result', { level: level.n, xp, seen: 1 })}
          >
            Ver o fato ▶
          </PixelButton>
        </div>
      </div>
    </div>
  )
}

/** Derrota gentil: "Quase!", o que faltou e uma dica, sem clarão vermelho. */
function LoseCard({ level, end, retry }: { level: Level; end: EndInfo; retry: () => void }) {
  useEffect(() => {
    stinger('lose')
  }, [])
  const timed = end.duration > 0
  const left = Math.ceil(end.timeLeft)
  const reached = timed ? 1 - end.timeLeft / end.duration : end.goal > 0 ? end.score / end.goal : 0
  const tip = level.how[0]
  return (
    <div className="overlay-center mt-ov mt-ov--lose">
      <div className="mt-card mt-card--lose" role="dialog" aria-labelledby="end-t">
        <Corners />
        <div className="mt-kicker">Fase {level.n} · {level.title}</div>
        <h2 id="end-t" className="mt-title mt-title--big">
          Quase!
        </h2>
        <p className="mt-lead">As vidas acabaram. Tente de novo ou siga com uma estrela.</p>
        <div className="mt-miss">
          <div className="mt-miss-row">
            <Hearts n={0} max={3} label="Sem vidas" />
            <span className="mt-miss-note">
              {timed && left > 0 ? `Faltaram ${left} s` : `${fmt(end.score)} pontos`}
            </span>
          </div>
          <SegBar label="Você chegou a" value={reached} text={`${Math.round(Math.min(1, reached) * 100)}%`} />
          {tip && (
            <div className="mt-hint">
              <IconTile name={tipIcon(tip, 0)} tone="gold" />
              <span>
                <b>Dica</b> {tip}
              </span>
            </div>
          )}
        </div>
        <div className="mt-actions">
          {/* biome-ignore lint/a11y/noAutofocus: tentar de novo é a ação esperada */}
          <PixelButton tone="red" size="big" wide autoFocus onClick={retry}>
            Tentar de novo
          </PixelButton>
          <PixelButton
            wide
            onClick={() => {
              const { firstTime } = getSave().completeLevel(level.n, 1, end.score, level.facts)
              go(level.n === 13 && firstTime ? 'final' : 'result', { level: level.n, xp: firstTime ? xpFor(1) : 0 })
            }}
          >
            Seguir com 1 estrela
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
