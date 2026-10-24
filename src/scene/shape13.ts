// Forma do "13" (lajes) e das fitas de energia, compartilhada pelo monumento 3D e pelo fallback 2D.
// Referência: docs/reference/ref-13-v2.png. Os dígitos ficam em três quartos (o lado direito vem para
// a frente), o 3 avança e gira um pouco mais que o 1, e a câmera fica baixa olhando para cima.
// Cada dígito é cortado em poucas lajes grandes com emendas diagonais (nada de grid regular).

/** profundidade das lajes */
export const D = 2.4
/** giro do conjunto no eixo vertical (negativo: o lado direito vem para a câmera) */
export const YAW = -0.12
/** campo de visão vertical da câmera em perspectiva (graus) */
export const FOV = 42
/** altura do olho e do alvo, em unidades do 13 (olho abaixo do alvo: monumento heroico) */
export const EYE_Y = 2.2
export const TARGET_Y = 4.5

export type Pt = [number, number]

export interface DigitDef {
  /** posição da origem local do dígito no grupo do monumento */
  x: number
  z: number
  /** giro extra no eixo vertical, em torno do centro do dígito */
  yaw: number
  /** centro (x local) para o giro */
  cx: number
}

/** 0 = o 1, 1 = o 3 */
export const DIGITS: DigitDef[] = [
  { x: -4.95, z: 0, yaw: -0.32, cx: 1.4 },
  { x: -1.0, z: 0.2, yaw: -0.38, cx: 2.8 },
]

export interface PieceDef {
  digit: 0 | 1
  /** contorno da frente em unidades locais do dígito (anti-horário) */
  pts: Pt[]
  x0: number
  y0: number
  x1: number
  y1: number
  /** chance de placas pintadas de vermelho */
  paint?: number
  /** 0 = sempre de pé; 1..8 = volta conforme o progresso */
  rank: number
}

function piece(digit: 0 | 1, rank: number, pts: Pt[], paint?: number): PieceDef {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return {
    digit,
    pts,
    rank,
    paint,
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  }
}

// O 1 tem 8 de altura; o 3, 8,2. Ordem de reconstrução: de baixo para cima.
export const PIECES: PieceDef[] = [
  // 1: fuste em três lajes com emendas inclinadas, pé à esquerda, serifa à esquerda
  piece(
    0,
    0,
    [
      [0.95, 0],
      [2.65, 0],
      [2.65, 2.55],
      [0.95, 3.25],
    ],
    0.22,
  ),
  piece(0, 1, [
    [0.95, 3.25],
    [2.65, 2.55],
    [2.65, 5.35],
    [0.95, 5.0],
  ]),
  piece(
    0,
    0,
    [
      [0.15, 0],
      [0.95, 0],
      [0.95, 1.35],
      [0.4, 1.35],
      [0.15, 1.1],
    ],
    0.8,
  ),
  piece(0, 4, [
    [0.95, 5.0],
    [2.65, 5.35],
    [2.65, 7.75],
    [2.4, 8.0],
    [0.95, 8.0],
  ]),
  piece(0, 5, [
    [-0.25, 5.0],
    [0.95, 5.0],
    [0.95, 7.45],
    [-0.25, 6.55],
  ]),
  // 3: braço de baixo (com lábio para cima), traço da direita, barra do meio, braço de cima (lábio para baixo)
  piece(
    1,
    0,
    [
      [0.3, 0],
      [2.7, 0],
      [3.05, 1.45],
      [1.0, 1.45],
      [1.0, 1.95],
      [0.25, 1.95],
      [0, 1.7],
      [0, 0.3],
    ],
    0.1,
  ),
  piece(
    1,
    0,
    [
      [2.7, 0],
      [4.5, 0],
      [5.65, 1.15],
      [5.65, 2.6],
      [3.95, 2.2],
      [3.95, 1.45],
      [3.05, 1.45],
    ],
    0.15,
  ),
  // cintura do 3: o gomo de baixo recolhe em chanfro até a barra do meio e o de cima abre de novo
  piece(1, 2, [
    [3.95, 2.2],
    [5.65, 2.6],
    [5.65, 3.45],
    [4.85, 4.25],
    [3.95, 4.25],
  ]),
  piece(1, 3, [
    [2.05, 4.0],
    [3.95, 4.0],
    [3.95, 5.2],
    [2.45, 5.2],
    [2.05, 4.8],
  ]),
  piece(1, 6, [
    [3.95, 4.25],
    [4.85, 4.25],
    [5.4, 4.85],
    [5.4, 6.25],
    [3.95, 5.85],
  ]),
  piece(1, 7, [
    [0, 6.55],
    [0.25, 6.35],
    [1.0, 6.35],
    [1.0, 6.75],
    [2.45, 6.75],
    [2.75, 8.2],
    [0.4, 8.2],
    [0, 7.8],
  ]),
  piece(1, 8, [
    [2.45, 6.75],
    [3.95, 6.75],
    [3.95, 5.85],
    [5.4, 6.25],
    [5.4, 7.15],
    [4.35, 8.2],
    [2.75, 8.2],
  ]),
]
export const MAX_RANK = 8
/** tamanho do canvas do monumento em unidades (largura cabe a fita de baixo inteira) */
export const CANVAS_U = { w: 16, h: 11.4 }
/** índice da laje de cima do 1 (onde a bandeira finca) */
export const FLAG_PIECE = 3
/** pé do mastro (local do 1) e centro da coroa (local do 3) */
export const FLAG_AT = { x: 1.35, y: 8.0, z: -0.35 }
export const CROWN_AT = { x: 2.85, y: 9.75, z: 0 }

