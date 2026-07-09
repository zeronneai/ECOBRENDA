import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { formatDays } from '../data/onboarding'
import { CHALLENGE_AUDIO_SRC } from '../lib/alarmAudio'
import { isIOSNative } from '../lib/platform'
import { getWakeStreak } from '../lib/dataStore'
import { getBrendaMessage } from '../data/brendaMessages'
import DestelloCard from '../components/ui/DestelloCard'

function greetingFor(h) {
  return h < 12 ? 'Buen día' : h < 19 ? 'Buena tarde' : 'Buena noche'
}

const QUICK_CHALLENGES = [
  { id: 'express', emoji: '🍑', reps: 15, exercise: 'squats', label: 'SQUATS', level: 'Express' },
  { id: 'calentamiento', emoji: '🦵', reps: 20, exercise: 'lunges', label: 'LUNGES', level: 'Calentamiento' },
  { id: 'intenso', emoji: '🍑', reps: 30, exercise: 'squats', label: 'SQUATS', level: 'Intenso' },
  { id: 'bestia', emoji: '🦵', reps: 40, exercise: 'lunges', label: 'LUNGES', level: 'Bestia' },
]

export default function Home() {
  const navigate = useNavigate()
  const { profile, streak, weekChart, challengesDone, totals, alarms, toggleAlarm, openAlarmEditor, openSheet, showRing, startWorkout } = useApp()
  const { isPremium } = useSubscription()

  const firstName = profile.name ? profile.name.split(' ')[0].toUpperCase() : 'HOLA'
  const avatarLetter = firstName[0] || 'B'
  const greeting = greetingFor(new Date().getHours())
  const best = getWakeStreak().best || 0

  // Saludo dinámico con la voz de Brenda según el estado de la racha.
  // Estable por render (no reshuffle) vía useMemo sobre la categoría.
  const streakCategory = streak > 0 ? 'homeStreak' : best > 0 ? 'homeStreakBroken' : 'homeNoWorkoutYet'
  const brendaGreeting = useMemo(
    () => getBrendaMessage(streakCategory, { streak }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streakCategory],
  )

  // Alarma principal (la primera de la lista real).
  const primary = alarms[0]
  const alarmTime = primary?.hour || profile.wakeTime
  const alarmEx = primary?.exercise === 'lunges' ? 'lunges' : 'squats'
  const alarmDesc = primary
    ? `${primary.reps} ${alarmEx} · ${formatDays(primary.days)}`
    : `${profile.reps || 10} squats · L a V`
  const alarmActive = primary ? primary.active : true

  const startChallenge = (ch) => {
    startWorkout({ source: 'challenge', exercise: ch.exercise, reps: ch.reps, level: ch.level, song: CHALLENGE_AUDIO_SRC })
  }

  return (
    <section className="screen active" id="s-home">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1">
          <div>
            <div className="hi" id="greeting">{greeting}</div>
            <div className="name destello-title" id="userName">{firstName}</div>
          </div>
          <div className="avatar" id="avatarLetter">{avatarLetter}</div>
        </div>

        {/* Racha */}
        <div className="streak reveal d2">
          <div className="lbl">Racha actual</div>
          <div className="big"><span id="streakNum">{streak}</span><span>días</span></div>
          <div className="sub" id="streakSub">{brendaGreeting}</div>
          <div className="week">
            {weekChart.map((d, i) => (
              <div key={i} className={'day' + (d.done ? ' done' : '') + (d.today ? ' today' : '')}>{d.key}</div>
            ))}
          </div>
        </div>

        {/* KPIs reales */}
        <div className="hm-kpis reveal d2">
          <div className="hm-kpi"><span className="n">{totals.workouts || 0}</span><div className="k">Entrenos</div></div>
          <div className="hm-kpi"><span className="n">{totals.reps || 0}</span><div className="k">Reps</div></div>
          <div className="hm-kpi"><span className="n">{best}</span><div className="k">Mejor racha</div></div>
        </div>

        {/* Alarma (funcionalidad intacta) */}
        <div className="sec-h reveal d3">
          <h2>TU ALARMA</h2>
          <span className="more" onClick={() => primary && openAlarmEditor(primary)}>EDITAR</span>
        </div>
        <div className="alarm-card reveal d3">
          <div className="row">
            <div className="alarm-time" id="homeAlarmTime">{alarmTime}</div>
            <div className="alarm-meta">
              <div className="t">Despertar activo</div>
              <div className="d" id="homeAlarmDesc">{alarmDesc}</div>
            </div>
            <div
              className={'toggle' + (alarmActive ? ' on' : '')}
              onClick={() => primary && toggleAlarm(primary.id)}
            >
              <div className="knob" />
            </div>
          </div>
          <div className="alarm-foot">
            <button><span className="ex">●</span> {alarmEx.toUpperCase()}</button>
            <button onClick={() => showRing(primary)}>▶ PROBAR ALARMA</button>
          </div>
        </div>

        {/* Retos rápidos (funcionalidad intacta) */}
        <div className="sec-h reveal d4">
          <h2>RETOS RÁPIDOS</h2>
          <span className="more">{challengesDone} COMPLETADOS</span>
        </div>
        <div className="brenda-live reveal d4">
          {QUICK_CHALLENGES.map((ch) => (
            <div className="bcard" key={ch.id} onClick={() => startChallenge(ch)}>
              <div
                className="ic"
                style={{ background: ch.exercise === 'squats' ? 'rgba(255,31,107,.15)' : 'rgba(216,255,62,.13)' }}
              >
                {ch.emoji}
              </div>
              <h4>{ch.reps} {ch.label}</h4>
              <p>{ch.level}</p>
            </div>
          ))}
        </div>

        {/* Brenda Fitness */}
        <div className="sec-h reveal d5"><h2>BRENDA FITNESS</h2></div>

        {isPremium ? (
          <div className="reveal d5">
            <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
              <div className="hm-hero-t">✦ Tu plan con Brenda</div>
              <div><span className="hm-hero-h">RUTINA Y DIETA LISTAS</span></div>
              <p className="hm-hero-p">Tu rutina y tu plan de comidas personalizados te esperan. ¿Le entras hoy?</p>
              <div className="hm-quick">
                <div className="hm-qbtn" onClick={() => navigate('/entrena')}><div className="e">🏋️</div><div className="l">Entrena</div></div>
                <div className="hm-qbtn" onClick={() => navigate('/nutricion')}><div className="e">🥗</div><div className="l">Nutrición</div></div>
                <div className="hm-qbtn" onClick={() => navigate('/progreso')}><div className="e">📊</div><div className="l">Progreso</div></div>
              </div>
            </DestelloCard>
          </div>
        ) : (
          <div id="brendaLocked" className="reveal d5">
            <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
              <div className="lock-pill" style={{ position: 'static', display: 'inline-block', marginBottom: 10 }}>🔒 PREMIUM</div>
              <div><span className="hm-hero-h">BRENDA FITNESS</span></div>
              <p className="hm-hero-p">Rutinas y dieta 100% personalizadas por IA para tu meta, tu nivel y tus días. Además, tu progreso con gráficas.</p>
              {!isIOSNative() && (
                <div className="hm-hero-cta"><button className="unlock" onClick={() => openSheet('paywall')}>DESBLOQUEAR →</button></div>
              )}
            </DestelloCard>
          </div>
        )}
      </div>
    </section>
  )
}
