/* Gate premium en iOS.
   - Con IAP activo (IAP_ENABLED + iOS): muestra el paywall de Apple (IapPaywall),
     único camino de pago permitido por App Store 3.1.1 (sin links a la web).
   - Sin IAP: card neutra que NO menciona pago/suscripción ni linkea a la web. */
import { useApp } from '../store'
import { iapAvailable } from '../lib/iap'
import IapPaywall from './IapPaywall'

export default function PremiumLockedIOS() {
  const { t } = useApp()
  if (iapAvailable()) return <IapPaywall />
  return (
    <div className="premium-locked">
      <div className="premium-locked-ic">🔒</div>
      <h3 className="premium-locked-title">{t('premium.locked_title')}</h3>
      <p className="premium-locked-text">{t('premium.locked_text')}</p>
      <p className="premium-locked-soon">{t('premium.coming_soon')}</p>
    </div>
  )
}
