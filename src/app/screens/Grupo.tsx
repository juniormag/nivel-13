// Placar do Grupo (VIRAL-DESIGN §2.6): Hoje e Semana, só apelido, nota e sequência. Nada de voto.
// "Postar no grupo" gera o texto e o jogador manda; "Falta você" cobra sem expor quem não jogou.
// Sem API, a tela explica e volta; o jogo segue normal.
import '../../viral/viral.css'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { dailyNumber, todayBR } from '../../lib/time'
import { useSave } from '../../state/save'
import { rise } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { Tabs } from '../../ui/Tabs'
import { ev, GROUP_ERROR, type GroupBoard, type GroupRow, viralApi } from '../../viral/api'
import { isGroupCode } from '../../viral/duel'
import { fmtInt } from '../../viral/format'
import { chuteUrl, sendText } from '../../viral/share'
import { ViralPage } from '../../viral/ViralPage'
import { go, useNav } from '../nav'

const MEDAL = ['🥇', '🥈', '🥉']

function postText(board: GroupBoard, code: string) {
  const n = dailyNumber()
  const rows = board.hoje
    .slice(0, 5)
    .map((r, i) => `${MEDAL[i] ?? `${i + 1}º`} ${r.name || 'Alguém'} ${fmtInt(r.total)}`)
  return [
    `Placar do ${board.nome} · Chuta Aí! #${n}`,
    ...(rows.length ? rows : ['Ninguém jogou ainda hoje.']),
    'Falta você 👀',
    chuteUrl(n, { group: code, s: 'wa_grupo' }),
  ].join('\n')
}

function Board({ rows, week }: { rows: GroupRow[]; week?: boolean }) {
  if (!rows.length)
    return (
      <p className="note">
        {week ? 'Ninguém jogou nesta semana ainda.' : 'Ninguém jogou hoje ainda. Seja o primeiro.'}
      </p>
    )
  return (
    <ol className="cx-board">
      {rows.map((r, i) => (
        <li key={`${r.name}-${i}`} className={r.me ? 'is-me' : undefined}>
          <span className="cx-pos">{i + 1}º</span>
          <span className="cx-gname">
            {r.name || 'Alguém'}
            {r.me && <span className="sr-only"> (você)</span>}
          </span>
          <span className="cx-gval">
            {fmtInt(r.total)}
            {r.streak > 1 && (
              <small>
                {r.streak}d<span className="sr-only"> de sequência</span>
              </small>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default function Grupo() {
  const params = useNav((s) => s.params)
  const save = useSave()
  const asked = typeof params.code === 'string' && isGroupCode(params.code) ? params.code : null
  const [code, setCode] = useState<string | null>(asked ?? save.groups[0] ?? null)
  const [board, setBoard] = useState<GroupBoard | null | 'loading' | 'off'>(code ? 'loading' : null)
  const [tab, setTab] = useState<'hoje' | 'semana'>('hoje')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!code) return
    let alive = true
    setBoard('loading')
    void viralApi.grupo(code, todayBR()).then((b) => {
      if (alive) setBoard(b ?? 'off')
    })
    return () => {
      alive = false
    }
  }, [code])

  const create = async () => {
    setBusy(true)
    const r = await viralApi.criarGrupo()
    setBusy(false)
    if (!r) return setMsg('Sem conexão agora. Tente de novo daqui a pouco.')
    if ('error' in r) return setMsg(GROUP_ERROR[r.error ?? ''] ?? 'Não deu para criar agora.')
    ev('group_create')
    save.patch({ groups: [...save.groups.filter((g) => g !== r.code), r.code] })
    setCode(r.code)
  }

  const leave = async () => {
    if (!code) return
    await viralApi.sair(code)
    const rest = save.groups.filter((g) => g !== code)
    save.patch({ groups: rest })
    setCode(rest[0] ?? null)
    setBoard(rest[0] ? 'loading' : null)
  }

  const b = typeof board === 'object' ? board : null
  return (
    <ViralPage
      eyebrow="Placar do grupo"
      title={b ? b.nome : 'Placar do grupo'}
      onClose={() => history.back()}
    >
      {save.groups.length > 1 && (
        <motion.div className="cx-chips" variants={rise} role="group" aria-label="Seus placares">
          {save.groups.map((g, i) => (
            <Tap key={g} className="chip" aria-pressed={g === code} vibe="move" onClick={() => setCode(g)}>
              Placar {i + 1}
            </Tap>
          ))}
        </motion.div>
      )}

      {!code && (
        <>
          <motion.p variants={rise}>
            Um placar só do seu grupo de WhatsApp: todo dia, quem chutou melhor. Aparece só o apelido, nada
            mais.
          </motion.p>
          {msg && (
            <motion.p className="note" role="alert" variants={rise}>
              {msg}
            </motion.p>
          )}
          <motion.div className="actions" variants={rise}>
            <PixelButton tone="red" wide onClick={() => void create()} disabled={busy}>
              {busy ? 'Criando...' : 'Criar placar do grupo'}
            </PixelButton>
          </motion.div>
        </>
      )}

      {board === 'loading' && (
        <motion.div className="cx-skel" aria-busy="true" variants={rise}>
          <i />
          <i />
          <i />
        </motion.div>
      )}

      {board === 'off' && (
        <motion.p variants={rise}>
          O placar está fora do ar agora. Seu jogo continua normal; tente de novo mais tarde.
        </motion.p>
      )}

      {b && code && (
        <>
          <motion.div variants={rise}>
            <Tabs
              tabs={[
                { id: 'hoje', label: 'Hoje' },
                { id: 'semana', label: 'Semana' },
              ]}
              value={tab}
              onChange={setTab}
              label="Período do placar"
            >
              <Board rows={tab === 'hoje' ? b.hoje : b.semana} week={tab === 'semana'} />
            </Tabs>
          </motion.div>
          <motion.p className="note" variants={rise}>
            {b.membros} {b.membros === 1 ? 'pessoa' : 'pessoas'} no placar. Só aparece quem jogou.
          </motion.p>
          <motion.div className="actions" variants={rise}>
            <PixelButton
              tone="red"
              onClick={async () => {
                ev('group_post')
                await sendText(postText(b, code))
              }}
            >
              Postar no grupo
            </PixelButton>
            {!save.chute[todayBR()] && (
              <PixelButton onClick={() => go('chuta', { g: code })}>Jogar hoje</PixelButton>
            )}
          </motion.div>
          <motion.div className="actions" variants={rise}>
            <PixelButton tone="ghost" onClick={() => void leave()}>
              Sair do placar
            </PixelButton>
          </motion.div>
        </>
      )}
    </ViralPage>
  )
}
