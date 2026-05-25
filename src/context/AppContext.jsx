import { createContext, useContext, useState, useMemo, useRef, useCallback } from 'react'
import { getBrendaPlan } from '../data/plans'
import * as dataStore from '../lib/dataStore'

const AppCtx = createContext(null)

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
  const [alarms, setAlarmsState] = useState(() => dataStore.getAlarms())
  const [weekChart, setWeekChart] = useState(() => dataStore.getWeekChartData())
  // Onboarding solo si el perfil aún no está marcado onboarded.
  const [onboarding, setOnboarding] = useState(() => !dataStore.getProfile()?.onboarded)

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

  const plan = useMemo(() => getBrendaPlan(profile), [profile])

  // ── Acciones de datos ──
  const updateProfile = useCallback((patch) => {
    setProfileState((p) => ({ ...p, ...patch }))
    dataStore.saveProfile(patch) // persiste
  }, [])

  // Activa premium (hoy local; mañana lo hará el webhook de Stripe en Supabase).
  const unlock = useCallback(() => {
    setSubscriptionState(dataStore.setSubscription({ status: 'active', plan: selectedPlan }))
  }, [selectedPlan])

  // Completar el ejercicio de la alarma → racha de despertar (persistente).
  const completeWakeWorkout = useCallback(() => {
    dataStore.completeWakeWorkout()
    setStreak(dataStore.getStreak())
  }, [])

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
  }, [])

  // ── Progreso (peso) ──
  const addProgressEntry = useCallback((entry) => {
    dataStore.addProgressEntry(entry)
    setProgressLogState([...dataStore.getProgressLog()])
  }, [])
  const deleteProgressEntry = useCallback((id) => {
    dataStore.deleteProgressEntry(id)
    setProgressLogState([...dataStore.getProgressLog()])
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

  // Único modo de detenerla: completar las reps (cámara).
  const stopSong = useCallback(() => {
    disarmAudioFallback()
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
  }, [disarmAudioFallback])

  // Ruta ÚNICA hacia la cámara real. La usan igual la alarma y los retos.
  const startWorkout = useCallback((cfg) => {
    setWorkout({ source: cfg.source, exercise: cfg.exercise, reps: cfg.reps, level: cfg.level })
    if (cfg.song) playSong(cfg.song)   // reto: arranca su canción; alarma: ya suena desde el ring
    setRingOpen(false)                 // cierra el ring si venía de la alarma
    setScanning(true)                  // abre CameraScan
  }, [playSong])

  const value = {
    profile, updateProfile,
    subscription, unlocked, unlock,
    onboarding, finishOnboarding,
    streak, completeWakeWorkout,
    challengesDone, incrementChallenge,
    totals, recordRep, logWorkout, workoutLog,
    progressLog, addProgressEntry, deleteProgressEntry,
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
    audioRef, playSong, stopSong,
    workout, setWorkout,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
