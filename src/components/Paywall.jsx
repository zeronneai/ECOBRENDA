import { useApp } from '../store'
import Sheet from './Sheet'

export default function Paywall() {
  const { selectedPlan, setSelectedPlan, closeSheet, showToast, unlock, confetti } = useApp()

  // En Fase 7 esto redirige al checkout de Stripe en zeronne.ai y la app
  // verifica el pago al volver. Por ahora se simula el retorno con pago activo.
  const goCheckout = () => {
    closeSheet()
    showToast('Abriendo pago seguro… (' + selectedPlan + ')')
    setTimeout(() => {
      unlock()
      confetti()
      showToast('¡Bienvenida a Brenda Fitness! 🎉')
    }, 1500)
  }

  return (
    <Sheet>
      <h3>DESBLOQUEA BRENDA FITNESS</h3>
      <p className="lead">Tu plan ya está listo. Rutinas y dietas hechas para tu meta. Cancela cuando quieras.</p>

      <div
        className={'plan' + (selectedPlan === 'anual' ? ' sel' : '')}
        onClick={() => setSelectedPlan('anual')}
      >
        <div className="pt">
          <div><span className="pname">Anual</span><span className="badge">AHORRA 40%</span></div>
          <div className="price">$59<small>/año</small></div>
        </div>
        <div className="pdesc">Equivale a $4.92/mes · el más elegido</div>
      </div>

      <div
        className={'plan' + (selectedPlan === 'mensual' ? ' sel' : '')}
        onClick={() => setSelectedPlan('mensual')}
      >
        <div className="pt">
          <div><span className="pname">Mensual</span></div>
          <div className="price">$8.99<small>/mes</small></div>
        </div>
        <div className="pdesc">Flexible, cancela cuando quieras</div>
      </div>

      <div style={{ margin: '18px 0 6px' }}>
        <div className="feat"><div className="fi">✓</div>Rutina semanal hecha para tu objetivo</div>
        <div className="feat"><div className="fi">✓</div>Plan de comidas según tu cuerpo</div>
        <div className="feat"><div className="fi">✓</div>Actualizado conforme avanzas</div>
        <div className="feat"><div className="fi">✓</div>Sin anuncios · todo el método Brenda</div>
      </div>

      <button className="cta full" style={{ marginTop: 8 }} onClick={goCheckout}>CONTINUAR AL PAGO →</button>
      <div className="note">
        El pago se procesa de forma segura en zeronne.ai.<br />Tu acceso se activa al instante.
      </div>
    </Sheet>
  )
}
