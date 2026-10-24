// Sprites pixel do tutorial de instalação, desenhados em código (mapa de caracteres → retângulos SVG).
// 1 caractere = 1 pixel lógico; crispEdges e escala inteira mantêm o pixel duro.
import { memo, useEffect, useState } from 'react'

const INK: Record<string, string> = {
  '#': 'var(--void)',
  h: 'var(--stone-hi)',
  s: 'var(--stone-3)',
  d: 'var(--stone-2)',
  r: 'var(--red)',
  g: 'var(--gold)',
  y: 'var(--gold-hi)',
  w: 'var(--sparkle)',
  c: 'currentColor',
}

type Run = { x: number; y: number; w: number; c: string }

function runs(rows: readonly string[]): Run[] {
  const out: Run[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x] ?? '.'
      if (ch === '.' || !INK[ch]) {
        x++
        continue
      }
      let w = 1
      while (row[x + w] === ch) w++
      out.push({ x, y, w, c: INK[ch] as string })
      x += w
    }
  })
  return out
}

export const Sprite = memo(function Sprite({
  rows,
  px,
  className,
  title,
}: {
  rows: readonly string[]
  /** tamanho de 1 pixel lógico em px CSS (inteiro) */
  px: number
  className?: string
  /** rótulo para leitor de tela; sem ele o sprite é decorativo */
  title?: string
}) {
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  return (
    <svg
      className={className}
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {runs(rows).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  )
})

/** Dedo indicador apontando para cima; a ponta fica em (4, 0). */
export const FINGER = [
  '...##......',
  '..#hh#.....',
  '..#hh#.....',
  '..#hh#.....',
  '..#hh###...',
  '..#hh#hh##.',
  '###hh#hh#h#',
  '#hh#hhhhhh#',
  '#hhhhhhhhh#',
  '.#hhhhhhhs#',
  '.#hhhhhhhs#',
  '..#hhhhhs#.',
  '..#hhhhss#.',
  '...######..',
] as const
export const FINGER_TIP = { x: 4, y: 0 }

/** Compartilhar do iOS: quadrado aberto em cima com a seta saindo. */
export const SHARE = [
  '...c...',
  '..ccc..',
  '.c.c.c.',
  '...c...',
  'cc.c.cc',
  'c..c..c',
  'c.....c',
  'c.....c',
  'ccccccc',
] as const

/** Adicionar à Tela de Início: quadrado com +. */
export const ADD = ['ccccccc', 'c.....c', 'c..c..c', 'c.ccc.c', 'c..c..c', 'c.....c', 'ccccccc'] as const

/** ⋮ e ⋯ */
export const KEBAB = ['c', '.', 'c', '.', 'c'] as const
export const MEATBALL = ['c.c.c'] as const

/** Abrir fora do app (no navegador): caixa com a seta saindo pelo canto. */
export const COMPASS = ['....ccc', '.....cc', 'cc..c.c', 'c..c...', 'c.c....', 'c.....c', 'ccccccc'] as const

/** Brilho de 4 pontas, 3 quadros (o ciclo vai e volta: 0 1 2 1 0). */
export const SPARKLE = [
  ['.......', '.......', '...y...', '..ywy..', '...y...', '.......', '.......'],
  ['.......', '...y...', '...y...', '.yywyy.', '...y...', '...y...', '.......'],
  ['...g...', '...y...', '...w...', 'gywwwyg', '...w...', '...y...', '...g...'],
] as const

/** Bateria e sinal da barra de status. */
export const BATTERY = ['ssssss.', 's....ss', 's.hhh.s', 's....ss', 'ssssss.'] as const

/** Brilho de 4 pontas em 12 fps (quadros 0 1 2 1 0) centrado em (x, y) px; some sozinho. */
export function Sparkle({ x, y, px, delay = 0 }: { x: number; y: number; px: number; delay?: number }) {
  const [f, setF] = useState(-1)
  useEffect(() => {
    const seq = [0, 1, 2, 1, 0, -1]
    const ts = seq.map((k, i) => window.setTimeout(() => setF(k), delay * 1000 + i * 83))
    return () => {
      for (const t of ts) clearTimeout(t)
    }
  }, [delay])
  const rows = f >= 0 ? SPARKLE[f] : null
  return rows ? (
    <span className="inst-sparkle" style={{ left: Math.round(x - 3.5 * px), top: Math.round(y - 3.5 * px) }}>
      <Sprite rows={rows} px={px} />
    </span>
  ) : null
}
