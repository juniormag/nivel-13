import type { Sfx } from '../core/audio'

export interface GameCtx {
  /** tamanho lógico da tela */
  W: number
  H: number
  /** faixa jogável (abaixo do HUD de cima, acima das habilidades) */
  top: number
  bottom: number
  rnd: () => number
  /** pixels CSS por pixel lógico (para alinhar DOM e canvas) */
  css: number
  /** camada DOM sobre o canvas, para cartas com texto */
  layer: HTMLElement
  addScore(n: number, x?: number, y?: number): void
  hit(x?: number, y?: number): void
  finish(): void
  burst(x: number, y: number, color: string, n?: number): void
  float(text: string, x: number, y: number, color?: string): void
  shake(amount: number): void
  sfx(name: Sfx): void
  /** segundos desde o início da fase (já com câmera lenta aplicada) */
  readonly time: number
  readonly reduced: boolean
}

export interface MicroGame {
  /** segundos; 0 = a fase termina quando o objetivo é cumprido */
  duration: number
  /** pontuação para 3 estrelas */
  goal: number
  init(c: GameCtx): void
  update(dt: number): void
  draw(g: CanvasRenderingContext2D): void
  down?(x: number, y: number): void
  move?(x: number, y: number): void
  up?(x: number, y: number): void
  key?(k: string, down: boolean): void
  /** LEMBRAR: mostra a resposta. Retorna false se não fez nada. */
  hint?(): boolean
  /** CHECAR: limpa as ameaças da tela. */
  clear?(): boolean
  /** quando o tempo acaba; retorna se a fase foi vencida */
  timeUp?(): boolean
  dispose?(): void
}
