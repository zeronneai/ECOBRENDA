import { useState } from 'react'
import { useApp } from '../store'

/* Priming de permisos nativos (solo Android/iOS): se muestra UNA vez tras el
   onboarding, explica POR QUÉ antes de pedir cámara + notificaciones, y al
   aceptar lanza los prompts del sistema. En web nunca aparece. */
export default function PermissionsPriming() {
  const { primePermissions, t } = useApp()
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
        <h2 className="perms-title">{t('perms.title')}</h2>
        <p className="perms-lead">{t('perms.lead')}</p>

        <div className="perms-row">
          <div className="perms-ic">⏰</div>
          <div className="perms-tx"><b>{t('perms.notif_t')}</b><span>{t('perms.notif_d')}</span></div>
        </div>
        <div className="perms-row">
          <div className="perms-ic">📷</div>
          <div className="perms-tx"><b>{t('perms.cam_t')}</b><span>{t('perms.cam_d')}</span></div>
        </div>

        <button className="perms-go" onClick={allow} disabled={busy}>{busy ? t('perms.allowing') : t('perms.allow')}</button>
      </div>
    </div>
  )
}
