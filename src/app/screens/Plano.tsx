// Meu plano de domingo (VIRAL-DESIGN §2.2 passo 8, §5.2 item 7): que horas, qual documento, com quem.
// Fica só no aparelho (save.plano), nunca vai para a API. Sem ponto, sem som de vitória, sem recompensa:
// plano de voto não pode virar prêmio (Código Eleitoral, art. 299).
import '../../viral/viral.css'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../config'
import { ShareSheet, shareText } from '../../share/ShareSheet'
import { useSave } from '../../state/save'
import { rise } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { ev } from '../../viral/api'
import { ViralPage } from '../../viral/ViralPage'

const HORAS = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h']
const DOCS = ['RG', 'CNH', 'e-Título', 'Passaporte', 'Carteira de trabalho']
const COM = ['Sozinho', 'Com a família', 'Com a minha mãe', 'Com o meu pai', 'Com amigos', 'Com vizinhos']

type Plano = { hora: string; doc: string; com: string }

function Chips({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string
  options: string[]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <motion.fieldset className="cx-chips" variants={rise}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <Tap key={o} className="chip" aria-pressed={value === o} vibe="move" onClick={() => onPick(o)}>
          {o}
        </Tap>
      ))}
    </motion.fieldset>
  )
}

export default function PlanoScreen() {
  const save = useSave()
  const [p, setP] = useState<Plano>(save.plano ?? { hora: '', doc: '', com: '' })
  const [card, setCard] = useState(false)
  const done = !!(p.hora && p.doc && p.com)
  const past = Date.now() > CONFIG.electionAt.getTime() + 10 * 3600000

  const cardRef = useRef<HTMLElement>(null)

  const set = (k: keyof Plano, v: string) => {
    const next = { ...p, [k]: v }
    setP(next)
    if (next.hora && next.doc && next.com) {
      if (!save.plano) ev('plano_create')
      save.patch({ plano: next })
      // no celular o card e os botões ficam abaixo da dobra: o terceiro toque leva até eles
      if (!done) {
        const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
        requestAnimationFrame(() =>
          cardRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }),
        )
      }
    }
  }

  useEffect(() => {
    if (save.plano) setP(save.plano)
  }, [save.plano])

  return (
    <ViralPage eyebrow="Meu plano de domingo" title="Como você vai votar" onClose={() => history.back()}>
      <motion.p variants={rise}>
        Quem decide a hora, o documento e a companhia vai votar com mais facilidade. Três toques. Fica só
        neste aparelho.
      </motion.p>
      {past && (
        <motion.p className="note" variants={rise}>
          A votação de {CONFIG.electionLabel} já passou.
        </motion.p>
      )}

      <Chips legend="Que horas?" options={HORAS} value={p.hora} onPick={(v) => set('hora', v)} />
      <Chips legend="Qual documento com foto?" options={DOCS} value={p.doc} onPick={(v) => set('doc', v)} />
      <Chips legend="Com quem?" options={COM} value={p.com} onPick={(v) => set('com', v)} />

      <motion.section
        ref={cardRef}
        className="cx-plan-card pf pf--red"
        aria-label="Seu plano"
        variants={rise}
      >
        <div className="eyebrow">Meu plano · domingo 25/10</div>
        <dl className="cx-plan-rows">
          <div>
            <dt>Hora</dt>
            <dd className={p.hora ? undefined : 'is-empty'}>{p.hora || '...'}</dd>
          </div>
          <div>
            <dt>Documento</dt>
            <dd className={p.doc ? undefined : 'is-empty'}>{p.doc || '...'}</dd>
          </div>
          <div>
            <dt>Com quem</dt>
            <dd className={p.com ? undefined : 'is-empty'}>{p.com || '...'}</dd>
          </div>
        </dl>
        <p className="cx-plan-foot">
          Seção aberta {CONFIG.electionLabel.replace(/^domingo, /, 'no domingo, ')}. Basta um documento
          oficial com foto.
        </p>
      </motion.section>

      <motion.div className="actions" variants={rise}>
        <PixelButton tone="red" disabled={!done} onClick={() => setCard(true)}>
          Ver card
        </PixelButton>
        <PixelButton
          disabled={!done}
          onClick={() =>
            void shareText(`Já fiz o meu plano para votar: ${CONFIG.electionLabel}. E você, já fez o seu?`)
          }
        >
          Chamar alguém
        </PixelButton>
      </motion.div>
      {save.plano && (
        <motion.div className="actions" variants={rise}>
          <PixelButton
            tone="ghost"
            onClick={() => {
              save.patch({ plano: null })
              setP({ hora: '', doc: '', com: '' })
            }}
          >
            Apagar meu plano
          </PixelButton>
        </motion.div>
      )}

      {card && done && <ShareSheet moment={{ kind: 'plano', ...p }} onClose={() => setCard(false)} />}
    </ViralPage>
  )
}
