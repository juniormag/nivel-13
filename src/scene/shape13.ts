// Forma do "13" (lajes) e das fitas de energia, compartilhada pelo monumento 3D e pelo fallback 2D.

/** profundidade das lajes */
export const D = 1.9
export const YAW = -0.38
export const PITCH = 0.2

export interface PieceDef {
  x0: number
  y0: number
  x1: number
  y1: number
  /** chanfros [baixo-esq, baixo-dir, cima-dir, cima-esq] */
  ch?: [number, number, number, number]
  paint?: number
  /** 0 = sempre de pé; 1..8 = volta conforme o progresso */
  rank: number
}

// "13" em unidades (o 1 tem 8 de altura). Ordem de reconstrução: de baixo para cima.
export const PIECES: PieceDef[] = [
  { x0: 0.1, y0: 0, x1: 3.9, y1: 0.95, ch: [0.15, 0.15, 0.3, 0.3], paint: 0.75, rank: 0 },
  { x0: 1.1, y0: 0.95, x1: 3.1, y1: 3.3, rank: 0 },
  { x0: 1.1, y0: 3.3, x1: 3.1, y1: 5.6, rank: 1 },
  { x0: 1.1, y0: 5.6, x1: 3.1, y1: 8, ch: [0, 0, 0.2, 0.05], rank: 4 },
  { x0: -0.2, y0: 5.85, x1: 1.1, y1: 7.5, ch: [0.4, 0, 0, 0.25], rank: 5 },
  { x0: 4.4, y0: 0, x1: 6.9, y1: 1.5, ch: [0.3, 0, 0, 0.35], paint: 0.22, rank: 0 },
  { x0: 6.9, y0: 0, x1: 9.9, y1: 1.5, ch: [0, 0.7, 0, 0], paint: 0.3, rank: 0 },
  { x0: 8.2, y0: 1.5, x1: 9.9, y1: 3.7, ch: [0, 0, 0.45, 0], rank: 0 },
  { x0: 4.9, y0: 1.5, x1: 6.5, y1: 2.45, ch: [0, 0, 0.35, 0.25], rank: 0 },
  { x0: 5.5, y0: 3.7, x1: 7.4, y1: 5.0, ch: [0.3, 0, 0, 0.35], rank: 2 },
  { x0: 7.4, y0: 3.7, x1: 9.35, y1: 5.0, rank: 3 },
  { x0: 8.0, y0: 5.0, x1: 9.7, y1: 6.6, ch: [0, 0.45, 0, 0], rank: 6 },
  { x0: 4.4, y0: 6.6, x1: 6.9, y1: 8.0, ch: [0.3, 0, 0, 0.4], rank: 7 },
  { x0: 6.9, y0: 6.6, x1: 9.7, y1: 8.0, ch: [0, 0, 0.75, 0], rank: 8 },
]
export const CENTER_X = 5
export const MAX_RANK = 8

export interface RingSpec {
  y: number
  R: number
  tx: number
  tz: number
  speed: number
  arc: number
  w: number
  ph: number
}
export const RINGS: RingSpec[] = [
  { y: 1.5, R: 6.5, tx: 0.1, tz: 0.07, speed: 0.22, arc: 0.78, w: 9, ph: 0.1 },
  { y: 4.3, R: 6.0, tx: -0.1, tz: -0.2, speed: -0.3, arc: 0.66, w: 8, ph: 0.55 },
  { y: 6.7, R: 5.3, tx: 0.18, tz: 0.26, speed: 0.38, arc: 0.6, w: 7, ph: 0.3 },
]
