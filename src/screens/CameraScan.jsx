import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { PoseTracker } from '../lib/poseTracker'
import { RepCounter } from '../lib/repCounter'
import * as storage from '../lib/storage'

// Anillo de progreso SVG.
const R = 92
const CIRC = 2 * Math.PI * R

export default function CameraScan() {
  const { workout, stopSong, setStreak, setChallengesDone, stopScan, showCelebration } = useApp()
  const goal = workout?.reps ?? 10
  const exercise = workout?.exercise === 'lunges' ? 'lunges' : 'squats'
  const exKind = exercise === 'lunges' ? 'lunge' : 'squat'
  const exLabel = exercise === 'lunges' ? 'LUNGES' : 'SQUATS'

  // 'priming' | 'active' | 'denied'
  const [phase, setPhase] = useState('priming')
  const [ready, setReady] = useState(false)            // cámara en vivo
  const [reps, setReps] = useState(0)
  const [feedback, setFeedback] = useState('Colócate de cuerpo completo en cuadro')

  const videoRef = useRef(null)
  const trackerRef = useRef(null)
  const finishedRef = useRef(false)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    trackerRef.current?.stop() // libera la cámara de inmediato
    stopSong()
    // La racha es SOLO de la alarma diaria; los retos van a su contador.
    if (workout?.source === 'challenge') setChallengesDone(storage.recordChallenge())
    else setStreak(storage.completeWorkout(exKind).streak)
    stopScan()
    showCelebration()
  }

  // Arranca modelo + cámara cuando el usuario acepta el priming.
  useEffect(() => {
    if (phase !== 'active') return
    let cancelled = false

    const counter = new RepCounter(exKind, {
      onRep: (n) => {
        storage.recordRep(exKind) // suma reps REALES por ejercicio
        setReps(n)
        if (n >= goal) finish()
      },
      onState: (p, info) => {
        if (p === 'NOT_READY') setFeedback(info?.reason || 'Colócate de cuerpo completo en cuadro')
        else if (p === 'TRANSITION' && info?.rejected) setFeedback(info?.reason || 'Movimiento no válido')
        else setFeedback(null)
      },
    })

    const tracker = new PoseTracker({
      onResult: (r) => { if (!cancelled) counter.update(r) },
      fps: 20,
    })
    trackerRef.current = tracker

    tracker
      .start(videoRef.current)
      .then(() => { if (!cancelled) setReady(true) })
      .catch((err) => {
        console.warn('[CameraScan] cámara no disponible:', err)
        if (!cancelled) setPhase('denied')
      })

    return () => {
      cancelled = true
      tracker.dispose() // libera cámara + WebGL (evita la fuga de memoria)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const activate = () => {
    finishedRef.current = false
    setReady(false)
    setReps(0)
    setPhase('active')
  }

  const pct = Math.min(reps / goal, 1)

  return (
    <div id="scan">
      {/* Video en vivo (espejado) */}
      <video ref={videoRef} className="scan-video" muted playsInline />
      <div className="scan-shade" />

      {/* PRIMING: explicación + permiso */}
      {phase === 'priming' && (
        <div className="scan-card">
          <div className="scan-emoji">📷</div>
          <h2 className="scan-title">ESCANEO DE CUERPO</h2>
          <p className="scan-lead">
            Tu cámara cuenta tus <b style={{ color: '#fff' }}>{goal} {exLabel.toLowerCase()}</b> en
            tiempo real. El video <b style={{ color: '#fff' }}>no se sube</b>: todo se procesa en tu
            teléfono.
          </p>
          <button className="scan-go" onClick={activate}>ACTIVAR CÁMARA</button>
        </div>
      )}

      {/* DENIED: permiso negado / cámara no disponible */}
      {phase === 'denied' && (
        <div className="scan-card">
          <div className="scan-emoji">🚫</div>
          <h2 className="scan-title">SIN ACCESO A LA CÁMARA</h2>
          <p className="scan-lead">
            Necesito tu cámara para contar tus reps (no hay forma de saltarlo). Activa el permiso
            en los ajustes de la app y reintenta.
          </p>
          <button className="scan-go" onClick={activate}>REINTENTAR</button>
        </div>
      )}

      {/* ACTIVE: HUD de conteo */}
      {phase === 'active' && (
        <>
          <div className="scan-top">
            <div className="scan-live"><span className="dot" /> EN VIVO</div>
            <div className="scan-ex">{exLabel}</div>
          </div>

          {!ready && <div className="scan-prep">Preparando cámara…</div>}

          {ready && (
            <div className="scan-bottom">
              {feedback && <div className="scan-fb">{feedback}</div>}
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
          )}
        </>
      )}
    </div>
  )
}
