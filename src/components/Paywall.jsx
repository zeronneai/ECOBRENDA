import { useState } from 'react'
import { useApp } from '../store'
import Sheet from './Sheet'
import PremiumLockedIOS from './PremiumLockedIOS'
import { isIOSNative } from '../lib/platform'

/* Paywall con dos planes, precio tachado y "EMPEZAR" por tarjeta.
   Los precios mostrados son visuales; los reales vienen de los Price IDs de
   Stripe en el servidor. El "tachado" es marketing local. Los textos salen de
   i18n (es/en); los datos numéricos/estructurales viven aquí. */
const PLANS = [
  {
    id: 'monthly',
    nameKey: 'paywall.monthly',
    badgeKey: null,
    old: '$299',
    price: '$99',
    unitKey: 'paywall.monthly_unit',
    subKey: 'paywall.monthly_sub',
  },
  {
    id: 'annual',
    nameKey: 'paywall.annual',
    badgeKey: 'paywall.annual_badge',
    old: '$3,499',
    price: '$999',
    unitKey: 'paywall.annual_unit',
    subKey: 'paywall.annual_sub',
  },
]

export default function Paywall() {
  const { closeSheet, checkoutPlan, t } = useApp()
  const [busy, setBusy] = useState(null)

  // iOS: defensa en profundidad — si alguien abre el paywall en iOS, mostramos
  // SOLO la card neutra. Sin precios, sin "EMPEZAR", sin mención a Stripe/web.
  if (isIOSNative()) {
    return (
      <Sheet>
        <PremiumLockedIOS />
      </Sheet>
    )
  }

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

      <div className="pwgrid">
        {PLANS.map((p) => (
          <div key={p.id} className={'pwcard' + (p.id === 'annual' ? ' best' : '')}>
            {p.badgeKey && <div className="pwbadge">{t(p.badgeKey)}</div>}
            <div className="pwname">{t(p.nameKey)}</div>
            <div className="pwold">{p.old}</div>
            <div className="pwprice">{p.price}<small>{t(p.unitKey)}</small></div>
            <div className="pwsub">{t(p.subKey)}</div>
            <button className="cta full pwgo" disabled={busy === p.id} onClick={() => go(p.id)}>
              {busy === p.id ? t('paywall.opening') : t('paywall.go')}
            </button>
          </div>
        ))}
      </div>

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
