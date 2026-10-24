// Meta de fase (P17): card de introdução com arte-chave do lugar, estrelas que batem uma a uma,
// ícones pixel das dicas e clarão de interface com orçamento. Tudo em pixel lógico, só a paleta.
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { hitstop, sfx } from '../audio/audio'
import { hex, type PaletteKey } from '../lib/palette'
import { prefersReduced } from './motion'
import { PixelButton } from './PixelButton'
import { getPrefs, haptic } from './prefs'

// ---------------------------------------------------------------- bitmaps

/** Legenda dos bitmaps: um caractere por cor da paleta; '.' é transparente. */
const KEY: Record<string, PaletteKey> = {
  K: 'void',
  n: 'night',
  d: 'dusk',
  h: 'hazeDark',
  z: 'haze',
  b: 'blood1',
  c: 'crimsonDeep',
  C: 'crimson',
  r: 'red',
  R: 'redHot',
  o: 'redGlow',
  e: 'ember',
  E: 'emberBright',
  q: 'gold0',
  y: 'gold1',
  g: 'gold',
  G: 'goldHi',
  s: 'sparkle',
  W: 'white',
  '0': 'stone0',
  '1': 'stone1',
  '2': 'stone2',
  '3': 'stone3',
  '4': 'stoneHi',
  v: 'vine1',
  V: 'green',
  L: 'leafHi',
}

const cache = new Map<string, HTMLCanvasElement>()

function paint(rows: readonly string[], key = rows.join('|')) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = Math.max(...rows.map((r) => r.length))
  c.height = rows.length
  const g = c.getContext('2d')
  if (g)
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const k = KEY[row[x] ?? '.']
        if (!k) continue
        g.fillStyle = hex(k)
        g.fillRect(x, y, 1, 1)
      }
    })
  cache.set(key, c)
  return c
}

/** Canvas pixel ampliado só por CSS inteiro (largura/altura em múltiplos de --px). */
export function Bitmap({ rows, className }: { rows: readonly string[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const src = paint(rows)
    c.width = src.width
    c.height = src.height
    const g = c.getContext('2d')
    g?.clearRect(0, 0, c.width, c.height)
    g?.drawImage(src, 0, 0)
  }, [rows])
  const w = Math.max(...rows.map((r) => r.length))
  return (
    <canvas
      ref={ref}
      className={`mt-bmp${className ? ` ${className}` : ''}`}
      style={{ ['--bw' as string]: w, ['--bh' as string]: rows.length }}
      aria-hidden="true"
    />
  )
}

// Estrela em três quartos: face ouro (lado da luz goldHi, sombra gold), aresta de 1 px sparkle no alto
// à esquerda, espessura de 2 px descendo à direita (gold1 e gold0) e contorno void. Gerada da máscara.
const STAR_MASK = [
  '.......#.......',
  '......###......',
  '......###......',
  '.....#####.....',
  '###############',
  '.#############.',
  '..###########..',
  '...#########...',
  '...#########...',
  '..#####.#####..',
  '..####...####..',
  '.####.....####.',
  '.###.......###.',
  '.#...........#.',
]

function starRows(tone: 'on' | 'off' | 'hit'): string[] {
  const mw = 15
  const mh = STAR_MASK.length
  const W = mw + 3
  const H = mh + 4
  const m = (x: number, y: number) => STAR_MASK[y]?.[x] === '#'
  const grid: string[][] = Array.from({ length: H }, () => Array(W).fill('.'))
  const ox = 1
  const oy = 1
  const pal =
    tone === 'on'
      ? { lit: 'G', face: 'g', edge: 's', side1: 'y', side2: 'q', line: 'K', seam: 'E' }
      : tone === 'off'
        ? { lit: 'h', face: 'd', edge: 'z', side1: 'n', side2: 'K', line: 'K', seam: 'h' }
        : { lit: 'W', face: 'W', edge: 'W', side1: 's', side2: 'G', line: 'K', seam: 'W' }
  // espessura (2 px para baixo e 1 para a direita)
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      if (!m(x, y)) continue
      for (const [dx, dy, col] of [
        [1, 2, pal.side2],
        [1, 1, pal.side1],
        [0, 1, pal.side1],
      ] as const) {
        const gx = x + ox + dx
        const gy = y + oy + dy
        const row = grid[gy]
        if (row && !m(x + dx, y + dy)) row[gx] = col
      }
    }
  // face
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      if (!m(x, y)) continue
      const row = grid[y + oy]
      if (!row) continue
      const litSide = x < 7 || (x === 7 && y < 5)
      let col: string = litSide ? pal.lit : pal.face
      if (x === 7 && y >= 5 && y <= 8) col = pal.seam
      if ((!m(x, y - 1) || !m(x - 1, y)) && litSide) col = pal.edge
      row[x + ox] = col
    }
  // contorno
  const out = grid.map((r) => r.slice())
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (grid[y]?.[x] !== '.') continue
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const v = grid[y + (dy ?? 0)]?.[x + (dx ?? 0)]
        return v !== undefined && v !== '.'
      })
      const row = out[y]
      if (near && row) row[x] = pal.line
    }
  return out.map((r) => r.join(''))
}

