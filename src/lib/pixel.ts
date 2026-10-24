// Resolução lógica de pixel art: o lado menor da tela vira ~TARGET pixels lógicos,
// ampliados por um fator inteiro de pixels físicos, então todo pixel tem o mesmo tamanho.
export const TARGET = 230

export interface PixelFit {
  W: number
  H: number
  /** pixels físicos por pixel lógico */
  s: number
  /** pixels CSS por pixel lógico */
  css: number
}

export function computeFit(target = TARGET): PixelFit {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const physShort = Math.min(vw, vh) * dpr
  const s = Math.max(1, Math.round(physShort / target))
  return { W: Math.ceil((vw * dpr) / s), H: Math.ceil((vh * dpr) / s), s, css: s / dpr }
}

export function applyFit(canvas: HTMLCanvasElement, f: PixelFit) {
  if (canvas.width !== f.W) canvas.width = f.W
  if (canvas.height !== f.H) canvas.height = f.H
  canvas.style.width = `${f.W * f.css}px`
  canvas.style.height = `${f.H * f.css}px`
}

/** Converte coordenadas de ponteiro (CSS) para pixels lógicos. */
export function toLogical(f: PixelFit, clientX: number, clientY: number) {
  return { x: clientX / f.css, y: clientY / f.css }
}

// Matriz de Bayer 4×4 para pontilhado ordenado (o "dither" da pixel art)
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Gradiente vertical pontilhado entre paradas de cor, desenhado direto em ImageData. */
export function ditherGradient(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  stops: [number, string][],
) {
  if (w <= 0 || h <= 0) return
  const img = g.createImageData(w, h)
  const cols = stops.map(([p, c]) => [p, ...hexToRgb(c)] as [number, number, number, number])
  for (let y = 0; y < h; y++) {
    const t = h <= 1 ? 0 : y / (h - 1)
    let i = 0
    while (i < cols.length - 2 && t > (cols[i + 1]?.[0] ?? 1)) i++
    const a = cols[i] ?? cols[0]
    const b = cols[i + 1] ?? a
    if (!a || !b) continue
    const span = b[0] - a[0] || 1
    const local = Math.min(1, Math.max(0, (t - a[0]) / span))
    for (let x = 0; x < w; x++) {
      const th = BAYER4[((y + y0) & 3) * 4 + ((x + x0) & 3)] ?? 0.5
      // 4 níveis intermediários por segmento: o pontilhado escolhe entre os vizinhos
      const q = local * 4
      const base = Math.floor(q)
      const frac = q - base
      const step = Math.min(4, base + (frac > th ? 1 : 0)) / 4
      const o = (y * w + x) * 4
      img.data[o] = a[1] + (b[1] - a[1]) * step
      img.data[o + 1] = a[2] + (b[2] - a[2]) * step
      img.data[o + 2] = a[3] + (b[3] - a[3]) * step
      img.data[o + 3] = 255
    }
  }
  g.putImageData(img, x0, y0)
}

export function offscreen(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  const g = c.getContext('2d')
  if (!g) throw new Error('canvas 2d indisponível')
  g.imageSmoothingEnabled = false
  return { c, g }
}
