import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { formatDays } from '../data/onboarding'
import GlowButton from '../components/ui/GlowButton'

/* Pantalla /alarm — LISTA de alarmas.
   Modelo de 4 productos: sin ACCESO_ALARMA la lista se muestra GRIS, con el
   switch apagado y NO togglable. Tocar la alarma o el candado abre el paywall
   (web/Android → Stripe; iOS → card neutra "Contenido exclusivo", sin pagos).
   Crear la alarma en el onboarding sigue permitido; el bloqueo es sobre
   activarla/sonar. */
export default function Alarm() {
  const { alarms, toggleAlarm, openAlarmEditor, openSheet, t } = useApp()
  const { accesoAlarma } = useSubscription()

  // Sin acceso: cualquier tap sobre una alarma → paywall (nunca activa la alarma).
  const gate = () => openSheet('paywall')

  return (
    <section className="screen active" id="s-alarm">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1">
          <div>
            <div className="hi">{t('alarm.hi')}</div>
            <div className="name destello-title">{t('alarm.header')}</div>
          </div>
        </div>

        <div className="al-list">
          {alarms.map((a, i) => {
            const ex = a.exercise === 'lunges' ? 'lunges' : 'squats'
            const on = accesoAlarma && a.active
            return (
              <div
                className={'al-card reveal d' + Math.min(i + 2, 5) + (on ? ' on' : '') + (accesoAlarma ? '' : ' locked')}
                key={a.id}
                onClick={() => (accesoAlarma ? openAlarmEditor(a) : gate())}
              >
                <div className="al-time">{a.hour}</div>
                <div className="al-meta">
                  <div className="t">{i === 0 ? t('alarm.wake') : t('alarm.alarm')}</div>
                  <div className="d">{a.reps} {ex} · {formatDays(a.days, t)}</div>
                </div>
                {accesoAlarma ? (
                  <div
                    className={'toggle' + (a.active ? ' on' : '')}
                    onClick={(e) => { e.stopPropagation(); toggleAlarm(a.id) }}
                  >
                    <div className="knob" />
                  </div>
                ) : (
                  <div className="al-lock" onClick={(e) => { e.stopPropagation(); gate() }} aria-label={t('premium.locked_title')}>🔒</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="al-new reveal d4">
          <GlowButton fullWidth onClick={() => openAlarmEditor(null)}>{t('alarm.new')}</GlowButton>
        </div>
      </div>
    </section>
  )
}
