// Carta de fato: retrato ou ícone, título, selo do status jurídico exato, texto, fontes com data e
// "esse me convenceu" (conta no placar). O texto vem sempre de src/content/facts.ts.
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Fact } from '../content/facts'
import { api } from '../lib/api'
import { PEOPLE, portrait, sprite } from '../lib/sprites'
import { useSave } from '../state/save'
import { rise, stagger } from './motion'
import { PixelButton } from './PixelButton'
import { PixelIcon } from './PixelIcon'

export function factArt(f: Fact) {
  const spec = f.who !== 'brasil' ? PEOPLE[f.who] : undefined
  return spec ? portrait(spec) : sprite(f.icon)
}

export function LikeButton({ id }: { id: string }) {
  const liked = useSave((s) => s.liked.includes(id))
  return (
    <PixelButton
      className={`like${liked ? ' is-on' : ''}`}
      aria-pressed={liked}
      sound={liked ? 'tap' : 'good'}
      vibe={liked ? 'confirm' : 'success'}
      onClick={() => {
        if (!useSave.getState().like(id)) return
        void api.like(id)
      }}
    >
      <span aria-hidden="true">👍</span> {liked ? 'Me convenceu' : 'Esse me convenceu'}
    </PixelButton>
  )
}

export function FactCard({
  fact: f,
  extra,
  className,
}: {
  fact: Fact
  extra?: ReactNode
  className?: string
}) {
  const id = `f-${f.id}`
  return (
    <motion.article
      className={`factcard pf pf--gold pf--lift${className ? ` ${className}` : ''}`}
      aria-labelledby={id}
      variants={stagger(0.04, 0.02)}
      initial="hidden"
      animate="show"
    >
      <motion.header className="fc-head" variants={rise}>
        <span className="fc-art pf pf--hud">
          <PixelIcon src={factArt(f)} />
        </span>
        <div>
          <div className="fc-kicker">{f.kicker}</div>
          <h3 id={id}>{f.title}</h3>
        </div>
      </motion.header>
      <motion.div variants={rise}>
        <span className={`fc-status is-${f.status.kind}`}>
          <span className="sr-only">Status: </span>
          {f.status.label}
        </span>
      </motion.div>
      <motion.p className="fc-body" variants={rise}>
        {f.body}
      </motion.p>
      <motion.div variants={rise}>
        <h4 className="fc-src-title">Fontes</h4>
        <ul className="fc-sources">
          {f.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>
              <span className="fc-date"> · {s.date}</span>
            </li>
          ))}
        </ul>
      </motion.div>
      <motion.div className="fc-actions" variants={rise}>
        <LikeButton id={f.id} />
        {extra}
      </motion.div>
    </motion.article>
  )
}
