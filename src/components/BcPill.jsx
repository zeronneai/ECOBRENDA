/* Píldora de saldo de Brenda Coins, esquina superior. Discreta. Al tocarla abre
   la sección Recompensas. Se monta SOLO en Home/Entrena/Nutrición/Perfil (nunca
   en la alarma sonando ni durante los squats). Detrás de BC_ENABLED. */
import { useApp } from '../store'
import { BC_ENABLED } from '../lib/features'

export default function BcPill() {
  const { bcBalance, openRewards, cloudEnabled, session, subscription } = useApp()
  // Solo PARTICIPANTES del sistema (acceso a la alarma o fundador → acceso_alarma
  // true en ambos). El usuario "sin nada" no ve la píldora ni la sección.
  if (!BC_ENABLED || !cloudEnabled || !session || subscription?.accesoAlarma !== true) return null
  return (
    <button className="bc-pill" onClick={openRewards} aria-label="Brenda Coins">
      {/* Moneda en SVG propio: idéntica en todos los navegadores (el emoji 🪙 lo
          pinta cada sistema distinto — dorado en desktop, plateado en Safari iOS). */}
      <svg className="bc-pill-ic" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <defs>
          <linearGradient id="bcCoinG" x1="4" y1="2" x2="16" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffe89a" />
            <stop offset="0.55" stopColor="#f3c33f" />
            <stop offset="1" stopColor="#cf9218" />
          </linearGradient>
        </defs>
        <circle cx="10" cy="10" r="8.5" fill="url(#bcCoinG)" stroke="#a9741a" strokeWidth="1" />
        <circle cx="10" cy="10" r="5.5" fill="none" stroke="#b9821c" strokeWidth="1.2" opacity="0.55" />
        <ellipse cx="7" cy="6.6" rx="3" ry="1.7" fill="#fff" opacity="0.35" />
      </svg>
      <span className="bc-pill-n">{bcBalance == null ? '—' : bcBalance.toLocaleString()}</span>
    </button>
  )
}
