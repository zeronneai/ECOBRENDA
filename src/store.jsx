import { createContext, useContext, useState, useMemo, useRef, useCallback } from 'react'
import { getBrendaPlan } from './data/plans'
import * as storage from './lib/storage'

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
  const [profile, setProfileState] = useState(DEFAULT_PROFILE)
  const [unlocked, setUnlocked] = useState(false)
  const [onboarding, setOnboarding] = useState(true)
  // Racha real desde storage (fecha actual, expira sola, 0 para usuario nuevo).
  const [streak, setStreak] = useState(() => storage.getCurrentStreak())
  const [sheet, setSheet] = useState(null)          // 'paywall' | 'alarmSheet' | 'mealsSheet' | null
  const [ringOpen, setRingOpen] = useState(false)
  const [scanning, setScanning] = useState(false)   // escaneo de cámara a pantalla completa
  const [celebrating, setCelebrating] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('anual')
  // Sesión de cámara activa: { source:'alarm'|'challenge', exercise, reps, level? }
  const [workout, setWorkout] = useState(null)
  // Contador de retos rápidos desde storage (aparte de la racha).
  const [challengesDone, setChallengesDone] = useState(() => storage.getChallengesDone())

  const appRef = useRef(null)      // contenedor .app — para el confeti imperativo
  const toastTimer = useRef(null)
  const audioRef = useRef(null)            // <audio> único (alarma o reto), vive en AppShell
  const gestureRef = useRef(null)          // handler de reintento ante autoplay bloqueado

  const plan = useMemo(() => getBrendaPlan(profile), [profile])

  const updateProfile = useCallback((patch) => {
    setProfileState((p) => ({ ...p, ...patch }))
  }, [])

  const openSheet = useCallback((id) => setSheet(id), [])
  const closeSheet = useCallback(() => setSheet(null), [])
  const showRing = useCallback(() => setRingOpen(true), [])
  const hideRing = useCallback(() => setRingOpen(false), [])
  const startScan = useCallback(() => setScanning(true), [])
  const stopScan = useCallback(() => setScanning(false), [])
  const showCelebration = useCallback(() => setCelebrating(true), [])
  const hideCelebration = useCallback(() => setCelebrating(false), [])
  const unlock = useCallback(() => setUnlocked(true), [])
  const finishOnboarding = useCallback(() => setOnboarding(false), [])

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

  // Único modo de detenerla: completar las reps (Fase 5: cámara).
  const stopSong = useCallback(() => {
    disarmAudioFallback()
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
  }, [disarmAudioFallback])

  // Ruta ÚNICA hacia la cámara real. La usan exactamente igual la alarma
  // (AlarmRing → "A DARLE") y los retos rápidos del Home.
  const startWorkout = useCallback((cfg) => {
    setWorkout({ source: cfg.source, exercise: cfg.exercise, reps: cfg.reps, level: cfg.level })
    if (cfg.song) playSong(cfg.song)   // reto: arranca su canción; alarma: ya suena desde el ring
    setRingOpen(false)                 // cierra el ring si venía de la alarma
    setScanning(true)                  // abre CameraScan
  }, [playSong])

  const value = {
    profile, updateProfile,
    unlocked, unlock,
    onboarding, finishOnboarding,
    streak, setStreak,
    plan,
    sheet, openSheet, closeSheet,
    ringOpen, showRing, hideRing,
    scanning, startScan, stopScan, startWorkout,
    celebrating, showCelebration, hideCelebration,
    toastMsg, showToast,
    selectedPlan, setSelectedPlan,
    confetti, appRef,
    audioRef, playSong, stopSong,
    workout, setWorkout,
    challengesDone, setChallengesDone,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
