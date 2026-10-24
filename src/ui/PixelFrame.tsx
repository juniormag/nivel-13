// Moldura 9-slice em degrau (regra 36): contorno de 1 px lógico com cantos cortados,
// bisel claro em cima e à esquerda, bisel escuro embaixo e à direita, fundo opaco --night.
import { type ComponentPropsWithRef, createElement, type ElementType } from 'react'

export type FrameTone = 'hud' | 'stone' | 'red' | 'gold' | 'ghost'

type Props = ComponentPropsWithRef<'div'> & {
  as?: ElementType
  tone?: FrameTone
  /** cantoneira clara no alto à esquerda, como no retrato e nas habilidades da referência */
  bracket?: boolean
  /** sombra projetada de 3 px lógicos */
  lift?: boolean
}

export function PixelFrame({ as = 'div', tone = 'stone', bracket, lift, className, ...rest }: Props) {
  const cls = ['pf', `pf--${tone}`, bracket && 'pf--bracket', lift && 'pf--lift', className]
    .filter(Boolean)
    .join(' ')
  return createElement(as, { ...rest, className: cls })
}
