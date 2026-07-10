import { useApp } from '../store'
import { formatDays } from '../data/onboarding'
import GlowButton from '../components/ui/GlowButton'

/* Pantalla /alarm — LISTA de alarmas. La configuración (hora/ejercicio/reps/
   días/canción + preview de audio) vive en AlarmSheet y NO se toca aquí:
   este rediseño es solo visual sobre la lista. Toda la funcionalidad
   (toggle, abrir editor, nueva alarma) se conserva igual. */
export default function Alarm() {
  const { alarms, toggleAlarm, openAlarmEditor } = useApp()

  return (
    <section className="screen active" id="s-alarm">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1">
          <div>
            <div className="hi">Movimiento</div>
            <div className="name destello-title">ALARMAS</div>
          </div>
        </div>

        <div className="al-list">
          {alarms.map((a, i) => {
            const ex = a.exercise === 'lunges' ? 'lunges' : 'squats'
            return (
              <div
                className={'al-card reveal d' + Math.min(i + 2, 5) + (a.active ? ' on' : '')}
                key={a.id}
                onClick={() => openAlarmEditor(a)}
              >
                <div className="al-time">{a.hour}</div>
                <div className="al-meta">
                  <div className="t">{i === 0 ? 'Despertar activo' : 'Alarma'}</div>
                  <div className="d">{a.reps} {ex} · {formatDays(a.days)}</div>
                </div>
                <div
                  className={'toggle' + (a.active ? ' on' : '')}
                  onClick={(e) => { e.stopPropagation(); toggleAlarm(a.id) }}
                >
                  <div className="knob" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="al-new reveal d4">
          <GlowButton fullWidth onClick={() => openAlarmEditor(null)}>＋ Nueva alarma</GlowButton>
        </div>
      </div>
    </section>
  )
}
