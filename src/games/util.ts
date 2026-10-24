// Utilidades de desenho para os minijogos (tudo em pixels lógicos).
export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  g.fillStyle = col
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

export function text(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  col = '#efe8dc',
  size = 8,
  align: CanvasTextAlign = 'center',
) {
  g.font = `${size}px Silkscreen, monospace`
  g.textAlign = align
  g.textBaseline = 'middle'
  g.fillStyle = '#000'
  g.fillText(s, Math.round(x), Math.round(y) + 1)
  g.fillStyle = col
  g.fillText(s, Math.round(x), Math.round(y))
}

export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

export function ring(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  col: string,
  step = 0.08,
) {
  g.fillStyle = col
  for (let a = 0; a < Math.PI * 2; a += step)
    g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1)
}
