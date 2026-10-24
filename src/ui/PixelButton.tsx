// Botão pixel. Toque em pixel nativo (x-craft.md §2, regras 1 e 2): no pointer-down desce 1 px lógico,
// troca o bisel, toca o som e vibra; a ação vem ao soltar dentro do botão; arrastar 8 px cancela.
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from 'react'
import type { Sfx } from '../audio/audio'
import type { Haptic } from './prefs'
import { usePress } from './press'

export type ButtonTone = 'stone' | 'red' | 'gold' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone
  size?: 'md' | 'big' | 'sm'
  wide?: boolean
  /** som no pointer-down (null desliga) */
  sound?: Sfx | null
  /** som ao confirmar; padrão: 'confirm' no botão vermelho (ação principal) */
  commit?: Sfx | null
  vibe?: Haptic | null
  ref?: Ref<HTMLButtonElement>
}

const cls = (tone: ButtonTone, size: string, wide?: boolean, extra?: string) =>
  [
    'btn',
    tone !== 'stone' && `btn--${tone}`,
    size === 'big' && 'btn--big',
    size === 'sm' && 'btn--sm',
    wide && 'btn--wide',
    extra,
  ]
    .filter(Boolean)
    .join(' ')

export function PixelButton({
  tone = 'stone',
  size = 'md',
  wide,
  sound = 'tap',
  commit,
  vibe = 'confirm',
  className,
  type = 'button',
  onClick,
  onKeyDown,
  ...rest
}: Props) {
  const press = usePress<HTMLButtonElement>(onClick, {
    sound,
    vibe,
    commit: commit === undefined ? (tone === 'red' ? 'confirm' : null) : commit,
    disabled: rest.disabled,
  })
  return (
    <button
      type={type}
      className={cls(tone, size, wide, className)}
      {...rest}
      {...press}
      onKeyDown={(e) => {
        press.onKeyDown(e)
        onKeyDown?.(e)
      }}
    />
  )
}

/** Link com cara de botão (fontes externas, TSE). */
export function PixelLink({
  tone = 'stone',
  wide,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { tone?: ButtonTone; wide?: boolean }) {
  const press = usePress<HTMLAnchorElement>(undefined, {})
  return <a className={cls(tone, 'md', wide, className)} {...rest} {...press} />
}

/** Botão sem estilo próprio com o mesmo modelo de toque (abas, cartas, opções, ícones). */
export function Tap({
  sound = 'tap',
  commit = null,
  vibe = 'confirm',
  type = 'button',
  onClick,
  onKeyDown,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  sound?: Sfx | null
  commit?: Sfx | null
  vibe?: Haptic | null
  ref?: Ref<HTMLButtonElement>
}) {
  const press = usePress<HTMLButtonElement>(onClick, { sound, commit, vibe, disabled: rest.disabled })
  return (
    <button
      type={type}
      {...rest}
      {...press}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!e.defaultPrevented) press.onKeyDown(e)
      }}
    />
  )
}