/** ponto local do dígito → grupo do monumento (antes do giro do conjunto) */
export function digitToGroup(digit: number, x: number, y: number, z: number): [number, number, number] {
  const d = DIGITS[digit] ?? (DIGITS[0] as DigitDef)
  const c = Math.cos(d.yaw)
  const s = Math.sin(d.yaw)
  const lx = x - d.cx
  return [d.x + d.cx + lx * c + z * s, y, d.z - lx * s + z * c]
}

/** maior y do contorno na vertical x (topo da laje naquele ponto), ou null fora dela */
export function topAt(pts: Pt[], x: number): number | null {
  let best: number | null = null
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as Pt
    const b = pts[(i + 1) % pts.length] as Pt
    if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue
    const y = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])
    if (best === null || y > best) best = y
  }
  return best
}

export function inside(pts: Pt[], x: number, y: number) {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i] as Pt
    const b = pts[j] as Pt
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c
  }
  return c
}

export interface RingSpec {
  /** centro do anel no grupo (x) e altura */
  x: number
  y: number
  R: number
  tx: number
  tz: number
  speed: number
  arc: number
  w: number
  ph: number
}
// no máximo 4 (o shader da pedra ilumina por 4). A de baixo envolve os dois dígitos; as de cima envolvem o 3 (como na referência), todas subindo à direita
export const RINGS: RingSpec[] = [
  { x: 0.1, y: 1.4, R: 6.9, tx: 0.2, tz: 0.12, speed: 0.22, arc: 0.74, w: 9, ph: 0.12 },
  { x: 1.8, y: 4.4, R: 4.3, tx: 0.42, tz: 0.22, speed: -0.3, arc: 0.66, w: 8, ph: 0.55 },
  { x: 2.0, y: 7.4, R: 3.6, tx: 0.5, tz: 0.3, speed: 0.38, arc: 0.55, w: 6, ph: 0.3 },
  // fita fina que enrola o 1 (o laço da esquerda na referência)
  { x: -3.4, y: 3.2, R: 2.3, tx: 0.45, tz: -0.25, speed: -0.45, arc: 0.6, w: 4, ph: 0.8 },
]
