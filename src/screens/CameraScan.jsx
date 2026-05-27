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
  const { workout, stopSong, stopScan, showCelebration, recordRep, completeWakeWorkout, incrementChallenge, logWorkout } = useApp()
  const goal = workout?.reps ?? 10
  const exercise = workout?.exercise === 'lunges' ? 'lunges' : 'squats'
  const exKind = exercise === 'lunges' ? 'lunge' : 'squat'
  const exLabel = exercise === 'lunges' ? 'LUNGES' : 'SQUATS'

  // 'priming' | 'active' | 'denied'
  const [stage, setStage] = useState('priming')
  const [ready, setReady] = useState(false) // cámara en vivo
  const [reps, setReps] = useState(0)
  const [hud, setHud] = useState({ phase: 'NOT_READY', depth: 0, msg: 'Colócate de cuerpo completo en cuadro' })
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
    if (phase === 'NOT_READY') return info.reason || 'Ponte de cuerpo completo en cuadro'
    if (info.reason) return info.reason // aviso de rechazo (p. ej. "Baja más")
    if (phase === 'DOWN') return '¡Bien! Sube'
    return '¡Baja!'
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
        if (!cancelled) setHud({ phase, depth: info.depth ?? 0, msg: cueFor(phase, info) })
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

  const activate = () => {
    finishedRef.current = false
    tauntFiredRef.current = false
    clearTimeout(tauntTimer.current)
    setTaunt(null)
    setReady(false)
    setReps(0)
    setHud({ phase: 'NOT_READY', depth: 0, msg: 'Colócate de cuerpo completo en cuadro' })
    setStage('active')
  }

  const pct = Math.min(reps / goal, 1)
  const isWarning = hud.phase === 'NOT_READY' || ['Baja más', 'Más despacio', 'Repite el movimiento'].includes(hud.msg)

  return (
    <div id="scan">
      <video ref={videoRef} className="scan-video" muted playsInline />
      <canvas ref={canvasRef} className="scan-canvas" />
      <div className="scan-shade" />

      {stage === 'priming' && (
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

      {stage === 'denied' && (
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

      {/* Texto provocador a mitad de rutina (no captura toques → no estorba). */}
      {taunt && <div className="scan-taunt" key={taunt + reps}>{taunt}</div>}

      {stage === 'active' && (
        <>
          <div className="scan-top">
            <div className="scan-live"><span className="dot" /> EN VIVO</div>
            <div className="scan-ex">{exLabel}</div>
          </div>

          {!ready && <div className="scan-prep">Preparando cámara…</div>}

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
                    {hud.phase === 'DOWN' ? 'ABAJO' : 'ARRIBA'}
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
