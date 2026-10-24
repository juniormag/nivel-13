// Placar do Grupo depois do resultado (só com ?g=). Entrar é um toque explícito; aparece só o apelido.
// Sem resposta da API, o bloco não aparece (o resto do resultado segue igual).
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { go } from '../app/nav'
import { cleanName } from '../app/screens/Onboard'
import { useSave } from '../state/save'
import { PixelButton } from '../ui/PixelButton'
import { rise } from '../ui/motion'
import { ev, GROUP_ERROR, type GroupBoard, viralApi } from './api'
import { fmtInt } from './format'

export function GroupJoin({ code, date }: { code: string; date: string }) {
  const save = useSave()
  const [board, setBoard] = useState<GroupBoard | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [nick, setNick] = useState(save.name)
  const [err, setErr] = useState('')
  const member = save.groups.includes(code)

  useEffect(() => {
    let alive = true
    void viralApi.grupo(code, date).then((b) => {
      if (alive) setBoard(b)
    })
    return () => {
      alive = false
    }
  }, [code, date])

  if (!board || dismissed) return null

  const join = async () => {
    setBusy(true)
    const name = cleanName(nick)
    if (name && name !== save.name) save.patch({ name })
    const r = await viralApi.entrar(code)
    setBusy(false)
    if (!r || 'error' in r) {
      setErr(r ? (GROUP_ERROR[r.error ?? ''] ?? 'Não deu para entrar agora.') : 'Sem conexão agora. Tente de novo.')
      return
    }
    setErr('')
    save.patch({ groups: [...save.groups.filter((g) => g !== code), code] })
    ev('group_join')
    const b = await viralApi.grupo(code, date)
    if (b) setBoard(b)
  }

  const top = board.hoje.slice(0, 3)
  return (
    <motion.section className="cx-group pf pf--hud" aria-labelledby="cx-group-h" variants={rise}>
      <h2 id="cx-group-h">Placar do {board.nome}</h2>
      {top.length > 0 && (
        <ol className="cx-group-top">
          {top.map((r, i) => (
            <li key={`${r.name}-${i}`} className={r.me ? 'is-me' : undefined}>
              <span className="cx-pos">{i + 1}º</span>
              <span className="cx-gname">{r.name}</span>
              <span className="cx-gval">{fmtInt(r.total)}</span>
            </li>
          ))}
        </ol>
      )}
      {member ? (
        <PixelButton wide onClick={() => go('grupo', { code })}>
          Ver placar completo
        </PixelButton>
      ) : (
        <>
          <p>Entrar no placar? Aparece só o seu apelido, nada mais.</p>
          {!save.name && (
            <div className="field">
              <label htmlFor="cx-nick">Seu apelido (opcional)</label>
              <input
                id="cx-nick"
                className="input"
                maxLength={16}
                autoComplete="nickname"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
              />
            </div>
          )}
          {err && (
            <p className="note" role="alert">
              {err}
            </p>
          )}
          <div className="actions">
            <PixelButton tone="red" onClick={() => void join()} disabled={busy}>
              {busy ? 'Entrando...' : 'Entrar no placar'}
            </PixelButton>
            <PixelButton tone="ghost" onClick={() => setDismissed(true)}>
              Agora não
            </PixelButton>
          </div>
        </>
      )}
    </motion.section>
  )
}
