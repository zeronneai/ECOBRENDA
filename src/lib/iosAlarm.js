/* Capa de alarma iOS con AlarmKit (iOS 26+). Suena a través de Silencio/Focus
   como el Reloj de Apple. Si el dispositivo NO es iOS 26 o el permiso está
   denegado, caemos al método de local-notifications (nativeAlarm.js), que ya
   funciona. Toda la lógica AlarmKit vive en el plugin nativo (AlarmKitPlugin.swift).

   Fase 3: solo el ring PRIMARIO (recurrencia semanal). El botón "HACER SQUATS"
   y la ráfaga de re-armado llegan en Fase 4. */
import { registerPlugin, Capacitor } from '@capacitor/core'
import { translate, getInitialLang } from '../i18n'
import { rescheduleNativeAlarms, cancelLocalPending } from './nativeAlarm'

const AlarmKit = registerPlugin('AlarmKit')

export const isIOSPlatform = () => Capacitor.getPlatform() === 'ios'

// ── Disponibilidad / permiso ──────────────────────────────────────────────────
let _supported = null
export async function alarmKitSupported() {
  if (!isIOSPlatform()) return false
  if (_supported != null) return _supported
  try { _supported = !!(await AlarmKit.isSupported()).supported } catch { _supported = false }
  return _supported
}

export async function alarmKitAuthorized() {
  try { return (await AlarmKit.getAuthorizationStatus()).status === 'authorized' } catch { return false }
}

// Pide el permiso de AlarmKit (solo si el device lo soporta). Devuelve el estado.
export async function requestAlarmKitAuthIfSupported() {
  if (!(await alarmKitSupported())) return 'unsupported'
  try { return (await AlarmKit.requestAuthorization()).status } catch { return 'denied' }
}

// ¿Usar AlarmKit para esta reagenda? Solo iOS 26 + autorizado.
async function useAlarmKit() {
  return (await alarmKitSupported()) && (await alarmKitAuthorized())
}

// ── Mapeo de nuestro modelo → payload del plugin (textos localizados i18n) ─────
function toPayload(alarms) {
  const lang = getInitialLang()
  return (alarms || [])
    .filter((a) => a.active)
    .map((a) => {
      const exLabel = a.exercise === 'lunges' ? 'lunges' : 'squats'
      const [hh, mm] = String(a.hour).split(':').map(Number)
      const reps = a.reps || 10
      return {
        id: String(a.id),
        hour: hh,
        minute: mm,
        days: a.days && a.days.length ? a.days : [0, 1, 2, 3, 4],
        exercise: exLabel,
        reps,
        title: translate(lang, 'notif.alarm_title', { reps, ex: exLabel }),
        stopLabel: translate(lang, 'alarm.stop'),
        squatsLabel: translate(lang, 'notif.squats_btn'),
      }
    })
}

// ── Runtime (Fase 4): botón squats + re-armado ────────────────────────────────
// Silencia el tono al abrir por "HACER SQUATS" (no corta la ráfaga).
export async function engageAlarmKit(id) {
  if (!isIOSPlatform() || id == null) return
  try { await AlarmKit.engage({ id: String(id) }) } catch { /* noop */ }
}
// Squats completados → corta la ráfaga restante.
export async function completeAlarmKit(id) {
  if (!isIOSPlatform() || id == null) return
  try { await AlarmKit.complete({ id: String(id) }) } catch { /* noop */ }
}
// Cold start: alarmId pendiente que dejó el App Intent (o null).
export async function getPendingAlarmKit() {
  if (!isIOSPlatform()) return null
  try { return (await AlarmKit.getPending()).alarmId || null } catch { return null }
}
// Evento cuando el usuario abre por "HACER SQUATS". Devuelve función para quitar el listener.
export async function onAlarmFired(cb) {
  if (!isIOSPlatform()) return () => {}
  try {
    const sub = await AlarmKit.addListener('alarmFired', (e) => { if (e?.alarmId != null) cb(e.alarmId) })
    return () => { try { sub.remove() } catch { /* noop */ } }
  } catch { return () => {} }
}

// ── Dispatcher iOS: AlarmKit o fallback (local-notifications) ─────────────────
// Cancela SIEMPRE el sistema que no se usa, para no dejar alarmas duplicadas al
// cambiar de modo (p. ej. si el permiso pasa de denegado a concedido).
export async function rescheduleAppleAlarms(alarms = []) {
  if (await useAlarmKit()) {
    try { await cancelLocalPending() } catch { /* noop */ }
    try { await AlarmKit.reschedule({ alarmsJson: JSON.stringify(toPayload(alarms)) }) }
    catch (e) { console.warn('[iosAlarm] AlarmKit.reschedule falló, cae a local', e); await rescheduleNativeAlarms(alarms) }
  } else {
    try { await AlarmKit.cancelAll() } catch { /* noop */ }
    await rescheduleNativeAlarms(alarms)
  }
}
