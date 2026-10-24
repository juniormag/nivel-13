// Roteiro do tutorial: quadros-chave em ~4 s, cada um ligado a um dos 3 passos numerados.
export type Variant = 'ios' | 'ios26' | 'android' | 'inapp-ios' | 'inapp-android'

export type Phase =
  | 'aim' // dedo vai até o botão
  | 'tap1' // toca no Compartilhar / ⋮ / ⋯
  | 'sheet' // folha ou menu do sistema sobe
  | 'tap2' // a linha certa acende
  | 'confirm' // tela de confirmar (Adicionar / Instalar)
  | 'tap3'
  | 'fly' // o 13 voa para a tela de início
  | 'land' // cai com squash, bounce e brilho
  | 'open' // (app de mensagem) abre no navegador
  | 'hint' // (app de mensagem) o jogo mostra o botão de instalar

export interface Beat {
  id: Phase
  ms: number
  step: 0 | 1 | 2
}

const BROWSER: Beat[] = [
  { id: 'aim', ms: 650, step: 0 },
  { id: 'tap1', ms: 380, step: 0 },
  { id: 'sheet', ms: 650, step: 1 },
  { id: 'tap2', ms: 420, step: 1 },
  { id: 'confirm', ms: 440, step: 2 },
  { id: 'tap3', ms: 300, step: 2 },
  { id: 'fly', ms: 520, step: 2 },
  { id: 'land', ms: 1050, step: 2 },
]

const INAPP: Beat[] = [
  { id: 'aim', ms: 650, step: 0 },
  { id: 'tap1', ms: 380, step: 0 },
  { id: 'sheet', ms: 650, step: 1 },
  { id: 'tap2', ms: 420, step: 1 },
  { id: 'open', ms: 620, step: 2 },
  { id: 'hint', ms: 520, step: 2 },
  { id: 'tap3', ms: 300, step: 2 },
  { id: 'land', ms: 900, step: 2 },
]

export const beatsOf = (v: Variant) => (v.startsWith('inapp') ? INAPP : BROWSER)

/** Primeiro quadro de cada passo (tocar no passo pula para ele). */
export const firstOf = (beats: Beat[], step: number) => Math.max(0, beats.findIndex((b) => b.step === step))

/** Quadro parado de cada passo no movimento reduzido. */
export const keyOf = (beats: Beat[], step: number) => {
  const want: Phase = step === 0 ? 'tap1' : step === 1 ? 'tap2' : 'land'
  return Math.max(0, beats.findIndex((b) => b.id === want))
}
