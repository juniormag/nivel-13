import '@fontsource/silkscreen/400.css'
import '@fontsource/pixelify-sans/400.css'
import './styles.css'
import { api } from './core/api'
import { unlockAudio } from './core/audio'
import { save } from './core/store'
import { Scene } from './scene/scene'
import { go } from './ui/router'
import './ui/title'
import './ui/onboard'
import './ui/map'
import './ui/play'
import './ui/result'
import './ui/final'
import './ui/daily'
import './ui/placar'
import './ui/colecao'
import './ui/votar'
import './ui/sobre'

Scene.init()
addEventListener('pointerdown', () => unlockAudio(), { once: true })
addEventListener('keydown', () => unlockAudio(), { once: true })

const params = new URLSearchParams(location.search)
const start = params.get('tela')
history.replaceState({ name: 'title' }, '', location.pathname + location.search)
if (start === 'desafio') go('daily', {}, false)
else if (start === 'placar') go('placar', {}, false)
else go('title', {}, false)

if (save.onboarded) void api.hello()

// gancho de QA (só em desenvolvimento): window.__go('play', { level: 5 })
if (import.meta.env.DEV) (window as unknown as { __go: typeof go }).__go = go

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
