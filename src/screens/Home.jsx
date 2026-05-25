import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { goalLabel, formatDays } from '../data/onboarding'
import { CHALLENGE_AUDIO_SRC } from '../lib/alarmAudio'

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
  const { profile, plan, streak, weekChart, challengesDone, alarms, toggleAlarm, openAlarmEditor, openSheet, showRing, startWorkout } = useApp()
  const { isPremium } = useSubscription()

  const firstName = profile.name ? profile.name.split(' ')[0].toUpperCase() : 'HOLA'
  const avatarLetter = firstName[0] || 'B'
  const greeting = greetingFor(new Date().getHours())

  const promoTitle = 'PLAN ' + plan.workout.title.toUpperCase()
  const promoDesc = `Brenda preparó "${plan.workout.title}" para tu meta de ${goalLabel(profile.goal).toLowerCase()}, calibrado a tus ${profile.weight}kg y ${profile.height}cm.`

  const m = plan.macros
  const today = plan.workout.days[0]

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
            <div className="name" id="userName">{firstName}</div>
          </div>
          <div className="avatar" id="avatarLetter">{avatarLetter}</div>
        </div>

        <div className="streak reveal d2">
          <div className="lbl">Racha actual</div>
          <div className="big"><span id="streakNum">{streak}</span><span>días</span></div>
          <div className="sub" id="streakSub">
            {streak > 0 ? '¡Vas con todo! Sigue tu racha 🔥' : 'Empieza hoy tu primera racha 🔥'}
          </div>
          <div className="week">
            {weekChart.map((d, i) => (
              <div key={i} className={'day' + (d.done ? ' done' : '') + (d.today ? ' today' : '')}>{d.key}</div>
            ))}
          </div>
        </div>

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

        <div className="sec-h reveal d5"><h2>BRENDA FITNESS</h2></div>

        {!isPremium && (
          <div id="brendaLocked" className="reveal d5">
            <div className="brenda-promo">
              <div className="glow" /><div className="shimmer" />
              <div className="lock-pill">🔒 PREMIUM</div>
              <div className="inner">
                <div className="kick">Nutrición + Rutinas</div>
                <h3 id="promoTitle">{promoTitle}</h3>
                <p id="promoDesc">{promoDesc}</p>
                <button className="unlock" onClick={() => openSheet('paywall')}>DESBLOQUEAR →</button>
              </div>
            </div>
          </div>
        )}

        {isPremium && (
          <div id="brendaUnlocked">
            <div className="macros">
              <div className="macro kcal"><div className="v" id="mKcal">{m.kcal}</div><div className="k">kcal</div></div>
              <div className="macro prot"><div className="v" id="mProt">{m.protein}g</div><div className="k">proteína</div></div>
              <div className="macro carb"><div className="v" id="mCarb">{m.carbs}g</div><div className="k">carbos</div></div>
            </div>
            <div className="brenda-live" style={{ marginTop: 14 }}>
              <div className="bcard" onClick={() => navigate('/brenda')}>
                <div className="ic" style={{ background: 'rgba(255,31,107,.15)' }}>🏋️</div>
                <h4>RUTINA HOY</h4>
                <p id="todayWk">{today.focus} · {today.ex.length} ejercicios</p>
              </div>
              <div className="bcard" onClick={() => openSheet('mealsSheet')}>
                <div className="ic" style={{ background: 'rgba(216,255,62,.13)' }}>🥗</div>
                <h4>COMIDAS</h4>
                <p>5 comidas · tu plan</p>
              </div>
            </div>
            <div className="brenda-signature">
              <div className="ba">B</div>
              <div className="bt">
                <b>Brenda Jazmín</b><br />
                <span id="sigText">{plan.workout.note}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
