// Entrada do Cloudflare Worker (wrangler.toml → main). Só o export default: o workerd recusa outros exports
// que não sejam handlers. A app e os utilitários vivem em ./index.ts.
import { handlers } from './index.ts'

export default handlers
