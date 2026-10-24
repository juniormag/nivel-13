import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense } from 'react'
import { InstallPrompt } from '../ui/install/InstallPrompt'
import { prefersReduced, screenOut } from '../ui/motion'
import { Splash } from '../ui/Splash'
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
  tio: lazy(() => import('./screens/Tio')),
  onde: lazy(() => import('./screens/Onde')),
}

export function App() {
  const screen = useNav((s) => s.screen)
  const Screen = screens[screen]
  // troca de tela: a anterior apaga em 3 degraus (100 ms) e a nova entra com a cortina pontilhada (PixelWipe)
  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={screen} className="scr-swap" exit={prefersReduced() ? undefined : screenOut}>
          <Suspense fallback={<Splash />}>
            <Screen />
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <InstallPrompt />
    </>
  )
}
