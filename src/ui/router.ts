// Navegação entre telas. Cada tela monta em #ui e devolve uma função de limpeza.
export type ScreenName =
  | 'title'
  | 'onboard'
  | 'map'
  | 'play'
  | 'result'
  | 'final'
  | 'daily'
  | 'placar'
  | 'colecao'
  | 'votar'
  | 'sobre'

type Params = Record<string, unknown>
type Screen = (root: HTMLElement, params: Params) => (() => void) | void

const screens = new Map<ScreenName, Screen>()
const ui = document.getElementById('ui') as HTMLElement
let cleanup: (() => void) | void
let current: ScreenName = 'title'

export function register(name: ScreenName, fn: Screen) {
  screens.set(name, fn)
}

export function go(name: ScreenName, params: Params = {}, push = true) {
  const fn = screens.get(name)
  if (!fn) return
  if (cleanup) cleanup()
  cleanup = undefined
  ui.replaceChildren()
  current = name
  if (push && name !== 'play' && name !== 'result')
    history.pushState({ name }, '', location.pathname + location.search)
  cleanup = fn(ui, params)
  const first = ui.querySelector<HTMLElement>('[autofocus], .menu-item.active, .btn--red')
  first?.focus({ preventScroll: true })
}

export const currentScreen = () => current

addEventListener('popstate', (e) => {
  const name = (e.state as { name?: ScreenName } | null)?.name ?? 'title'
  go(current === 'play' || current === 'result' ? 'map' : name, {}, false)
})
