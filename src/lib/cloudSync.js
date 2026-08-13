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
    allergies: Array.isArray(p.allergies) ? p.allergies : null,
    diet_pref: p.dietPref ?? null,
    dislikes: dislikesToArray(p.dislikes),
    ai_consent_at: p.aiConsent?.date ?? null,
    avatar_url: p.avatarUrl ?? null,
    language: p.language ?? null,
  }
}

// dislikes se captura como texto libre pero la columna es text[]: normaliza a
// array (split por comas, sin vacíos). '' / null -> null. Un array pasa igual.
function dislikesToArray(v) {
  if (Array.isArray(v)) return v.length ? v : null
  if (typeof v === 'string') {
    const arr = v.split(',').map((s) => s.trim()).filter(Boolean)
    return arr.length ? arr : null
  }
  return null
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
    allergies: r.allergies ?? [],
    dietPref: r.diet_pref ?? null,
    dislikes: Array.isArray(r.dislikes) ? r.dislikes.join(', ') : (r.dislikes ?? ''),
    // Consentimiento de IA: reconstruye el flag desde la columna (sobrevive
    // reinstalación si inició sesión).
    ...(r.ai_consent_at ? { aiConsent: { accepted: true, date: r.ai_consent_at } } : {}),
    avatarUrl: r.avatar_url ?? null,
    ...(r.language ? { language: r.language } : {}),
    onboarded: true, // si ya tiene perfil en la nube, ya hizo onboarding
    ...(r.created_at ? { createdAt: r.created_at } : {}),
  })
}

async function pullProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
  if (!error && data) applyProfileRow(data)
}
async function pushProfile() {
  const { error } = await supabase.from('profiles').upsert(profileRowFromLocal(dataStore.getProfile()), { onConflict: 'id' })
  if (error) throw error
}

