// Sobre: ajustes (som, tremor, clarões, vibração), quem responde pela peça, aviso de IA, privacidade e todas as fontes.
import { motion } from 'motion/react'
import { useState } from 'react'
import { setMuted } from '../../audio/audio'
import { CONFIG, responsavelText } from '../../config'
import { FACTS } from '../../content/facts'
import { apagar } from '../../lib/api'
import { getSave, levelsDone, useSave } from '../../state/save'
import { Dialog } from '../../ui/Dialog'
import { rise } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { canVibrate, haptic, PREFS_KEY, setPrefs, usePrefs } from '../../ui/prefs'
import { Page, Screen } from '../../ui/Shell'
import { toast } from '../../ui/Toast'

function Toggle({
  label,
  on,
  onChange,
  disabled,
  note,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  note?: string
}) {
  return (
    <div className="setting">
      <Tap
        className="switch chip"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        vibe={on ? null : 'confirm'}
        onClick={() => onChange(!on)}
      >
        <span className="knob" aria-hidden="true" />
        <span className="switch-label">{label}</span>
        <span className="switch-state" aria-hidden="true">
          {on ? 'Ligado' : 'Desligado'}
        </span>
      </Tap>
      {note && <small className="note">{note}</small>}
    </div>
  )
}

export default function Sobre() {
  const save = useSave()
  const on = !save.muted
  const prefs = usePrefs()
  const vibra = canVibrate()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const apagarTudo = async () => {
    setBusy(true)
    const ok = await apagar()
    getSave().reset()
    try {
      localStorage.removeItem(PREFS_KEY)
    } catch {
      /* sem armazenamento */
    }
    toast(
      ok ? 'Seus dados foram apagados' : 'Apagamos deste aparelho. O servidor não respondeu agora.',
      ok ? 'gold' : 'red',
    )
    setTimeout(() => location.reload(), 900)
  }

  return (
    <Screen world={levelsDone(save) / 13} className="scr--page">
      <Page eyebrow="Nível 13 · A virada" title="Sobre o jogo" wide>
        <motion.h2 variants={rise}>Ajustes</motion.h2>
        <motion.div className="settings" variants={rise}>
          <Toggle label="Som" on={on} onChange={(v) => setMuted(!v)} />
          <Toggle
            label="Tremor de tela"
            on={prefs.shake > 0}
            onChange={(v) => setPrefs({ shake: v ? 1 : 0 })}
          />
          <Toggle label="Clarões" on={prefs.flashes} onChange={(v) => setPrefs({ flashes: v })} />
          <Toggle
            label="Vibração"
            on={prefs.haptics && vibra}
            disabled={!vibra}
            note={vibra ? undefined : 'Este aparelho não vibra pelo navegador.'}
            onChange={(v) => {
              setPrefs({ haptics: v })
              if (v) haptic('confirm')
            }}
          />
        </motion.div>
        <motion.p variants={rise}>
          Um jogo curto sobre o Brasil de 2023 a 2026 e o histórico documentado da família Bolsonaro. Cada
          carta traz a data, o status jurídico exato e o link da fonte.
        </motion.p>
        <motion.h2 variants={rise}>Propaganda eleitoral</motion.h2>
        <motion.p variants={rise}>
          {CONFIG.aiLabel}. {responsavelText()}.
        </motion.p>
        <motion.h2 variants={rise}>Privacidade</motion.h2>
        <motion.p variants={rise}>
          Sem cadastro, sem telefone, sem e-mail. Guardamos um código aleatório deste aparelho, o apelido e o
          estado se você informar, seus pontos e, se você declarar, sua escolha no movimento, que entra só na
          contagem agregada por estado. Nada é vendido nem cruzado com outros dados.
        </motion.p>
        <motion.p variants={rise}>
          Todos os dados do jogo guardados no servidor serão apagados para sempre em <b>30/11/2026</b>.
        </motion.p>
        <motion.div className="actions" variants={rise}>
          <PixelButton commit="error" onClick={() => setConfirm(true)}>
            Apagar meus dados
          </PixelButton>
        </motion.div>
        <motion.h2 variants={rise}>Todas as fontes</motion.h2>
        <motion.ul className="src-groups" variants={rise}>
          {FACTS.map((f) => (
            <li key={f.id}>
              <b>{f.title}</b>
              <ul>
                {f.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                    <span className="fc-date"> · {s.date}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </motion.ul>
        <motion.h2 variants={rise}>Créditos</motion.h2>
        <motion.p className="note" variants={rise}>
          Arte em pixel, música e efeitos gerados por código. Fontes tipográficas Silkscreen e Pixelify Sans
          (OFL).
        </motion.p>
      </Page>
      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} title="Apagar meus dados?" tone="red">
        <div className="stack">
          <p className="dlg-text">
            Isso apaga seu progresso, cartas, apelido e ajustes deste aparelho e pede ao servidor que apague
            tudo o que está ligado ao seu código. Não dá para desfazer.
          </p>
          <div className="actions">
            <PixelButton
              tone="ghost"
              commit="back"
              disabled={busy}
              onClick={() => setConfirm(false)}
              data-autofocus
            >
              Cancelar
            </PixelButton>
            <PixelButton tone="red" commit="error" disabled={busy} onClick={() => void apagarTudo()}>
              {busy ? 'Apagando…' : 'Apagar tudo'}
            </PixelButton>
          </div>
        </div>
      </Dialog>
    </Screen>
  )
}