export const STAR = { on: starRows('on'), off: starRows('off'), hit: starRows('hit') }

/** Estrela pequena (recorde no card de intro). */
const MINI_ON = ['...K...', '..KGK..', 'KKGGgKK', 'KGGGggK', '.KGgggK', '.KgKKgK', '.KK..KK']
const MINI_OFF = ['...K...', '..KhK..', 'KKhhdKK', 'KhhhddK', '.KhdddK', '.KdKKdK', '.KK..KK']

/** Brilho de 4 pontas (regra 26), quadro maior. */
const SPARK = ['..W..', '..G..', 'WGsGW', '..G..', '..W..']

export const ICONS = {
  tap: [
    '..R.WW.R....',
    '....W4W.....',
    '.R..W4W..R..',
    '....W4W2....',
    '..2.W4W4W2..',
    '.W4WW4W4W4W.',
    '.W44W444444W',
    '..W44444444W',
    '..W4444444W.',
    '...W444444W.',
    '....W2222W..',
    '.....WWWW...',
  ],
  drag: [
    '............',
    '............',
    '...y....y...',
    '..yG....Gy..',
    '.yGGGGGGGGy.',
    'yGGGGGGGGGGy',
    '.ygggggggggy',
    '..yg....gy..',
    '...y....y...',
    '............',
    '.....RR.....',
    '.....RR.....',
  ],
  keys: [
    '............',
    '............',
    '22222..22222',
    '24444..24444',
    '24R44..244R4',
    '2RRR4..24RRR',
    '24R44..244R4',
    '24444..24444',
    '11111..11111',
    '00000..00000',
    '............',
    '............',
  ],
  avoid: [
    '............',
    '.oR......RR.',
    '.ooR....RRr.',
    '..oRR..RRr..',
    '...oRRRRr...',
    '....RRRr....',
    '....RRRr....',
    '...RRrRRr...',
    '..RRr..RRr..',
    '.RRr....RRr.',
    '.Rr......Rr.',
    '............',
  ],
  goal: [
    '...RRRRRR...',
    '..R......R..',
    '.R..WWWW..R.',
    'R..W....W..r',
    'R.W..RR..W.r',
    'R.W.RooR.W.r',
    'R.W.RRRR.W.r',
    'R.W..RR..W.r',
    'R..W....W..r',
    '.r..WWWW..r.',
    '..r......r..',
    '...rrrrrr...',
  ],
  shield: [
    '.vvvvvvvvvv.',
    'vLLLLLVVVVVv',
    'vLsLLLVVVVVv',
    'vLLLLLVVVVVv',
    'vLLLLLVVVVVv',
    '.vLLLLVVVVv.',
    '.vLLLLVVVVv.',
    '..vLLLVVVv..',
    '...vLLVVv...',
    '....vLVv....',
    '.....vv.....',
    '............',
  ],
  cards: [
    '....CCCCCCC.',
    '....CRRRRRC.',
    '2222222RRrC.',
    '2W4444WRRrC.',
    '24444442RrC.',
    '24G44442RrC.',
    '24GG4442RrC.',
    '24G44442CCC.',
    '24444442....',
    '24444442....',
    '22222222....',
    '11111111....',
  ],
  order: [
    '............',
    '.........GG.',
    '.........gg.',
    '......44.gg.',
    '......33.gg.',
    '...22.33.gg.',
    '...22.33.gg.',
    '...22.33.gg.',
    '...22.33.gg.',
    '...11.11.yy.',
    '............',
    '.RRRRRRRRRR.',
  ],
  eye: [
    '............',
    '............',
    '....4444....',
    '..44....44..',
    '.4..RRRR..4.',
    '4..RoKKRR..4',
    '4..RKKKRR..4',
    '.4..RRRR..4.',
    '..44....44..',
    '....4444....',
    '............',
    '............',
  ],
  check: [
    '............',
    '..........L.',
    '.........LV.',
    '........LVv.',
    '.L.....LVv..',
    'LLV...LVv...',
    '.LLV.LVv....',
    '..LLLVv.....',
    '...LVv......',
    '....v.......',
    '............',
    '............',
  ],
  pin: [
    '..RRRRR..',
    '.RoRRRRC.',
    'RoRWWWRrC',
    'RRWWWWWrC',
    'RRWWWWWrC',
    'RRRWWWrrC',
    '.RrrrrrC.',
    '.RrrrrCC.',
    '..rrrCC..',
    '..rrC....',
    '...rC....',
    '....C....',
  ],
  pause: [
    '............',
    '.444...444..',
    '.4W3...4W3..',
    '.4W3...4W3..',
    '.4W3...4W3..',
    '.4W3...4W3..',
    '.4W3...4W3..',
    '.4W3...4W3..',
    '.4W3...4W3..',
    '.233...233..',
    '.111...111..',
    '............',
  ],
} as const satisfies Record<string, readonly string[]>

