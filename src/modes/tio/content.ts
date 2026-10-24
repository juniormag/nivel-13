// Conteúdo em uso no modo: o real de src/content/tio.ts (produção: só review 'ok') ou, em dev e sem
// conteúdo, a fixture de exemplo. A fixture nunca entra no build de produção (import.meta.env.DEV é falso).
import { PARENTES, TIO_MSGS } from '../../content/tio'
import { FIX_MSGS, FIX_PARENTES } from './fixture'
import { selectPool } from './logic'

export const POOL = selectPool(
  { parentes: PARENTES, msgs: TIO_MSGS },
  import.meta.env.DEV ? { parentes: FIX_PARENTES, msgs: FIX_MSGS } : { parentes: [], msgs: [] },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
)
