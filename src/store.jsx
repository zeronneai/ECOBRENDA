import { createContext, useContext, useState, useMemo, useRef, useCallback } from 'react'
import { getBrendaPlan } from './data/plans'

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
  const [streak, setStreak] = useState(0)
  const [sheet, setSheet] = useState(null)          // 'paywall' | 'alarmSheet' | 'mealsSheet' | 'cameraSheet' | null
  const [ringOpen, setRingOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('anual')

  const appRef = useRef(null)      // contenedor .app — para el confeti imperativo
  const toastTimer = useRef(null)
  const alarmAudioRef = useRef(null)       // <audio> de la alarma (vive en AppShell)
  const alarmGestureRef = useRef(null)     // handler de reintento ante autoplay bloqueado

  const plan = useMemo(() => getBrendaPlan(profile), [profile])

  const updateProfile = useCallback((patch) => {
    setProfileState((p) => ({ ...p, ...patch }))
  }, [])

  const openSheet = useCallback((id) => setSheet(id), [])
  const closeSheet = useCallback(() => setSheet(null), [])
  const showRing = useCallback(() => setRingOpen(true), [])
  const hideRing = useCallback(() => setRingOpen(false), [])
  const unlock = useCallback(() => setUnlocked(true), [])
  const finishOnboarding = useCallback(() => setOnboarding(false), [])

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400)
  }, [])

  // Confeti — mismo comportamiento que el prototipo (Web Animations API).
  const confetti = useCallback(() => {
    const app = appRef.current
    if (!app) return
    const cols = ['#ff1f6b', '#d8ff3e', '#f5c451', '#fff']
    for (let i = 0; i < 40; i++) {
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

  // ===== Audio de la alarma =====
  const disarmAlarmFallback = useCallback(() => {
    const h = alarmGestureRef.current
    if (!h) return
    window.removeEventListener('pointerdown', h)
    window.removeEventListener('touchstart', h)
    alarmGestureRef.current = null
  }, [])

  const armAlarmFallback = useCallback(() => {
    if (alarmGestureRef.current) return
    const h = () => {
      const el = alarmAudioRef.current
      if (el) el.play().catch(() => {})
      disarmAlarmFallback()
    }
    alarmGestureRef.current = h
    window.addEventListener('pointerdown', h, { once: true })
    window.addEventListener('touchstart', h, { once: true })
  }, [disarmAlarmFallback])

  // Arranca la canción desde el inicio, en loop, a volumen máximo.
  const playAlarm = useCallback(() => {
    const el = alarmAudioRef.current
    if (!el) return
    el.currentTime = 0
    el.volume = 1.0
    el.loop = true
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => armAlarmFallback())
  }, [armAlarmFallback])

  // Único modo de detenerla: completar el reto (Fase 5: cámara).
  const stopAlarm = useCallback(() => {
    disarmAlarmFallback()
    const el = alarmAudioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
  }, [disarmAlarmFallback])

  const value = {
    profile, updateProfile,
    unlocked, unlock,
    onboarding, finishOnboarding,
    streak, setStreak,
    plan,
    sheet, openSheet, closeSheet,
    ringOpen, showRing, hideRing,
    toastMsg, showToast,
    selectedPlan, setSelectedPlan,
    confetti, appRef,
    alarmAudioRef, playAlarm, stopAlarm,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
