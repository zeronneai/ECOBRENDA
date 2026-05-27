import { useEffect } from 'react'
import { useApp } from '../store'
import { songUrlById } from '../data/songs'

export default function AlarmRing() {
  const { profile, ringAlarm, playSong, startWorkout } = useApp()

  const exercise = ringAlarm?.exercise === 'lunges' ? 'lunges' : 'squats'
  const reps = ringAlarm?.reps ?? 10
  const time = ringAlarm?.hour || profile.wakeTime

  // Al abrirse la pantalla de alarma, suena la canción ELEGIDA (songId) desde el
  // inicio en loop. Si la alarma no tiene songId, cae a la de por defecto.
  useEffect(() => {
    playSong(songUrlById(ringAlarm?.songId))
  }, [playSong, ringAlarm])

  // Misma ruta que los retos rápidos hacia la cámara (la canción ya suena).
  const startCamera = () => {
    startWorkout({ source: 'alarm', exercise, reps })
  }

  return (
    <div id="ringScreen" className="show">
      <div className="ring-lbl">⏰ Booty Alarm</div>
      <div className="ring-time" id="ringTime">{time}</div>
      <div className="pulse">🍑</div>
      <div className="ring-msg">
        No se apaga hasta que completes <b style={{ color: '#fff' }}>{reps} {exercise}</b>. La cámara los cuenta.
      </div>
      <button className="ring-go" onClick={startCamera}>A DARLE 💪</button>
      <div className="ring-note">
        En iOS la app debe estar abierta · en Android suena en segundo plano
      </div>
    </div>
  )
}
