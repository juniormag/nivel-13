// Paleta mestra de 32 cores (docs/research/visual.md §2). Toda arte em pixel usa só estas cores.
export const PALETTE = {
  void: 0x07050a,
  night: 0x0e0a14,
  dusk: 0x181122,
  hazeDark: 0x241a33,
  haze: 0x3a2a4a,
  blood0: 0x2a0a14,
  blood1: 0x4a0d1c,
  crimsonDeep: 0x7a1224,
  crimson: 0xb01a2a,
  red: 0xe3242b,
  redHot: 0xff4a3d,
  redGlow: 0xff7a5c,
  emberDark: 0x9c2a10,
  ember: 0xff6a1f,
  emberBright: 0xffa040,
  gold0: 0x4a2e0c,
  gold1: 0xa8701c,
  gold: 0xe8b23a,
  goldHi: 0xffe27a,
  sparkle: 0xfff6d6,
  white: 0xffffff,
  stone0: 0x2a2530,
  stone1: 0x4f4858,
  stone2: 0x857c8c,
  stone3: 0xbdb4b6,
  stoneHi: 0xece6de,
  vine0: 0x0c2418,
  vine1: 0x1c5230,
  green: 0x2f9a3e,
  leafHi: 0xa6d84a,
  blue0: 0x14204f,
  blue1: 0x3a64c8,
} as const

export type PaletteKey = keyof typeof PALETTE
export const hex = (k: PaletteKey) => `#${PALETTE[k].toString(16).padStart(6, '0')}`

/** rampas contínuas, do escuro ao claro */
export const RAMPS = {
  night: ['void', 'night', 'dusk', 'hazeDark', 'haze'],
  fire: ['blood0', 'blood1', 'crimsonDeep', 'crimson', 'red', 'redHot', 'redGlow', 'ember', 'emberBright', 'goldHi', 'sparkle', 'white'],
  gold: ['gold0', 'gold1', 'gold', 'goldHi', 'sparkle'],
  stone: ['stone0', 'stone1', 'stone2', 'stone3', 'stoneHi'],
  vine: ['vine0', 'vine1', 'green', 'leafHi'],
  blue: ['blue0', 'blue1'],
} as const satisfies Record<string, readonly PaletteKey[]>
