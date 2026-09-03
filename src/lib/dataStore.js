// dataStore.js — Capa de datos central de la app.
//
// API única de datos cuyo ESQUEMA coincide con las tablas que tendrá Supabase
// (profile, subscription, wakeStreak, workoutLog, progressLog, challengeCount,
// totals, settings). Hoy persiste en localStorage (namespace 'bf:'); mañana el
// mismo API se respalda en Supabase sin tocar pantallas.
//
// - Lectura tolerante a corrupción (try/catch + default).
// - Esquema versionado con migración (incluye import best-effort del 'bac:' viejo).
// - Una sola racha de despertar (wakeStreak) + registro de entrenamientos
//   (workoutLog) como campos SEPARADOS del mismo store (no dos sistemas).

import { GOALS } from '../data/plans.js'

const NS = 'bf:'
const KEY = NS + 'state'
const SCHEMA_VERSION = 1
const LEGACY_KEY = 'bac:state' // store anterior (cámara) — se importa una vez

// Días de descanso tolerados sin romper la racha de despertar.
const STREAK_REST_DAYS = 1
// Factor de actividad para TDEE (actividad moderada).
const ACTIVITY_FACTOR = 1.5

const DEFAULT_STATE = {
  version: SCHEMA_VERSION,
  // { name, age, gender, weight, height, goal, level, daysPerWeek, wakeTime,
  //   exercise, reps, allergies:[], dietPref, dislikes, createdAt,
  //   aiConsent:{ accepted:true, date:ISO }, avatarUrl, language:'es'|'en' }
  profile: null,
  subscription: { status: 'inactive', plan: null, currentPeriodEnd: null, accesoAlarma: false, accesoPremium: false, trialEnd: null, unlimitedPlans: false },
  wakeStreak: { current: 0, best: 0, lastCompleted: '' }, // racha de la alarma diaria
  workoutLog: [],   // [{ id, ts, date, source:'alarm'|'challenge', exercise:'squat'|'lunge', reps }]
  progressLog: [],  // [{ id, ts, date, weight, note }]
  challengeCount: 0,
  totals: { squat: 0, lunge: 0, reps: 0, workouts: 0 }, // reps REALES por ejercicio
  // [{ id, hour:'HH:MM', exercise:'squats'|'lunges', reps, days:[0-6], active, songId }]
  alarms: [],
  // Logros ya anunciados (null = aún sin inicializar/seed).
  announcedAchievements: null,
  settings: { sound: true, reminder: true, reminderTime: '20:00', streakAlerts: true, weeklyReport: false, permsPrimed: false },
  // Ejercicios de la rutina IA marcados como hechos (checklist, solo local).
  //   completions: { [planKey]: { [dayIdx]: { [exIdx]: true } } }
  //   loggedDays:   { [planKey]: { [dayIdx]: true } }  (guard anti-doble-conteo)
  planProgress: { completions: {}, loggedDays: {} },
}

const DEFAULT_DAYS = [0, 1, 2, 3, 4] // Lun–Vie

// ── Fechas en local time ────────────────────────────────────────────────
function ymd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db - da) / 86400000)
}
// Lunes..Domingo (fechas 'YYYY-MM-DD') de la semana que contiene a `d`.
function weekDates(d = new Date()) {
  const dow = (d.getDay() + 6) % 7 // lunes = 0
  const monday = new Date(d)
  monday.setDate(d.getDate() - dow)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return ymd(x)
  })
}
const WEEK_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
}

