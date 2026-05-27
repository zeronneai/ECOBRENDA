/* Capa de alarma NATIVA (Android/iOS) con @capacitor/local-notifications.

   Alcance de este primer paso (acordado): notificación nativa con sonido que
   suena a su hora aunque la app esté CERRADA; al tocarla, abre la app y dispara
   el flujo AlarmRing -> cámara con el ejercicio/reps/canción de esa alarma.

   NO incluye (se afina después): Foreground Service, full-screen intent sobre
   lockscreen, AlarmManager.setAlarmClock exacto. Por eso el disparo puede ser
   aproximado (±minutos) en algunos Android y la notificación no hace loop
   infinito: el loop fuerte vive in-app (Web Audio + canción) al abrir.

   En WEB esto es no-op: todo va detrás de Capacitor.isNativePlatform(), así que
   el flujo web/Vercel no cambia. */

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const isNativeApp = () => Capacitor.isNativePlatform()

const CHANNEL_ID = 'alarm'

// Capacitor: weekday 1=Domingo … 7=Sábado. App: dow Lun=0 … Dom=6.
const WEEKDAY_BY_DOW = [2, 3, 4, 5, 6, 7, 1]

// id entero estable por (alarma, día) para poder cancelar y reagendar.
function notifId(alarmId, dow) {
  let h = 0
  const s = String(alarmId)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h * 10 + dow + 1
}

let channelReady = false
async function ensureChannel() {
  if (channelReady || !isNativeApp()) return
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Alarma',
      description: 'Booty Alarm — Despertar Activo',
      importance: 5,           // IMPORTANCE_HIGH (sonido + asoma)
      visibility: 1,           // pública en lockscreen
      sound: 'alarm',          // res/raw/alarm.wav (local, sin Cloudinary)
      vibration: true,
    })
    channelReady = true
  } catch { /* noop */ }
}

export async function requestNotificationPermission() {
  if (!isNativeApp()) return false
  try { return (await LocalNotifications.requestPermissions()).display === 'granted' }
  catch { return false }
}

// Cancela TODO lo pendiente y reagenda una notificación semanal por (alarma×día).
export async function rescheduleNativeAlarms(alarms = []) {
  if (!isNativeApp()) return
  await ensureChannel()
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications?.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
    }
  } catch { /* noop */ }

  const list = []
  for (const a of alarms) {
    if (!a.active) continue
    const [hh, mm] = String(a.hour).split(':').map(Number)
    const exLabel = a.exercise === 'lunges' ? 'lunges' : 'squats'
    const days = a.days && a.days.length ? a.days : [0, 1, 2, 3, 4]
    for (const dow of days) {
      list.push({
        id: notifId(a.id, dow),
        title: '🍑 Booty Alarm',
        body: `Hora de tus ${a.reps} ${exLabel}. No se apaga hasta que completes tus reps.`,
        channelId: CHANNEL_ID,
        schedule: { on: { weekday: WEEKDAY_BY_DOW[dow], hour: hh, minute: mm }, allowWhileIdle: true },
        extra: { alarmId: a.id },
      })
    }
  }
  if (list.length) {
    try { await LocalNotifications.schedule({ notifications: list }) }
    catch (e) { console.warn('[nativeAlarm] schedule falló', e) }
  }
}

// Registra el tap de la notificación -> cb(alarmId). Devuelve una función para
// quitar el listener. En web no hace nada.
export async function onAlarmTapped(cb) {
  if (!isNativeApp()) return () => {}
  const sub = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const id = action?.notification?.extra?.alarmId
    if (id != null) cb(id)
  })
  return () => { try { sub.remove() } catch { /* noop */ } }
}
