/* Puente JS al plugin nativo Android "Alarm" (alarma imparable de verdad:
   AlarmManager exacto + Foreground Service en loop + full-screen sobre el
   lockscreen). Android usa ESTO; iOS usa LocalNotifications (nativeAlarm.js);
   en web todo es no-op. */

import { registerPlugin, Capacitor } from '@capacitor/core'
import { songUrlById } from '../data/songs'

const Alarm = registerPlugin('Alarm')

export const isAndroid = () => Capacitor.getPlatform() === 'android'

// Agenda TODAS las alarmas activas en el plugin nativo (cancela y reescribe).
export async function scheduleAndroidAlarms(alarms = []) {
  if (!isAndroid()) return
  const payload = alarms
    .filter((a) => a.active)
    .map((a) => {
      const [hh, mm] = String(a.hour).split(':').map(Number)
      return {
        id: String(a.id),
        hour: hh,
        minute: mm,
        days: a.days && a.days.length ? a.days : [0, 1, 2, 3, 4],
        exercise: a.exercise === 'lunges' ? 'lunges' : 'squats',
        reps: a.reps || 10,
        songUrl: songUrlById(a.songId), // la nativa reproduce la canción elegida (con fallback al pitido)
      }
    })
  try { await Alarm.schedule({ alarms: payload }) } catch (e) { console.warn('[androidAlarm] schedule', e) }
}

// Detiene el sonido/servicio nativo (se llama al completar las reps).
export async function stopAndroidAlarm() {
  if (!isAndroid()) return
  try { await Alarm.stop() } catch { /* noop */ }
}

// id de la alarma con la que se abrió la app desde el full-screen intent (cold start).
export async function consumePendingAndroidAlarm() {
  if (!isAndroid()) return null
  try { const r = await Alarm.consumePending(); return r?.id || null } catch { return null }
}

// Android 12+: asegura permiso de alarma exacta; si falta, abre ajustes.
export async function ensureExactAlarmAllowed() {
  if (!isAndroid()) return true
  try {
    const r = await Alarm.canScheduleExact()
    if (!r?.value) { await Alarm.openExactSettings(); return false }
    return true
  } catch { return true }
}

// Escucha el disparo nativo (warm start). Devuelve función para quitar el listener.
export function onNativeAlarm(cb) {
  const h = (e) => { const id = e?.detail?.id; if (id) cb(id) }
  window.addEventListener('native-alarm', h)
  return () => window.removeEventListener('native-alarm', h)
}
