// Peças do HUD reaproveitadas entre telas.
import { CONFIG, responsavelText } from '../config'
import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import { LEVELS } from '../content/levels'
import { h } from '../core/dom'
import { PEOPLE, portrait, skillIcon, sprite } from '../core/sprites'
import { type Avatar, levelsDone, save } from '../core/store'

export function spriteCanvas(name: string, cls = '', label?: string) {
  const src = sprite(name)
  const c = h('canvas', {
    class: cls,
    width: src.width,
    height: src.height,
    role: label ? 'img' : undefined,
    'aria-label': label,
  })
  c.getContext('2d')?.drawImage(src, 0, 0)
  return c
}

export function avatarCanvas(av: Avatar = save.avatar, cls = 'portrait') {
  return spriteCanvas(av, cls, `Seu personagem: ${AVATAR_NAMES[av]}`)
}

export function personCanvas(who: keyof typeof PEOPLE | 'brasil', icon: string) {
  if (who === 'brasil') return spriteCanvas(icon)
  const spec = PEOPLE[who]
  const src = spec ? portrait(spec) : sprite(icon)
  const c = h('canvas', { width: src.width, height: src.height })
  c.getContext('2d')?.drawImage(src, 0, 0)
  return c
}

export const AVATAR_NAMES: Record<Avatar, string> = {
  coelho: 'Coelho',
  onca: 'Onça',
  arara: 'Arara',
  capivara: 'Capivara',
}

export function hearts(n: number, max = 3) {
  const wrap = h('div', { class: 'hearts', role: 'img', 'aria-label': `${n} de ${max} vidas` })
  for (let i = 0; i < max; i++) wrap.append(spriteCanvas(i < n ? 'heart' : 'heartOff', 'heart'))
  return wrap
}

export type SkillKind = 'checar' | 'lembrar' | 'foco' | 'proteger'
export const SKILLS: { kind: SkillKind; label: string; key: string; unlock: number; desc: string }[] = [
  { kind: 'checar', label: 'Checar', key: 'Q', unlock: 0, desc: 'Desmonta as ameaças da tela' },
  { kind: 'lembrar', label: 'Lembrar', key: 'W', unlock: 3, desc: 'Mostra a resposta certa' },
  { kind: 'foco', label: 'Foco', key: 'E', unlock: 6, desc: 'Câmera lenta por 4 segundos' },
  { kind: 'proteger', label: 'Proteger', key: 'R', unlock: 9, desc: 'Escudo contra o próximo golpe' },
]

export function skillUnlocked(kind: SkillKind) {
  const s = SKILLS.find((k) => k.kind === kind)
  return !!s && levelsDone() >= s.unlock
}

export function skillButton(kind: SkillKind, onUse?: () => void) {
  const s = SKILLS.find((k) => k.kind === kind)
  if (!s) return h('span')
  const unlocked = skillUnlocked(kind)
  const icon = skillIcon(kind)
  const c = h('canvas', { width: 32, height: 32 })
  c.getContext('2d')?.drawImage(icon, 0, 0)
  const b = h(
    'button',
    {
      class: `skill${unlocked ? '' : ' locked'}`,
      title: unlocked ? `${s.label}: ${s.desc}` : `${s.label}: libera ao completar ${s.unlock} fases`,
      'aria-label': unlocked
        ? `${s.label}, tecla ${s.key}. ${s.desc}`
        : `${s.label}, bloqueado até a fase ${s.unlock}`,
      disabled: !unlocked || !onUse,
    },
    c,
    s.label.toUpperCase(),
    h('span', { class: 'kbd', 'aria-hidden': 'true' }, s.key),
  )
  if (onUse) b.addEventListener('click', onUse)
  b.dataset.kind = kind
  return b
}

export function legal() {
  return h('div', { class: 'legal' }, `${CONFIG.aiLabel} · ${responsavelText()}`)
}

/** Minimapa do Brasil com as 13 fases. */
export function drawMinimap(c: HTMLCanvasElement, size = 64, highlight = levelsDone()) {
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) return
  g.fillStyle = '#0d0a0f'
  g.fillRect(0, 0, size, size)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const lon = LON0 + ((i + 0.5) / size) * (LON1 - LON0)
      const lat = LAT0 + ((j + 0.5) / size) * (LAT1 - LAT0)
      if (!inBrazil(lon, lat)) continue
      g.fillStyle = (i + j) % 7 === 0 ? '#3a2a26' : '#2a1d1c'
      g.fillRect(i, j, 1, 1)
    }
  const pos = (lon: number, lat: number) => [
    Math.round(((lon - LON0) / (LON1 - LON0)) * size),
    Math.round(((lat - LAT0) / (LAT1 - LAT0)) * size),
  ]
  g.fillStyle = '#c9a77a'
  LEVELS.forEach((l, i) => {
    const next = LEVELS[i + 1]
    if (!next) return
    const [x0 = 0, y0 = 0] = pos(l.lon, l.lat)
    const [x1 = 0, y1 = 0] = pos(next.lon, next.lat)
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let s = 0; s <= steps; s += 2)
      g.fillRect(Math.round(x0 + ((x1 - x0) * s) / steps), Math.round(y0 + ((y1 - y0) * s) / steps), 1, 1)
  })
  LEVELS.forEach((l, i) => {
    const [x = 0, y = 0] = pos(l.lon, l.lat)
    const done = (save.stars[i] ?? 0) > 0
    g.fillStyle = i === highlight ? '#ff3b3b' : done ? '#f5c04a' : '#6b6560'
    g.fillRect(x - 1, y - 1, 3, 3)
    if (i === highlight) {
      g.fillStyle = '#ffffff'
      g.fillRect(x, y, 1, 1)
    }
  })
}

export function avatarTile(av: Avatar, pressed: boolean, onPick: () => void) {
  return h(
    'button',
    { class: 'tile', 'aria-pressed': pressed ? 'true' : 'false', onclick: onPick, type: 'button' },
    spriteCanvas(av),
    AVATAR_NAMES[av],
  )
}
