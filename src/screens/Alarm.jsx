import { useState } from 'react'
import { useApp } from '../store'

export default function Alarm() {
  const { profile, openSheet } = useApp()
  const [a1, setA1] = useState(true)
  const [a2, setA2] = useState(false)

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

        <div className="alarm-card reveal d2" style={{ marginBottom: 14 }}>
          <div className="row">
            <div className="alarm-time" id="alarmTime2">{profile.wakeTime}</div>
            <div className="alarm-meta">
              <div className="t">Despertar activo</div>
              <div className="d" id="alarmDesc2">10 squats · L a V</div>
            </div>
            <div className={'toggle' + (a1 ? ' on' : '')} onClick={() => setA1((v) => !v)}>
              <div className="knob" />
            </div>
          </div>
        </div>

        <div className="alarm-card reveal d3">
          <div className="row">
            <div className="alarm-time" style={{ opacity: 0.5 }}>13:00</div>
            <div className="alarm-meta">
              <div className="t">Reto de mediodía</div>
              <div className="d">8 lunges · diario</div>
            </div>
            <div className={'toggle' + (a2 ? ' on' : '')} onClick={() => setA2((v) => !v)}>
              <div className="knob" />
            </div>
          </div>
        </div>

        <button className="cta reveal d4" onClick={() => openSheet('alarmSheet')}>
          ＋ NUEVA ALARMA
        </button>
      </div>
    </section>
  )
}
