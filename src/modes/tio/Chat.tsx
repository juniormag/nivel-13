// Convence o Tio: a conversa (docs/MODOS-NOVOS.md §1). Celular em pé, uma mão: mensagens no alto,
// as 2 respostas como cartas na zona do polegar. Arrastar para cima ou para a direita envia; tocar também.
// Nada vai ao servidor além de contadores agregados sem parente nem resposta (§3).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { type Sfx, sfx, stinger } from '../../audio/audio'
import { CONFIG } from '../../config'
import type { Parente, TioMsg, TioReply } from '../../content/tio'
import { getSave } from '../../state/save'
import { prefersReduced } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { haptic } from '../../ui/prefs'
import { toast } from '../../ui/Toast'
import { ev } from '../../viral/api'
import { copyText, sendText } from '../../viral/share'
import { Face } from './Face'
import type { Expr } from './faces'
import {
  cardOrders,
  challengeLink,
  comArtigo,
  emojiGrid,
  familyText,
  goods,
  isGood,
  type Mark,
  mainTip,
  resultText,
  typingMs,
  WIN_AT,
  won,
} from './logic'
import { useTio } from './store'
import { TioShare } from './TioShare'

type Entry =
  | { k: 'them'; key: string; text: string }
  | { k: 'me'; key: string; text: string; good: boolean; reply: TioReply; done: boolean; topic: string }

type Phase = 'typing' | 'choose' | 'wait' | 'hint' | 'end'

const ARROW_T = ['..X..', '.XXX.', 'XXXXX', '..X..', '..X..']

