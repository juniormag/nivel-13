// Quatro habilidades (docs/GAME-DESIGN.md): liberadas nas fases 0, 3, 6 e 9, uma vez por fase.
// Mesmo conteúdo de SKILLS em Play.tsx, sem puxar o motor para a tela de título.
import type { SkillKind } from '../state/play'

export interface SkillInfo {
  kind: SkillKind
  label: string
  key: string
  unlock: number
  desc: string
}

export const SKILL_INFO: SkillInfo[] = [
  { kind: 'checar', label: 'Checar', key: 'Q', unlock: 0, desc: 'Desmonta as ameaças da tela' },
  { kind: 'lembrar', label: 'Lembrar', key: 'W', unlock: 3, desc: 'Mostra a resposta certa' },
  { kind: 'foco', label: 'Foco', key: 'E', unlock: 6, desc: 'Câmera lenta por 4 segundos' },
  { kind: 'proteger', label: 'Proteger', key: 'R', unlock: 9, desc: 'Escudo contra o próximo golpe' },
]
