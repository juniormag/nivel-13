// Cards para compartilhar (1080×1920, formato de story e status do WhatsApp), gerados no aparelho.
import { CONFIG, responsavelText } from '../config'
import { Scene } from '../scene/scene'
import { fmtBRL, toast } from './dom'
import { sprite } from './sprites'
import { type Avatar, save, shareLink, stats } from './store'

const W = 1080
const H = 1920
const PX = 4

export type CardKind =
  | { kind: 'nivel'; level: number }
  | { kind: 'ir'; perYear: number }
  | { kind: 'movimento' }
  | { kind: 'daily'; n: number; grid: boolean[]; streak: number }

const GLYPHS = [
  ['.XXX.', 'XXXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', 'XXXXX'],
  ['XXXXX.', 'XXXXXX', '....XX', '....XX', '.XXXX.', '....XX', '....XX', 'XXXXXX', 'XXXXX.'],
]

/** O 13 de pedra em pixel: face clara, lateral vermelha, musgo no topo. */
export function draw13(g: CanvasRenderingContext2D, x: number, y: number, cell: number) {
  const d = Math.max(2, Math.round(cell * 0.35))
  GLYPHS.forEach((gl, gi) => {
    const ox = x + gi * 6 * cell + (gi ? cell : 0)
    gl.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== 'X') continue
        const px = ox + rx * cell
        const py = y + ry * cell
        g.fillStyle = '#8e1218'
        g.fillRect(px + d, py + d, cell, cell)
      }
    })
    gl.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== 'X') continue
        const px = ox + rx * cell
        const py = y + ry * cell
        g.fillStyle =
          (rx * 7 + ry * 3) % 5 === 0 ? '#c2b39b' : ry > 6 && (rx + ry) % 3 === 0 ? '#d91a22' : '#e6dccb'
        g.fillRect(px, py, cell, cell)
        g.fillStyle = '#5a4b44'
        if ((rx * 13 + ry * 7) % 9 === 0) g.fillRect(px + cell * 0.3, py, Math.max(1, cell * 0.12), cell)
        if (ry === 0 || gl[ry - 1]?.[rx] !== 'X') {
          g.fillStyle = '#4fae3f'
          g.fillRect(px, py - Math.max(1, cell * 0.2), cell, Math.max(1, cell * 0.25))
        }
      }
    })
  })
}

function pixelText(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  col: string,
  font = 'Silkscreen',
  align: CanvasTextAlign = 'center',
) {
  g.font = `${size}px ${font}, monospace`
  g.textAlign = align
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#000'
  g.fillText(s, x, y + Math.round(size / 9))
  g.fillStyle = col
  g.fillText(s, x, y)
}