export function Chat({
  parente,
  msgs,
  fixture,
  onBack,
  onOther,
}: {
  parente: Parente
  msgs: TioMsg[]
  fixture?: boolean
  onBack: () => void
  onOther: () => void
}) {
  const total = msgs.length
  const orders = useMemo(() => cardOrders(total), [total])
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const [typing, setTyping] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [expr, setExpr] = useState<Expr>('neutro')
  const [tip, setTip] = useState<string | null>(null)
  const [share, setShare] = useState(false)
  const timers = useRef<number[]>([])
  const logRef = useRef<HTMLOListElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const kbd = useRef(false)
  const meterId = useId()
  const record = useTio((s) => s.record)
  const msg = msgs[i]

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t)
    },
    [],
  )

  // rodada: "digitando..." e a dúvida chega
  useEffect(() => {
    const m = msgs[i]
    if (!m) return
    setPhase('typing')
    setTyping(true)
    ev('round_start', `tio${i + 1}`)
    later(i === 0 ? 700 : typingMs(m.doubt), () => {
      setTyping(false)
      setExpr('neutro')
      setEntries((e) => [...e, { k: 'them', key: `${m.id}-q`, text: m.doubt }])
      sfx('select')
      setPhase('choose')
    })
  }, [i, msgs, later])

  // a conversa rola até a última mensagem
  // biome-ignore lint/correctness/useExhaustiveDependencies: rola quando chega mensagem nova ou o digitando muda
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReduced() ? 'auto' : 'smooth' })
  }, [entries.length, typing, phase])

  // foco nas cartas para quem joga no teclado
  useEffect(() => {
    if (!kbd.current) return
    if (phase === 'choose') zoneRef.current?.querySelector<HTMLElement>('.tio-card')?.focus()
    if (phase === 'hint') zoneRef.current?.querySelector<HTMLElement>('.tio-hint')?.focus()
    if (phase === 'end') zoneRef.current?.querySelector<HTMLElement>('.btn')?.focus()
  }, [phase])

  const finish = useCallback(
    (all: Mark[]) => {
      const win = won(all, total)
      setPhase('wait')
      setTyping(true)
      later(800, () => {
        setTyping(false)
        setEntries((e) => [...e, { k: 'them', key: 'fim', text: win ? parente.win : parente.lose }])
        setExpr(win ? 'neutro' : 'fechado')
        setTip(win ? null : mainTip(msgs, all))
        stinger(win ? 'win' : 'lose')
        haptic(win ? 'levelup' : 'error')
        record(parente.id, goods(all), win)
        ev('day_complete', win ? 'tio_win' : 'tio_lose')
        setPhase('end')
      })
    },
    [later, msgs, parente, record, total],
  )

  const next = useCallback(
    (all: Mark[]) => {
      if (i + 1 >= total) finish(all)
      else setI(i + 1)
    },
    [finish, i, total],
  )

  const send = (reply: TioReply) => {
    const m = msgs[i]
    if (!m || phase !== 'choose') return
    const good = isGood(reply)
    const all = [...marks, good ? ('good' as const) : ('trap' as const)]
    setPhase('wait')
    setMarks(all)
    sfx('swipe')
    haptic('confirm')
    const key = `${m.id}-a`
    setEntries((e) => [...e, { k: 'me', key, text: reply.text, good, reply, done: false, topic: m.topic }])
    later(260, () => setTyping(true))
    later(260 + typingMs(good ? m.react.good : m.react.bad), () => {
      setTyping(false)
      setEntries((e) => [
        ...e.map((x) => (x.key === key && x.k === 'me' ? { ...x, done: true } : x)),
        { k: 'them', key: `${m.id}-r`, text: good ? m.react.good : m.react.bad },
      ])
      if (good) {
        setExpr('pensando')
        sfx('good')
        haptic('success')
        later(1500, () => next(all))
      } else {
        setExpr('fechado')
        sfx('bad')
        haptic('error')
        setPhase('hint')
      }
    })
  }

  const goodN = goods(marks)
  const win = phase === 'end' && won(marks, total)
  const ref = getSave().id
  const link = challengeLink(CONFIG.siteUrl, parente.id, ref, 'tio')
  const cardData = { parente, marks, link: challengeLink(CONFIG.siteUrl, parente.id) }

  const sendFamily = () => {
    ev('papo_send', 'tio')
    const text = familyText(parente, msgs, challengeLink(CONFIG.siteUrl, parente.id, ref, 'wa_familia'))
    void sendText(text).then((r) => {
      if (r === 'abort') return
      if (r === 'wa') toast('Abrindo o WhatsApp')
    })
  }

  const status = typing ? 'digitando...' : phase === 'end' ? (win ? 'convencido' : 'pensativo') : 'online'

  return (
    <div
      className="tio-chat pf pf--hud"
      onKeyDownCapture={(e) => {
        kbd.current = true
        if (phase === 'choose' && (e.key === '1' || e.key === '2') && msg) {
          const first = orders[i] ? msg.good : msg.trap
          const second = orders[i] ? msg.trap : msg.good
          send(e.key === '1' ? first : second)
        }
      }}
      onPointerDownCapture={() => {
        kbd.current = false
      }}
    >
      <header className="tio-head">
        <Tap
          className="btn btn--ghost tio-back"
          aria-label="Voltar para a escolha de parente"
          commit="back"
          onClick={onBack}
        >
          <span aria-hidden="true">◀</span>
        </Tap>
        <Face key={expr} id={parente.id} expr={expr} className="tio-head-face" label={parente.name} />
        <div className="tio-head-who">
          <h1 className="tio-name">{parente.name}</h1>
          <p className="tio-status" aria-hidden="true">
            {status}
          </p>
        </div>
        {fixture && <span className="tio-fixture">exemplo</span>}
        <div
          className="tio-meter"
          role="meter"
          aria-labelledby={meterId}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={goodN}
          aria-valuetext={`${goodN} de ${total}. Convence com ${Math.min(WIN_AT, total)}.`}
        >
          <span id={meterId} className="tio-meter-label">
            Convencido
          </span>
          <span className="tio-meter-bar" aria-hidden="true">
            {Array.from({ length: total }, (_, k) => (
              <i
                // biome-ignore lint/suspicious/noArrayIndexKey: degraus fixos do medidor
                key={k}
                className={`${k < goodN ? 'on' : ''}${k === Math.min(WIN_AT, total) - 1 ? ' goal' : ''}`}
              />
            ))}
          </span>
          <b className="tio-meter-n" aria-hidden="true">
            {goodN}/{total}
          </b>
        </div>
      </header>

      <ol
        ref={logRef}
        className="tio-log"
        role="log"
        aria-live="polite"
        aria-label={`Conversa com ${parente.name}`}
      >
        <li className="tio-sys" aria-hidden="true">
          {parente.name} mandou mensagem no grupo da família
        </li>
        {entries.map((e, n) =>
          e.k === 'them' ? (
            <li key={e.key} className="tio-row tio-row--them">
              {entries[n - 1]?.k !== 'them' ? (
                <Face id={parente.id} expr={e.key === 'fim' ? expr : 'neutro'} className="tio-mini" />
              ) : (
                <span className="tio-mini tio-mini--gap" aria-hidden="true" />
              )}
              <p className="tio-bubble tio-bubble--them">
                <span className="sr-only">{parente.name}: </span>
                {e.text}
              </p>
            </li>
          ) : (
            <li
              key={e.key}
              className={`tio-row tio-row--me${e.done ? (e.good ? ' is-good' : ' is-trap') : ''}`}
            >
              <div className="tio-bubble tio-bubble--me">
                <p>
                  <span className="sr-only">Você: </span>
                  {e.text}
                </p>
                <span className="tio-ticks" aria-hidden="true">
                  {e.done ? (e.good ? '✓ boa' : '✕ armadilha') : '✓✓'}
                </span>
                {e.done && <span className="sr-only">{e.good ? 'Resposta boa.' : 'Armadilha.'}</span>}
              </div>
              {e.done && e.good && e.reply.source && (
                <a
                  className="tio-src"
                  href={e.reply.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => ev('source_open', `tio_${e.topic}`)}
                >
                  <span aria-hidden="true">↗ </span>
                  Fonte ({e.reply.source.date}): {e.reply.source.name}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              )}
            </li>
          ),
        )}
        {typing && (
          <li className="tio-row tio-row--them tio-typing">
            <Face id={parente.id} expr={expr} className="tio-mini" />
            <p className="tio-bubble tio-bubble--them">
              <span className="sr-only">{parente.name} está digitando</span>
              <span className="tio-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
          </li>
        )}
      </ol>

      <div ref={zoneRef} className={`tio-zone tio-zone--${phase}`}>
        {phase === 'choose' && msg && (
          <>
            <p className="tio-howto">
              <Arrow />{' '}
              {i === 0 ? 'Arraste a resposta pra cima ou toque pra mandar' : 'Arraste ou toque pra mandar'}
            </p>
            <div className="tio-cards" key={msg.id}>
              {(orders[i] ? [msg.good, msg.trap] : [msg.trap, msg.good]).map((r, n) => (
                <ReplyCard key={r.kind} reply={r} n={n} onSend={send} />
              ))}
            </div>
          </>
        )}
        {(phase === 'typing' || phase === 'wait') && (
          <p className="tio-waiting" aria-hidden="true">
            {typing ? `${parente.name} está digitando...` : `${parente.name} está lendo...`}
          </p>
        )}
        {phase === 'hint' && msg && (
          <Tap
            className="tio-hint pf pf--red"
            sound="tap"
            commit={null}
            onClick={() => {
              setPhase('wait')
              next(marks)
            }}
          >
            <span className="tio-hint-tag">Dica</span>
            <span className="tio-hint-why" role="status">
              {msg.trap.why ?? 'Essa fechou a conversa. Tente com dado e fonte.'}
            </span>
            <span className="tio-hint-go">
              Toque para seguir <span aria-hidden="true">▶</span>
            </span>
          </Tap>
        )}
        {phase === 'end' && (
          <section className="tio-end" aria-label="Resultado">
            <div className="tio-end-top">
              <h2 className={win ? 'is-win' : 'is-lose'}>{win ? 'Convenceu!' : 'Ficou pro almoço'}</h2>
              <p
                className="tio-grid"
                role="img"
                aria-label={`${goodN} de ${total} respostas boas: ${marks.map((m) => (m === 'good' ? 'boa' : 'armadilha')).join(', ')}`}
              >
                {marks.map((m, n) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: uma casa por mensagem, na ordem
                  <i key={n} className={m === 'good' ? 'g' : 'r'} />
                ))}
              </p>
            </div>
            {!win && tip && (
              <p className="tio-end-tip">
                <b>Dica:</b> {tip}
              </p>
            )}
            <div className="tio-end-actions">
              <PixelButton tone="red" wide onClick={sendFamily}>
                Mandar no grupo da família
              </PixelButton>
              <PixelButton tone="gold" wide onClick={() => setShare(true)}>
                Compartilhar resultado
              </PixelButton>
              <PixelButton wide onClick={onOther}>
                Outro parente
              </PixelButton>
            </div>
            <details className="tio-goods">
              <summary>Ver as {total} respostas boas</summary>
              <ol>
                {msgs.map((m) => (
                  <li key={m.id}>
                    <p>{m.good.text}</p>
                    {m.good.source && (
                      <a href={m.good.source.url} target="_blank" rel="noopener noreferrer">
                        Fonte: {m.good.source.name} · {m.good.source.date}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    )}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="btn btn--sm tio-copy"
                onClick={() =>
                  void copyText(
                    familyText(parente, msgs, challengeLink(CONFIG.siteUrl, parente.id, ref, 'copia')),
                  ).then((ok) => toast(ok ? 'Mensagem copiada' : 'Não deu para copiar'))
                }
              >
                Copiar mensagem
              </button>
            </details>
          </section>
        )}
      </div>

      {share && (
        <TioShare
          data={cardData}
          text={resultText(parente, marks, link)}
          link={link}
          onClose={() => setShare(false)}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {phase === 'end'
          ? `${win ? 'Convenceu' : 'Não convenceu'} ${comArtigo(parente)}. ${emojiGrid(marks)}`
          : ''}
      </p>
    </div>
  )
}

function Arrow() {
  return (
    <span className="tio-arrow" aria-hidden="true">
      {ARROW_T.map((r, y) =>
        [...r].map((ch, x) =>
          ch === 'X' ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: pixels fixos
            <i key={`${x}-${y}`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
          ) : null,
        ),
      )}
    </span>
  )
}

/** Distância (px CSS) para enviar arrastando: para cima ou para a direita. */
const SEND_UP = 56
const SEND_RIGHT = 72

function ReplyCard({ reply, n, onSend }: { reply: TioReply; n: number; onSend: (r: TioReply) => void }) {
  const [d, setD] = useState({ x: 0, y: 0 })
  const [pressed, setPressed] = useState(false)
  const [fly, setFly] = useState<null | 'up' | 'right'>(null)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const moved = useRef(false)
  const swallow = useRef(false)
  const sentRef = useRef(false)
  const reduced = prefersReduced()

  const commit = (dir: 'up' | 'right') => {
    if (sentRef.current) return
    sentRef.current = true
    if (!reduced) {
      setFly(dir)
      window.setTimeout(() => onSend(reply), 140)
    } else onSend(reply)
  }
  const feedback = (s: Sfx) => {
    sfx(s)
    haptic('move')
  }
  const armed = d.y < -SEND_UP || d.x > SEND_RIGHT

  return (
    <button
      type="button"
      className={`tio-card pf pf--stone${pressed ? ' is-pressed' : ''}${armed ? ' is-armed' : ''}${fly ? ` is-fly-${fly}` : ''}`}
      style={d.x || d.y ? { transform: `translate(${Math.round(d.x)}px, ${Math.round(d.y)}px)` } : undefined}
      aria-label={`Mandar: ${reply.text}`}
      data-n={n + 1}
      onPointerDown={(e) => {
        if (e.button > 0 || sentRef.current) return
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
        moved.current = false
        setPressed(true)
        feedback('tap')
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* sem captura: o arraste segue até sair da carta */
        }
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s || s.id !== e.pointerId) return
        const x = Math.max(-16, e.clientX - s.x)
        const y = Math.min(16, e.clientY - s.y)
        if (!moved.current && Math.hypot(x, y) > 8) moved.current = true
        if (moved.current) {
          const was = d.y < -SEND_UP || d.x > SEND_RIGHT
          const now = y < -SEND_UP || x > SEND_RIGHT
          if (now && !was) haptic('move')
          setD({ x, y })
        }
      }}
      onPointerUp={() => {
        const s = start.current
        start.current = null
        setPressed(false)
        if (!s) return
        if (moved.current) {
          swallow.current = true
          if (d.y < -SEND_UP) commit('up')
          else if (d.x > SEND_RIGHT) commit('right')
          else setD({ x: 0, y: 0 })
        }
      }}
      onPointerCancel={() => {
        start.current = null
        setPressed(false)
        setD({ x: 0, y: 0 })
      }}
      onClick={(e) => {
        if (swallow.current) {
          swallow.current = false
          e.preventDefault()
          return
        }
        // toque ou Enter/Espaço
        if (e.detail === 0) feedback('tap')
        commit('up')
      }}
    >
      <span className="tio-card-n" aria-hidden="true">
        {n + 1}
      </span>
      <span className="tio-card-text">{reply.text}</span>
      <span className="tio-card-send" aria-hidden="true">
        ▲
      </span>
    </button>
  )
}
