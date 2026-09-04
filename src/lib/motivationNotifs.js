/* Notificaciones motivacionales LOCALES (sin servidor) con @capacitor/local-
   notifications. Banco fijo de frases (data/motivation.js). Tres momentos
   configurables (comida, entrenamiento, racha), máx 2/día, solo de día.

   SEPARADO de la alarma para NO interferir: canal 'motivation' (≠ 'alarm') e IDs
   en un rango propio (≥ MOTIV_ID_BASE, muy por encima de los IDs de la alarma).
   Cancelar/reprogramar estas notificaciones nunca toca las de la alarma, y en
   Android el usuario puede silenciar el canal 'motivation' sin perder la alarma. */
import { LocalNotifications } from '@capacitor/local-notifications'
import { isNativeApp } from './nativeAlarm'
import { nextMotivAny } from '../data/motivation'
import { translate } from '../i18n'

const CHANNEL_ID = 'motivation'
const MOTIV_ID_BASE = 1500000     // muy por encima del rango de la alarma (~1M)
const MOTIV_ID_MAX = 1600000
const DAYS_AHEAD = 7
const DAY_START = 8               // nunca de madrugada: solo 8:00–21:59
const DAY_END = 22
const MAX_PER_DAY = 2

let channelReady = false
async function ensureChannel() {
  if (channelReady) return
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Motivación',
      description: 'Recordatorios y frases motivacionales',
      importance: 3,          // default (no intrusivo como la alarma)
      visibility: 1,
    })
    channelReady = true
  } catch { /* iOS no usa canales */ }
}

const parseHM = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return { h: Number.isFinite(h) ? h : -1, m: Number.isFinite(m) ? m : 0 }
}
const inDayWindow = (hhmm) => { const { h } = parseHM(hhmm); return h >= DAY_START && h < DAY_END }

function dateAt(dayOffset, hhmm) {
  const { h, m } = parseHM(hhmm)
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}

/* Reprograma TODAS las notificaciones motivacionales. Cancela solo las propias
   (rango de IDs) y agenda los momentos activos para los próximos DAYS_AHEAD días,
   cada uno con una frase rotada. streakActive: si hay racha viva ahora mismo. */
export async function rescheduleMotivational(settings = {}, streakActive = false, lang = 'es') {
  if (!isNativeApp()) return
  try {
    // 1) Cancela SOLO las motivacionales (por rango de ID) — nunca la alarma.
    const pending = await LocalNotifications.getPending()
    const mine = (pending.notifications || [])
      .filter((n) => n.id >= MOTIV_ID_BASE && n.id < MOTIV_ID_MAX)
      .map((n) => ({ id: n.id }))
    if (mine.length) await LocalNotifications.cancel({ notifications: mine })

    // 2) Master apagado → no agenda nada.
    if (!settings.motivEnabled) return

    // 3) Momentos activos (con prioridad para el tope de 2/día).
    const moments = []
    if (settings.notifStreak && streakActive) moments.push({ key: 'streak', time: settings.notifStreakTime, prio: 3 })
    if (settings.notifWorkout) moments.push({ key: 'workout', time: settings.notifWorkoutTime, prio: 2 })
    if (settings.notifMeal) moments.push({ key: 'meal', time: settings.notifMealTime, prio: 1 })
    const chosen = moments
      .filter((m) => inDayWindow(m.time))   // nunca de madrugada
      .sort((a, b) => b.prio - a.prio)
      .slice(0, MAX_PER_DAY)                 // máx 2/día
    if (!chosen.length) return

    await ensureChannel()

    // 4) Agenda cada momento para los próximos días con una frase rotada.
    const list = []
    let idOff = 0
    for (let day = 0; day < DAYS_AHEAD; day++) {
      for (const m of chosen) {
        const when = dateAt(day, m.time)
        if (when.getTime() <= Date.now() + 60000) continue // no agendes en el pasado
        const title = translate(lang, 'notif.' + m.key + '_title')
        const body = m.key === 'streak' ? translate(lang, 'notif.streak_body') : nextMotivAny(lang)
        list.push({
          id: MOTIV_ID_BASE + (idOff++),
          channelId: CHANNEL_ID,
          title,
          body,
          schedule: { at: when, allowWhileIdle: false },
        })
      }
    }
    if (list.length) await LocalNotifications.schedule({ notifications: list })
  } catch (e) {
    console.warn('[motivationNotifs] reschedule', e?.message || e)
  }
}
