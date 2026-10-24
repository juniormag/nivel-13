// Acesso fixo ao tutorial de instalação (tela inicial). Some no modo app e depois de instalar;
// no desktop só aparece quando o Chrome/Edge oferece o pedido nativo. Ícone: o favicon de 32 (grade nativa) a 16 px.
import './install.css'
import { useState } from 'react'
import { Tap } from '../PixelButton'
import { detectPath, requestInstall, useInstall } from './platform'

export function InstallButton() {
  const standalone = useInstall((s) => s.standalone)
  const installed = useInstall((s) => s.installed)
  const deferred = useInstall((s) => s.deferred)
  const [path] = useState(detectPath)
  if (standalone || installed || (path === 'desktop' && !deferred)) return null
  return (
    <Tap
      className="inst-homebtn"
      aria-label="Instalar o Nível 13 como app"
      onClick={() => void requestInstall()}
    >
      <span className="inst-homebtn-icon" aria-hidden="true">
        <img src="/favicon-32.png" alt="" width={16} height={16} draggable={false} />
        <i>+</i>
      </span>
      <span className="inst-homebtn-text">Instalar</span>
    </Tap>
  )
}
