// Sprites em texto: cada letra é uma cor da paleta, '.' é transparente.
// Desenhados à mão em grade pequena e ampliados sem suavização.

export const PAL: Record<string, string> = {
  k: '#0a0a0f',
  w: '#f4efe6',
  g: '#b9b1a6',
  G: '#6b6560',
  D: '#1d1418',
  r: '#e3242b',
  R: '#8e1218',
  p: '#f29aa6',
  y: '#f5c04a',
  Y: '#a8741a',
  o: '#ff7a3d',
  b: '#8a5a3a',
  B: '#4e3122',
  e: '#4fae3f',
  E: '#23561f',
  u: '#2f5fd0',
  U: '#1b347a',
  c: '#8fe3ff',
  s: '#e0a77f',
  S: '#a8714f',
  x: '#9fe6ff',
}

export const SPR: Record<string, string[]> = {
  coelho: [
    '....kk..kk......',
    '...kwpk.kwk.....',
    '...kwpk.kwpk....',
    '...kwpk.kwpk....',
    '...kwpk..kwpk...',
    '....kwk..kwpk...',
    '....kwwkkkwwk...',
    '...kwwwwwwwwwk..',
    '..kwwwwwwwkrwk..',
    '..kwwwwwwwwwwwk.',
    '..kwwwwwwwwwwpk.',
    '..kgwwwwwwwwwk..',
    '...kgwwwwwwwk...',
    '..kgwwwwwwwk....',
    '.kgwwwwwwwwwk...',
    '.kkkkkkkkkkkk...',
  ],
  onca: [
    '................',
    '..kk........kk..',
    '.kyyk......kyyk.',
    '.kyBykkkkkkyByk.',
    '.kyyyyyyyyyyyyk.',
    'kyyByyyyyyyByyyk',
    'kyyyykkyykkyyyyk',
    'kyByykeyykeyyByk',
    'kyyyyyyyyyyyyyyk',
    'kyyByyywwyyyByyk',
    '.kyyyywkkwyyyyk.',
    '.kyByywwwwyyByk.',
    '..kyyyywwyyyyk..',
    '...kyyyyyyyyk...',
    '....kkkkkkkk....',
    '................',
  ],
  arara: [
    '................',
    '.....kkkk.......',
    '....krrrrk......',
    '...krrrrrrk.....',
    '...krrwwkrrk....',
    '..krrrwkwrrkkk..',
    '..krrrrwwrkGGGk.',
    '..krrrrrrrkGkGGk',
    '..krrrrrrrrkGGk.',
    '..krrrrrrrrrkk..',
    '..kyyyrrrrrrk...',
    '..kuuyyyrrrk....',
    '.kuuuuyyyrk.....',
    '.kuuuuuuyk......',
    'kuuUuuuuk.......',
    'kkkkkkkk........',
  ],
  capivara: [
    '................',
    '................',
    '....kk..........',
    '...kbbkkkkkk....',
    '..kbbbbbbbbbk...',
    '..kbbkbbbbbbbk..',
    '.kbbbbbbbbbbbbk.',
    '.kBbbbbbbbbbbbk.',
    '.kkBbbbbbbbbbbk.',
    '..kBBbbbbbbbbbk.',
    '...kBbbbbbbbbbk.',
    '...kBBbbbbbbbk..',
    '...kbkkbbbkbk...',
    '...kbk.kbk.kbk..',
    '...kkk.kkk.kkk..',
    '................',
  ],
  prato: [
    '............',
    '............',
    '...beoyeob..',
    '..byoeyoeyb.',
    '.kwwwwwwwwwk',
    '.kwgwwwwwwgk',
    '..kwwwwwwwk.',
    '...kgwwwgk..',
    '....kkkkk...',
  ],
  fogo: [
    '....r.....',
    '...ror....',
    '...ror..r.',
    '..royor.r.',
    '..royyorr.',
    '.royyyyor.',
    '.ryyywyyr.',
    '.royywwyor',
    '..royyyor.',
    '...rooor..',
  ],
  arvore: [
    '...EEEE...',
    '..EeeeeE..',
    '.EeeeeeeE.',
    '.EeeEeeeE.',
    'EeeeeeEeeE',
    'EeEeeeeeeE',
    '.EeeeeEeE.',
    '..EEeeEE..',
    '....bb....',
    '....bb....',
    '...BbbB...',
  ],
  toco: [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '....kk....',
    '...kGGk...',
    '...kBBk...',
    '..kBBBBk..',
  ],
  broto: [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '...e..e...',
    '...ee.e...',
    '....eee...',
    '.....b....',
    '...BbbB...',
  ],
  carteira: [
    '.kkkkkkkk.',
    'kuuuuuuuuk',
    'kuUUUUUUuk',
    'kuuyyyyuuk',
    'kuuyuuyuuk',
    'kuuyyyyuuk',
    'kuuuuuuuuk',
    'kuwwwwwwuk',
    'kuuuuuuuuk',
    'kuwwwwwuuk',
    'kuuuuuuuuk',
    '.kkkkkkkk.',
  ],
  golpe: [
    '.kkkkkkkk.',
    'krrrrrrrrk',
    'krrrwwrrrk',
    'krrrwwrrrk',
    'krrrwwrrrk',
    'krrrwwrrrk',
    'krrrrrrrrk',
    'krrrwwrrrk',
    'krrrrrrrrk',
    '.kkkkkkkk.',
  ],
  moeda: ['..kkkk..', '.kyyyyk.', 'kyywwyYk', 'kyywyyYk', 'kyywyyYk', 'kyyyyyYk', '.kYYYYk.', '..kkkk..'],
  livro: [
    '.kkkkkkkk.',
    'krrrrrrrwk',
    'krwwwwrrwk',
    'krrrrrrrwk',
    'krrrrrrrwk',
    'krrrrrrrwk',
    'kkkkkkkkwk',
    '.kwwwwwwwk',
    '..kkkkkkk.',
  ],
  minuta: [
    'kkkkkkkk.',
    'kwwwwwwkk',
    'kwggggwwk',
    'kwwwwwwwk',
    'kwgggggwk',
    'kwwwwwwwk',
    'kwgrrrgwk',
    'kwwrrrwwk',
    'kwgggggwk',
    'kwwwwwwwk',
    'kkkkkkkkk',
  ],
  joia: [
    '...kkkkk...',
    '..kcwccck..',
    '.kcwccccck.',
    'kkkkkkkkkkk',
    '.kcccwccck.',
    '..kcccccck.',
    '...kcccck..',
    '....kcck...',
    '.....kk....',
  ],
  camisa: [
    '.kk....kk.',
    'kxxk..kxxk',
    'kxxxkkxxxk',
    '.kxxxxxxk.',
    '..kxxxxk..',
    '..kxxxxk..',
    '..kxxxxk..',
    '..kkkkkk..',
  ],
  colar: [
    '.x......x.',
    '.x......x.',
    '..x....x..',
    '...x..x...',
    '....xx....',
    '...xwwx...',
    '..xwwwwx..',
    '...xwwx...',
    '....xx....',
  ],
  camera: [
    '...kkk....',
    '.kkxxxkkk.',
    'kxxxxxxxxk',
    'kxxkkkxxxk',
    'kxkxxxkxxk',
    'kxkxxxkxxk',
    'kxxkkkxxxk',
    'kxxxxxxxxk',
    '.kkkkkkkk.',
  ],
  sapato: [
    '..........',
    '.kkk......',
    '.kxxk.....',
    '.kxxk.....',
    '.kxxxkkk..',
    '.kxxxxxxk.',
    '.kxxxxxxxk',
    '.kkkkkkkkk',
  ],
  remedio: ['.kkkkkkkk.', 'krrrrwwwwk', 'krRrrwwgwk', 'krrrrwwwwk', '.kkkkkkkk.'],
  casa: [
    '....kk....',
    '...krrk...',
    '..krrrrk..',
    '.krrrrrrk.',
    'kkkkkkkkkk',
    '.kwwwwwwk.',
    '.kwuwwbwk.',
    '.kwwwwbwk.',
    '.kkkkkkkk.',
  ],
  fake: [
    'kkkkkkkkkkk.',
    'kwwwwwwwwwkk',
    'kwrrrrrrrwwk',
    'kwrrrrrrrwwk',
    'kwwwwwwwwwwk',
    'kwggggwgggwk',
    'kwwwwwwwwwwk',
    'kwgggwggggwk',
    'kwwwwwwwwwwk',
    'kkkkkkkkkkkk',
  ],
  tarifa: ['........k...', 'kkkkkkkkrk..', 'krrrrrrrrrk.', 'kkkkkkkkrk..', '........k...'],
  heart: [
    '.kkk...kkk.',
    'krwrk.krrrk',
    'krwrrkrrrrk',
    'krrrrrrrrrk',
    'krrrrrrrrrk',
    '.krrrrrrrk.',
    '..krrrrrk..',
    '...krrrk...',
    '....krk....',
    '.....k.....',
  ],
  heartOff: [
    '.ggg...ggg.',
    'gDDDg.gDDDg',
    'gDDDDgDDDDg',
    'gDDDDDDDDDg',
    'gDDDDDDDDDg',
    '.gDDDDDDDg.',
    '..gDDDDDg..',
    '...gDDDg...',
    '....gDg....',
    '.....g.....',
  ],
  cofre: [
    '....kkkk......',
    '..kkppppkk....',
    '.kppppppppk.k.',
    'kppwkpppppppkpk',
    'kppkkppppppppk.',
    'kpppppppppppk..',
    'kppppppppppppk.',
    '.kpppppppppppk.',
    '..kpppppppppk..',
    '..kpk....kpk...',
    '..kkk....kkk...',
  ],
  balde: [
    '............',
    '.kkkkkkkkkk.',
    'kuuuuuuuuuuk',
    'kucccccccuuk',
    '.kuuuuuuuuk.',
    '.kuuuuuuuuk.',
    '..kuuuuuuk..',
    '..kkkkkkkk..',
  ],
}

