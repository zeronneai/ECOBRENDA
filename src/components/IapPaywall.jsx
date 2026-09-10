/* Paywall de iOS (Apple IAP). Muestra el offering de RevenueCat con precios
   LOCALIZADOS de StoreKit. Cumple App Store 3.1.1: SOLO el pago de Apple, sin
   links ni menciones a la web.

   Fase 1: muestra planes + precios. La COMPRA y RESTAURAR se cablean en Fase 2
   (por ahora avisan "próximamente"). No otorga acceso todavía. */
import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { getOfferings, purchase, restore } from '../lib/iap'

// Copia propia por producto (la de StoreKit puede ser genérica); el PRECIO sí
// viene de StoreKit (priceString).
const LABEL = {
  'bootyalarm.allinclusive.annual': 'iap.plan.allinclusive_annual',
  'bootyalarm.allinclusive.monthly': 'iap.plan.allinclusive_monthly',
  'bootyalarm.alarm.monthly': 'iap.plan.alarm',
}
const ORDER = ['bootyalarm.allinclusive.annual', 'bootyalarm.allinclusive.monthly', 'bootyalarm.alarm.monthly']

export default function IapPaywall() {
  const { t, showToast, refreshPremium } = useApp()
  const [pkgs, setPkgs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getOfferings().then((p) => { if (alive) { setPkgs(p); setLoading(false) } })
    return () => { alive = false }
  }, [])

  if (loading) return <div className="iap-pay"><div className="iap-note">{t('iap.loading')}</div></div>
  if (!pkgs?.length) return <div className="iap-pay"><div className="iap-note">{t('iap.unavailable')}</div></div>

  const sorted = [...pkgs].sort((a, b) => ORDER.indexOf(a.productId) - ORDER.indexOf(b.productId))

  // Compra: el acceso lo otorga el SERVIDOR (webhook RevenueCat). Tras comprar,
  // esperamos con refreshPremium hasta que el acceso llegue a la fila de Supabase.
  const onBuy = async (p) => {
    if (busy) return
    setBusy(true)
    const r = await purchase(p.identifier)
    if (r.ok) {
      showToast(t('iap.processing'))
      await refreshPremium({ tries: 10, delay: 1500 }) // espera al webhook
      showToast(t('iap.success'))
    } else if (!r.cancelled) {
      showToast(t('iap.error'))
    }
    setBusy(false)
  }

  const onRestore = async () => {
    if (busy) return
    setBusy(true)
    const r = await restore()
    if (r.ok) {
      await refreshPremium({ tries: 8, delay: 1500 })
      showToast(t(r.hasActive ? 'iap.restored' : 'iap.restore_none'))
    } else {
      showToast(t('iap.error'))
    }
    setBusy(false)
  }

  return (
    <div className="iap-pay">
      <div className="iap-ic">🍑</div>
      <h3 className="iap-title">{t('iap.title')}</h3>
      <p className="iap-sub">{t('iap.sub')}</p>

      <div className="iap-plans">
        {sorted.map((p) => (
          <button key={p.identifier} className="iap-plan" onClick={() => onBuy(p)} disabled={busy}>
            <span className="iap-plan-l">
              <span className="iap-plan-name">{t(LABEL[p.productId] || 'iap.plan.generic')}</span>
              {p.productId === 'bootyalarm.alarm.monthly' && <span className="iap-plan-trial">{t('iap.trial')}</span>}
            </span>
            <span className="iap-plan-price">{p.priceString}</span>
          </button>
        ))}
      </div>

      <button className="iap-restore" onClick={onRestore} disabled={busy}>{t('iap.restore')}</button>
    </div>
  )
}
