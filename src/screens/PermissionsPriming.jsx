import { useState } from 'react'
import { useApp } from '../store'

/* Priming de permisos nativos (solo Android/iOS): se muestra UNA vez tras el
   onboarding, explica POR QUÉ antes de pedir cámara + notificaciones, y al
   aceptar lanza los prompts del sistema. En web nunca aparece. */
export default function PermissionsPriming() {
  const { primePermissions } = useApp()
  const [busy, setBusy] = useState(false)

  const allow = async () => {
    if (busy) return
    setBusy(true)
    await primePermissions()
  }

  return (
    <div id="perms" className="show">
      <div className="perms-card">
        <div className="perms-emoji">🔔</div>
        <h2 className="perms-title">UN PASO MÁS</h2>
        <p className="perms-lead">Para que la alarma funcione de verdad, Booty Alarm necesita dos permisos:</p>

        <div className="perms-row">
          <div className="perms-ic">⏰</div>
          <div className="perms-tx"><b>Notificaciones</b><span>Para que la alarma suene a su hora, aunque la app esté cerrada.</span></div>
        </div>
        <div className="perms-row">
          <div className="perms-ic">📷</div>
          <div className="perms-tx"><b>Cámara</b><span>Cuenta tus reps en tu teléfono. El video no se sube a ningún lado.</span></div>
        </div>

        <button className="perms-go" onClick={allow} disabled={busy}>{busy ? 'PERMITIENDO…' : 'PERMITIR'}</button>
      </div>
    </div>
  )
}
