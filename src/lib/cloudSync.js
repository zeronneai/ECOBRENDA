/* Motor de sincronización "local-first con espejo en la nube".

   - localStorage (dataStore) sigue siendo la fuente de verdad SÍNCRONA de la UI.
   - Aquí espejamos a Supabase en segundo plano:
       · login/resume  -> PULL  (nube -> local)   [la nube manda al iniciar sesión]
       · signup        -> PUSH  (local -> nube)    [lo local sube al registrarse]
       · cada cambio   -> PUSH debounced            [se guarda en la nube solito]
   - Offline: si no hay red o falla el push, se marca "dirty" y se reintenta al
     volver la conexión. La app nunca se bloquea por la nube.

   Esta sección implementa el mapeo de PROFILES. Las siguientes secciones
   (settings, alarms, etc.) solo agregan su mapeo a pull/push. */

import { supabase, isSupabaseConfigured } from './supabase'
import * as dataStore from './dataStore'

const DIRTY_KEY = 'bf:cloudDirty'

let currentUser = null
let applyingRemote = false   // true mientras aplicamos datos de la nube (evita eco)
let pushTimer = null
const hydratedSubs = new Set()

export const isCloudOn = () => isSupabaseConfigured && !!currentUser

export function onHydrated(fn) { hydratedSubs.add(fn); return () => hydratedSubs.delete(fn) }
function notifyHydrated() { hydratedSubs.forEach((fn) => { try { fn() } catch { /* noop */ } }) }

const markDirty = () => { try { localStorage.setItem(DIRTY_KEY, '1') } catch { /* noop */ } }
const clearDirty = () => { try { localStorage.removeItem(DIRTY_KEY) } catch { /* noop */ } }
const isDirty = () => { try { return localStorage.getItem(DIRTY_KEY) === '1' } catch { return false } }

// ── Mapeo PROFILES (blob local <-> fila de Supabase) ────────────────────────
function profileRowFromLocal(p) {
  return {
    id: currentUser.id,
    name: p.name ?? null,
    age: p.age ?? null,
    gender: p.gender ?? null,
    height: p.height ?? null,
    weight: p.weight ?? null,
    units: p.weightUnit ?? p.units ?? null,
    goal: p.goal ?? null,
    level: p.level ?? null,
    workout_days: p.daysPerWeek ?? null,
    wake_time: p.wakeTime ?? null,
    alarm_exercise: p.exercise ?? null,
    alarm_reps: p.reps ?? null,
  }
}
function applyProfileRow(r) {
  dataStore.saveProfile({
    name: r.name,
    age: r.age,
    gender: r.gender,
    height: r.height,
    weight: r.weight,
    weightUnit: r.units,
    goal: r.goal,
    level: r.level,
    daysPerWeek: r.workout_days,
    wakeTime: r.wake_time,
    exercise: r.alarm_exercise,
    reps: r.alarm_reps,
    onboarded: true, // si ya tiene perfil en la nube, ya hizo onboarding
    ...(r.created_at ? { createdAt: r.created_at } : {}),
  })
}

async function pullAll() {
  if (!isCloudOn()) return
  applyingRemote = true
  try {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
    if (!error && data) applyProfileRow(data)
  } catch (e) {
    console.warn('[cloudSync] pull falló', e)
  } finally {
    applyingRemote = false
  }
  notifyHydrated()
}

async function pushAll() {
  if (!isCloudOn()) return
  const p = dataStore.getProfile()
  const { error } = await supabase.from('profiles').upsert(profileRowFromLocal(p), { onConflict: 'id' })
  if (error) throw error
}

// ── Sesión / disparadores ───────────────────────────────────────────────────
// mode: 'signup' (sube local), 'login' o 'resume' (baja nube). En resume, si hay
// cambios locales sin sincronizar (dirty), primero empuja y luego baja.
export async function setUser(session, mode = 'resume') {
  currentUser = session?.user || null
  if (!isCloudOn()) return
  try {
    if (mode === 'signup') {
      await pushAll(); clearDirty()
    } else {
      if (mode === 'resume' && isDirty()) { try { await pushAll(); clearDirty() } catch { /* noop */ } }
      await pullAll()
    }
  } catch (e) {
    console.warn('[cloudSync] setUser', e)
  }
}

export function clearUser() { currentUser = null }

async function flush() {
  if (!isCloudOn()) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { markDirty(); return }
  try { await pushAll(); clearDirty() } catch { markDirty() }
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(flush, 1500)
}

// Reacciona a cambios locales (cualquier save del dataStore).
dataStore.subscribe(() => {
  if (applyingRemote || !isCloudOn()) return
  schedulePush()
})

// Al volver la conexión, vacía lo pendiente.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { if (isCloudOn() && isDirty()) flush() })
}