export type IconName = keyof typeof ICONS

/** Ícone de cada dica, pelo verbo. Sem palavra conhecida: 1ª dica = toque, 2ª = meta. */
export function tipIcon(text: string, i: number): IconName {
  const t = text.toLowerCase()
  if (/[←→]|use /.test(t)) return 'keys'
  if (/evite|deixe/.test(t)) return 'avoid'
  if (/proteja|escudo/.test(t)) return 'shield'
  if (/vire|carta|par$/.test(t)) return 'cards'
  if (/ordem|antigo/.test(t)) return 'order'
  if (/pinte|%|economiza/.test(t)) return 'goal'
  if (/leia|veja/.test(t)) return 'eye'
  if (/escolha|replante/.test(t)) return 'check'
  if (/arraste|gire|segure/.test(t)) return 'drag'
  if (/toque|bata/.test(t)) return 'tap'
  return i === 0 ? 'tap' : 'goal'
}

/** Ícone em ladrilho escuro com moldura fina e cantos marcados (lição 13 da ref v2). */
export function IconTile({ name, tone = 'stone' }: { name: IconName; tone?: 'stone' | 'red' | 'gold' }) {
  return (
    <span className={`mt-tile mt-tile--${tone}`} aria-hidden="true">
      <Bitmap rows={ICONS[name]} />
    </span>
  )
}

/** Quatro cantoneiras em L de um painel. */
export function Corners() {
  return (
    <>
      <i className="mt-c mt-c--tl" aria-hidden="true" />
      <i className="mt-c mt-c--tr" aria-hidden="true" />
      <i className="mt-c mt-c--bl" aria-hidden="true" />
      <i className="mt-c mt-c--br" aria-hidden="true" />
    </>
  )
}

// ---------------------------------------------------------------- clarão com orçamento

const flashLog: number[] = []

/** Clarão de tela inteira: 1 quadro branco e depois a cor. No máximo 3 por segundo (WCAG 2.3.1). */
export function uiFlash(color: PaletteKey = 'goldHi') {
  if (typeof document === 'undefined' || !getPrefs().flashes || prefersReduced()) return
  const now = performance.now()
  while (flashLog.length && now - (flashLog[0] ?? 0) > 1000) flashLog.shift()
  if (flashLog.length >= 3) return
  flashLog.push(now)
  const el = document.createElement('div')
  el.className = 'mt-flash'
  el.style.setProperty('--fc', hex(color))
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 220)
}

const shakeOn = () => !prefersReduced() && getPrefs().shake > 0

// ---------------------------------------------------------------- linha do tempo interrompível

/**
 * Sequência de batidas em ms. Devolve quantas já passaram, se acabou e skip() para ir direto ao fim.
 * Toque, Enter, espaço ou Esc durante a sequência pulam para o fim (o primeiro toque não aciona botão).
 */
