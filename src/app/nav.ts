// Navegação entre telas (estado simples + histórico do navegador para o botão voltar do Android).
import { create } from 'zustand'

export type Screen =
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
  | 'chuta'
  | 'papo'
  | 'duelo'
  | 'grupo'
  | 'plano'
  | 'tio'
  | 'onde'

export interface NavState {
  screen: Screen
  params: Record<string, unknown>
  go(screen: Screen, params?: Record<string, unknown>): void
}

export const useNav = create<NavState>((set) => ({
  screen: 'title',
  params: {},
  go(screen, params = {}) {
    if (screen !== 'play' && screen !== 'result') history.pushState({ screen }, '')
    set({ screen, params })
  },
}))

export const go = (screen: Screen, params?: Record<string, unknown>) => useNav.getState().go(screen, params)

addEventListener('popstate', (e) => {
  const cur = useNav.getState().screen
  const target = (e.state as { screen?: Screen } | null)?.screen ?? 'title'
  useNav.setState({ screen: cur === 'play' || cur === 'result' ? 'map' : target, params: {} })
})