// ── Lectura/escritura seguras ───────────────────────────────────────────
function safeParse(raw, fallback) {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

function migrate(s) {
  if (!s || typeof s !== 'object') return { ...DEFAULT_STATE }
  // Merge profundo de objetos anidados conocidos sobre los defaults.
  return {
    ...DEFAULT_STATE,
    ...s,
    version: SCHEMA_VERSION,
    subscription: { ...DEFAULT_STATE.subscription, ...(s.subscription || {}) },
    wakeStreak: { ...DEFAULT_STATE.wakeStreak, ...(s.wakeStreak || {}) },
    totals: { ...DEFAULT_STATE.totals, ...(s.totals || {}) },
    settings: { ...DEFAULT_STATE.settings, ...(s.settings || {}) },
    workoutLog: Array.isArray(s.workoutLog) ? s.workoutLog : [],
    progressLog: Array.isArray(s.progressLog) ? s.progressLog : [],
    alarms: Array.isArray(s.alarms) ? s.alarms : [],
    planProgress: {
      completions: (s.planProgress && s.planProgress.completions) || {},
      loggedDays: (s.planProgress && s.planProgress.loggedDays) || {},
    },
  }
}

// Import best-effort del store anterior ('bac:') para no perder racha/retos
// de las pruebas de cámara. Si no existe, arranca en defaults.
function migrateFromLegacy() {
  const old = safeParse(localStorage.getItem(LEGACY_KEY), null)
  if (!old || typeof old !== 'object') return { ...DEFAULT_STATE }
  const t = old.totals || {}
  return {
    ...DEFAULT_STATE,
    wakeStreak: {
      current: old.streak || 0,
      best: old.bestStreak || 0,
      lastCompleted: old.lastCompleted || '',
    },
    challengeCount: old.challengesDone || 0,
    totals: {
      squat: t.squat || 0,
      lunge: t.lunge || 0,
      reps: (t.squat || 0) + (t.lunge || 0),
      workouts: t.workouts || 0,
    },
  }
}

let _cache = null

// Pub/sub mínimo: se notifica tras cada save(). Lo usa cloudSync para empujar a
// la nube. NO afecta a nadie más (la API pública sigue igual y síncrona).
const _subs = new Set()
export function subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn) }

export function load() {
  if (_cache) return _cache
  const parsed = safeParse(localStorage.getItem(KEY), null)
  _cache = parsed ? migrate(parsed) : migrateFromLegacy()
  save()
  return _cache
}

export function save() {
  if (!_cache) return
  _cache.version = SCHEMA_VERSION
  try { localStorage.setItem(KEY, JSON.stringify(_cache)) }
  catch (e) { console.warn('[dataStore] no se pudo guardar:', e) }
  _subs.forEach((fn) => { try { fn() } catch { /* noop */ } })
}

// ── PERFIL ──────────────────────────────────────────────────────────────
export function getProfile() { return load().profile }
export function saveProfile(patch) {
  const s = load()
  const prev = s.profile || {}
  s.profile = { createdAt: prev.createdAt || new Date().toISOString(), ...prev, ...patch }
  save()
  return s.profile
}

// ── SUSCRIPCIÓN (gate premium) ──────────────────────────────────────────
export function getSubscription() { return load().subscription }
export function setSubscription(patch) {
  const s = load()
  s.subscription = { ...s.subscription, ...patch }
  save()
  return s.subscription
}

// ── RACHA DE DESPERTAR (alarma diaria) ──────────────────────────────────
export function getWakeStreak() { return load().wakeStreak }

// Racha actual con tolerancia de STREAK_REST_DAYS días de descanso.
// Expiración perezosa: si pasó más del tope desde la última, la racha es 0.
export function getStreak() {
  const s = load()
  const last = s.wakeStreak.lastCompleted
  if (!last) return 0
  const gap = daysBetween(last, ymd())
  if (gap < 0) return s.wakeStreak.current
  return gap <= STREAK_REST_DAYS + 1 ? s.wakeStreak.current : 0
}

// Completar el ejercicio de la alarma: actualiza SOLO la racha de despertar.
export function completeWakeWorkout() {
  const s = load()
  const today = ymd()
  const ws = s.wakeStreak
  if (ws.lastCompleted !== today) {
    const gap = ws.lastCompleted ? daysBetween(ws.lastCompleted, today) : Infinity
    if (gap <= STREAK_REST_DAYS + 1) ws.current += 1 // consecutivo o dentro de tolerancia
    else ws.current = 1 // racha rota o primer día
    ws.lastCompleted = today
    if (ws.current > ws.best) ws.best = ws.current
  }
  save()
  return { current: ws.current, best: ws.best }
}

