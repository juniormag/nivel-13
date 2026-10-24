// Splash leve enquanto o chunk da próxima tela carrega: fundo --void (sem flash) e, só se a espera
// passar de 200 ms, um "13" em pixels com três blocos piscando em degraus. Com movimento reduzido, parado.
export function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <span className="sr-only">Carregando</span>
      <div className="splash-mark" aria-hidden="true">
        <span className="splash-13">13</span>
        <span className="splash-dots">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}
