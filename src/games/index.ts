// Registro automático: cada arquivo src/games/<kind>.ts exporta `default` (fábrica do MicroGame).
import type { GameKind } from '../content/levels'
import type { MicroGame } from '../engine/types'

type Factory = (opts?: unknown) => MicroGame
const mods = import.meta.glob<{ default: Factory }>(['./*.ts', '!./index.ts', '!./kit*.ts'])

export async function loadGame(kind: GameKind, opts?: unknown): Promise<MicroGame> {
  const loader = mods[`./${kind}.ts`]
  if (!loader) throw new Error(`Jogo "${kind}" ainda não existe em src/games/${kind}.ts`)
  const m = await loader()
  return m.default(opts)
}

export const hasGame = (kind: GameKind) => `./${kind}.ts` in mods
