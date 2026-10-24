// Tela de fase: hospeda o Runner (PixiJS) e desenha o HUD, as habilidades e os overlays em React.
import { useEffect, useRef, useState } from 'react'
import { playMusic, sfx } from '../../audio/audio'
import { LEVELS, type GameKind, type Level } from '../../content/levels'
import { Runner } from '../../engine/runner'
import type { MicroGame } from '../../engine/types'
import { loadGame } from '../../games'
import { getSave, levelsDone, useSave } from '../../state/save'
import { type SkillKind, usePlay } from '../../state/play'
import { CountUp } from '../../ui/CountUp'
import { Hearts } from '../../ui/Hearts'
import { Tap } from '../../ui/PixelButton'
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
  const [end, setEnd] = useState<{ success: boolean; score: number; stars: number; firstTime: boolean } | null>(null)
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
          setEnd({ success, score: sc, stars, firstTime })
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
        useSkill(s)
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
  function useSkill(k: SkillKind) {
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
        void runnerRef.current?.start()
        return
      }
      sfx('tick')
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
            onUse={useSkill}
          />
        )}
        {(slow || shield) && <div className={`status-glow${shield ? ' shield' : ''}`} aria-hidden="true" />}
      </div>

      {phase === 'intro' && (
        <div className="overlay-center">
          <div className="intro px-frame px-frame--red" role="dialog" aria-labelledby="intro-t">
            <div className="lvl">{custom ? custom.sub : `Fase ${level?.n} de 13`}</div>
            <h2 id="intro-t">{title}</h2>
            {level && <div className="where">{level.where}</div>}
            <p>{custom?.intro ?? level?.intro}</p>
            <div className="howto">
              {(custom?.how ?? level?.how ?? []).map((h) => (
                <span key={h}>▸ {h}</span>
              ))}
            </div>
            {/* biome-ignore lint/a11y/noAutofocus: o botão de começar é a única ação */}
            <button type="button" className="btn btn--red btn--big" autoFocus onClick={startCountdown}>
              Começar ▶
            </button>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn btn--ghost" onClick={() => go(custom ? 'title' : 'map')}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
      {count !== null && (
        <div className="overlay-center" style={{ background: 'transparent' }}>
          <div className="count" aria-live="assertive" key={count}>
            {count}
          </div>
        </div>
      )}
      {phase === 'pause' && (
        <div className="overlay-center">
          <div className="intro px-frame" role="dialog" aria-label="Pausa">
            <h2>Pausa</h2>
            <div className="stack" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn--red btn--wide" onClick={() => runnerRef.current?.resume()}>
                Continuar
              </button>
              {!custom && (
                <button type="button" className="btn btn--wide" onClick={() => setRunKey((k) => k + 1)}>
                  Recomeçar
                </button>
              )}
              <button type="button" className="btn btn--ghost btn--wide" onClick={() => go(custom ? 'title' : 'map')}>
                {custom ? 'Sair' : 'Voltar ao mapa'}
              </button>
            </div>
          </div>
        </div>
      )}
      {end && level && (
        <div className="overlay-center">
          {end.success ? (
            <div className="intro px-frame px-frame--gold" role="dialog" aria-labelledby="end-t">
              <div className="lvl">Fase {level.n} concluída</div>
              <h2 id="end-t">{level.title}</h2>
              <div className="stars" role="img" aria-label={`${end.stars} de 3 estrelas`}>
                {[0, 1, 2].map((k) => (
                  <span key={k} className={k < end.stars ? '' : 'off'}>
                    ★
                  </span>
                ))}
              </div>
              <p>
                {end.score.toLocaleString('pt-BR')} pontos{end.firstTime ? ` · +${500 + end.stars * 166} XP` : ''}
              </p>
              {/* biome-ignore lint/a11y/noAutofocus: próxima ação óbvia */}
              <button type="button" className="btn btn--red btn--big" autoFocus onClick={() => go('result', { level: level.n })}>
                Ver o fato ▶
              </button>
            </div>
          ) : (
            <div className="intro px-frame px-frame--red" role="dialog" aria-labelledby="end-t">
              <div className="lvl">Fase {level.n}</div>
              <h2 id="end-t">Quase!</h2>
              <p>As vidas acabaram. Tente de novo ou siga com uma estrela.</p>
              <div className="stack">
                <button type="button" className="btn btn--red btn--wide" onClick={() => setRunKey((k) => k + 1)}>
                  Tentar de novo
                </button>
                <button
                  type="button"
                  className="btn btn--wide"
                  onClick={() => {
                    const { firstTime } = getSave().completeLevel(level.n, 1, end.score, level.facts)
                    go(level.n === 13 && firstTime ? 'final' : 'result', { level: level.n })
                  }}
                >
                  Seguir com 1 estrela
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