const cache = new Map<string, HTMLCanvasElement>()

/** Canvas de um sprite, opcionalmente com a cor 'x' trocada (raio-X, silhuetas). */
export function sprite(name: string, tint?: Record<string, string>): HTMLCanvasElement {
  const key = tint ? `${name}|${JSON.stringify(tint)}` : name
  const hit = cache.get(key)
  if (hit) return hit
  const rows = SPR[name] ?? SPR.fake ?? []
  const w = Math.max(...rows.map((r) => r.length))
  const c = document.createElement('canvas')
  c.width = w
  c.height = rows.length
  const g = c.getContext('2d')
  if (!g) return c
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? '.'
      if (ch === '.') continue
      const col = tint?.[ch] ?? PAL[ch]
      if (!col) continue
      g.fillStyle = col
      g.fillRect(x, y, 1, 1)
    }
  })
  cache.set(key, c)
  return c
}

export function drawSprite(
  g: CanvasRenderingContext2D,
  name: string | HTMLCanvasElement,
  x: number,
  y: number,
  opts: { scale?: number; flip?: boolean; alpha?: number; center?: boolean; rot?: number } = {},
) {
  const c = typeof name === 'string' ? sprite(name) : name
  const s = opts.scale ?? 1
  const w = c.width * s
  const hgt = c.height * s
  const px = opts.center ? x - w / 2 : x
  const py = opts.center ? y - hgt / 2 : y
  if (opts.alpha !== undefined) g.globalAlpha = opts.alpha
  if (opts.flip || opts.rot) {
    g.save()
    g.translate(Math.round(px + w / 2), Math.round(py + hgt / 2))
    if (opts.rot) g.rotate(opts.rot)
    if (opts.flip) g.scale(-1, 1)
    g.drawImage(c, Math.round(-w / 2), Math.round(-hgt / 2), w, hgt)
    g.restore()
  } else {
    g.drawImage(c, Math.round(px), Math.round(py), w, hgt)
  }
  if (opts.alpha !== undefined) g.globalAlpha = 1
}

