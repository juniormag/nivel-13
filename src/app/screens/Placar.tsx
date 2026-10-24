// Placar da Virada: movimento por estado (anônimo), corrente de convites e os fatos que mais convencem.
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { FACTS } from '../../content/facts'
import { api, type Stats } from '../../lib/api'
import { ShareSheet } from '../../share/ShareSheet'
import { levelsDone, shareLink, useSave } from '../../state/save'
import { fmt, useCountUp } from '../../ui/hooks'
import { rise, stagger } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { Page, Screen } from '../../ui/Shell'
import { Tabs } from '../../ui/Tabs'
import { toast } from '../../ui/Toast'
import { go, useNav } from '../nav'

type Tab = 'virada' | 'corrente' | 'fatos'
const TABS: { id: Tab; label: string }[] = [
  { id: 'virada', label: 'Virada' },
  { id: 'corrente', label: 'Corrente' },
  { id: 'fatos', label: 'Fatos' },
]

function Big({ n, label, text }: { n: number; label: string; text?: string }) {
  const v = useCountUp(n, { from: 0, ms: 500 })
  return (
    <div className="pf pf--stone">
      <b>{text ?? fmt(v)}</b>
      <span>{label}</span>
    </div>
  )
}

const list = stagger(0.04, 0.05)

export default function Placar() {
  const params = useNav((s) => s.params)
  const save = useSave()
  const [tab, setTab] = useState<Tab>((params.tab as Tab) ?? 'virada')
  const [stats, setStats] = useState<Stats | null | undefined>(undefined)
  const [invite, setInvite] = useState(false)

  const load = useCallback(async () => {
    setStats(undefined)
    setStats(await api.stats())
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink())
      toast('Link copiado', 'gold')
    } catch {
      toast(shareLink())
    }
  }

  let body: React.ReactNode
  if (stats === undefined) body = <p className="muted">Carregando o placar…</p>
  else if (stats === null)
    body = (
      <div className="stack">
        <p>O placar ao vivo está fora do ar agora. Seu progresso continua salvo neste aparelho.</p>
        <div className="actions">
          <PixelButton onClick={() => void load()}>Tentar de novo</PixelButton>
        </div>
      </div>
    )
  else if (tab === 'virada') {
    const s = stats
    const max = Math.max(1, ...s.byUf.map((u) => u.vou + u.virei))
    body = (
      <div className="stack">
        <div className="bigstat">
          <Big n={s.movimento.vou} label="Vão votar 13" />
          <Big n={s.movimento.virei} label="Viraram o voto" />
          <Big n={s.players} label="Jogadores" />
        </div>
        <h2 className="sub">Estados com mais gente no movimento</h2>
        {s.byUf.length ? (
          <motion.ol className="plist" variants={list} initial="hidden" animate="show">
            {s.byUf.slice(0, 27).map((u, i) => (
              <motion.li key={u.uf} variants={rise}>
                <span className="pos">{i + 1}º</span>
                <div>
                  <div>
                    {u.uf} · {fmt(u.virei)} viradas
                  </div>
                  <span className="pbar">
                    <i style={{ width: `${((u.vou + u.virei) / max) * 100}%` }} />
                  </span>
                </div>
                <span className="val">{fmt(u.vou + u.virei)}</span>
              </motion.li>
            ))}
          </motion.ol>
        ) : (
          <p className="muted">Ninguém declarou ainda. Seja o primeiro.</p>
        )}
        <p className="note">
          Declaração anônima e voluntária: só o estado entra na conta, sem nome. Não vale prêmio nem ponto.
        </p>
        <div className="actions">
          <PixelButton tone="red" onClick={() => go('votar')}>
            {save.movimento ? 'Ver meu compromisso' : 'Entrar no movimento'}
          </PixelButton>
        </div>
      </div>
    )
  } else if (tab === 'corrente') {
    const s = stats
    body = (
      <div className="stack">
        <p>Sua corrente conta quantas pessoas terminaram as 13 fases pelo seu link.</p>
        <div className="bigstat">
          <Big n={s.me?.corrente ?? 0} label="Na sua corrente" />
          <Big n={0} text={s.me?.rank ? `${s.me.rank}º` : '–'} label="Sua posição" />
        </div>
        <div className="actions">
          <PixelButton tone="red" onClick={() => setInvite(true)}>
            Convidar amigos
          </PixelButton>
          <PixelButton onClick={() => void copy()}>Copiar meu link</PixelButton>
        </div>
        <h2 className="sub">Maiores correntes</h2>
        {s.corrente.length ? (
          <motion.ol className="plist" variants={list} initial="hidden" animate="show">
            {s.corrente.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a posição no ranking é a identidade da linha
              <motion.li key={`${i}-${p.name}`} className={p.me ? 'is-me' : ''} variants={rise}>
                <span className="pos">{i + 1}º</span>
                <span>
                  {p.name || 'Anônimo'}
                  {p.uf ? ` · ${p.uf}` : ''}
                  {p.me ? ' (você)' : ''}
                </span>
                <span className="val">{fmt(p.count)}</span>
              </motion.li>
            ))}
          </motion.ol>
        ) : (
          <p className="muted">Ainda não há correntes. Mande seu link e abra a primeira.</p>
        )}
      </div>
    )
  } else {
    const s = stats
    const max = Math.max(1, ...s.facts.map((f) => f.likes))
    const rows = s.facts.map((f) => ({ f, fact: FACTS.find((x) => x.id === f.fact) })).filter((x) => x.fact)
    body = (
      <div className="stack">
        <p>Os fatos que mais convenceram quem jogou. Use os mais fortes na conversa com a família.</p>
        {rows.length ? (
          <motion.ol className="plist" variants={list} initial="hidden" animate="show">
            {rows.map(({ f, fact }, i) => (
              <motion.li key={f.fact} variants={rise}>
                <span className="pos">{i + 1}º</span>
                <div>
                  <div>{fact?.title}</div>
                  <span className="pbar">
                    <i style={{ width: `${(f.likes / max) * 100}%` }} />
                  </span>
                </div>
                <span className="val">
                  <span aria-hidden="true">👍 </span>
                  {fmt(f.likes)}
                  <span className="sr-only"> votos</span>
                </span>
              </motion.li>
            ))}
          </motion.ol>
        ) : (
          <p className="muted">Sem votos ainda. Toque em "Esse me convenceu" nas cartas.</p>
        )}
      </div>
    )
  }

  return (
    <Screen world={levelsDone(save) / 13} className="scr--page">
      <Page eyebrow="Ao vivo" title="Placar da virada" wide>
        <motion.div variants={rise}>
          <Tabs tabs={TABS} value={tab} onChange={setTab} label="Seções do placar">
            <div aria-live="polite">{body}</div>
          </Tabs>
        </motion.div>
      </Page>
      {invite && <ShareSheet moment={{ kind: 'convite' }} onClose={() => setInvite(false)} />}
    </Screen>
  )
}
