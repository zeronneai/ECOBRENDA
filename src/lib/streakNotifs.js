/* Aviso local "vas a perder tu racha" antes de que se rompa. El corte lo calcula
   el SERVIDOR (deadline_at = última alarma + 48h); aquí solo programamos un
   recordatorio local 3h antes, nunca de madrugada.

   SEPARADO de la alarma y de las motivacionales para no interferir: ID propio
   (STREAK_WARN_ID, muy por encima de los rangos de alarma ~1M y motivación
   1.5–1.6M). Reusa el canal 'motivation' (recordatorio suave, no intrusivo). */
import { LocalNotifications } from '@capacitor/local-notifications'
import { isNativeApp } from './nativeAlarm'
import { translate } from '../i18n'

const CHANNEL_ID = 'motivation'
const STREAK_WARN_ID = 1700000
const DAY_START = 8   // nunca de madrugada
const DAY_END = 22

// Reprograma el aviso a partir del deadline (ISO) del servidor. Cancela el previo.
export async function scheduleStreakBreakWarning(deadlineISO, lang = 'es') {
  if (!isNativeApp()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: STREAK_WARN_ID }] })
    if (!deadlineISO) return
    const deadline = new Date(deadlineISO)
    if (Number.isNaN(deadline.getTime())) return

    // 3h antes del corte; si cae de madrugada/noche, se mueve a horario diurno.
    const warn = new Date(deadline.getTime() - 3 * 3600 * 1000)
    const h = warn.getHours()
    if (h < DAY_START) warn.setHours(DAY_START, 0, 0, 0)
    else if (h >= DAY_END) warn.setHours(DAY_END - 1, 0, 0, 0)
    if (warn.getTime() <= Date.now() + 60000) return // ya pasó o demasiado cerca

    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID, name: 'Motivación',
        description: 'Recordatorios y frases motivacionales', importance: 3, visibility: 1,
      })
    } catch { /* iOS no usa canales */ }

    await LocalNotifications.schedule({ notifications: [{
      id: STREAK_WARN_ID,
      channelId: CHANNEL_ID,
      title: translate(lang, 'notif.streak_warn_title'),
      body: translate(lang, 'notif.streak_warn_body'),
      schedule: { at: warn, allowWhileIdle: true },
    }] })
  } catch (e) {
    console.warn('[streakNotifs] schedule', e?.message || e)
  }
}