// ── Mapeo SETTINGS ──────────────────────────────────────────────────────────
// Los toggles van en `notifications` (jsonb). permsPrimed NO se sincroniza: es
// del dispositivo (si otorgaste permisos nativos EN ESTE teléfono).
async function pullSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', currentUser.id).maybeSingle()
  if (!error && data && data.notifications && typeof data.notifications === 'object') {
    dataStore.saveSettings(data.notifications)
  }
}
async function pushSettings() {
  const s = dataStore.getSettings()
  const notifications = {
    sound: s.sound, reminder: s.reminder, reminderTime: s.reminderTime,
    streakAlerts: s.streakAlerts, weeklyReport: s.weeklyReport,
  }
  const { error } = await supabase.from('settings').upsert(
    { user_id: currentUser.id, units: dataStore.getProfile()?.weightUnit ?? null, notifications },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

// ── Mapeo SUBSCRIPTION (gate premium — la NUBE manda) ───────────────────────
// El estado premium se LEE de la nube (pull). El cliente NO lo empuja en el sync
// normal (evita que alguien se ponga premium solo). Solo se sube explícitamente
// vía pushSubscriptionNow() (unlock demo) y al sembrar en el registro.
// Con Stripe: el webhook (service_role) escribe esta tabla; se endurece el RLS
// para que el cliente solo pueda SELECT, y se quita el push del cliente.
async function pullSubscription() {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', currentUser.id).maybeSingle()
  if (!error && data) {
    dataStore.setSubscription({
      status: data.status || 'inactive',
      plan: data.plan ?? null,
      currentPeriodEnd: data.current_period_end ?? null,
      accesoAlarma: data.acceso_alarma === true,
      accesoPremium: data.acceso_premium === true,
    })
  }
}
// (pushSubscription se eliminó al integrar Stripe: el cliente solo LEE la
// suscripción; el webhook con service_role la escribe.)

// Re-jala SOLO la fila de suscripción. Lo llama el AppContext al volver del
// pago (deep link o foreground) para reflejar el cambio del webhook.
export async function refreshSubscription() {
  if (!isCloudOn()) return
  applyingRemote = true
  try { await pullSubscription() } finally { applyingRemote = false }
  notifyHydrated()
}

// ── Mapeo TOTALS (reps reales + retos) ──────────────────────────────────────
async function pullTotals() {
  const { data, error } = await supabase.from('totals').select('*').eq('user_id', currentUser.id).maybeSingle()
  if (!error && data) {
    const squat = data.squat || 0
    const lunge = data.lunge || 0
    dataStore.setTotals({ squat, lunge, workouts: data.workouts || 0, reps: squat + lunge })
    dataStore.setChallengeCount(data.challenges_completed || 0)
  }
}
async function pushTotals() {
  const t = dataStore.getTotals()
  const { error } = await supabase.from('totals').upsert(
    {
      user_id: currentUser.id,
      squat: t.squat || 0,
      lunge: t.lunge || 0,
      workouts: t.workouts || 0,
      challenges_completed: dataStore.getChallengeCount() || 0,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

// ── Mapeo WAKE_STREAKS (racha de despertar) ─────────────────────────────────
async function pullStreak() {
  const { data, error } = await supabase.from('wake_streaks').select('*').eq('user_id', currentUser.id).maybeSingle()
  if (!error && data) {
    dataStore.setWakeStreak({ current: data.current || 0, best: data.best || 0, lastCompleted: data.last_completed || '' })
  }
}
async function pushStreak() {
  const ws = dataStore.getWakeStreak()
  const { error } = await supabase.from('wake_streaks').upsert(
    { user_id: currentUser.id, current: ws.current || 0, best: ws.best || 0, last_completed: ws.lastCompleted || null },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

// ── Colecciones que crecen: WORKOUT_LOGS y PROGRESS_LOGS ────────────────────
// Estrategia "reemplazar las filas del usuario": borro sus filas y reinserto el
// set local. Para no reinsertar en cada cambio, salto si la firma no cambió.
// Nota: workout_logs reaprovecha columnas existentes (workout_id=source,
// title=exercise, calories=reps) para no requerir cambios de esquema.
const lastSig = { workout_logs: null, progress_logs: null, alarms: null }

function workoutRows() {
  return dataStore.getWorkoutLog().map((w) => ({
    user_id: currentUser.id,
    workout_id: w.source ?? null,
    title: w.exercise ?? null,
    calories: typeof w.reps === 'number' ? w.reps : null,
    date: w.date ?? null,
    completed_at: w.ts ? new Date(w.ts).toISOString() : new Date().toISOString(),
  }))
}
function progressRows() {
  return dataStore.getProgressLog().map((p) => ({
    user_id: currentUser.id,
    date: p.date ?? null,
    weight: typeof p.weight === 'number' ? p.weight : (p.weight != null ? Number(p.weight) : null),
    notes: p.note ?? p.notes ?? null,
  }))
}

async function replaceCollection(table, rows) {
  const sig = JSON.stringify(rows)
  if (sig === lastSig[table]) return // sin cambios -> no reinsertar
  // GUARDA ANTI-PÉRDIDA: nunca borres TODO en la nube por un push VACÍO. Un local
  // vacío casi siempre es transitorio (transición de sesión, pull parcial, glitch),
  // no una eliminación real de todos los datos. Preferimos conservar la nube. El
  // borrado de un ítem individual SÍ propaga: rows llega con los N restantes (>0).
  if (rows.length === 0) {
    console.warn(`[cloudSync] push vacío a ${table} omitido (protección anti-borrado)`)
    return
  }
  const del = await supabase.from(table).delete().eq('user_id', currentUser.id)
  if (del.error) throw del.error
  const { error } = await supabase.from(table).insert(rows)
  if (error) throw error
  lastSig[table] = sig
}
async function pushWorkoutLogs() { await replaceCollection('workout_logs', workoutRows()) }
async function pushProgressLogs() { await replaceCollection('progress_logs', progressRows()) }

async function pullWorkoutLogs() {
  const { data, error } = await supabase.from('workout_logs').select('*').eq('user_id', currentUser.id).order('completed_at', { ascending: false })
  if (!error && Array.isArray(data)) {
    dataStore.setWorkoutLog(data.map((r) => ({
      id: r.id,
      source: r.workout_id || 'alarm',
      exercise: r.title || 'squat',
      reps: r.calories ?? 0,
      date: r.date,
      ts: r.completed_at ? new Date(r.completed_at).getTime() : Date.now(),
    })))
    lastSig.workout_logs = JSON.stringify(workoutRows()) // evita re-push inmediato
  }
}
async function pullProgressLogs() {
  const { data, error } = await supabase.from('progress_logs').select('*').eq('user_id', currentUser.id).order('date', { ascending: false })
  if (!error && Array.isArray(data)) {
    dataStore.setProgressLog(data.map((r) => ({
      id: r.id,
      date: r.date,
      weight: r.weight,
      note: r.notes || undefined,
      ts: r.date ? new Date(r.date + 'T12:00:00').getTime() : Date.now(),
    })))
    lastSig.progress_logs = JSON.stringify(progressRows())
  }
}

// ── Mapeo ALARMAS ───────────────────────────────────────────────────────────
// La lista de alarmas del usuario sigue al login (mismo usuario = mismas alarmas
// en cualquier dispositivo). Se preserva el `id` local (UUID) como PK para
// identidad estable entre dispositivos. `last_triggered` NO se sincroniza: es
// per-dispositivo (así la alarma suena en el equipo activo, no se suprime porque
// sonó en otro). Local-first + last-write-wins, igual que workout/progress logs.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function alarmRows() {
  return (dataStore.getAlarms() || []).map((a) => ({
    // id UUID válido → se preserva; si es un id legacy no-UUID, se omite y la BD
    // genera uno (se "actualiza" en el próximo pull). Evita romper el insert.
    ...(UUID_RE.test(String(a.id)) ? { id: a.id } : {}),
    user_id: currentUser.id,
    hour: a.hour ?? null,
    exercise: a.exercise ?? null,
    reps: typeof a.reps === 'number' ? a.reps : (a.reps != null ? Number(a.reps) : null),
    days: Array.isArray(a.days) ? a.days : [],
    active: a.active !== false,
    song_id: a.songId ?? null,
    // last_triggered: NO se sincroniza (per-dispositivo)
  }))
}
function rowToAlarm(r, localById) {
  return {
    id: r.id,
    hour: r.hour,
    exercise: r.exercise === 'lunges' ? 'lunges' : 'squats',
    reps: r.reps ?? 10,
    days: Array.isArray(r.days) ? r.days : [],
    active: r.active !== false,
    songId: r.song_id ?? undefined,
    // last_triggered per-dispositivo: conserva el local si esa alarma ya existía aquí.
    lastTriggered: localById.get(r.id)?.lastTriggered,
  }
}
async function pushAlarms() { await replaceCollection('alarms', alarmRows()) }
async function pullAlarms() {
  const { data, error } = await supabase.from('alarms').select('*').eq('user_id', currentUser.id)
  if (error || !Array.isArray(data)) return
  if (data.length === 0) {
    // La nube aún NO tiene alarmas (primer sync): NO borres las locales — súbelas.
    if ((dataStore.getAlarms() || []).length > 0) { try { await pushAlarms() } catch { /* noop */ } }
    return
  }
  const localById = new Map((dataStore.getAlarms() || []).map((a) => [a.id, a]))
  dataStore.setAlarms(data.map((r) => rowToAlarm(r, localById)))
  lastSig.alarms = JSON.stringify(alarmRows()) // evita re-push inmediato
}

// (Antes existía pushSubscriptionNow() para el demo unlock. Con Stripe en su
// lugar y RLS endurecido, el cliente NO escribe subscriptions; el webhook con
// service_role es el único que actualiza el premium.)

async function pullAll() {
  if (!isCloudOn()) return
  applyingRemote = true
  try {
    // El PREMIUM primero: corrige el gate cuanto antes e hidrata de inmediato,
    // para que quien ya pagó (p. ej. en otro dispositivo) NO vea "bloqueado" ni
    // un instante mientras baja el resto de los datos.
    await pullSubscription()
    notifyHydrated()
    await pullProfile()
    await pullSettings()
    await pullTotals()
    await pullStreak()
    await pullWorkoutLogs()
    await pullProgressLogs()
    await pullAlarms()
  } catch (e) {
    console.warn('[cloudSync] pull falló', e)
  } finally {
    applyingRemote = false
  }
  notifyHydrated()
}

// Push de cambios normales: NO incluye subscription (la nube/Stripe manda).
async function pushChanges() {
  if (!isCloudOn()) return
  await pushProfile()
  await pushSettings()
  await pushTotals()
  await pushStreak()
  await pushWorkoutLogs()
  await pushProgressLogs()
  await pushAlarms()
}

// Push de "siembra" al registrarse: sube todo lo que el cliente PUEDE escribir.
// subscriptions NO va aquí (la crea el webhook de Stripe).
async function pushSeed() {
  if (!isCloudOn()) return
  await pushProfile()
  await pushSettings()
  await pushTotals()
  await pushStreak()
  await pushWorkoutLogs()
  await pushProgressLogs()
  await pushAlarms()
}

// Auto-seed (defensa en profundidad): si al usuario le falta la fila en alguna
// de estas tablas, la crea con sus valores default (solo user_id; las columnas
// default del esquema rellenan el resto). Evita romper para usuarios futuros o
// si agregamos tablas. No pisa filas existentes (insert solo si no hay).
// subscriptions queda FUERA: con Stripe el RLS solo permite SELECT al cliente;
// la fila la crea el webhook (service_role) al primer checkout.
const SEED_TABLES = ['settings', 'totals', 'wake_streaks']
async function ensureSeed() {
  if (!isCloudOn()) return
  for (const table of SEED_TABLES) {
    try {
      const { data } = await supabase.from(table).select('user_id').eq('user_id', currentUser.id).maybeSingle()
      if (!data) await supabase.from(table).insert({ user_id: currentUser.id })
    } catch { /* noop */ }
  }
}

// ── Sesión / disparadores ───────────────────────────────────────────────────
// mode: 'signup' (sube local), 'login' o 'resume' (baja nube). En resume, si hay
// cambios locales sin sincronizar (dirty), primero empuja y luego baja.
export async function setUser(session, mode = 'resume') {
  currentUser = session?.user || null
  if (!isCloudOn()) return
  try {
    if (mode === 'signup') {
      await pushSeed(); clearDirty()
    } else {
      if (mode === 'resume' && isDirty()) { try { await pushChanges(); clearDirty() } catch { /* noop */ } }
      await pullAll()
    }
    await ensureSeed() // crea filas default que falten (subs/settings/totals/streaks)
  } catch (e) {
    console.warn('[cloudSync] setUser', e)
  }
}

export function clearUser() { currentUser = null }

async function flush() {
  if (!isCloudOn()) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { markDirty(); return }
  try { await pushChanges(); clearDirty() } catch { markDirty() }
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
