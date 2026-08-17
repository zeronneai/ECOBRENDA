import { useState } from 'react'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import Sheet from './Sheet'
import PremiumLockedIOS from './PremiumLockedIOS'
import { isIOSNative } from '../lib/platform'

/* Paywall del modelo de 4 productos. Qué se muestra depende de los permisos:
   - Sin nada           → $9 (alarma) · $59/mes · $590/año
   - Con alarma, sin premium → $49 (upgrade) · $59/mes · $590/año
   - Con premium        → nada que comprar ("ya tienes todo")
   El $49 SOLO aparece si el usuario ya tiene alarma (regla del upgrade).
   Los precios son visuales; el cobro real lo define el Price ID en Stripe.
   iOS: card neutra sin precios/pagos (App Store 3.1.1). */
const ALL_PLANS = {
  alarm: { id: 'alarm', nameKey: 'paywall.alarm', badgeKey: 'paywall.alarm_badge', price: '$9', unitKey: 'paywall.monthly_unit', subKey: 'paywall.alarm_sub' },
  upgrade: { id: 'upgrade', nameKey: 'paywall.upgrade', badgeKey: null, price: '$49', unitKey: 'paywall.monthly_unit', subKey: 'paywall.upgrade_sub' },
  monthly: { id: 'monthly', nameKey: 'paywall.monthly', badgeKey: null, price: '$59', unitKey: 'paywall.monthly_unit', subKey: 'paywall.monthly_sub' },
  annual: { id: 'annual', nameKey: 'paywall.annual', badgeKey: 'paywall.annual_badge', price: '$590', unitKey: 'paywall.annual_unit', subKey: 'paywall.annual_sub' },
}

export default function Paywall() {
  const { closeSheet, checkoutPlan, t } = useApp()
  const { accesoAlarma, accesoPremium } = useSubscription()
  const [busy, setBusy] = useState(null)

  // iOS: defensa en profundidad — card neutra. Sin precios, sin "EMPEZAR", sin Stripe/web.
  if (isIOSNative()) {
    return (
      <Sheet>
        <PremiumLockedIOS />
      </Sheet>
    )
  }

  // Selección de productos según permisos (regla del $49 incluida).
  let plans
  if (accesoPremium) plans = []
  else if (accesoAlarma) plans = [ALL_PLANS.upgrade, ALL_PLANS.monthly, ALL_PLANS.annual]
  else plans = [ALL_PLANS.alarm, ALL_PLANS.monthly, ALL_PLANS.annual]

  const go = async (plan) => {
    if (busy) return
    setBusy(plan)
    try {
      await checkoutPlan(plan)
      closeSheet() // si volvió (web redirige; native abre browser) — al cerrar el sheet queda limpio
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet>
      <h3>BRENDA FITNESS</h3>
      <p className="lead">{t('paywall.lead')}</p>

      {plans.length === 0 ? (
        <p className="lead" style={{ textAlign: 'center', marginTop: 8 }}>{t('paywall.have_all')}</p>
      ) : (
        <div className="pwgrid">
          {plans.map((p) => (
            <div key={p.id} className={'pwcard' + (p.id === 'annual' ? ' best' : '')}>
              {p.badgeKey && <div className="pwbadge">{t(p.badgeKey)}</div>}
              <div className="pwname">{t(p.nameKey)}</div>
              <div className="pwprice">{p.price}<small>{t(p.unitKey)}</small></div>
              <div className="pwsub">{t(p.subKey)}</div>
              <button className="cta full pwgo" disabled={busy === p.id} onClick={() => go(p.id)}>
                {busy === p.id ? t('paywall.opening') : t('paywall.go')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pwfeats">
        <div className="feat"><div className="fi">✓</div>{t('paywall.feat_1')}</div>
        <div className="feat"><div className="fi">✓</div>{t('paywall.feat_2')}</div>
        <div className="feat"><div className="fi">✓</div>{t('paywall.feat_3')}</div>
        <div className="feat"><div className="fi">✓</div>{t('paywall.feat_4')}</div>
      </div>

      <div className="note">{t('paywall.secure')}</div>
    </Sheet>
  )
}
