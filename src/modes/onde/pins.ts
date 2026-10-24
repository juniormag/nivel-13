// Acervo jogável: só pino com review === 'ok' (o fact-checker revisa em src/content/onde.ts).
// Sem nenhum pino revisado, o dev usa os exemplos de fixture.ts; a produção mostra o aviso de vazio.
import { PINS } from '../../content/onde'
import { FIXTURE_PINS } from './fixture'
import { playable } from './logic'

export function pinPool() {
  const ok = PINS.filter(playable)
  if (ok.length === 0 && import.meta.env.DEV) return FIXTURE_PINS
  return ok
}
