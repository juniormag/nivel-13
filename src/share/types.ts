// Contrato público de compartilhamento (dono: growth-share-engineer).
export type Moment =
  | { kind: 'stars3'; level: number; title: string; score: number }
  | { kind: 'ir'; perYear: number }
  | { kind: 'nivel13' }
  | { kind: 'daily'; n: number; grid: boolean[]; streak: number }
  | { kind: 'movimento'; escolha: 'vou' | 'virei' }
  | { kind: 'convite' }

export type Format = 'story' | 'feed' | 'square'