export function useBeats(times: readonly number[], opts: { start?: boolean } = {}) {
  const { start = true } = opts
  const [stage, setStage] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const total = times.length
  const done = stage >= total
  const key = times.join(',')
  useEffect(() => {
    if (!start) return
    const ts = key
      .split(',')
      .filter(Boolean)
      .map((t, i) => window.setTimeout(() => setStage((s) => Math.max(s, i + 1)), Number(t)))
    return () => {
      for (const t of ts) clearTimeout(t)
    }
  }, [key, start])
  const skip = () => {
    if (stage >= total) return
    setSkipped(true)
    setStage(total)
  }
  const skipRef = useRef(skip)
  skipRef.current = skip
  const doneRef = useRef(done)
  doneRef.current = done
  useEffect(() => {
    if (!start) return
    const onKey = (e: KeyboardEvent) => {
      if (doneRef.current) return
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        skipRef.current()
      }
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [start])
  /** para o onPointerDownCapture do contêiner */
  const onPointerDownCapture = (e: { preventDefault(): void; stopPropagation(): void }) => {
    if (doneRef.current) return
    e.preventDefault()
    e.stopPropagation()
    skipRef.current()
  }
  return { stage, done, skipped, skip, onPointerDownCapture }
}

// ---------------------------------------------------------------- estrelas

/**
 * Três estrelas; `landed` diz quantas já bateram. Cada batida: escala 3→2→1 em degraus, quadro branco
 * de impacto segurado (hit-stop), faíscas, tremor, som em escada e vibração. `instant` pula os efeitos.
 */
export function StarRow({
  n,
  landed,
  instant,
  size = 'big',
}: {
  n: number
  landed: number
  instant?: boolean
  size?: 'big' | 'mid'
}) {
  const prev = useRef(instant ? landed : 0)
  const [kick, setKick] = useState(0)
  useEffect(() => {
    const from = prev.current
    prev.current = landed
    if (instant || landed <= from) return
    const k = landed - 1
    if (k >= n) return
    sfx('star', { combo: k })
    hitstop(90)
    haptic(k === 2 ? 'levelup' : 'confirm')
    if (k === 2) uiFlash('goldHi')
    if (shakeOn()) setKick((x) => x + 1)
  }, [landed, instant, n])
  return (
    <div
      className={`mt-stars mt-stars--${size}${kick ? ` mt-kick${kick % 2}` : ''}`}
      role="img"
      aria-label={`${n} de 3 estrelas`}
    >
      {[0, 1, 2].map((k) => {
        const on = k < n && k < landed
        return (
          <span
            key={k}
            className={`mt-star${on ? ' is-on' : ''}${instant ? ' is-instant' : ''}${k === 1 ? ' is-mid' : ''}`}
          >
            <Bitmap rows={STAR.off} className="mt-star-off" />
            {on && (
              <>
                <Bitmap rows={STAR.on} className="mt-star-on" />
                {!instant && <Bitmap rows={STAR.hit} className="mt-star-hit" />}
                {!instant && (
                  <span className="mt-burst">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <i key={j} style={{ ['--a' as string]: `${j * 45 + 22}deg` }} />
                    ))}
                  </span>
                )}
              </>
            )}
          </span>
        )
      })}
    </div>
  )
}

/** Faixa em pixel ("FASE CONCLUÍDA"): bate de cima e passa um brilho. */
export function Banner({ children, size = 'big' }: { children: ReactNode; size?: 'big' | 'sm' }) {
  return (
    <div className={`mt-banner mt-banner--${size}`}>
      <i className="mt-banner-tail mt-banner-tail--l" aria-hidden="true" />
      <i className="mt-banner-tail mt-banner-tail--r" aria-hidden="true" />
      <span className="mt-banner-face">
        <span className="mt-banner-text">{children}</span>
        <i className="mt-banner-shine" aria-hidden="true" />
      </span>
    </div>
  )
}

/** Barra em segmentos vermelhos com número branco à direita (lição 14 da ref v2). */
export function SegBar({ label, value, text, segs = 10 }: { label: string; value: number; text: string; segs?: number }) {
  const on = Math.round(Math.max(0, Math.min(1, value)) * segs)
  return (
    <div className="mt-seg" role="img" aria-label={`${label}: ${text}`}>
      <span className="mt-seg-label">{label}</span>
      <span className="mt-seg-bar">
        {Array.from({ length: segs }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: segmento fixo
          <i key={i} className={i < on ? 'is-on' : ''} style={{ ['--i' as string]: i }} />
        ))}
      </span>
      <b className="mt-seg-num">{text}</b>
    </div>
  )
}

