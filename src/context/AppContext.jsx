import { createContext, useContext, useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { getBrendaPlan } from '../data/plans'
import { ACHIEVEMENTS } from '../data/achievements'
import { songUrlById } from '../data/songs'
import * as dataStore from '../lib/dataStore'
import { unlockAlarmAudio, isAlarmAudioReady, stopAlarmTone } from '../lib/alarmTone'
import { isNativeApp, onAlarmTapped } from '../lib/nativeAlarm'
import { rescheduleAppleAlarms, requestAlarmKitAuthIfSupported, engageAlarmKit, completeAlarmKit, getPendingAlarmKit, onAlarmFired } from '../lib/iosAlarm'
import { primeNativePermissions } from '../lib/nativePerms'
import { isAndroid, scheduleAndroidAlarms, stopAndroidAlarm, consumePendingAndroidAlarm, ensureExactAlarmAllowed, onNativeAlarm } from '../lib/androidAlarm'
import { onAuthChange, getSession, signOut as authSignOut } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import * as cloudSync from '../lib/cloudSync'
import { startCheckout, openBillingPortal, closeNativeBrowser } from '../lib/stripeClient'
import { deleteAccountRequest } from '../lib/account'
import { uploadAvatarDataUrl } from '../lib/avatar'
import { translate, getInitialLang, LANG_KEY } from '../i18n'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

const AppCtx = createContext(null)

// iOS: política de autoplay distinta a Android/web — el truco "muted play+pause"
// sobre el <audio> principal NO funciona (iOS no respeta muted y el pause de
// microtask no cancela). Por eso desbloqueamos con un <audio> descartable que
// reproduce un WAV silencioso (data URL inline) y se descarta, sin tocar el
// principal. Esto evita el leak de 1ms y el "atorado" en EDITAR ALARMA.
const isIOS = () => { try { return Capacitor.getPlatform() === 'ios' } catch { return false } }
const SILENT_WAV_DATA_URL = (() => {
  if (typeof btoa !== 'function') return ''
  // 46-byte WAV: PCM mono 8kHz/8-bit, 2 samples de silencio (0x80 = center).
  const bytes = [
    0x52,0x49,0x46,0x46, 0x26,0x00,0x00,0x00, 0x57,0x41,0x56,0x45,
    0x66,0x6d,0x74,0x20, 0x10,0x00,0x00,0x00, 0x01,0x00, 0x01,0x00,
    0x40,0x1f,0x00,0x00, 0x40,0x1f,0x00,0x00, 0x01,0x00, 0x08,0x00,
    0x64,0x61,0x74,0x61, 0x02,0x00,0x00,0x00, 0x80,0x80,
  ]
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(s)
})()

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
  trainLocation: null, // 'gym' | 'home' — null = existente sin responder (→ gym)
  equipment: '',       // texto libre: equipo disponible en casa
}

