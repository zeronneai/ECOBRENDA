import { useApp } from '../store'
import { formatDays } from '../data/onboarding'

export default function Alarm() {
  const { alarms, toggleAlarm, openAlarmEditor } = useApp()

  return (
    <section className="screen active" id="s-alarm">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1">
          <div>
            <div className="hi">Movimiento</div>
            <div className="name">ALARMAS</div>
          </div>
        </div>

        {alarms.map((a, i) => {
          const ex = a.exercise === 'lunges' ? 'lunges' : 'squats'
          return (
            <div className={'alarm-card reveal d' + Math.min(i + 2, 5)} key={a.id} style={{ marginBottom: 12 }}>
              <div className="row" onClick={() => openAlarmEditor(a)}>
                <div className="alarm-time" style={a.active ? undefined : { opacity: 0.5 }}>{a.hour}</div>
                <div className="alarm-meta">
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
            </div>
          )
        })}

        <button className="cta reveal d4" onClick={() => openAlarmEditor(null)}>
          ＋ NUEVA ALARMA
        </button>
      </div>
    </section>
  )
}
