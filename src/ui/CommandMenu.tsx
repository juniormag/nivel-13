// Menu de comandos da referência: item ativo em faixa vermelha com ▶ fora da faixa, que balança 1 px
// a cada 400 ms; os outros com um ponto. Foco = seleção (x-craft §2, regra 6): setas, Home/End,
// Enter; o mouse também move a faixa. Mover é instantâneo (só o quadro branco), sem tween.
// Com `memory`, o item escolhido é lembrado: ao voltar para a tela, a seleção e o foco voltam nele.
import { motion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { sfx } from '../audio/audio'
import { rise, stagger } from './motion'
import { haptic } from './prefs'
import { usePress } from './press'

export interface MenuItem {
  id: string
  label: string
  /** etiqueta curta à direita (número do desafio, contagem, prazo) */
  hint?: ReactNode
  /** texto lido pelo leitor de tela no lugar da etiqueta */
  hintLabel?: string
  onSelect: () => void
}

/** Pilha de seleção: último item escolhido em cada menu (sobrevive à troca de tela). */
const remembered = new Map<string, string>()
let lastInputKeyboard = false
if (typeof window !== 'undefined') {
  addEventListener('keydown', () => (lastInputKeyboard = true), true)
  addEventListener('pointerdown', () => (lastInputKeyboard = false), true)
}

export function CommandMenu({
  items,
  label,
  className,
  globalKeys = true,
  memory,
}: {
  items: MenuItem[]
  label: string
  className?: string
  /** setas funcionam mesmo sem foco no menu (tela de título) */
  globalKeys?: boolean
  /** chave para lembrar a seleção ao voltar para esta tela */
  memory?: string
}) {
  const saved = memory ? remembered.get(memory) : undefined
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      items.findIndex((it) => it.id === saved),
    ),
  )
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // voltando para a tela: o foco volta no item que abriu a tela anterior
  useEffect(() => {
    if (saved && lastInputKeyboard) {
      const t = window.setTimeout(() => refs.current[active]?.focus({ preventScroll: true }), 60)
      return () => clearTimeout(t)
    }
    // só na montagem
    // biome-ignore lint/correctness/useExhaustiveDependencies: restaura uma vez
  }, [])

  const move = (to: number, focus = true) => {
    const n = (to + items.length) % items.length
    if (n !== active) {
      sfx('tick')
      if (focus) haptic('move')
    }
    setActive(n)
    if (focus) refs.current[n]?.focus()
  }

  const select = (i: number) => {
    const it = items[i]
    if (!it) return
    if (memory) remembered.set(memory, it.id)
    it.onSelect()
  }

  useEffect(() => {
    if (!globalKeys) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t !== document.body) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        move(active + (e.key === 'ArrowDown' ? 1 : -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        sfx('tap')
        select(active)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <nav className={`cmd${className ? ` ${className}` : ''}`} aria-label={label}>
      <motion.ul variants={stagger(0.04, 0.12)} initial="hidden" animate="show">
        {items.map((it, i) => (
          <motion.li key={it.id} variants={rise}>
            <CmdItem
              item={it}
              active={i === active}
              ref={(el) => {
                refs.current[i] = el
              }}
              onHover={() => move(i, false)}
              onFocus={() => setActive(i)}
              onSelect={() => select(i)}
              onNav={(key) => {
                if (key === 'ArrowDown') move(i + 1)
                else if (key === 'ArrowUp') move(i - 1)
                else if (key === 'Home') move(0)
                else if (key === 'End') move(items.length - 1)
                else return false
                return true
              }}
            />
          </motion.li>
        ))}
      </motion.ul>
    </nav>
  )
}

function CmdItem({
  item: it,
  active,
  ref,
  onHover,
  onFocus,
  onSelect,
  onNav,
}: {
  item: MenuItem
  active: boolean
  ref: (el: HTMLButtonElement | null) => void
  onHover: () => void
  onFocus: () => void
  onSelect: () => void
  onNav: (key: string) => boolean
}) {
  const press = usePress<HTMLButtonElement>(onSelect)
  return (
    <button
      ref={ref}
      type="button"
      className={`cmd-item${active ? ' is-active' : ''}`}
      tabIndex={active ? 0 : -1}
      aria-current={active ? 'true' : undefined}
      aria-label={it.hintLabel ? `${it.label}, ${it.hintLabel}` : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') onHover()
      }}
      onFocus={onFocus}
      {...press}
      onKeyDown={(e) => {
        if (onNav(e.key)) {
          e.preventDefault()
          return
        }
        press.onKeyDown(e)
      }}
    >
      <span className="cmd-cursor" aria-hidden="true">
        <svg viewBox="0 0 5 9" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M0 0h1v1h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1z" />
        </svg>
      </span>
      <span className="cmd-label">{it.label}</span>
      {it.hint !== undefined && it.hint !== '' && (
        <span className="cmd-hint" aria-hidden={it.hintLabel ? true : undefined}>
          {it.hint}
        </span>
      )}
    </button>
  )
}
