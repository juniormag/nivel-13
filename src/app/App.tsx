import { Suspense, lazy } from 'react'
import { useNav } from './nav'

// Cada tela é um chunk próprio: a primeira tela abre rápido.
const screens = {
  title: lazy(() => import('./screens/Title')),
  onboard: lazy(() => import('./screens/Onboard')),
  map: lazy(() => import('./screens/Map')),
  play: lazy(() => import('./screens/Play')),
  result: lazy(() => import('./screens/Result')),
  final: lazy(() => import('./screens/Final')),
  daily: lazy(() => import('./screens/Daily')),
  placar: lazy(() => import('./screens/Placar')),
  colecao: lazy(() => import('./screens/Colecao')),
  votar: lazy(() => import('./screens/Votar')),
  sobre: lazy(() => import('./screens/Sobre')),
  chuta: lazy(() => import('./screens/Chuta')),
  papo: lazy(() => import('./screens/Papo')),
  duelo: lazy(() => import('./screens/Duelo')),
  grupo: lazy(() => import('./screens/Grupo')),
  plano: lazy(() => import('./screens/Plano')),
}

export function App() {
  const screen = useNav((s) => s.screen)
  const Screen = screens[screen]
  return (
    <Suspense fallback={<div className="boot" aria-busy="true" />}>
      <Screen />
    </Suspense>
  )
}
