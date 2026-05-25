import { useEffect, useState } from 'react'
import { useApp } from '../store'
import Sheet from '../components/Sheet'

// TEMPORAL (prototipo): el conteo simulado y el boton "SIMULAR COMPLETAR"
// se reemplazan en la Fase 5 por la deteccion real con camara (MediaPipe
// Pose) que cuenta las reps por movimiento, sin boton para saltar.
export default function CameraScan() {
  const { closeSheet, setStreak, stopSong, showCelebration, workout, setChallengesDone } = useApp()
  const goal = workout?.reps ?? 10
  const exercise = workout?.exercise === 'lunges' ? 'lunges' : 'squats'
  const [reps, setReps] = useState(0)

  useEffect(() => {
    let c = 0
    const iv = setInterval(() => {
      c++
      setReps(c)
      if (c >= goal) clearInterval(iv)
    }, 450)
    return () => clearInterval(iv)
  }, [goal])

  const complete = () => {
    stopSong() // el audio solo se apaga al completar las reps
    closeSheet()
    // La racha es SOLO de la alarma diaria; los retos rápidos van a su contador.
    if (workout?.source === 'challenge') setChallengesDone((n) => n + 1)
    else setStreak((s) => s + 1)
    showCelebration()
  }

  return (
    <Sheet>
      <h3>ESCANEO DE CUERPO</h3>
      <p className="lead">Colócate frente a la cámara. Cuento tus repeticiones en tiempo real.</p>

      <div
        style={{
          aspectRatio: '3/4',
          borderRadius: 18,
          background: 'linear-gradient(160deg,#1a0a12,#0a0a0c)',
          border: '1px solid var(--line-strong)',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(60% 50% at 50% 50%,rgba(255,31,107,.14),transparent)',
            animation: 'breathe 3s infinite',
          }}
        />
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 13, color: 'var(--txt-dim)', maxWidth: 200, lineHeight: 1.5 }}>
            Aquí se activa la detección de {exercise} con la cámara
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'rgba(0,0,0,.5)',
            padding: '6px 12px',
            borderRadius: 30,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          ● EN VIVO
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            right: 14,
            fontFamily: "'Bebas Neue'",
            fontSize: 48,
            lineHeight: 0.8,
          }}
        >
          <span id="repCount">{reps}</span>
          <span style={{ fontSize: 20, color: 'var(--txt-dim)' }}>/{goal}</span>
        </div>
      </div>

      <button className="cta full" onClick={complete}>SIMULAR COMPLETAR ✓</button>
    </Sheet>
  )
}
