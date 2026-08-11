import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'

/* Página a la que Stripe redirige tras el Checkout (web).
   Web: ${origin}/premium-return?ok=1  o  ?canceled=1
   En cuanto vuelves, AppContext re-jala la suscripción con polling; aquí solo
   damos feedback visual mientras llega el webhook. Si el webhook tarda más de lo
   normal, NUNCA dejamos al usuario atascado: mostramos "Verificar de nuevo" y
   "Continuar a la app" (el pull de foreground/resume reconciliará el premium). */
export default function PremiumReturn() {
  const navigate = useNavigate()
  const { subscription, refreshPremium, t } = useApp()
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const canceled = params.get('canceled') === '1'
  const active = subscription.status === 'active'

  // checking = el polling sigue en curso. Cuando termina sin activar, revelamos
  // los botones de salida para que el usuario nunca quede en un spinner infinito.
  const [checking, setChecking] = useState(!canceled)

  useEffect(() => {
    if (canceled) return
    let cancelled = false
    setChecking(true)
    refreshPremium({ tries: 8, delay: 1000 }).finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [canceled, refreshPremium])

  const recheck = () => {
    setChecking(true)
    refreshPremium({ tries: 6, delay: 1000 }).finally(() => setChecking(false))
  }

  return (
    <div id="perms" className="show">
      <div className="perms-card">
        {canceled ? (
          <>
            <div className="perms-emoji">↩️</div>
            <h2 className="perms-title">{t('preturn.canceled_title')}</h2>
            <p className="perms-lead">{t('preturn.canceled_lead')}</p>
            <button className="perms-go" onClick={() => navigate('/')}>{t('preturn.back_app')}</button>
          </>
        ) : active ? (
          <>
            <div className="perms-emoji">🎉</div>
            <h2 className="perms-title">{t('preturn.active_title')}</h2>
            <p className="perms-lead">{t('preturn.active_lead')}</p>
            <button className="perms-go" onClick={() => navigate('/')}>{t('preturn.start')}</button>
          </>
        ) : (
          <>
            <div className="perms-emoji">⏳</div>
            <h2 className="perms-title">{t('preturn.confirming_title')}</h2>
            <p className="perms-lead">
              {checking ? t('preturn.confirming_lead') : t('preturn.confirming_slow')}
            </p>
            {!checking && (
              <>
                <button className="perms-go" onClick={recheck}>{t('preturn.confirming_retry')}</button>
                <button className="perms-alt" onClick={() => navigate('/')}>{t('preturn.confirming_continue')}</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