/** Retrato pixel de pessoa pública: caricatura neutra, só cabelo, barba e terno distinguem. */
export interface PortraitSpec {
  hair: string
  hairTop: number
  sideHair?: boolean
  beard?: string
  suit: string
  tie: string
  skin?: string
  glasses?: boolean
}

export function portrait(spec: PortraitSpec, size = 20): HTMLCanvasElement {
  const key = `p|${JSON.stringify(spec)}|${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) return c
  const skin = spec.skin ?? '#e0a77f'
  const px = (x: number, y: number, col: string, w = 1, hh = 1) => {
    g.fillStyle = col
    g.fillRect(x, y, w, hh)
  }
  // fundo
  px(0, 0, '#1b1219', size, size)
  // ombros e terno
  px(2, 15, PAL.k as string, 16, 5)
  px(3, 16, spec.suit, 14, 4)
  px(8, 15, '#f4efe6', 4, 5)
  px(9, 16, spec.tie, 2, 4)
  // pescoço
  px(8, 13, '#a8714f', 4, 2)
  // cabeça
  px(5, 3, PAL.k as string, 10, 11)
  px(6, 4, skin, 8, 9)
  px(5, 5, skin, 1, 5)
  px(14, 5, skin, 1, 5)
  // olhos e sobrancelhas
  px(7, 7, '#0a0a0f', 2, 1)
  px(11, 7, '#0a0a0f', 2, 1)
  px(7, 6, spec.hair, 2, 1)
  px(11, 6, spec.hair, 2, 1)
  if (spec.glasses) {
    px(6, 7, '#0a0a0f', 3, 1)
    px(11, 7, '#0a0a0f', 3, 1)
  }
  // nariz e boca
  px(10, 9, '#a8714f', 1, 1)
  px(8, 11, '#7a3d2a', 4, 1)
  // cabelo
  px(5, 3 - spec.hairTop + 1, spec.hair, 10, spec.hairTop)
  px(6, 2 - spec.hairTop + 1, spec.hair, 8, 1)
  if (spec.sideHair) {
    px(5, 4, spec.hair, 1, 3)
    px(14, 4, spec.hair, 1, 3)
  }
  // barba
  if (spec.beard) {
    px(6, 10, spec.beard, 8, 3)
    px(5, 9, spec.beard, 1, 3)
    px(14, 9, spec.beard, 1, 3)
    px(7, 13, spec.beard, 6, 1)
    px(8, 11, '#7a3d2a', 4, 1)
  }
  cache.set(key, c)
  return c
}

export const PEOPLE: Record<string, PortraitSpec> = {
  lula: { hair: '#e9e4dc', hairTop: 2, sideHair: true, beard: '#e9e4dc', suit: '#1f2a44', tie: '#e3242b' },
  jair: { hair: '#8d8780', hairTop: 2, sideHair: true, suit: '#26262e', tie: '#2f5fd0' },
  flavio: { hair: '#2a1d16', hairTop: 1, suit: '#22222a', tie: '#7a6a5a', beard: '#3a2a20' },
  eduardo: { hair: '#2a1d16', hairTop: 2, beard: '#2a1d16', suit: '#2b2b33', tie: '#3a3a44' },
}

/** Ícones das habilidades (estilo do HUD da referência): traço com brilho em 32×32. */
export function skillIcon(kind: 'checar' | 'lembrar' | 'foco' | 'proteger'): HTMLCanvasElement {
  const key = `skill|${kind}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const g = c.getContext('2d')
  if (!g) return c
  g.fillStyle = '#0e0a10'
  g.fillRect(0, 0, 32, 32)
  const dot = (x: number, y: number, col: string) => {
    g.fillStyle = col
    g.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
  const glow = (x: number, y: number, col: string, a = 0.25) => {
    g.globalAlpha = a
    g.fillStyle = col
    g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3)
    g.globalAlpha = 1
  }
  if (kind === 'checar' || kind === 'proteger') {
    const core = kind === 'checar' ? '#ffd6d6' : '#d8ffd0'
    const mid = kind === 'checar' ? '#ff3b3b' : '#4fae3f'
    const dark = kind === 'checar' ? '#8e1218' : '#23561f'
    for (let i = 0; i < 26; i++) {
      const x = 4 + i
      const y = 28 - i
      glow(x, y, mid)
      dot(x, y, core)
      dot(x + 1, y, mid)
      dot(x, y + 1, mid)
      if (i % 3 === 0) {
        dot(x - 2, y + 3, dark)
        dot(x + 3, y - 2, dark)
      }
    }
    for (let i = 0; i < 10; i++) {
      dot(8 + i * 1.6, 26 - i * 0.6, mid)
      dot(14 + i * 0.6, 28 - i * 1.6, dark)
    }
  } else if (kind === 'lembrar') {
    for (let a = 0; a < Math.PI * 3.2; a += 0.08) {
      const r = 3 + a * 1.25
      const x = 16 + Math.cos(a) * r
      const y = 16 + Math.sin(a) * r * 0.8
      glow(x, y, '#ff3b3b', 0.15)
      dot(x, y, a > 6 ? '#ff3b3b' : '#ffd6d6')
    }
  } else {
    const cx = 16
    const cy = 16
    for (let i = -12; i <= 12; i++) {
      const fade = 1 - Math.abs(i) / 13
      g.globalAlpha = fade
      dot(cx + i, cy, '#ffe29a')
      dot(cx, cy + i, '#ffe29a')
      g.globalAlpha = 1
    }
    for (let i = -6; i <= 6; i++) {
      g.globalAlpha = 0.6 * (1 - Math.abs(i) / 7)
      dot(cx + i, cy + i, '#f5c04a')
      dot(cx + i, cy - i, '#f5c04a')
      g.globalAlpha = 1
    }
    g.fillStyle = '#fff'
    g.fillRect(cx - 1, cy - 1, 3, 3)
    for (const [x, y] of [
      [6, 7],
      [25, 9],
      [8, 24],
      [24, 25],
    ] as const)
      dot(x, y, '#f5c04a')
  }
  cache.set(key, c)
  return c
}
