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
      <span className="bc-pill-ic">🪙</span>
      <span className="bc-pill-n">{bcBalance == null ? '—' : bcBalance.toLocaleString()}</span>
    </button>
  )
}
