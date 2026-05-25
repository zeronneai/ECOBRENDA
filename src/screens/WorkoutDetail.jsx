import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useApp } from '../store'
import { getRoutine, difficultyColor } from '../data/workouts'
import { todayKey } from '../lib/dataStore'

export default function WorkoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { workoutLog, logWorkout } = useApp()
  const [open, setOpen] = useState({})

  const r = getRoutine(id)
  if (!r) return <Navigate to="/entrena" replace />

  const today = todayKey()
  const doneToday = workoutLog.some((w) => w.workoutId === r.id && w.date === today)

  const complete = () => {
    logWorkout({ source: 'routine', workoutId: r.id, title: r.title })
  }
  const toggle = (i) => setOpen((o) => ({ ...o, [i]: !o[i] }))

  return (
    <section className="screen active" id="s-workout">
      <div className="scroll">
        {/* HERO */}
        <div className="wd-hero" style={{ background: r.gradient }}>
          <div className="wd-hero-shade" />
          <button className="wd-back" onClick={() => navigate('/entrena')}>‹</button>
          <div className="wd-hero-inner">
            <div className="wd-badges">
              <span className="wd-badge">{r.category}</span>
              <span className="wd-badge" style={{ color: difficultyColor(r.difficulty) }}>{r.difficulty}</span>
              {r.isNew && <span className="wd-badge new">NUEVO</span>}
            </div>
            <h1 className="wd-title">{r.title}</h1>
            <div className="wd-stats">
              <span>⏱ {r.duration} min</span>
              <span>🔥 {r.calories} cal</span>
              <span>⭐ {r.rating} <small>({r.reviews})</small></span>
            </div>
          </div>
        </div>

        <div className="wd-body">
          {/* COMPLETADO */}
          {doneToday ? (
            <div className="wd-done">
              <div className="wd-done-ic">✓</div>
              <div>
                <b>¡Completado hoy!</b>
                <span>Suma a tu semana. Sigue así 💚</span>
              </div>
            </div>
          ) : (
            <button className="wd-complete" onClick={complete}>MARCAR COMO COMPLETADO</button>
          )}

          {/* DESCRIPCIÓN */}
          <div className="wd-section">
            <h3>DESCRIPCIÓN</h3>
            <p className="wd-desc">{r.description}</p>
          </div>

          {/* EQUIPAMIENTO */}
          <div className="wd-section">
            <h3>EQUIPAMIENTO</h3>
            <div className="wd-equip">
              {r.equipment.map((e) => <span key={e} className="wd-pill">{e}</span>)}
            </div>
          </div>

          {/* CALENTAMIENTO */}
          <div className="wd-section">
            <h3>CALENTAMIENTO</h3>
            {r.warmup.map((w, i) => (
              <div key={i} className="wd-line"><span className="wd-dot" />{w}</div>
            ))}
          </div>

          {/* EJERCICIOS (acordeón) */}
          <div className="wd-section">
            <h3>EJERCICIOS · {r.exercises.length}</h3>
            {r.exercises.map((ex, i) => (
              <div className={'wd-ex' + (open[i] ? ' open' : '')} key={i}>
                <div className="wd-ex-head" onClick={() => toggle(i)}>
                  <div className="wd-ex-n">{i + 1}</div>
                  <div className="wd-ex-meta">
                    <h4>{ex.name}</h4>
                    <span>{ex.sets} series × {ex.reps} · {ex.rest}s descanso</span>
                  </div>
                  <div className="wd-ex-chev">{open[i] ? '−' : '+'}</div>
                </div>
                {open[i] && (
                  <div className="wd-ex-body">
                    <div className="wd-video"><span>▶</span> Video próximamente</div>
                    <div className="wd-muscles">
                      {ex.muscles.map((mu) => <span key={mu} className="wd-pill sm">{mu}</span>)}
                    </div>
                    <div className="wd-tip"><b>Técnica:</b> {ex.tip}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ENFRIAMIENTO */}
          <div className="wd-section">
            <h3>ENFRIAMIENTO</h3>
            {r.cooldown.map((c, i) => (
              <div key={i} className="wd-line"><span className="wd-dot lime" />{c}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
