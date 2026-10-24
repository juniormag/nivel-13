import '@fontsource/silkscreen/400.css'
import '@fontsource/pixelify-sans/400.css'
import './ui/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { unlockAudio } from './audio/audio'
import { go } from './app/nav'

addEventListener('pointerdown', () => unlockAudio(), { once: true })
addEventListener('keydown', () => unlockAudio(), { once: true })
history.replaceState({ screen: 'title' }, '')

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
