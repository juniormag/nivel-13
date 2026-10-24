// Abas acessíveis: role tablist/tab/tabpanel, aria-selected, setas, Home e End, foco itinerante.
import { type ReactNode, useId, useRef } from 'react'
import { Tap } from './PixelButton'

export interface TabDef<T extends string> {
  id: T
  label: string
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  children,
}: {
  tabs: TabDef<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  children: ReactNode
}) {
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = Math.max(
    0,
    tabs.findIndex((t) => t.id === value),
  )
  const go = (i: number) => {
    const n = (i + tabs.length) % tabs.length
    const t = tabs[n]
    if (!t) return
    onChange(t.id)
    refs.current[n]?.focus()
  }
  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <Tap
            key={t.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${base}-t-${t.id}`}
            aria-selected={t.id === value}
            aria-controls={`${base}-p`}
            tabIndex={t.id === value ? 0 : -1}
            className="tab"
            vibe="move"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') go(i + 1)
              else if (e.key === 'ArrowLeft') go(i - 1)
              else if (e.key === 'Home') go(0)
              else if (e.key === 'End') go(tabs.length - 1)
              else return
              e.preventDefault()
            }}
          >
            {t.label}
          </Tap>
        ))}
      </div>
      <div
        className="tabpanel"
        role="tabpanel"
        id={`${base}-p`}
        aria-labelledby={`${base}-t-${tabs[idx]?.id ?? ''}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}
