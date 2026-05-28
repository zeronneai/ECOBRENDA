import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'

/* Página a la que Stripe redirige tras el Checkout (web).
   Web: ${origin}/premium-return?ok=1  o  ?canceled=1
   En cuanto vuelves, AppContext re-jala la suscripción con polling; aquí solo
   damos feedback visual mientras llega el webhook. */
export default function PremiumReturn() {
  const navigate = useNavigate()
  const { subscription, refreshPremium } = useApp()
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const canceled = params.get('canceled') === '1'
  const active = subscription.status === 'active'

  useEffect(() => {
    if (canceled) return
    refreshPremium({ tries: 8, delay: 1000 })
  }, [canceled, refreshPremium])

  return (
    <div id="perms" className="show">
      <div className="perms-card">
        {canceled ? (
          <>
            <div className="perms-emoji">↩️</div>
            <h2 className="perms-title">PAGO CANCELADO</h2>
            <p className="perms-lead">No se cobró nada. Puedes intentarlo de nuevo cuando quieras.</p>
            <button className="perms-go" onClick={() => navigate('/')}>VOLVER A LA APP</button>
          </>
        ) : active ? (
          <>
            <div className="perms-emoji">🎉</div>
            <h2 className="perms-title">¡PREMIUM ACTIVO!</h2>
            <p className="perms-lead">Brenda Fitness desbloqueado. Tu plan ya está listo.</p>
            <button className="perms-go" onClick={() => navigate('/')}>EMPEZAR</button>
          </>
        ) : (
          <>
            <div className="perms-emoji">⏳</div>
            <h2 className="perms-title">CONFIRMANDO PAGO…</h2>
            <p className="perms-lead">Estamos activando tu suscripción. Esto tarda unos segundos.</p>
          </>
        )}
      </div>
    </div>
  )
}
