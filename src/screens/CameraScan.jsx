import { useEffect, useRef, useState } from 'react'
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision'
import { useApp } from '../store'
import { PoseTracker } from '../lib/poseTracker'
import { RepCounter } from '../lib/repCounter'
import { tauntTriggerRep, randomTaunt, TAUNT_DURATION_MS } from '../data/taunts'

// Anillo de progreso SVG.
const R = 92
const CIRC = 2 * Math.PI * R

export default function CameraScan() {
  const { workout, stopSong, stopScan, showCelebration, recordRep, completeWakeWorkout, incrementChallenge, logWorkout, t } = useApp()

  // Traduce los CÓDIGOS de coaching que emite RepCounter (texto en i18n).
  const REASON_KEY = { FRAME: 'scan.cue_frame', SLOW_DOWN: 'scan.cue_slow', REDO: 'scan.cue_redo', GO_LOWER: 'scan.cue_lower' }
  const WARN_CODES = ['GO_LOWER', 'SLOW_DOWN', 'REDO']
  const goal = workout?.reps ?? 10
  const exercise = workout?.exercise === 'lunges' ? 'lunges' : 'squats'
  const exKind = exercise === 'lunges' ? 'lunge' : 'squat'
  const exLabel = exercise === 'lunges' ? 'LUNGES' : 'SQUATS'

  // 'priming' | 'active' | 'denied'
  const [stage, setStage] = useState('priming')
  const [ready, setReady] = useState(false) // cámara en vivo
  const [reps, setReps] = useState(0)
  const [hud, setHud] = useState({ phase: 'NOT_READY', depth: 0, msg: t('scan.cue_frame'), warn: true })
  const [taunt, setTaunt] = useState(null) // frase provocadora a mitad de rutina

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const drawerRef = useRef(null)
  const trackerRef = useRef(null)
  const finishedRef = useRef(false)
  const tauntTimer = useRef(null)
  const tauntFiredRef = useRef(false) // aparece una sola vez por sesión

  // Dispara el texto a la rep configurada (por defecto, la mitad). NO interrumpe
  // el conteo: el overlay es puro CSS sobre el video y se borra solo.
  const maybeTaunt = (n) => {
    if (tauntFiredRef.current || n < tauntTriggerRep(goal) || n >= goal) return
    tauntFiredRef.current = true
    setTaunt(randomTaunt())
    tauntTimer.current = setTimeout(() => setTaunt(null), TAUNT_DURATION_MS)
  }

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    trackerRef.current?.stop() // libera la cámara de inmediato
    stopSong()
    // La racha es SOLO de la alarma diaria; los retos van a su contador.
    if (workout?.source === 'challenge') incrementChallenge()
    else completeWakeWorkout()
    logWorkout({ source: workout?.source ?? 'alarm', exercise: exKind, reps: goal })
    stopScan()
    showCelebration()
  }

  // Dibuja el esqueleto detectado sobre el video, en la paleta de la app.
  const drawSkeleton = (landmarks) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    if (video.videoWidth && canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks) return
    if (!drawerRef.current) drawerRef.current = new DrawingUtils(ctx)
    drawerRef.current.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: 'rgba(216,255,62,.9)', // lima
      lineWidth: 4,
    })
    drawerRef.current.drawLandmarks(landmarks, {
      color: '#ff1f6b', // magenta
      fillColor: '#ff1f6b',
      radius: 5,
      lineWidth: 1,
    })
  }

  const cueFor = (phase, info) => {
    if (info.reason) return t(REASON_KEY[info.reason] || 'scan.cue_frame') // código → texto
    if (phase === 'NOT_READY') return t('scan.cue_frame')
    if (phase === 'DOWN') return t('scan.cue_up')
    return t('scan.cue_down')
  }

  // Arranca modelo + cámara cuando el usuario acepta el priming.
  useEffect(() => {
    if (stage !== 'active') return
    let cancelled = false

    const counter = new RepCounter(exKind, {
      onRep: (n) => {
        recordRep(exKind)
        setReps(n)
        maybeTaunt(n)
        if (n >= goal) finish()
      },
      onState: (phase, info) => {
        if (!cancelled) setHud({ phase, depth: info.depth ?? 0, msg: cueFor(phase, info), warn: phase === 'NOT_READY' || WARN_CODES.includes(info.reason) })
      },
    })

    const tracker = new PoseTracker({
      onResult: (res) => {
        if (cancelled) return
        drawSkeleton(res.landmarks)
        counter.update(res)
      },
      fps: 20,
    })
    trackerRef.current = tracker

    tracker
      .start(videoRef.current)
      .then(() => { if (!cancelled) setReady(true) })
      .catch((err) => {
        console.warn('[CameraScan] cámara no disponible:', err)
        if (!cancelled) setStage('denied')
      })

    return () => {
      cancelled = true
      clearTimeout(tauntTimer.current)
      tracker.dispose() // libera cámara + WebGL (evita la fuga de memoria)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  // Wake lock: mantiene la pantalla encendida durante el workout y la re-adquiere
  // al volver a primer plano (B7). Aislado: no toca la detección.
  useEffect(() => {
    if (stage !== 'active' || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen') } catch { /* noop */ }
    }
    const onVis = () => { if (!document.hidden && !cancelled) acquire() }
    acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      try { lock?.release() } catch { /* noop */ }
    }
  }, [stage])

  const activate = () => {
    finishedRef.current = false
    tauntFiredRef.current = false
    clearTimeout(tauntTimer.current)
    setTaunt(null)
    setReady(false)
    setReps(0)
    setHud({ phase: 'NOT_READY', depth: 0, msg: t('scan.cue_frame'), warn: true })
    setStage('active')
  }

  const pct = Math.min(reps / goal, 1)
  const isWarning = !!hud.warn

  return (
    <div id="scan">
      <video ref={videoRef} className="scan-video" muted playsInline />
      <canvas ref={canvasRef} className="scan-canvas" />
      <div className="scan-shade" />

      {stage === 'priming' && (
        <div className="scan-card">
          <div className="scan-emoji">📷</div>
          <h2 className="scan-title">{t('scan.priming_title')}</h2>
          <p className="scan-lead">
            {t('scan.priming_lead_a')} <b style={{ color: '#fff' }}>{goal} {exLabel.toLowerCase()}</b> {t('scan.priming_lead_b')} <b style={{ color: '#fff' }}>{t('scan.priming_lead_c')}</b>{t('scan.priming_lead_d')}
          </p>
          <button className="scan-go" onClick={activate}>{t('scan.activate')}</button>
        </div>
      )}

      {stage === 'denied' && (
        <div className="scan-card">
          <div className="scan-emoji">🚫</div>
          <h2 className="scan-title">{t('scan.denied_title')}</h2>
          <p className="scan-lead">
            {t('scan.denied_lead')}
          </p>
          <button className="scan-go" onClick={activate}>{t('scan.retry')}</button>
        </div>
      )}

      {/* Texto provocador a mitad de rutina (no captura toques → no estorba). */}
      {taunt && <div className="scan-taunt" key={taunt + reps}>{taunt}</div>}

      {stage === 'active' && (
        <>
          <div className="scan-top">
            <div className="scan-live"><span className="dot" /> {t('scan.live')}</div>
            <div className="scan-ex">{exLabel}</div>
          </div>

          {!ready && <div className="scan-prep">{t('scan.preparing')}</div>}

          {ready && (
            <>
              {/* Barra de profundidad */}
              <div className="scan-depth">
                <div
                  className="scan-depth-fill"
                  style={{
                    height: Math.round(hud.depth * 100) + '%',
                    background: hud.phase === 'DOWN' ? 'var(--lime)' : 'var(--magenta)',
                  }}
                />
              </div>

              <div className="scan-bottom">
                <div className={'scan-status' + (isWarning ? ' warn' : '')}>{hud.msg}</div>
                {hud.phase !== 'NOT_READY' && (
                  <div className={'scan-phase ' + (hud.phase === 'DOWN' ? 'down' : 'up')}>
                    {hud.phase === 'DOWN' ? t('scan.down') : t('scan.up')}
                  </div>
                )}
                <div className="scan-ring">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                    <circle
                      cx="100" cy="100" r={R} fill="none" stroke="var(--magenta)" strokeWidth="10"
                      strokeLinecap="round" strokeDasharray={CIRC}
                      strokeDashoffset={CIRC * (1 - pct)}
                      style={{ transition: 'stroke-dashoffset .3s ease' }}
                    />
                  </svg>
                  <div className="scan-count">
                    <div className="n">{reps}</div>
                    <div className="g">/ {goal}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
