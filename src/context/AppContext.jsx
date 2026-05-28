import { createContext, useContext, useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { getBrendaPlan } from '../data/plans'
import { ACHIEVEMENTS } from '../data/achievements'
import { goalLabel } from '../data/onboarding'
import * as dataStore from '../lib/dataStore'
import { unlockAlarmAudio, isAlarmAudioReady, stopAlarmTone } from '../lib/alarmTone'
import { isNativeApp, rescheduleNativeAlarms, onAlarmTapped } from '../lib/nativeAlarm'
import { primeNativePermissions } from '../lib/nativePerms'
import { isAndroid, scheduleAndroidAlarms, stopAndroidAlarm, consumePendingAndroidAlarm, ensureExactAlarmAllowed, onNativeAlarm } from '../lib/androidAlarm'
import { onAuthChange, getSession, signOut as authSignOut } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import * as cloudSync from '../lib/cloudSync'

const AppCtx = createContext(null)

// 'HH:MM' (24h) -> '6:30 AM' para el chip de recap.
function fmt12(hhmm) {
  if (!hhmm) return ''
  const [H, M] = String(hhmm).split(':').map(Number)
  const ap = H >= 12 ? 'PM' : 'AM'
  let h = H % 12
  if (h === 0) h = 12
  return `${h}:${String(M || 0).padStart(2, '0')} ${ap}`
}

const DEFAULT_PROFILE = {
  name: '',
  goal: 'tonificar',
  weight: 62,
  height: 165,
  exercise: 'squats',
  wakeTime: '06:30',
}

export function AppProvider({ children }) {
  // ── Estado persistente (respaldado por dataStore; mañana Supabase) ──
  const [profile, setProfileState] = useState(() => ({ ...DEFAULT_PROFILE, ...(dataStore.getProfile() || {}) }))
  const [subscription, setSubscriptionState] = useState(() => dataStore.getSubscription())
  const [streak, setStreak] = useState(() => dataStore.getStreak())
  const [challengesDone, setChallengesDone] = useState(() => dataStore.getChallengeCount())
  const [totals, setTotals] = useState(() => dataStore.getTotals())
  const [workoutLog, setWorkoutLogState] = useState(() => dataStore.getWorkoutLog())
  const [progressLog, setProgressLogState] = useState(() => dataStore.getProgressLog())
  const [settings, setSettingsState] = useState(() => dataStore.getSettings())
  const [achievementQueue, setAchievementQueue] = useState([]) // ids de logros por celebrar
  const [alarms, setAlarmsState] = useState(() => dataStore.getAlarms())
  const [weekChart, setWeekChart] = useState(() => dataStore.getWeekChartData())
  // Onboarding solo si el perfil aún no está marcado onboarded.
  const [onboarding, setOnboarding] = useState(() => !dataStore.getProfile()?.onboarded)

  // ── Auth / nube (Supabase) ──
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured) // ¿ya sabemos si hay sesión?
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState('login')

  const unlocked = subscription.status === 'active' // gate premium

  // ── Estado efímero de UI ──
  const [sheet, setSheet] = useState(null)          // 'paywall' | 'alarmSheet' | 'mealsSheet' | null
  const [ringOpen, setRingOpen] = useState(false)
  const [scanning, setScanning] = useState(false)   // escaneo de cámara a pantalla completa
  const [celebrating, setCelebrating] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('anual')
  // Sesión de cámara activa: { source:'alarm'|'challenge', exercise, reps, level? }
  const [workout, setWorkout] = useState(null)
  const [ringAlarm, setRingAlarm] = useState(null)     // alarma que se está probando/sonando
  const [editingAlarm, setEditingAlarm] = useState(null) // alarma en edición (null = nueva)

  const appRef = useRef(null)      // contenedor .app — para el confeti imperativo
  const toastTimer = useRef(null)
  const audioRef = useRef(null)            // <audio> único (alarma o reto), vive en AppShell
  const gestureRef = useRef(null)          // handler de reintento ante autoplay bloqueado
  const audioUnlockedRef = useRef(false)   // ¿ya se "bendijo" el audio con un gesto?

  const plan = useMemo(() => getBrendaPlan(profile), [profile])

  // ── Acciones de datos ──
  const updateProfile = useCallback((patch) => {
    const saved = dataStore.saveProfile(patch) // persiste y devuelve el perfil completo (con createdAt)
    setProfileState({ ...DEFAULT_PROFILE, ...saved })
  }, [])

  // Activa premium (hoy local; mañana lo hará el webhook de Stripe en Supabase).
  const unlock = useCallback(() => {
    setSubscriptionState(dataStore.setSubscription({ status: 'active', plan: selectedPlan }))
    cloudSync.pushSubscriptionNow() // sube el premium a la nube (demo; con Stripe lo hará el server)
  }, [selectedPlan])

  // Detecta el momento EXACTO en que se cruza el umbral de un logro.
  // 1ª vez (announced===null): siembra los ya desbloqueados SIN celebrar
  // (evita aluvión a usuarios existentes). Después: encola solo los nuevos.
  const syncAchievements = useCallback(() => {
    const s = dataStore.getStreak()
    const w = dataStore.getTotals().workouts
    const unlocked = ACHIEVEMENTS.filter((a) => a.check(s, w)).map((a) => a.id)
    const announced = dataStore.getAnnouncedAchievements()
    if (announced === null) {
      dataStore.setAnnouncedAchievements(unlocked)
      return
    }
    const newly = unlocked.filter((id) => !announced.includes(id))
    if (newly.length) {
      dataStore.setAnnouncedAchievements([...announced, ...newly])
      setAchievementQueue((q) => [...q, ...newly])
    }
  }, [])
  const dismissAchievement = useCallback(() => setAchievementQueue((q) => q.slice(1)), [])

  // Completar el ejercicio de la alarma → racha de despertar (persistente).
  const completeWakeWorkout = useCallback(() => {
    dataStore.completeWakeWorkout()
    setStreak(dataStore.getStreak())
    syncAchievements()
  }, [syncAchievements])

  // Reto rápido completado → su contador propio (no toca la racha).
  const incrementChallenge = useCallback(() => {
    setChallengesDone(dataStore.incrementChallenge())
  }, [])

  // Rep válida → suma a totales reales (persistente). Sin re-render por frame.
  const recordRep = useCallback((exercise) => {
    dataStore.recordRep(exercise)
  }, [])

  // Registra una sesión terminada en el log y refresca totales + gráfica + log.
  const logWorkout = useCallback((entry) => {
    dataStore.logWorkout(entry)
    setTotals({ ...dataStore.getTotals() })
    setWeekChart(dataStore.getWeekChartData())
    setWorkoutLogState([...dataStore.getWorkoutLog()])
    syncAchievements()
  }, [syncAchievements])

  // ── Progreso (peso) ──
  const addProgressEntry = useCallback((entry) => {
    dataStore.addProgressEntry(entry)
    setProgressLogState([...dataStore.getProgressLog()])
  }, [])
  const deleteProgressEntry = useCallback((id) => {
    dataStore.deleteProgressEntry(id)
    setProgressLogState([...dataStore.getProgressLog()])
  }, [])

  // ── Ajustes ──
  const saveSettings = useCallback((patch) => {
    setSettingsState({ ...dataStore.saveSettings(patch) })
  }, [])

  // Reiniciar progreso (no toca perfil ni suscripción).
  const resetProgress = useCallback(() => {
    dataStore.resetProgress()
    setWorkoutLogState([...dataStore.getWorkoutLog()])
    setProgressLogState([...dataStore.getProgressLog()])
    setWeekChart(dataStore.getWeekChartData())
  }, [])

  // ── Alarmas ──
  const refreshAlarms = useCallback(() => setAlarmsState([...dataStore.getAlarms()]), [])
  const addAlarm = useCallback((a) => { dataStore.addAlarm(a); refreshAlarms() }, [refreshAlarms])
  const updateAlarm = useCallback((id, patch) => { dataStore.updateAlarm(id, patch); refreshAlarms() }, [refreshAlarms])
  const deleteAlarm = useCallback((id) => { dataStore.deleteAlarm(id); refreshAlarms() }, [refreshAlarms])
  const toggleAlarm = useCallback((id) => { dataStore.toggleAlarm(id); refreshAlarms() }, [refreshAlarms])

  // Al cerrar el onboarding, siembra la 1ª alarma desde el perfil recién guardado.
  const finishOnboarding = useCallback(() => {
    setOnboarding(false)
    refreshAlarms()
  }, [refreshAlarms])

  // ── UI ──
  const openSheet = useCallback((id) => setSheet(id), [])
  const closeSheet = useCallback(() => setSheet(null), [])
  // Abre la sheet de alarma para editar `alarm` (o null = alarma nueva).
  const openAlarmEditor = useCallback((alarm = null) => {
    setEditingAlarm(alarm)
    setSheet('alarmSheet')
  }, [])
  // Muestra el ring; `alarm` define el ejercicio/reps/hora que se prueban.
  const showRing = useCallback((alarm = null) => {
    setRingAlarm(alarm)
    setRingOpen(true)
  }, [])
  const hideRing = useCallback(() => setRingOpen(false), [])
  const startScan = useCallback(() => setScanning(true), [])
  const stopScan = useCallback(() => setScanning(false), [])
  const showCelebration = useCallback(() => setCelebrating(true), [])
  const hideCelebration = useCallback(() => setCelebrating(false), [])

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400)
  }, [])

  // Confeti — mismo comportamiento que el prototipo (Web Animations API).
  const confetti = useCallback((count = 40) => {
    const app = appRef.current
    if (!app) return
    const cols = ['#ff1f6b', '#d8ff3e', '#f5c451', '#fff']
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div')
      c.className = 'cf'
      c.style.background = cols[i % 4]
      c.style.left = Math.random() * 100 + '%'
      c.style.top = '-10px'
      app.appendChild(c)
      const dx = (Math.random() - 0.5) * 200
      const dy = window.innerHeight + 40
      const rot = Math.random() * 720
      c.animate(
        [
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: 1400 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.4,1)' }
      ).onfinish = () => c.remove()
    }
  }, [])

  // ===== Audio (alarma y retos comparten el mismo <audio>) =====
  const disarmAudioFallback = useCallback(() => {
    const h = gestureRef.current
    if (!h) return
    window.removeEventListener('pointerdown', h)
    window.removeEventListener('touchstart', h)
    gestureRef.current = null
  }, [])

  const armAudioFallback = useCallback(() => {
    if (gestureRef.current) return
    const h = () => {
      const el = audioRef.current
      if (el) el.play().catch(() => {})
      disarmAudioFallback()
    }
    gestureRef.current = h
    window.addEventListener('pointerdown', h, { once: true })
    window.addEventListener('touchstart', h, { once: true })
  }, [disarmAudioFallback])

  // Arranca una canción desde el inicio, en loop, a volumen máximo.
  const playSong = useCallback((src) => {
    const el = audioRef.current
    if (!el) return
    if (src && el.src !== src) el.src = src
    el.currentTime = 0
    el.volume = 1.0
    el.loop = true
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => armAudioFallback())
  }, [armAudioFallback])

  // Único modo de detenerla: completar las reps (cámara). Detiene canción +
  // pitido in-app + el servicio de alarma nativo (Android).
  const stopSong = useCallback(() => {
    disarmAudioFallback()
    stopAlarmTone()
    stopAndroidAlarm()
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
  }, [disarmAudioFallback])

  // Desbloqueo de audio: en el PRIMER gesto del usuario (cualquier toque) hace
  // un play/pause SILENCIOSO del mismo <audio> que usará la alarma, para
  // "bendecirlo" y que el play() del scheduler (sin gesto) suene SOLO después.
  // Actúa una sola vez; nunca toca una reproducción real (guard audioUnlockedRef).
  const unlockAudio = useCallback(() => {
    const el = audioRef.current
    if (!el || audioUnlockedRef.current) return
    try {
      const prevVol = el.volume
      el.muted = true
      const p = el.play()
      const done = () => {
        try { el.pause(); el.currentTime = 0 } catch { /* noop */ }
        el.muted = false
        el.volume = prevVol
        audioUnlockedRef.current = true
      }
      if (p && typeof p.then === 'function') p.then(done).catch(() => { el.muted = false })
      else done()
    } catch { el.muted = false }
  }, [])

  // Ruta ÚNICA hacia la cámara real. La usan igual la alarma y los retos.
  const startWorkout = useCallback((cfg) => {
    setWorkout({ source: cfg.source, exercise: cfg.exercise, reps: cfg.reps, level: cfg.level })
    if (cfg.song) playSong(cfg.song)   // reto: arranca su canción; alarma: ya suena desde el ring
    setRingOpen(false)                 // cierra el ring si venía de la alarma
    setScanning(true)                  // abre CameraScan
  }, [playSong])

  // Al montar: siembra el baseline (no celebra logros ya ganados).
  useEffect(() => {
    syncAchievements()
  }, [syncAchievements])

  // ── Scheduler de alarma "app abierta" ──
  // Mientras la app está abierta, compara el reloj contra la hora OBJETIVO de
  // cada alarma activa (hora + día). Dispara si "ahora" ya alcanzó la hora y
  // está dentro de una ventana de tolerancia (~90 s), para no perderse aunque
  // el chequeo caiga unos segundos / un minuto tarde. Marca lastTriggered para
  // no repetir el mismo día.
  //
  // LÍMITE conocido: esta es la capa "app abierta". Con la pantalla bloqueada o
  // la pestaña en segundo plano los timers del navegador se ralentizan/pausan y
  // puede perderse la ventana; y el audio NO suena solo por el autoplay (suena
  // al primer toque). La fiabilidad TOTAL (pantalla bloqueada, app cerrada y
  // sonido automático) requiere la capa NATIVA con Capacitor.
  const schedRef = useRef({})
  schedRef.current = { alarms, ringOpen, scanning, celebrating, onboarding }
  useEffect(() => {
    const TOLERANCE_MS = 90 * 1000
    const tick = () => {
      const st = schedRef.current
      if (st.ringOpen || st.scanning || st.celebrating || st.onboarding) return // no interrumpir
      const now = new Date()
      const dow = (now.getDay() + 6) % 7 // Lun=0 … Dom=6
      const today = dataStore.todayKey()
      const due = st.alarms.find((a) => {
        if (!a.active || a.lastTriggered === today || !(a.days || []).includes(dow)) return false
        const [hh, mm] = String(a.hour).split(':').map(Number)
        const target = new Date(now)
        target.setHours(hh, mm, 0, 0)
        const diff = now.getTime() - target.getTime() // ms desde la hora objetivo
        return diff >= 0 && diff <= TOLERANCE_MS // ya llegó la hora y dentro de la ventana
      })
      if (due) {
        updateAlarm(due.id, { lastTriggered: today }) // una sola vez hoy (persistente)
        showRing(due) // AlarmRing con su canción → cámara con su ejercicio/reps
      }
    }
    tick() // chequeo inmediato al abrir la app
    const iv = setInterval(tick, 1000) // cada 1s (como la app vieja): dispara sin retraso perceptible
    return () => clearInterval(iv)
  }, [updateAlarm, showRing])

  // ── ALARMA NATIVA (Capacitor) ────────────────────────────────────────────
  // Punto de entrada ÚNICO para disparar una alarma por id (lo usa el tap de la
  // notificación nativa; el scheduler in-app usa showRing directo). Marca
  // lastTriggered para que el scheduler no la repita dentro de la ventana.
  const triggerAlarmById = useCallback((id) => {
    const a = (schedRef.current.alarms || []).find((x) => String(x.id) === String(id))
    if (!a) return
    const today = dataStore.todayKey()
    if (a.lastTriggered !== today) updateAlarm(a.id, { lastTriggered: today })
    showRing(a)
  }, [updateAlarm, showRing])

  // Reagenda al cambiar las alarmas. Android: plugin nativo (AlarmManager + FGS).
  // iOS: LocalNotifications. Web: nada.
  useEffect(() => {
    if (isAndroid()) { scheduleAndroidAlarms(alarms); return }
    if (isNativeApp()) rescheduleNativeAlarms(alarms)
  }, [alarms])

  // Disparo nativo -> dispara la alarma. Android: evento 'native-alarm' (+ cold
  // start con consumePending). iOS: tap de la notificación.
  useEffect(() => {
    if (isAndroid()) {
      const off = onNativeAlarm((id) => triggerAlarmById(id))
      consumePendingAndroidAlarm().then((id) => { if (id) triggerAlarmById(id) })
      return off
    }
    if (!isNativeApp()) return
    let off = () => {}
    onAlarmTapped((id) => triggerAlarmById(id)).then((fn) => { off = fn })
    return () => off()
  }, [triggerAlarmById])

  // Permisos nativos: pedir UNA vez (cámara + notificaciones) tras el onboarding.
  const needsPriming = isNativeApp() && !onboarding && profile.onboarded && !settings.permsPrimed
  const primePermissions = useCallback(async () => {
    await primeNativePermissions()
    if (isAndroid()) await ensureExactAlarmAllowed() // Android 12+: permiso de alarma exacta
    setSettingsState({ ...dataStore.saveSettings({ permsPrimed: true }) })
    const al = dataStore.getAlarms()
    if (isAndroid()) scheduleAndroidAlarms(al)
    else rescheduleNativeAlarms(al)
  }, [])

  // Desbloqueo de audio en el primer gesto (cualquier toque, incl. guardar una
  // alarma). Desbloquea AMBOS para que suenen juntos al dispararse la alarma:
  //  - el AudioContext del pitido Web Audio (unlockAlarmAudio)
  //  - el elemento <audio> de la canción elegida (unlockAudio, play/pause mudo)
  // Se desmonta cuando los dos están listos. NO afecta al ring (es solo audio).
  useEffect(() => {
    const onGesture = () => {
      unlockAudio()
      unlockAlarmAudio()
      if (audioUnlockedRef.current && isAlarmAudioReady()) {
        window.removeEventListener('pointerdown', onGesture)
        window.removeEventListener('touchstart', onGesture)
      }
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('touchstart', onGesture)
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('touchstart', onGesture)
    }
  }, [unlockAudio])

  // ── Auth / sincronización con la nube ──────────────────────────────────────
  // Relee TODAS las secciones del dataStore al estado de React (tras un pull).
  const rehydrate = useCallback(() => {
    setProfileState({ ...DEFAULT_PROFILE, ...(dataStore.getProfile() || {}) })
    setSubscriptionState(dataStore.getSubscription())
    setStreak(dataStore.getStreak())
    setChallengesDone(dataStore.getChallengeCount())
    setTotals({ ...dataStore.getTotals() })
    setWorkoutLogState([...dataStore.getWorkoutLog()])
    setProgressLogState([...dataStore.getProgressLog()])
    setSettingsState({ ...dataStore.getSettings() })
    setAlarmsState([...dataStore.getAlarms()])
    setWeekChart(dataStore.getWeekChartData())
    setOnboarding(!dataStore.getProfile()?.onboarded)
    // Tras un pull: marca como YA anunciados los logros que correspondan al
    // progreso de la nube, para NO celebrar logros ganados en otro dispositivo.
    const unlocked = ACHIEVEMENTS.filter((a) => a.check(dataStore.getStreak(), dataStore.getTotals().workouts)).map((a) => a.id)
    const announced = dataStore.getAnnouncedAchievements() || []
    dataStore.setAnnouncedAchievements(Array.from(new Set([...announced, ...unlocked])))
  }, [])

  // Sesión: al montar comprueba si hay sesión guardada (resume -> pull). Escucha
  // cambios de auth. Rehidrata cuando la nube baja datos. Solo si está configurado.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const offHy = cloudSync.onHydrated(() => rehydrate())
    getSession().then((s) => {
      setSession(s)
      setAuthChecked(true)
      if (s) cloudSync.setUser(s, 'resume')
    })
    const unsub = onAuthChange((s) => {
      setSession(s)
      if (!s) cloudSync.clearUser()
    })
    return () => { offHy(); unsub() }
  }, [rehydrate])

  // Llamado por las pantallas de Auth al registrarse/iniciar sesión.
  const handleAuthed = useCallback(async (s, mode) => {
    setSession(s)
    setAuthOpen(false)
    await cloudSync.setUser(s, mode) // signup -> sube local; login -> baja nube
    rehydrate()
  }, [rehydrate])

  const openAuth = useCallback((view = 'login') => { setAuthView(view); setAuthOpen(true) }, [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const signOutAccount = useCallback(async () => {
    await authSignOut()
    cloudSync.clearUser()
    setSession(null)
  }, [])

  // Cuenta OBLIGATORIA (Opción B): con Supabase configurado, tras el onboarding y
  // sin sesión, hay que crear cuenta para entrar. Sin Supabase (dev) -> se omite.
  const needsAccount = isSupabaseConfigured && authChecked && !session && !!profile.onboarded
  const accountRecap = useMemo(() => {
    const g = goalLabel(profile.goal)
    const t = fmt12(profile.wakeTime)
    return `Hola, ${profile.name || ''}${g ? ' · ' + g : ''}${t ? ' · ' + t : ''}`
  }, [profile.name, profile.goal, profile.wakeTime])

  const value = {
    profile, updateProfile,
    subscription, unlocked, unlock,
    onboarding, finishOnboarding,
    streak, completeWakeWorkout,
    challengesDone, incrementChallenge,
    totals, recordRep, logWorkout, workoutLog,
    progressLog, addProgressEntry, deleteProgressEntry,
    settings, saveSettings, resetProgress,
    needsPriming, primePermissions,
    cloudEnabled: isSupabaseConfigured,
    session, authOpen, authView, openAuth, closeAuth, handleAuthed, signOutAccount,
    needsAccount, accountRecap,
    achievementQueue, dismissAchievement,
    weekChart,
    alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm,
    plan,
    sheet, openSheet, closeSheet,
    editingAlarm, openAlarmEditor,
    ringOpen, ringAlarm, showRing, hideRing,
    scanning, startScan, stopScan, startWorkout,
    celebrating, showCelebration, hideCelebration,
    toastMsg, showToast,
    selectedPlan, setSelectedPlan,
    confetti, appRef,
    audioRef, playSong, stopSong, unlockAudio,
    workout, setWorkout,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
