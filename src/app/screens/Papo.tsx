// Papo de Almoço (VIRAL-DESIGN §3.5, MVP = só o compositor): quem → o que preocupa → mensagem editável,
// privada e respeitosa, com um fato revisado e a fonte → WhatsApp 1 a 1 (wa.me, sem número).
// Nada é gravado: nem quem, nem a preocupação, nem o texto.
import '../../viral/viral.css'
import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { CONFIG } from '../../config'
import { dailyNumber } from '../../lib/time'
import { getSave } from '../../state/save'
import { rise } from '../../ui/motion'
import { PixelButton, Tap } from '../../ui/PixelButton'
import { toast } from '../../ui/Toast'
import { ev } from '../../viral/api'
import { verifiedRound } from '../../viral/rounds'
import { chuteUrl, copyText, openWhatsApp } from '../../viral/share'
import { ViralPage } from '../../viral/ViralPage'
import { go } from '../nav'

const WHO = ['Mãe', 'Pai', 'Tia', 'Tio', 'Vó', 'Vô', 'Amigo', 'Amiga', 'Colega'] as const
type Who = (typeof WHO)[number]

type Concern = 'mercado' | 'emprego' | 'imposto' | 'saude' | 'educacao' | 'seguranca'
const CONCERNS: { id: Concern; label: string }[] = [
  { id: 'mercado', label: 'Preço do mercado' },
  { id: 'emprego', label: 'Emprego' },
  { id: 'imposto', label: 'Imposto' },
  { id: 'saude', label: 'Remédio e saúde' },
  { id: 'educacao', label: 'Educação dos filhos' },
  { id: 'seguranca', label: 'Segurança' },
]

/** Fato de cada preocupação: só rodadas revisadas (review === 'ok'), com fonte. */
const FACT: Record<Concern, string> = {
  mercado: 'r15',
  emprego: 'r04',
  imposto: 'r01',
  saude: 'r10',
  educacao: 'r13',
  seguranca: 'r17',
}

