// Primeira vez: personagem, apelido e estado. Tudo opcional, em menos de 15 segundos.
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { playMusic, unlockAudio } from '../../audio/audio'
import { UFS } from '../../content/brazil'
import { api } from '../../lib/api'
import { sprite } from '../../lib/sprites'
import { type Avatar, levelsDone, useSave } from '../../state/save'
import { rise } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { PixelIcon } from '../../ui/PixelIcon'
import { AVATAR_NAMES, Page, Screen } from '../../ui/Shell'
import { go } from '../nav'

const AVATARS: Avatar[] = ['coelho', 'onca', 'arara', 'capivara']
const BLOCK = /(bolsominion|gado|petralha|lula ?ladr|ladr[aã]o|merda|porra|caralho|puta|fdp|viado|nazi)/i

export function cleanName(s: string) {
  const t = s
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 16)
  return BLOCK.test(t) ? '' : t
}

export default function Onboard() {
  const save = useSave()
  const [pick, setPick] = useState<Avatar>(save.avatar)
  const [name, setName] = useState(save.name)
  const [uf, setUf] = useState(save.uf)
  const tiles = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    unlockAudio()
    playMusic('title')
  }, [])

  const choose = (i: number, focus = false) => {
    const a = AVATARS[(i + AVATARS.length) % AVATARS.length]
    if (!a) return
    setPick(a)
    if (focus) tiles.current[AVATARS.indexOf(a)]?.focus()
  }

  const start = () => {
    save.patch({ avatar: pick, name: cleanName(name), uf, onboarded: true })
    void api.hello()
    go('map')
  }

  return (
    <Screen world={levelsDone(save) / 13} className="scr--page">
      <Page eyebrow="Antes de começar" title="Escolha seu personagem" tone="red">
        <form
          className="page-body"
          onSubmit={(e) => {
            e.preventDefault()
            start()
          }}
        >
          <motion.div className="avatars" role="radiogroup" aria-label="Personagem" variants={rise}>
            {AVATARS.map((a, i) => (
              <Tap
                key={a}
                ref={(el) => {
                  tiles.current[i] = el
                }}
                role="radio"
                aria-checked={a === pick}
                tabIndex={a === pick ? 0 : -1}
                className="av"
                vibe="move"
                onClick={() => choose(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') choose(i + 1, true)
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') choose(i - 1, true)
                  else return
                  e.preventDefault()
                }}
              >
                <PixelIcon src={sprite(a)} />
                {AVATAR_NAMES[a]}
              </Tap>
            ))}
          </motion.div>
          <motion.div className="field" variants={rise}>
            <label htmlFor="nick">Apelido no placar (opcional)</label>
            <input
              id="nick"
              className="input"
              maxLength={16}
              placeholder="Ex.: Coelho do Sertão"
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </motion.div>
          <motion.div className="field" variants={rise}>
            <label htmlFor="uf">Seu estado (opcional)</label>
            <select id="uf" className="input" value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">Prefiro não dizer</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </motion.div>
          <motion.p className="note" variants={rise}>
            Sem cadastro e sem telefone. O apelido aparece no placar; o estado entra só na contagem por
            estado.
          </motion.p>
          <motion.div className="actions actions--end" variants={rise}>
            <PixelButton tone="ghost" commit="back" onClick={() => go('title')}>
              Voltar
            </PixelButton>
            <PixelButton tone="red" size="big" type="submit">
              Começar ▶
            </PixelButton>
          </motion.div>
        </form>
      </Page>
    </Screen>
  )
}