export function AppProvider({ children }) {
  // ── i18n: idioma actual + traductor ──
  const [language, setLanguageState] = useState(() => getInitialLang())
  const t = useCallback((key, vars) => translate(language, key, vars), [language])

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

  const unlocked = subscription.accesoPremium === true // gate premium (nutrición+entrena)

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
  const realPlayIdRef = useRef(0)          // contador de plays "reales" (playSong); el unlock async no debe pisar uno nuevo

  const plan = useMemo(() => getBrendaPlan(profile), [profile])

  // ── Acciones de datos ──
  const updateProfile = useCallback((patch) => {
    const saved = dataStore.saveProfile(patch) // persiste y devuelve el perfil completo (con createdAt)
    setProfileState({ ...DEFAULT_PROFILE, ...saved })
  }, [])

  // Cambia el idioma: estado + localStorage (render instantáneo) + perfil (espejo
  // a Supabase para que siga a la cuenta).
  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* noop */ }
    updateProfile({ language: lang })
  }, [updateProfile])

  // Reconcilia el idioma cuando el perfil llega de la nube (login en otro equipo).
  useEffect(() => {
    const pl = profile?.language
    if (pl && pl !== language) {
      setLanguageState(pl)
      try { localStorage.setItem(LANG_KEY, pl) } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.language])

  // Activa premium (hoy local; mañana lo hará el webhook de Stripe en Supabase).
  // Demo local: solo activa premium en localStorage (sin tocar la nube).
  // Con Stripe configurado, la UI llamará al checkout y el webhook (service_role)
  // será el ÚNICO que escriba public.subscriptions. Útil aún en modo offline (sin
  // Supabase) y para pruebas locales rápidas.
  const unlock = useCallback(() => {
    setSubscriptionState(dataStore.setSubscription({ status: 'active', plan: selectedPlan, accesoAlarma: true, accesoPremium: true }))
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
    // AlarmKit (iOS 26): squats completados → corta la ráfaga de re-armado de esta
    // alarma y rearma la PRÓXIMA ocurrencia. (La ráfaga NO se corta al abrir/tocar
    // el botón, solo AQUÍ, al completar reps.)
    const aid = activeAlarmIdRef.current
    alarmSessionActiveRef.current = false
    clearTimeout(sessionTimerRef.current)
    if (aid != null) {
      completeAlarmKit(aid)
      activeAlarmIdRef.current = null
      if (isIOS()) rescheduleAppleAlarms(schedRef.current.alarms || []) // arma la siguiente ocurrencia
    }
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

  // ── Rutina IA: marcar ejercicios hechos (checklist) ──
  const getPlanCompletions = useCallback((planKey) => dataStore.getPlanCompletions(planKey), [])
  // Marca/desmarca un ejercicio; si el día queda 100% y no estaba contado,
  // registra 1 workout (cuenta para totals/Progreso/logros) una sola vez.
  const toggleExerciseDone = useCallback((planKey, dayIdx, exIdx, done, exCount, focus) => {
    const dayComp = dataStore.setExerciseDone(planKey, dayIdx, exIdx, done)
    const doneCount = Object.keys(dayComp[dayIdx] || {}).length
    if (doneCount >= exCount && exCount > 0 && !dataStore.isDayLogged(planKey, dayIdx)) {
      dataStore.markDayLogged(planKey, dayIdx)
      logWorkout({ source: 'plan', title: focus || 'Rutina', exercise: 'plan', reps: 0 })
    }
    return dayComp
  }, [logWorkout])

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
    // Persistir "sonando" para restaurar el popup si se recarga la web con la
    // alarma a medias (evita quedar con la canción sonando sin poder apagarla).
    if (alarm?.id) { try { dataStore.setRinging(alarm.id) } catch { /* noop */ } }
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
  // Marca un "play real" (realPlayIdRef++) para que el unlock async en curso NO
  // lo sabotee con un pause() tardío. Y fuerza muted=false / volume=1 ANTES de
  // cambiar src y de play(), por si el unlock dejó el elemento muteado.
  const playSong = useCallback((src) => {
    const el = audioRef.current
    if (!el) return
    realPlayIdRef.current += 1
    el.muted = false
    el.volume = 1.0
    if (src && el.src !== src) el.src = src
    el.currentTime = 0
    el.loop = true
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => armAudioFallback())
  }, [armAudioFallback])

  // Único modo de detenerla: completar las reps (cámara). Detiene canción +
  // pitido in-app + el servicio de alarma nativo (Android). En iOS además llama
  // a el.load() — el pause() puede no surtir efecto si el media element está en
  // un estado raro tras un cambio de src/promesa async; load() lo resetea duro.
  const stopSong = useCallback(() => {
    try { dataStore.setRinging(null) } catch { /* noop */ } // apagada → ya no está "sonando"
    disarmAudioFallback()
    stopAlarmTone()
    stopAndroidAlarm()
    const el = audioRef.current
    if (!el) return
    try { el.pause() } catch { /* noop */ }
    try { el.currentTime = 0 } catch { /* noop */ }
    try { el.load() } catch { /* noop */ } // C: fuerza reset (clave en iOS)
  }, [disarmAudioFallback])

  // Desbloqueo de audio: en el PRIMER gesto del usuario (cualquier toque) hace
  // un play/pause SILENCIOSO para "bendecir" la política de autoplay.
  //
  // iOS: NO toca el <audio> principal (WebKit no respeta muted y el pause
  // asincrónico no cancela -> deja el principal "atorado" reproduciendo). En
  // su lugar reproduce un <audio> DESCARTABLE con un WAV silencioso (data URL).
  // Esto bendice la política sin afectar al principal -> sin leak ni atorado.
  //
  // Android/web: mantiene el truco original sobre el principal (sí funciona ahí).
  // Si entre el play silencioso del unlock y su pause llega un playSong real,
  // el done/catch NO pausa ni cambia muted — solo marca desbloqueado.
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return

    if (isIOS()) {
      try {
        if (!SILENT_WAV_DATA_URL) { audioUnlockedRef.current = true; return }
        const a = new Audio(SILENT_WAV_DATA_URL)
        a.muted = true; a.volume = 0
        const cleanup = () => { try { a.pause() } catch { /* noop */ } try { a.src = '' } catch { /* noop */ } audioUnlockedRef.current = true }
        const p = a.play()
        if (p && typeof p.then === 'function') p.then(cleanup).catch(cleanup)
        else cleanup()
      } catch { audioUnlockedRef.current = true }
      return
    }

    const el = audioRef.current
    if (!el) return
    const startId = realPlayIdRef.current
    const realPlayCameIn = () => realPlayIdRef.current !== startId
    try {
      const prevVol = el.volume
      el.muted = true
      const p = el.play()
      const done = () => {
        if (realPlayCameIn()) { audioUnlockedRef.current = true; return }
        try { el.pause(); el.currentTime = 0 } catch { /* noop */ }
        el.muted = false
        el.volume = prevVol
        audioUnlockedRef.current = true
      }
      if (p && typeof p.then === 'function') {
        p.then(done).catch(() => { if (!realPlayCameIn()) el.muted = false })
      } else { done() }
    } catch { if (!realPlayCameIn()) el.muted = false }
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
  schedRef.current = { alarms, ringOpen, scanning, celebrating, onboarding, accesoAlarma: subscription.accesoAlarma === true }
  const activeAlarmIdRef = useRef(null) // AlarmKit: id de la alarma que suena (para complete)
  const lastSchedSigRef = useRef('')    // firma de scheduling (evita reagendar por lastTriggered)
  const didInitSchedRef = useRef(false) // ¿ya corrió la reagenda de arranque?
  const alarmSessionActiveRef = useRef(false) // ¿hay una alarma sonando ahora? (no reagendar → protege la ráfaga)
  const sessionTimerRef = useRef(null)  // limpia la sesión activa tras la ventana de la ráfaga
  useEffect(() => {
    const TOLERANCE_MS = 90 * 1000
    const tick = () => {
      const st = schedRef.current
      if (!st.accesoAlarma) return // sin ACCESO_ALARMA la alarma NO suena (gate del modelo)
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

  // Al MONTAR (recarga/reapertura web): si el navegador se cerró con una alarma
  // SONANDO (sin apagarla), restaura el popup completo (AlarmRing → cámara/squats)
  // para que SIEMPRE se pueda apagar. Si no hay ninguna sonando, corta cualquier
  // audio residual (evita el estado "canción sí, popup no").
  useEffect(() => {
    const ringingId = dataStore.getRinging()
    if (ringingId) {
      const a = (dataStore.getAlarms() || []).find((x) => String(x.id) === String(ringingId))
      if (a) showRing(a)
      else dataStore.setRinging(null)
    } else {
      try { audioRef.current?.pause() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── ALARMA NATIVA (Capacitor) ────────────────────────────────────────────
  // Punto de entrada ÚNICO para disparar una alarma por id (lo usa el tap de la
  // notificación nativa; el scheduler in-app usa showRing directo). Marca
  // lastTriggered para que el scheduler no la repita dentro de la ventana.
  const triggerAlarmById = useCallback((id) => {
    const a = (schedRef.current.alarms || []).find((x) => String(x.id) === String(id))
    if (!a) return
    activeAlarmIdRef.current = a.id // AlarmKit: recordar cuál suena para cortar la ráfaga al completar
    const today = dataStore.todayKey()
    if (a.lastTriggered !== today) updateAlarm(a.id, { lastTriggered: today })
    showRing(a)
  }, [updateAlarm, showRing])

  // AlarmKit: la app se abrió por "HACER SQUATS". Marca sesión activa (para NO
  // reagendar y no cancelar la ráfaga), silencia el tono y entra a AlarmRing.
  // La sesión se limpia al COMPLETAR squats o tras la ventana de la ráfaga (~6 min).
  const openFromAlarmKit = useCallback((id) => {
    alarmSessionActiveRef.current = true
    clearTimeout(sessionTimerRef.current)
    sessionTimerRef.current = setTimeout(() => { alarmSessionActiveRef.current = false }, 6 * 60 * 1000)
    engageAlarmKit(id)
    triggerAlarmById(id)
  }, [triggerAlarmById])

  // Reagenda al cambiar las alarmas. Android: plugin nativo (AlarmManager + FGS).
  // iOS: LocalNotifications. Web: nada.
  useEffect(() => {
    const sig = (alarms || []).map((a) =>
      `${a.id}|${a.hour}|${(a.days || []).join(',')}|${a.exercise}|${a.reps}|${a.active ? 1 : 0}|${a.songId || ''}`
    ).join(';')

    // ARRANQUE (mount): si abrimos por una alarma pendiente (cold start via
    // "HACER SQUATS"), NO reagendes — reagendar haría cancelAll y borraría la
    // ráfaga activa. Solo maneja la alarma. Si no hay pendiente, reagenda normal.
    if (!didInitSchedRef.current) {
      didInitSchedRef.current = true
      lastSchedSigRef.current = sig
      if (isAndroid()) { scheduleAndroidAlarms(alarms); return }
      if (!isNativeApp()) return
      if (isIOS()) {
        getPendingAlarmKit().then((pid) => {
          if (pid) openFromAlarmKit(pid)                                  // hay alarma sonando → no reagendar
          else rescheduleAppleAlarms(schedRef.current.alarms || [])       // arranque normal → limpia zombies + arma
        })
      } else {
        rescheduleAppleAlarms(alarms)
      }
      return
    }

    // CAMBIOS posteriores: solo reagenda si cambió el SCHEDULING (no por
    // `lastTriggered`) y NO hay una alarma sonando (protege la ráfaga activa).
    if (sig === lastSchedSigRef.current) return
    lastSchedSigRef.current = sig
    if (alarmSessionActiveRef.current) return
    if (isAndroid()) { scheduleAndroidAlarms(alarms); return }
    if (isNativeApp()) rescheduleAppleAlarms(alarms)
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
    let offFired = () => {}

    // AlarmKit (iOS 26): "HACER SQUATS" (app viva) → abre AlarmRing/cámara.
    // El cold start (app muerta) lo maneja el effect de reagenda vía getPending.
    onAlarmFired((id) => openFromAlarmKit(id)).then((fn) => { offFired = fn })

    onAlarmTapped((id) => {
      // D — iOS: el tap de la notificación ES el gesto. Aprovéchalo SÍNCRONO
      // para resumir el AudioContext y bendecir el <audio> antes de que el
      // AlarmRing useEffect corra (ahí ya estamos fuera del gesto).
      if (isIOS()) {
        try { unlockAlarmAudio() } catch { /* noop */ }
        const a = (schedRef.current.alarms || []).find((x) => String(x.id) === String(id))
        if (a) {
          try { startAlarmTone() } catch { /* noop */ }
          try { playSong(songUrlById(a.songId)) } catch { /* noop */ }
        }
      }
      triggerAlarmById(id)
    }).then((fn) => { off = fn })
    return () => { off(); offFired() }
  }, [triggerAlarmById, playSong, openFromAlarmKit])

  // Permisos nativos: pedir UNA vez (cámara + notificaciones) tras el onboarding.
  const needsPriming = isNativeApp() && !onboarding && profile.onboarded && !settings.permsPrimed
  const primePermissions = useCallback(async () => {
    await primeNativePermissions()
    if (isAndroid()) await ensureExactAlarmAllowed() // Android 12+: permiso de alarma exacta
    else if (isIOS()) { try { await requestAlarmKitAuthIfSupported() } catch { /* noop */ } } // iOS 26: alarma imparable
    setSettingsState({ ...dataStore.saveSettings({ permsPrimed: true }) })
    const al = dataStore.getAlarms()
    if (isAndroid()) scheduleAndroidAlarms(al)
    else rescheduleAppleAlarms(al)
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

  // Sube el avatar capturado en el onboarding (dataUrl local) una vez que hay
  // sesión (Storage requiere uid). Si falla, deja el pendiente para reintentar.
  const flushPendingAvatar = useCallback(async () => {
    const prof = dataStore.getProfile()
    const pending = prof?.avatarPendingDataUrl
    if (!pending) return
    try {
      const url = await uploadAvatarDataUrl(pending)
      updateProfile({ avatarUrl: url, avatarPendingDataUrl: null })
    } catch (e) {
      console.warn('[avatar] subida pendiente falló:', e?.message || e)
    }
  }, [updateProfile])

  // Llamado por las pantallas de Auth al registrarse/iniciar sesión.
  // ORDEN IMPORTANTE (UX de login): hacemos primero la carga pesada (setUser =
  // pull/seed de la nube) y la rehidratación, y SOLO AL FINAL fijamos la sesión.
  // Así la pantalla de Auth sigue montada mostrando su spinner hasta que la cuenta
  // está lista; al fijar la sesión, el gate se desmonta y la app aparece ya
  // hidratada (sin "congelado" ni parpadeo con datos viejos). setUser tiene
  // try/catch interno → nunca lanza, así que la sesión SIEMPRE se fija (no hay
  // carga infinita aunque falle la red: la app es local-first).
  const handleAuthed = useCallback(async (s, mode) => {
    await cloudSync.setUser(s, mode) // signup -> sube local; login -> baja nube
    rehydrate()
    flushPendingAvatar()
    setAuthOpen(false)
    setSession(s) // AL FINAL: desmonta el gate y revela la app ya lista
  }, [rehydrate, flushPendingAvatar])

  const openAuth = useCallback((view = 'login') => { setAuthView(view); setAuthOpen(true) }, [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const signOutAccount = useCallback(async () => {
    try { await authSignOut() } catch { /* la sesión ya pudo expirar */ }
    cloudSync.clearUser()
    setSession(null)
    // CRÍTICO: borra TODO el dato local (bf:/bac:) para que el perfil, alarmas y
    // suscripción del usuario anterior NO se filtren a la siguiente cuenta en el
    // mismo navegador. Recarga a un estado limpio (idioma/onboarding).
    Object.keys(localStorage)
      .filter((k) => k.startsWith('bf:') || k.startsWith('bac:'))
      .forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }, [])

  // Borra TODOS los datos locales (bf:/bac:) y reinicia al onboarding.
  const wipeLocalAndRestart = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('bf:') || k.startsWith('bac:'))
      .forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }

  // Elimina la cuenta (Apple 5.1.1v). Con cuenta en la nube: borra en el
  // servidor (cascada + cancela Stripe), cierra sesión y limpia local. Solo
  // local: limpia local. Lanza error si el servidor falla (el caller lo maneja).
  const deleteAccount = useCallback(async () => {
    if (session) {
      await deleteAccountRequest() // throws si falla → no limpiamos nada
      try { await authSignOut() } catch { /* la sesión ya no existe */ }
      cloudSync.clearUser()
      setSession(null)
    }
    wipeLocalAndRestart()
  }, [session])

  // ── Stripe: re-jala suscripción con polling tras volver del pago ───────────
  // Después de pagar, el webhook puede tardar 1-3s en escribir la fila. Hacemos
  // varios intentos hasta ver status='active' (o agotar tries).
  const refreshPremium = useCallback(async ({ tries = 6, delay = 1000 } = {}) => {
    if (!isSupabaseConfigured) return
    for (let i = 0; i < tries; i++) {
      try { await cloudSync.refreshSubscription() } catch { /* noop */ }
      if (dataStore.getSubscription().status === 'active') return
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delay))
    }
  }, [])

  // Al volver al foreground (web visibilitychange / native appStateChange) o al
  // recibir el deep link de retorno, re-jala la suscripción.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const onVis = () => { if (!document.hidden && session) refreshPremium({ tries: 3, delay: 800 }) }
    document.addEventListener('visibilitychange', onVis)
    let stateSub, urlSub
    if (Capacitor?.isNativePlatform?.()) {
      CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive && session) refreshPremium({ tries: 3, delay: 800 }) }).then((s) => { stateSub = s })
      CapApp.addListener('appUrlOpen', ({ url }) => {
        if (typeof url === 'string' && url.includes('premium-return')) {
          closeNativeBrowser().catch(() => {})
          refreshPremium({ tries: 8, delay: 1000 })
        }
      }).then((s) => { urlSub = s })
    }
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      try { stateSub?.remove?.() } catch { /* noop */ }
      try { urlSub?.remove?.() } catch { /* noop */ }
    }
  }, [session, refreshPremium])

  // Llamados desde el Paywall / Perfil. Si Supabase no está configurado, el
  // paywall cae al demo local (unlock).
  const checkoutPlan = useCallback(async (plan) => {
    if (!isSupabaseConfigured) { unlock(); return }
    try { await startCheckout(plan) } catch (e) { showToast(e.message || t('errors.checkout')) }
  }, [unlock, t])
  const openPortal = useCallback(async () => {
    try { await openBillingPortal() } catch (e) { showToast(e.message || t('errors.portal')) }
  }, [t])

  // Cuenta OBLIGATORIA (Opción B): con Supabase configurado, tras el onboarding y
  // sin sesión, hay que crear cuenta para entrar. Sin Supabase (dev) -> se omite.
  const needsAccount = isSupabaseConfigured && authChecked && !session && !!profile.onboarded
  const accountRecap = useMemo(() => {
    const g = profile.goal ? translate(language, 'onboarding.goals.' + profile.goal + '.label') : ''
    const time = fmt12(profile.wakeTime)
    const hi = translate(language, 'auth.recap_hi')
    return `${hi} ${profile.name || ''}${g ? ' · ' + g : ''}${time ? ' · ' + time : ''}`
  }, [profile.name, profile.goal, profile.wakeTime, language])

  const value = {
    language, setLanguage, t,
    profile, updateProfile,
    subscription, unlocked, unlock,
    onboarding, finishOnboarding,
    streak, completeWakeWorkout,
    challengesDone, incrementChallenge,
    totals, recordRep, logWorkout, workoutLog,
    getPlanCompletions, toggleExerciseDone,
    progressLog, addProgressEntry, deleteProgressEntry,
    settings, saveSettings, resetProgress,
    needsPriming, primePermissions,
    cloudEnabled: isSupabaseConfigured,
    session, authOpen, authView, openAuth, closeAuth, handleAuthed, signOutAccount, deleteAccount,
    needsAccount, accountRecap,
    checkoutPlan, openPortal, refreshPremium,
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
