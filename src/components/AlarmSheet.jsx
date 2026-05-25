import { useState } from 'react'
import { useApp } from '../store'
import Sheet from './Sheet'

export default function AlarmSheet() {
  const { profile, updateProfile, closeSheet, showToast } = useApp()
  const [ex, setEx] = useState(null)

  const save = () => {
    if (ex) updateProfile({ exercise: ex })
    closeSheet()
    showToast('Alarma guardada ✓')
  }

  const exStyle = (name) => ({
    textAlign: 'center',
    borderColor: ex === name ? 'var(--magenta)' : undefined,
  })

  return (
    <Sheet>
      <h3>CONFIGURAR ALARMA</h3>
      <p className="lead">Define la hora y el reto que tendrás que completar para apagarla.</p>

      <div className="alarm-card" style={{ margin: '0 0 16px' }}>
        <div className="row" style={{ justifyContent: 'center' }}>
          <div className="alarm-time" style={{ fontSize: 64 }} id="sheetTime">{profile.wakeTime}</div>
        </div>
      </div>

      <div className="sec-h" style={{ margin: '6px 0 12px' }}><h2 style={{ fontSize: 18 }}>EJERCICIO</h2></div>
      <div className="brenda-live" style={{ margin: 0 }}>
        <div className="bcard" style={exStyle('squats')} onClick={() => setEx('squats')}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🍑</div><h4>SQUATS</h4>
        </div>
        <div className="bcard" style={exStyle('lunges')} onClick={() => setEx('lunges')}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🦵</div><h4>LUNGES</h4>
        </div>
      </div>

      <div className="macros" style={{ margin: '16px 0 0' }}>
        <div className="macro"><div className="v">10</div><div className="k">repeticiones</div></div>
        <div className="macro"><div className="v">L–V</div><div className="k">días</div></div>
      </div>

      <button className="cta full" style={{ marginTop: 20 }} onClick={save}>GUARDAR ALARMA</button>
    </Sheet>
  )
}
