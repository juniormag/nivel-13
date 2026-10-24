// Contrato dos minijogos. Todo jogo implementa MicroGame e desenha em `c.stage` (PixiJS, modo retido).
import type { Container, Texture } from 'pixi.js'
import type { Sfx } from '../audio/audio'

export interface Juice {
  /** partículas pixel com gravidade */
  burst(x: number, y: number, color: number | string, n?: number, speed?: number): void
  /** texto subindo e sumindo (pontos, "PERFEITO") */
  float(text: string, x: number, y: number, color?: number | string): void
  /** tremor de tela em px lógicos, decai em ~ms */
  shake(px: number, ms?: number): void
  /** congela a simulação por ms (impacto) */
  hitstop(ms: number): void
  /** clarão de tela inteira */
  flash(color: number | string, ms?: number, alpha?: number): void
  /** anel pixel que expande (onda de choque) */
  ring(x: number, y: number, color: number | string, maxR?: number): void
}

export interface GameCtx {
  /** tamanho lógico da tela (pixels de arte) */
  readonly W: number
  readonly H: number
  /** faixa jogável entre o HUD de cima e as habilidades */
  top: number
  bottom: number
  /** pixels CSS por pixel lógico */
  readonly css: number
  /** camada do jogo (já com fundo atrás e efeitos na frente) */
  readonly stage: Container
  /** camada DOM por cima do canvas, para cartas com texto */
  readonly layer: HTMLElement
  readonly rnd: () => number
  readonly fx: Juice
  addScore(n: number, x?: number, y?: number): void
  hit(x?: number, y?: number): void
  finish(): void
  sfx(name: Sfx): void
  /** textura nomeada (sprites de src/lib/sprites.ts ou gerados pelo jogo) */
  tex(name: string): Texture
  readonly time: number
  readonly reduced: boolean
}

export interface MicroGame {
  /** segundos; 0 = termina quando o objetivo é cumprido */
  duration: number
  /** pontuação para 3 estrelas */
  goal: number
  init(c: GameCtx): void | Promise<void>
  update(dt: number): void
  down?(x: number, y: number): void
  move?(x: number, y: number): void
  up?(x: number, y: number): void
  key?(k: string, down: boolean): void
  /** LEMBRAR: mostra a resposta; false se não fez nada */
  hint?(): boolean
  /** CHECAR: limpa as ameaças */
  clear?(): boolean
  /** fim do tempo: retorna se venceu */
  timeUp?(): boolean
  dispose?(): void
}
