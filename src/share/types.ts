// Contrato público de compartilhamento (dono: growth-share-engineer).
export type Moment =
  | { kind: 'stars3'; level: number; title: string; score: number }
  | { kind: 'ir'; perYear: number }
  | { kind: 'nivel13' }
  | { kind: 'daily'; n: number; grid: boolean[]; streak: number }
  | { kind: 'movimento'; escolha: 'vou' | 'virei' }
  | { kind: 'convite' }
  /** Chuta Aí #n: notas 0..100 por rodada, total (máx. 1.300) e o tema da linha-gancho (ex.: "o desemprego") */
  | { kind: 'chute'; n: number; s: number[]; total: number; theme: string }
  /** Meu plano de domingo. Fica só no aparelho: sai apenas dentro da imagem que a pessoa escolher mandar. */
  | { kind: 'plano'; hora: string; doc: string; com: string }
  /** Placar da virada: resultado oficial do 1º e do 2º turno (src/content/resultado.ts) */
  | { kind: 'virada' }

export type Format = 'story' | 'feed' | 'square'
