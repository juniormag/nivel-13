// Estado ao vivo de uma fase, lido pelo HUD em React.
import { create } from 'zustand'

export type PlayPhase = 'loading' | 'intro' | 'count' | 'run' | 'pause' | 'end'

export interface PlayState {
  phase: PlayPhase
  hearts: number
  maxHearts: number
  score: number
  timeLeft: number
  duration: number
  combo: number
}

export const usePlay = create<PlayState>(() => ({
  phase: 'loading',
  hearts: 3,
  maxHearts: 3,
  score: 0,
  timeLeft: 0,
  duration: 0,
  combo: 0,
}))
