// Retrato pixel do parente com a expressão do momento (neutro, pensando, fechado). Ampliação inteira via CSS.
import type { ParenteId } from '../../content/tio'
import { PixelIcon } from '../../ui/PixelIcon'
import { type Expr, faceCanvas } from './faces'

const EXPR_LABEL: Record<Expr, string> = {
  neutro: 'tranquilo',
  pensando: 'pensando',
  fechado: 'de cara fechada',
}

export function Face({
  id,
  expr = 'neutro',
  className,
  label,
}: {
  id: ParenteId
  expr?: Expr
  className?: string
  /** nome para leitor de tela; sem nome, é decorativo */
  label?: string
}) {
  return (
    <span className={`tio-face tio-face--${expr}${className ? ` ${className}` : ''}`} data-expr={expr}>
      <PixelIcon src={faceCanvas(id, expr)} label={label ? `${label}, ${EXPR_LABEL[expr]}` : undefined} />
    </span>
  )
}
