import { useEffect, useMemo } from 'react'
import { useApp } from '../store'
import { songUrlById } from '../data/songs'
import { startAlarmTone } from '../lib/alarmTone'
import { isAndroid } from '../lib/androidAlarm'
import { getBrendaMessage } from '../data/brendaMessages'

export default function AlarmRing() {
  const { profile, ringAlarm, playSong, startWorkout, dismissAlarm, t, language } = useApp()

  const exercise = ringAlarm?.exercise === 'lunges' ? 'lunges' : 'squats'
  const reps = ringAlarm?.reps ?? 10
  const time = ringAlarm?.hour || profile.wakeTime
  // Solo visual: mensaje retador de Brenda (uno nuevo por cada sonada).
  const alarmMsg = useMemo(() => getBrendaMessage(language, 'alarm'), [language])

  // En Android el SERVICIO NATIVO ya reproduce la canción en loop (sonido
  // imparable), así que el JS NO arranca su propio audio (evita doble sonido).
  // En web/iOS suenan en paralelo desde el inicio el pitido Web Audio (shock
  // ~10s que se desvanece) y la canción elegida (sigue hasta completar reps).
  useEffect(() => {
    if (isAndroid()) return
    startAlarmTone()
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
      <div className="ring-brenda">{alarmMsg}</div>
      <div className="ring-msg">
        {t('alarmring.unstoppable_a')} <b style={{ color: '#fff' }}>{reps} {exercise}</b>{t('alarmring.unstoppable_b')}
      </div>
      <button className="ring-go" onClick={startCamera}>{t('alarmring.go')}</button>
      {/* Apagado de emergencia: siempre disponible para no quedar atascado sonando. */}
      <button type="button" className="ring-off" onClick={dismissAlarm}>{t('alarmring.turn_off')}</button>
      <div className="ring-note">
        {t('alarmring.note')}
      </div>
    </div>
  )
}
