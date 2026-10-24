// Ícone do app: o do agente de ícone (/install/app-icon-64.png) quando existir; senão o 192 do manifest.
// Trocar o arquivo basta: o caminho é testado uma vez e o resultado vale para a sessão.
import { useSyncExternalStore } from 'react'

export const ICON_PRIMARY = '/install/app-icon-64.png'
export const ICON_FALLBACK = '/icon-192.png'

let current = ICON_FALLBACK
let probed = false
const subs = new Set<() => void>()

function probe() {
  if (probed || typeof Image === 'undefined') return
  probed = true
  const img = new Image()
  img.onload = () => {
    if (img.naturalWidth > 0) {
      current = ICON_PRIMARY
      for (const f of subs) f()
    }
  }
  img.src = ICON_PRIMARY
}

export function useIconSrc() {
  return useSyncExternalStore(
    (f) => {
      probe()
      subs.add(f)
      return () => subs.delete(f)
    },
    () => current,
    () => ICON_FALLBACK,
  )
}
