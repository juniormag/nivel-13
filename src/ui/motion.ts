// Motion da interface (docs/research/visual.md, regras 32 a 34).
// Entradas em degraus de 120 a 220 ms; fechar mais rápido que abrir; movimento reduzido respeitado.
import type { Transition, Variants } from 'motion/react'

/** Easing em degraus, como animação de sprite (steps(n) do CSS). */
export const steps =
  (n: number) =>
  (t: number): number =>
    t >= 1 ? 1 : Math.floor(t * n) / n

export const EASE_OUT_QUAD: [number, number, number, number] = [0.5, 1, 0.89, 1]
/** ease-out-back com cerca de 8% de passagem do alvo */
export const EASE_BACK: [number, number, number, number] = [0.34, 1.45, 0.64, 1]

/** Escala de toque só para elementos que não são pixel (cartas DOM); botões pixel usam usePress. */
export const PRESS = {
  whileTap: { scale: 0.97, transition: { duration: 0.06, ease: EASE_OUT_QUAD } },
  transition: { type: 'tween', duration: 0.15, ease: EASE_BACK } satisfies Transition,
}

/** Contêiner que escalona a entrada dos filhos. */
export const stagger = (gap = 0.05, delay = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

/** Filho que entra subindo alguns pixels, em 4 degraus (180 ms). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: steps(4) } },
}

/** Entrada lateral para os cantos do HUD. */
export const slideFrom = (x: number, y = 0): Variants => ({
  hidden: { opacity: 0, x, y },
  show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.22, ease: steps(5) } },
})

/** Painéis e diálogos: abre em 180 ms, fecha em 120 ms. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: steps(4) } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: steps(3) } },
}

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: steps(4) } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: steps(2) } },
}

export const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Tela nova entra pela direita, 8 px lógicos em 4 degraus (navegação para a frente). */
export const pageIn: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.16, ease: steps(4) } },
}

/** Saída de tela: apaga em 3 degraus em 100 ms (fechar mais rápido que abrir; a entrada é o PixelWipe de 160 ms). */
export const screenOut = { opacity: 0, transition: { duration: 0.1, ease: steps(3) } }
