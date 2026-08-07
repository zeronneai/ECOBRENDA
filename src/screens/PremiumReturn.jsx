import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'

/* Página a la que Stripe redirige tras el Checkout (web).
   Web: ${origin}/premium-return?ok=1  o  ?canceled=1
   En cuanto vuelves, AppContext re-jala la suscripción con polling; aquí solo
   damos feedback visual mientras llega el webhook. */
export default function PremiumReturn() {
  const navigate = useNavigate()
  const { subscription, refreshPremium, t } = useApp()
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
            <p className="perms-lead">{t('preturn.confirming_lead')}</p>
          </>
        )}
      </div>
    </div>
  )
}
