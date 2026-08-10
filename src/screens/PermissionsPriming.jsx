import { useState, useEffect } from 'react'
import { useApp } from '../store'
import { alarmKitSupported } from '../lib/iosAlarm'

/* Priming de permisos nativos (solo Android/iOS): se muestra UNA vez tras el
   onboarding, explica POR QUÉ antes de pedir cámara + notificaciones, y al
   aceptar lanza los prompts del sistema. En iOS 26 añade la "alarma imparable"
   (AlarmKit). En web nunca aparece. */
export default function PermissionsPriming() {
  const { primePermissions, t } = useApp()
  const [busy, setBusy] = useState(false)
  const [hasAlarmKit, setHasAlarmKit] = useState(false)

  useEffect(() => { alarmKitSupported().then(setHasAlarmKit) }, [])

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
        {hasAlarmKit && (
          <div className="perms-row">
            <div className="perms-ic">⏰</div>
            <div className="perms-tx"><b>{t('perms.alarmkit_t')}</b><span>{t('perms.alarmkit_d')}</span></div>
          </div>
        )}

        <button className="perms-go" onClick={allow} disabled={busy}>{busy ? t('perms.allowing') : t('perms.allow')}</button>
      </div>
    </div>
  )
}
