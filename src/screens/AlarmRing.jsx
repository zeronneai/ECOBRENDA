import { useEffect } from 'react'
import { useApp } from '../store'

export default function AlarmRing() {
  const { profile, hideRing, openSheet, playAlarm } = useApp()

  // Al abrirse la pantalla de alarma, suena la canción desde el inicio en loop.
  useEffect(() => {
    playAlarm()
  }, [playAlarm])

  const startCamera = () => {
    hideRing()
    openSheet('cameraSheet')
  }

  return (
    <div id="ringScreen" className="show">
      <div className="ring-lbl">⏰ Booty Alarm</div>
      <div className="ring-time" id="ringTime">{profile.wakeTime}</div>
      <div className="pulse">🍑</div>
      <div className="ring-msg">
        No se apaga hasta que completes <b style={{ color: '#fff' }}>10 squats</b>. La cámara los cuenta.
      </div>
      <button className="ring-go" onClick={startCamera}>A DARLE 💪</button>
      <div className="ring-note">
        En iOS la app debe estar abierta · en Android suena en segundo plano
      </div>
    </div>
  )
}
