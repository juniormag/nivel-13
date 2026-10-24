import '@fontsource/silkscreen/400.css'
import '@fontsource/pixelify-sans/400.css'
import './ui/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { go, initHistory } from './app/nav'
import { unlockAudio } from './audio/audio'

addEventListener('pointerdown', () => unlockAudio(), { once: true })
addEventListener('keydown', () => unlockAudio(), { once: true })
initHistory('title')

// Links do Chuta Aí (?c=, ?d=, ?g=) abrem direto no jogo do dia; ?t= abre um parente do Convence o Tio; ?o= abre um mapa do Onde Foi?; ?go=ir abre a calculadora do IR.
{
  const q = new URLSearchParams(location.search)
  if (q.has('c') || q.has('d') || q.has('g')) go('chuta', { c: q.get('c'), d: q.get('d'), g: q.get('g') })
  else if (q.get('t')) go('tio', { parente: q.get('t') })
  else if (q.get('o')) go('onde', { seed: q.get('o'), vs: q.get('vs') })
  else if (q.get('go') === 'ir') go('play', { level: 3 })
}

// gancho de QA em desenvolvimento: window.__go('play', { level: 5 })
if (import.meta.env.DEV) (window as unknown as { __go: typeof go }).__go = go

const el = document.getElementById('root')
if (el)
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
