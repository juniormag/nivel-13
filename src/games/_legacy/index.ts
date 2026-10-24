import type { GameKind } from '../content/levels'
import { LEVEL2_IDS, STATEMENTS } from '../content/statements'
import { chefeGame } from './chefe'
import { defesaGame } from './defesa'
import { escudoGame } from './escudo'
import { fogoGame } from './fogo'
import { irGame } from './ir'
import { linhaGame } from './linha'
import { mapaGame } from './mapa'
import { memoriaGame } from './memoria'
import { pegarGame } from './pegar'
import { raioxGame } from './raiox'
import { ritmoGame } from './ritmo'
import { swipeGame } from './swipe'
import type { MicroGame } from './types'
import { whackGame } from './whack'

export function makeGame(kind: GameKind): MicroGame {
  switch (kind) {
    case 'mapa':
      return mapaGame()
    case 'swipe':
      return swipeGame({
        statements: LEVEL2_IDS.map((id) => STATEMENTS.find((s) => s.id === id)).filter((s) => !!s),
      })
    case 'ir':
      return irGame()
    case 'fogo':
      return fogoGame()
    case 'whack':
      return whackGame()
    case 'ritmo':
      return ritmoGame()
    case 'defesa':
      return defesaGame()
    case 'linha':
      return linhaGame()
    case 'memoria':
      return memoriaGame()
    case 'raiox':
      return raioxGame()
    case 'escudo':
      return escudoGame()
    case 'pegar':
      return pegarGame()
    case 'chefe':
      return chefeGame()
  }
}
