/* Card neutra que reemplaza cualquier CTA de pago en iOS — cumple App Store
   Rule 3.1.1: NO menciona "premium", "suscripción", "pago", ni linkea a la
   web. Texto suave: "acceso completo" / "iniciar sesión para continuar". */
import { useApp } from '../store'

export default function PremiumLockedIOS() {
  const { t } = useApp()
  return (
    <div className="premium-locked">
      <div className="premium-locked-ic">🔒</div>
      <h3 className="premium-locked-title">{t('premium.locked_title')}</h3>
      <p className="premium-locked-text">{t('premium.locked_text')}</p>
      <p className="premium-locked-soon">{t('premium.coming_soon')}</p>
    </div>
  )
}