// ── REGISTRO DE ENTRENAMIENTOS ──────────────────────────────────────────
export function getWorkoutLog() { return load().workoutLog }
// Reemplaza la lista completa (lo usa el pull de la nube).
export function setWorkoutLog(list) {
  const s = load()
  s.workoutLog = Array.isArray(list) ? list : []
  save()
  return s.workoutLog
}
export function logWorkout(entry) {
  const s = load()
  const row = { id: uid(), ts: Date.now(), date: ymd(), ...entry }
  s.workoutLog.unshift(row)
  s.totals.workouts += 1
  save()
  return row
}
export function removeWorkoutLog(id) {
  const s = load()
  s.workoutLog = s.workoutLog.filter((w) => w.id !== id)
  save()
}

// ── Completados de la rutina IA (checklist por ejercicio, solo local) ─────────
export function getPlanCompletions(planKey) {
  if (!planKey) return {}
  return load().planProgress.completions[planKey] || {}
}
// Marca/desmarca un ejercicio. Devuelve las completions del plan.
export function setExerciseDone(planKey, dayIdx, exIdx, done) {
  const s = load()
  const comp = s.planProgress.completions
  const plan = comp[planKey] || (comp[planKey] = {})
  const day = plan[dayIdx] || (plan[dayIdx] = {})
  if (done) day[exIdx] = true
  else delete day[exIdx]
  save()
  return { ...plan }
}
export function isDayLogged(planKey, dayIdx) {
  const days = load().planProgress.loggedDays[planKey]
  return !!(days && days[dayIdx])
}
// Marca un día como ya contado (guard: no se vuelve a contar nunca).
export function markDayLogged(planKey, dayIdx) {
  const s = load()
  const ld = s.planProgress.loggedDays
  const plan = ld[planKey] || (ld[planKey] = {})
  plan[dayIdx] = true
  save()
}

// Clave de fecha de hoy ('YYYY-MM-DD' local) — para checar "completado hoy".
export function todayKey() { return ymd() }

// Entrenamientos de la semana actual (número de sesiones registradas).
export function getWeeklyWorkouts() {
  const s = load()
  const week = new Set(weekDates())
  return s.workoutLog.filter((w) => week.has(w.date)).length
}

// Datos para la gráfica semanal: 7 días (L..D) con conteo y si hubo sesión.
export function getWeekChartData() {
  const s = load()
  const dates = weekDates()
  const today = ymd()
  return dates.map((date, i) => {
    const count = s.workoutLog.filter((w) => w.date === date).length
    return { key: WEEK_LABELS[i], date, count, done: count > 0, today: date === today }
  })
}

// ── PROGRESO (peso) ─────────────────────────────────────────────────────
export function getProgressLog() { return load().progressLog }
// Reemplaza la lista completa (lo usa el pull de la nube).
export function setProgressLog(list) {
  const s = load()
  s.progressLog = Array.isArray(list) ? list : []
  save()
  return s.progressLog
}
export function addProgressEntry(entry) {
  const s = load()
  const row = { id: uid(), ts: Date.now(), date: ymd(), ...entry }
  s.progressLog.unshift(row)
  save()
  return row
}
export function deleteProgressEntry(id) {
  const s = load()
  s.progressLog = s.progressLog.filter((p) => p.id !== id)
  save()
}

// ── RETOS RÁPIDOS (contador propio, NO toca la racha) ───────────────────
export function getChallengeCount() { return load().challengeCount }
export function incrementChallenge() {
  const s = load()
  s.challengeCount += 1
  save()
  return s.challengeCount
}
// Aplica un valor absoluto (lo usa el pull de la nube).
export function setChallengeCount(n) {
  const s = load()
  s.challengeCount = Number(n) || 0
  save()
  return s.challengeCount
}

// Aplica valores absolutos de la racha (pull de la nube).
export function setWakeStreak(patch) {
  const s = load()
  s.wakeStreak = { ...s.wakeStreak, ...patch }
  save()
  return s.wakeStreak
}

// ── TOTALES DE REPS REALES ──────────────────────────────────────────────
export function getTotals() { return load().totals }
// Aplica valores absolutos de totales (pull de la nube).
export function setTotals(patch) {
  const s = load()
  s.totals = { ...s.totals, ...patch }
  save()
  return s.totals
}
export function recordRep(exercise) {
  const s = load()
  if (exercise === 'squat' || exercise === 'lunge') s.totals[exercise] += 1
  s.totals.reps += 1
  save()
}

