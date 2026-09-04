/* Cliente de Brenda Coins. Habla con los endpoints /api/bc/* con el JWT de
   Supabase. Todo va detrás del feature flag BC_ENABLED (default OFF): mientras
   esté apagado, estas funciones no hacen NADA (no tocan el servidor), así que la
   racha de los usuarios actuales sigue 100% local como hoy. */
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { BC_ENABLED } from './features'

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_BASE || 'https://ecobrenda.vercel.app')
  : ''

async function authedPost(path, body) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null // sin sesión: no hay nube que actualizar
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  })
  if (!resp.ok) throw new Error(`bc ${path} ${resp.status}`)
  return resp.json()
}

/* Otorga los puntos de la alarma del día. Best-effort: si falla (offline, sin
   sesión), NO rompe el flujo de la alarma; se reintenta la próxima vez. Devuelve
   el estado del servidor { balance, streak, best, deadline_at, ... } o null. */
export async function awardAlarm() {
  if (!BC_ENABLED || !supabase) return null
  try {
    return await authedPost('/api/bc/alarm-complete', {})
  } catch (e) {
    console.warn('[bc] awardAlarm', e?.message || e)
    return null
  }
}

/* Intenta un giro de ruleta para la fuente ('alarm' | 'challenge'). El servidor
   decide el premio y el cupo (máx 1/día por fuente). Devuelve { ok, prize, ... }
   solo cuando el giro procede; null si no hay giro (ya giró, no elegible, error,
   flag OFF). Best-effort: nunca rompe el flujo de completar. */
export async function spin(source) {
  if (!BC_ENABLED || !supabase) return null
  try {
    const r = await authedPost('/api/bc/spin', { source })
    return r?.ok ? r : null
  } catch (e) {
    console.warn('[bc] spin', e?.message || e)
    return null
  }
}
