// TEMPORÁRIO (QA do growth-share-engineer): monta a folha isolada. Apagar depois.
import { createRoot } from 'react-dom/client'
import { ShareSheet } from './ShareSheet'
import type { Moment } from './types'

export function mount(moment: Moment) {
  const el = document.createElement('div')
  el.id = 'qa-share'
  document.body.appendChild(el)
  const root = createRoot(el)
  root.render(<ShareSheet moment={moment} onClose={() => root.unmount()} />)
}