// ── ALARMAS ─────────────────────────────────────────────────────────────
// Si no hay alarmas pero el perfil ya tiene hora de despertar (onboarding),
// crea la primera alarma a partir del perfil.
function ensureSeedAlarm(s) {
  if (s.alarms.length === 0 && s.profile?.wakeTime) {
    s.alarms.push({
      id: uid(),
      hour: s.profile.wakeTime,
      exercise: s.profile.exercise === 'lunges' ? 'lunges' : 'squats',
      reps: s.profile.reps || 10,
      days: DEFAULT_DAYS.slice(),
      active: true,
      songId: 'workout1',
    })
  }
}
export function getAlarms() {
  const s = load()
  ensureSeedAlarm(s)
  save()
  return s.alarms
}
// Reemplaza la lista completa de alarmas (lo usa cloudSync al bajar de la nube).
export function setAlarms(list) {
  const s = load()
  s.alarms = Array.isArray(list) ? list : []
  save()
  return s.alarms
}

// Marcador "alarma SONANDO ahora" (id de la alarma). Persiste para poder
// restaurar el popup si se recarga/reabre la web con la alarma a medias. Se
// limpia al apagarla (completar squats o botón de emergencia).
const RINGING_KEY = NS + 'ringing'
export function getRinging() { try { return localStorage.getItem(RINGING_KEY) || null } catch { return null } }
export function setRinging(id) {
  try { if (id) localStorage.setItem(RINGING_KEY, String(id)); else localStorage.removeItem(RINGING_KEY) } catch { /* noop */ }
}
export function addAlarm(alarm = {}) {
  const s = load()
  const row = {
    id: uid(),
    hour: '07:00',
    exercise: 'squats',
    reps: 10,
    days: DEFAULT_DAYS.slice(),
    active: true,
    songId: 'workout1',
    ...alarm,
  }
  s.alarms.push(row)
  save()
  return row
}
export function updateAlarm(id, patch) {
  const s = load()
  s.alarms = s.alarms.map((a) => (a.id === id ? { ...a, ...patch } : a))
  save()
  return s.alarms.find((a) => a.id === id)
}
export function deleteAlarm(id) {
  const s = load()
  s.alarms = s.alarms.filter((a) => a.id !== id)
  save()
}
export function toggleAlarm(id) {
  const s = load()
  s.alarms = s.alarms.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
  save()
  return s.alarms.find((a) => a.id === id)
}

// ── AJUSTES ─────────────────────────────────────────────────────────────
export function getSettings() { return load().settings }
export function saveSettings(patch) {
  const s = load()
  s.settings = { ...s.settings, ...patch }
  save()
  return s.settings
}

// ── Logros anunciados (para no repetir la celebración) ──────────────────
export function getAnnouncedAchievements() { return load().announcedAchievements }
export function setAnnouncedAchievements(ids) {
  const s = load()
  s.announcedAchievements = ids
  save()
  return s.announcedAchievements
}

// ── Reiniciar progreso: borra SOLO el log de entrenamientos y de peso ────
export function resetProgress() {
  const s = load()
  s.workoutLog = []
  s.progressLog = []
  save()
}

// ── Empezar de nuevo: borra SOLO las claves del namespace 'bf:' ──────────
export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(NS))
    .forEach((k) => localStorage.removeItem(k))
  _cache = null
}

// ── FÓRMULA DE MACROS (Mifflin-St Jeor con género/edad) ─────────────────
export function calculateMacros({ weight, height, age = 27, gender = 'female', goal = 'tonificar' }) {
  const sexTerm = gender === 'male' ? 5 : -161
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexTerm
  const tdee = bmr * ACTIVITY_FACTOR
  const g = GOALS[goal] || GOALS.tonificar
  const kcal = Math.round((tdee * (1 + g.kcalAdj)) / 10) * 10
  const protein = Math.round(weight * g.protein)
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.round((kcal - (protein * 4 + fat * 9)) / 4)
  const water = Math.round(weight * 0.04 * 10) / 10
  return { kcal, protein, carbs, fat, water }
}