/** A revelação de rodada de escolha começa pela resposta ("Todos: ...", "Fake. ..."): na conversa, tira. */
function factSentence(r: NonNullable<ReturnType<typeof verifiedRound>>) {
  if (r.kind !== 'choice') return r.reveal
  const ans = r.options[r.correct] ?? ''
  const m = r.reveal.match(/^([^:.]{1,24})[:.]\s+(.*)$/)
  if (!m || !ans || (m[1] ?? '').toLowerCase() !== ans.toLowerCase()) return r.reveal
  const rest = m[2] ?? ''
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

const greet = (who: Who | null) => (who && who !== 'Colega' ? `Oi, ${who.toLowerCase()}!` : 'Oi!')

function build(concern: Concern, who: Who | null) {
  const r = verifiedRound(FACT[concern])
  const src = r?.sources[0]
  const fact = r ? factSentence(r) : ''
  const fonte = src ? `Fonte: ${src.name}, ${src.url}` : ''
  const game = chuteUrl(dailyNumber(), { s: 'tio' })
  const hi = greet(who)
  const lines: string[] = []
  switch (concern) {
    case 'mercado':
      lines.push(`${hi} Tava pensando em você. O mercado tá caro mesmo, não é impressão sua.`)
      if (fact) lines.push(`Fui olhar os números e achei isto: ${fact}`, fonte)
      lines.push(`Tem um joguinho de chutar números do Brasil. Chuta aí e me conta: ${game}`)
      break
    case 'emprego':
      // sem o número: a pergunta é o gancho (a pessoa chuta antes de abrir)
      lines.push(
        `${hi} Chuta aí: quanto você acha que tá o desemprego no Brasil hoje? Eu achava que era bem mais e errei feio.`,
        `Joga esse aqui e me diz quanto você chutou. A resposta vem com a fonte: ${game}`,
      )
      break
    case 'imposto':
      lines.push(`${hi} Lembrei de você.`)
      if (fact) lines.push(`Sabia disso do Imposto de Renda? ${fact}`, fonte)
      lines.push(`Fiz a conta do meu aqui, faz a sua: ${CONFIG.siteUrl}/?go=ir&s=tio&r=${getSave().id}`)
      break
    case 'saude':
      lines.push(`${hi} Você ainda paga o remédio da pressão?`)
      if (fact) lines.push(`Olha o que eu descobri do Farmácia Popular: ${fact}`, fonte)
      lines.push('Vale conferir na farmácia perto de casa. Se precisar, eu vou junto.')
      break
    case 'educacao':
      lines.push(`${hi} Conhece o Pé-de-Meia? É uma poupança para aluno do ensino médio público.`)
      if (fact) lines.push(fact, fonte)
      lines.push(`Achei isso num joguinho de números do Brasil: ${game}`)
      break
    case 'seguranca':
      lines.push(`${hi} Segurança é o que mais me preocupa também.`)
      if (fact) lines.push(`Fui ver os números: ${fact} Ainda tem muito a fazer.`, fonte)
      lines.push('Queria saber o que você acha, com calma. Bora conversar no almoço?')
      break
  }
  return { text: lines.filter(Boolean).join('\n'), src }
}

export default function Papo() {
  const [who, setWho] = useState<Who | null>(null)
  const [concern, setConcern] = useState<Concern | null>(null)
  const [text, setText] = useState('')
  const msgId = useId()
  const msgRef = useRef<HTMLDivElement>(null)
  // no celular a mensagem e o botão de mandar nascem abaixo da dobra: a primeira escolha leva até eles
  const revealMsg = () => {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        msgRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }),
      ),
    )
  }

  useEffect(() => ev('papo_open'), [])

  const choose = (c: Concern | null, w: Who | null) => {
    if (c) setText(build(c, w).text)
  }
  const src = concern ? build(concern, who).src : undefined

  return (
    <ViralPage eyebrow="Papo de Almoço" title="Chame alguém pra conversar" onClose={() => history.back()}>
      <motion.p variants={rise}>
        Mensagem de um pra um pesa mais que link no grupo. Escolha a pessoa e o que preocupa ela. O texto é
        seu: mude o que quiser. Nada fica gravado.
      </motion.p>

      <motion.fieldset className="cx-chips" variants={rise}>
        <legend>Pra quem?</legend>
        {WHO.map((w) => (
          <Tap
            key={w}
            className="chip"
            aria-pressed={who === w}
            vibe="move"
            onClick={() => {
              const next = who === w ? null : w
              setWho(next)
              choose(concern, next)
            }}
          >
            {w}
          </Tap>
        ))}
      </motion.fieldset>

      <motion.fieldset className="cx-chips" variants={rise}>
        <legend>O que preocupa essa pessoa?</legend>
        {CONCERNS.map((c) => (
          <Tap
            key={c.id}
            className="chip"
            aria-pressed={concern === c.id}
            vibe="move"
            onClick={() => {
              if (!concern) revealMsg()
              setConcern(c.id)
              choose(c.id, who)
              ev('papo_concern', c.id)
            }}
          >
            {c.label}
          </Tap>
        ))}
      </motion.fieldset>

      {concern ? (
        <motion.div
          ref={msgRef}
          className="field"
          key={concern}
          initial="hidden"
          animate="show"
          variants={rise}
        >
          <label htmlFor={msgId}>Sua mensagem</label>
          <textarea
            id={msgId}
            className="input cx-msg"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {src && (
            <p className="cx-fact-note">
              Fato com fonte:{' '}
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.name} ↗<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </p>
          )}
          <p className="note">
            Dica: pergunte antes de afirmar e escute a resposta. Ninguém muda de ideia brigando.
          </p>
          <div className="actions">
            <PixelButton
              tone="red"
              size="big"
              wide
              disabled={!text.trim()}
              onClick={() => {
                ev('papo_send', concern)
                openWhatsApp(text.trim())
              }}
            >
              Mandar no WhatsApp
            </PixelButton>
            <PixelButton
              tone="ghost"
              onClick={async () => {
                const ok = await copyText(text.trim())
                toast(ok ? 'Copiado.' : 'Não deu para copiar aqui.', ok ? 'gold' : 'stone')
              }}
            >
              Copiar
            </PixelButton>
          </div>
        </motion.div>
      ) : (
        <motion.p className="note" variants={rise}>
          Toque numa preocupação para ver a mensagem.
        </motion.p>
      )}

      <motion.div className="actions" variants={rise}>
        <PixelButton tone="ghost" onClick={() => go('chuta')}>
          Voltar ao Chuta Aí
        </PixelButton>
      </motion.div>
    </ViralPage>
  )
}