// ---------------------------------------------------------------- arte-chave do lugar

/** Recorte do cenário da fase em pixel lógico (ART_W × ART_H), com primeiro plano escuro emoldurando. */
const ART_W = 168
const ART_H = 64

function LevelArt({ n }: { n: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    import('../scene')
      .then((m) => {
        const c = ref.current
        if (!alive || !c) return
        const H = 104
        const src = m.renderLevelBackdrop(n, ART_W, H)
        const hz = Math.round(H * 0.64)
        const y0 = Math.max(0, Math.min(H - ART_H, hz - 44))
        c.width = ART_W
        c.height = ART_H
        const g = c.getContext('2d')
        if (!g) return
        g.imageSmoothingEnabled = false
        g.drawImage(src, 0, -y0)
        // primeiro plano: bordas em xadrez void (2 degraus), base escura
        g.fillStyle = hex('void')
        for (let y = 0; y < ART_H; y++)
          for (let x = 0; x < ART_W; x++) {
            const edge = Math.min(x, ART_W - 1 - x)
            const foot = ART_H - 1 - y
            const dither = (x + y) % 2 === 0
            if (edge < 2 || foot < 1 || ((edge < 5 || foot < 3) && dither)) g.fillRect(x, y, 1, 1)
          }
        setReady(true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [n])
  return <canvas ref={ref} className={`mt-art-cv${ready ? ' is-ready' : ''}`} aria-hidden="true" />
}

// ---------------------------------------------------------------- card de introdução

export function LevelCard({
  n,
  kicker,
  title,
  where,
  intro,
  how,
  best = 0,
  onStart,
  onBack,
  backLabel = 'Voltar',
}: {
  n?: number
  kicker: string
  title: string
  where?: string
  intro: string
  how: readonly string[]
  best?: number
  onStart: () => void
  onBack: () => void
  backLabel?: string
}) {
  const [skip, setSkip] = useState(false)
  return (
    <div
      className={`overlay-center mt-ov mt-ov--intro${skip ? ' is-skip' : ''}`}
      onPointerDownCapture={() => setSkip(true)}
      onKeyDownCapture={() => setSkip(true)}
    >
      <div className="mt-card mt-card--intro mt-card--red" role="dialog" aria-labelledby="intro-t">
        <Corners />
        {n ? (
          <div className="mt-art">
            <LevelArt n={n} />
            <span className="mt-twinkle mt-twinkle--a" aria-hidden="true">
              <Bitmap rows={SPARK} />
            </span>
            <span className="mt-twinkle mt-twinkle--b" aria-hidden="true">
              <Bitmap rows={SPARK} />
            </span>
            <span className="mt-embers" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <div className="mt-ribbon">{kicker}</div>
            {where && (
              <div className="mt-where">
                <Bitmap rows={ICONS.pin} />
                <span>{where}</span>
              </div>
            )}
            {best > 0 && (
              <div className="mt-best" role="img" aria-label={`Seu recorde: ${best} de 3 estrelas`}>
                {[0, 1, 2].map((k) => (
                  <Bitmap key={k} rows={k < best ? MINI_ON : MINI_OFF} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-kicker">{kicker}</div>
        )}
        <div className="mt-body">
          <h2 id="intro-t" className="mt-title">
            {title}
          </h2>
          <p className="mt-lead">{intro}</p>
          <ul className="mt-tips">
            {how.slice(0, 2).map((h, i) => (
              <li key={h} style={{ ['--i' as string]: i }}>
                <IconTile name={tipIcon(h, i)} tone={i === 0 ? 'red' : 'gold'} />
                <span>{h}</span>
              </li>
            ))}
          </ul>
          <div className="mt-actions">
            {/* biome-ignore lint/a11y/noAutofocus: o botão de começar é a única ação */}
            <PixelButton tone="red" size="big" wide autoFocus onClick={onStart}>
              Começar ▶
            </PixelButton>
            <PixelButton tone="ghost" commit="back" onClick={onBack}>
              {backLabel}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  )
}
