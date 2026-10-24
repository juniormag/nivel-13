// Composição da cena do título em pixels lógicos, para retrato (celular) e paisagem (desktop).
// Retrato: monumento no meio-alto, o menu do HUD fica abaixo dele.
// Paisagem: monumento no centro, HUD em volta.

/** margem extra das camadas para o parallax e a respiração da câmera */
export const PAD = 16

/** fatores de parallax por camada (regra 21) */
export const DEPTH = {
  sky: 0,
  moon: 0.02,
  cloudsFar: 0.06,
  cloudsNear: 0.1,
  skyline: 0.18,
  bay: 0.3,
  hill: 1,
  front: 1.25,
} as const

export interface Layout {
  W: number
  H: number
  portrait: boolean
  /** linha d'água da baía */
  horizon: number
  /** fim da água (praia de baixo) */
  waterBottom: number
  /** pixels por unidade do monumento (o "1" tem 8 unidades de altura) */
  ppu: number
  /** pé do monumento (centro da base) */
  base: { x: number; y: number }
  /** topo do morro no centro */
  hillTop: number
  moon: { x: number; y: number; r: number }
  sugar: { x: number; h: number }
  corc: { x: number; peak: number; half: number }
}

export function layoutFor(W: number, H: number): Layout {
  const portrait = W / H < 0.8
  if (portrait) {
    // o 13 ocupa ~85% da largura; pé a 55% da altura (o menu começa em ~57%)
    const ppu = Math.max(10, Math.floor((W * 0.85) / 9.9))
    const baseY = Math.round(H * 0.55)
    const horizon = Math.round(baseY - ppu * 3.4)
    return {
      W,
      H,
      portrait,
      horizon,
      waterBottom: Math.round(baseY + ppu * 0.6),
      ppu,
      base: { x: Math.round(W / 2), y: baseY },
      hillTop: baseY,
      moon: {
        x: Math.round(W * 0.15),
        y: Math.round(baseY - ppu * 9.3),
        r: Math.max(11, Math.round(W * 0.062)),
      },
      sugar: { x: Math.round(W * 0.1), h: Math.round(ppu * 2.6) },
      corc: { x: Math.round(W * 0.9), peak: Math.round(horizon - ppu * 3.2), half: Math.round(W * 0.2) },
    }
  }
  const ppu = Math.max(10, Math.floor(Math.min((H * 0.62) / 11, (W * 0.42) / 10)))
  const baseY = Math.round(H * 0.76)
  const horizon = Math.round(H * 0.58)
  return {
    W,
    H,
    portrait,
    horizon,
    waterBottom: Math.round(H * 0.8),
    ppu,
    base: { x: Math.round(W / 2), y: baseY },
    hillTop: baseY,
    moon: { x: Math.round(W * 0.17), y: Math.round(H * 0.24), r: Math.max(12, Math.round(H * 0.085)) },
    sugar: { x: Math.round(W * 0.17), h: Math.round(H * 0.15) },
    corc: { x: Math.round(W * 0.88), peak: Math.round(H * 0.4), half: Math.round(W * 0.13) },
  }
}