function wrap(g: CanvasRenderingContext2D, s: string, maxW: number) {
  const words = s.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

export async function makeCard(card: CardKind): Promise<Blob> {
  await document.fonts.ready
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) throw new Error('canvas')
  g.imageSmoothingEnabled = false
  // cenário em pixel, ampliado 4×
  const bg = document.createElement('canvas')
  bg.width = W / PX
  bg.height = H / PX
  Scene.renderBackdropTo(bg, W / PX, H / PX)
  g.drawImage(bg, 0, 0, W, H)
  g.fillStyle = 'rgba(6,4,8,0.35)'
  g.fillRect(0, 0, W, H)

  // retrato do jogador
  const av = sprite(save.avatar as Avatar)
  g.fillStyle = '#efe8dc'
  g.fillRect(64, 84, 172, 172)
  g.fillStyle = '#1a1418'
  g.fillRect(70, 90, 160, 160)
  g.drawImage(av, 70, 90, 160, 160)
  const done = save.stars.filter((s) => s > 0).length
  pixelText(
    g,
    `NÍVEL ${card.kind === 'nivel' ? card.level : Math.max(1, done)}`,
    270,
    150,
    46,
    '#efe8dc',
    'Silkscreen',
    'left',
  )
  g.fillStyle = '#efe8dc'
  g.fillRect(270, 176, 520, 26)
  g.fillStyle = '#1a1013'
  g.fillRect(274, 180, 512, 18)
  g.fillStyle = '#e3242b'
  g.fillRect(274, 180, 512 * Math.min(1, (card.kind === 'nivel' ? card.level : done) / 13), 18)
  if (save.name) pixelText(g, save.name.toUpperCase(), 270, 240, 30, '#b9b1a6', 'Silkscreen', 'left')

  const mid = W / 2
  if (card.kind === 'nivel') {
    draw13(g, mid - 6.5 * 44, 520, 44)
    pixelText(g, card.level >= 13 ? 'CHEGUEI AO' : 'ESTOU NO', mid, 1030, 64, '#efe8dc')
    pixelText(g, `NÍVEL ${card.level}`, mid, 1150, 120, '#ff3b3b')
    const st = stats()
    const rows: [string, number][] = [
      ['FATOS', st.fatos],
      ['MEMÓRIA', st.memoria],
      ['CORAGEM', st.coragem],
      ['DEMOCRACIA', st.democracia],
    ]
    rows.forEach(([k, v], i) => {
      const y = 1250 + i * 64
      pixelText(g, k, 170, y + 26, 32, '#b9b1a6', 'Silkscreen', 'left')
      for (let s = 0; s < 10; s++) {
        g.fillStyle = s < Math.round(v / 10) ? '#e3242b' : '#2a1a1d'
        g.fillRect(560 + s * 30, y, 26, 26)
      }
      pixelText(g, String(v), 910, y + 26, 34, '#efe8dc', 'Silkscreen', 'right')
    })
    pixelText(g, 'Você chega ao nível 13?', mid, 1600, 50, '#f5c04a', 'Pixelify Sans')
  } else if (card.kind === 'ir') {
    draw13(g, mid - 6.5 * 30, 420, 30)
    pixelText(g, 'COM A ISENÇÃO DO IR', mid, 860, 56, '#efe8dc')
    pixelText(g, 'EU ECONOMIZO', mid, 940, 56, '#efe8dc')
    pixelText(g, fmtBRL(card.perYear), mid, 1100, 110, '#f5c04a')
    pixelText(g, 'POR ANO', mid, 1190, 56, '#f5c04a')
    g.font = '40px Pixelify Sans, sans-serif'
    const lines = wrap(
      g,
      'Até R$ 5 mil por mês, zero de Imposto de Renda. Lei 15.270/2025, em vigor desde janeiro de 2026.',
      840,
    )
    lines.forEach((l, i) => {
      pixelText(g, l, mid, 1320 + i * 54, 40, '#efe8dc', 'Pixelify Sans')
    })
    pixelText(g, 'Faça a sua conta no jogo', mid, 1600, 50, '#ff3b3b', 'Pixelify Sans')
  } else if (card.kind === 'movimento') {
    draw13(g, mid - 6.5 * 52, 480, 52)
    const virei = save.movimento === 'virei'
    pixelText(g, virei ? 'VIREI MEU VOTO' : 'EU VOU VOTAR', mid, 1080, 76, '#efe8dc')
    pixelText(g, 'NO 13', mid, 1200, 130, '#ff3b3b')
    pixelText(g, CONFIG.electionLabel, mid, 1300, 38, '#f5c04a', 'Pixelify Sans')
    pixelText(g, 'E você? Joga, confere os fatos', mid, 1560, 46, '#efe8dc', 'Pixelify Sans')
    pixelText(g, 'e decide com fonte.', mid, 1620, 46, '#efe8dc', 'Pixelify Sans')
  } else {
    pixelText(g, `DESAFIO DO DIA #${card.n}`, mid, 560, 62, '#efe8dc')
    const size = 150
    const gap = 24
    const x0 = mid - (card.grid.length * size + (card.grid.length - 1) * gap) / 2
    card.grid.forEach((ok, i) => {
      g.fillStyle = '#0a0a0f'
      g.fillRect(x0 + i * (size + gap) - 6, 700 - 6, size + 12, size + 12)
      g.fillStyle = ok ? '#4fae3f' : '#e3242b'
      g.fillRect(x0 + i * (size + gap), 700, size, size)
      pixelText(g, ok ? '✓' : '✗', x0 + i * (size + gap) + size / 2, 700 + size * 0.7, 90, '#ffffff')
    })
    const hits = card.grid.filter(Boolean).length
    pixelText(g, `${hits}/${card.grid.length} FATOS`, mid, 1040, 96, '#f5c04a')
    if (card.streak > 1) pixelText(g, `${card.streak} DIAS SEGUIDOS`, mid, 1140, 50, '#ff7a3d')
    draw13(g, mid - 6.5 * 22, 1240, 22)
    pixelText(g, 'Fato ou fake? Teste você também', mid, 1600, 46, '#efe8dc', 'Pixelify Sans')
  }
  // rodapé
  pixelText(g, shareLink().replace(/^https?:\/\//, ''), mid, 1720, 40, '#efe8dc', 'Silkscreen')
  pixelText(g, CONFIG.aiLabel, mid, 1800, 26, '#b9b1a6', 'Pixelify Sans')
  pixelText(g, responsavelText(), mid, 1840, 26, '#b9b1a6', 'Pixelify Sans')
  return await new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'),
  )
}

export async function shareCard(card: CardKind, text: string) {
  try {
    const blob = await makeCard(card)
    const file = new File([blob], 'nivel-13.png', { type: 'image/png' })
    const full = `${text}\n${shareLink()}`
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: full })
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nivel-13.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    toast('Imagem salva. Agora é só postar.')
  } catch (err) {
    if ((err as Error).name !== 'AbortError') toast('Não deu para gerar a imagem')
  }
}

export async function shareText(text: string) {
  const full = `${text}\n${shareLink()}`
  try {
    if (navigator.share) {
      await navigator.share({ text: full })
      return
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener')
}

export async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareLink())
    toast('Link copiado')
  } catch {
    toast(shareLink())
  }
}
