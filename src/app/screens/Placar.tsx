// Placar da Virada: resultado oficial do 1º e do 2º turno (com card de share), corrente de convites e os fatos que mais convencem.
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { FACTS } from '../../content/facts'
import { diferenca2, pct, RESULTADO, subida, type Turno } from '../../content/resultado'
import { api, type Stats } from '../../lib/api'
import { ShareSheet } from '../../share/ShareSheet'
import { levelsDone, shareLink, useSave } from '../../state/save'
import { fmt, useCountUp } from '../../ui/hooks'
import { rise, stagger } from '../../ui/motion'
import { PixelButton } from '../../ui/PixelButton'
import { Page, Screen } from '../../ui/Shell'
import { Tabs } from '../../ui/Tabs'
import { toast } from '../../ui/Toast'
import { useNav } from '../nav'

type Tab = 'virada' | 'corrente' | 'fatos'
const TABS: { id: Tab; label: string }[] = [
  { id: 'virada', label: 'Virada' },
  { id: 'corrente', label: 'Corrente' },
  { id: 'fatos', label: 'Fatos' },
]

function Linha({ label, t, gold }: { label: string; t: Turno; gold?: boolean }) {
  const rows: [string, number][] = [
    ['Lula', t.lula],
    ['Flávio', t.flavio],
  ]
  const top = Math.max(t.lula, t.flavio)
  return (
    <div className={`vr-turno pf ${gold ? 'pf--gold' : 'pf--stone'}`}>
      <h2 className="sub">{label}</h2>
      <ol className="plist">
        {rows.map(([name, v]) => (
          <li key={name} className={v === top ? 'is-me' : ''}>
            <div>
              <div>{name}</div>
              <span className="pbar">
                <i style={{ width: `${v}%` }} />
              </span>
            </div>
            <span className="val">{pct(v)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Virada({ onShare }: { onShare: () => void }) {
  const r = RESULTADO
  return (
    <div className="stack">
      <p>
        No 1º turno, Flávio Bolsonaro ficou na frente. No 2º turno, Lula virou e foi reeleito com{' '}
        {pct(r.turno2.lula)} dos votos válidos.
      </p>
      <Linha label="1º turno · 4 de outubro" t={r.turno1} />
      <Linha label="2º turno · 25 de outubro" t={r.turno2} gold />
      <div className="bigstat">
        <Big
          n={subida}
          text={`+${subida.toLocaleString('pt-BR')}`}
          label="Pontos de Lula do 1º para o 2º turno"
        />
        <Big n={diferenca2} label="Votos de diferença no 2º turno" />
        <Big
          n={0}
          text={`${r.ufs2.lula} × ${r.ufs2.flavio}`}
          label="Estados vencidos (Lula × Flávio, com o DF)"
        />
      </div>
      <div className="actions">
        <PixelButton tone="red" onClick={onShare}>
          Compartilhar a virada
        </PixelButton>
      </div>
      <ul className="fc-sources">
        {r.sources.map((src) => (
          <li key={src.url}>
            <a href={src.url} target="_blank" rel="noopener noreferrer">
              {src.name}
            </a>{' '}
            · {src.date}
          </li>
        ))}
      </ul>
      <p className="note">Percentuais dos votos válidos, com 100% das seções totalizadas pelo TSE.</p>
    </div>
  )
}

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
  const [virada, setVirada] = useState(false)

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
  if (tab === 'virada') body = <Virada onShare={() => setVirada(true)} />
  else if (stats === undefined) body = <p className="muted">Carregando o placar…</p>
  else if (stats === null)
    body = (
      <div className="stack">
        <p>O placar ao vivo está fora do ar agora. Seu progresso continua salvo neste aparelho.</p>
        <div className="actions">
          <PixelButton onClick={() => void load()}>Tentar de novo</PixelButton>
        </div>
      </div>
    )
  else if (tab === 'corrente') {
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
      <Page eyebrow="Resultado oficial" title="Placar da virada" wide>
        <motion.div variants={rise}>
          <Tabs tabs={TABS} value={tab} onChange={setTab} label="Seções do placar">
            <div aria-live="polite">{body}</div>
          </Tabs>
        </motion.div>
      </Page>
      {invite && <ShareSheet moment={{ kind: 'convite' }} onClose={() => setInvite(false)} />}
      {virada && <ShareSheet moment={{ kind: 'virada' }} onClose={() => setVirada(false)} />}
    </Screen>
  )
}
