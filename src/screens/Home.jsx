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

function greetingKey(h) {
  return h < 12 ? 'home.g_morning' : h < 19 ? 'home.g_afternoon' : 'home.g_evening'
}

const QUICK_CHALLENGES = [
  { id: 'express', emoji: '🍑', reps: 15, exercise: 'squats', label: 'SQUATS', level: 'Express', levelKey: 'home.lvl_express' },
  { id: 'calentamiento', emoji: '🦵', reps: 20, exercise: 'lunges', label: 'LUNGES', level: 'Calentamiento', levelKey: 'home.lvl_calentamiento' },
  { id: 'intenso', emoji: '🍑', reps: 30, exercise: 'squats', label: 'SQUATS', level: 'Intenso', levelKey: 'home.lvl_intenso' },
  { id: 'bestia', emoji: '🦵', reps: 40, exercise: 'lunges', label: 'LUNGES', level: 'Bestia', levelKey: 'home.lvl_bestia' },
]

export default function Home() {
  const navigate = useNavigate()
  const { t, language, profile, streak, weekChart, challengesDone, totals, alarms, toggleAlarm, openAlarmEditor, openSheet, showRing, startWorkout } = useApp()
  const { isPremium } = useSubscription()

  const firstName = profile.name ? profile.name.split(' ')[0].toUpperCase() : t('home.hi')
  const avatarLetter = firstName[0] || 'B'
  const greeting = t(greetingKey(new Date().getHours()))
  const best = getWakeStreak().best || 0

  // Saludo dinámico con la voz de Brenda según el estado de la racha.
  // Estable por render (no reshuffle) vía useMemo sobre la categoría.
  const streakCategory = streak > 0 ? 'homeStreak' : best > 0 ? 'homeStreakBroken' : 'homeNoWorkoutYet'
  const brendaGreeting = useMemo(
    () => getBrendaMessage(language, streakCategory, { streak }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streakCategory, language],
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
          <div className="lbl">{t('home.streak_label')}</div>
          <div className="big"><span id="streakNum">{streak}</span><span>{t('home.days')}</span></div>
          <div className="sub" id="streakSub">{brendaGreeting}</div>
          <div className="week">
            {weekChart.map((d, i) => (
              <div key={i} className={'day' + (d.done ? ' done' : '') + (d.today ? ' today' : '')}>{d.key}</div>
            ))}
          </div>
        </div>

        {/* KPIs reales */}
        <div className="hm-kpis reveal d2">
          <div className="hm-kpi"><span className="n">{totals.workouts || 0}</span><div className="k">{t('home.kpi_workouts')}</div></div>
          <div className="hm-kpi"><span className="n">{totals.reps || 0}</span><div className="k">{t('home.kpi_reps')}</div></div>
          <div className="hm-kpi"><span className="n">{best}</span><div className="k">{t('home.kpi_best')}</div></div>
        </div>

        {/* Alarma (funcionalidad intacta) */}
        <div className="sec-h reveal d3">
          <h2>{t('home.alarm_h')}</h2>
          <span className="more" onClick={() => primary && openAlarmEditor(primary)}>{t('home.edit')}</span>
        </div>
        <div className="alarm-card reveal d3">
          <div className="row">
            <div className="alarm-time" id="homeAlarmTime">{alarmTime}</div>
            <div className="alarm-meta">
              <div className="t">{t('home.active_wake')}</div>
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
            <button onClick={() => showRing(primary)}>▶ {t('home.test_alarm')}</button>
          </div>
        </div>

        {/* Retos rápidos (funcionalidad intacta) */}
        <div className="sec-h reveal d4">
          <h2>{t('home.challenges_h')}</h2>
          <span className="more">{t('home.completed', { n: challengesDone })}</span>
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
              <p>{t(ch.levelKey)}</p>
            </div>
          ))}
        </div>

        {/* Brenda Fitness */}
        <div className="sec-h reveal d5"><h2>BRENDA FITNESS</h2></div>

        {isPremium ? (
          <div className="reveal d5">
            <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
              <div className="hm-hero-t">{t('home.hero_kick')}</div>
              <div><span className="hm-hero-h">{t('home.hero_title')}</span></div>
              <p className="hm-hero-p">{t('home.hero_p')}</p>
              <div className="hm-quick">
                <div className="hm-qbtn" onClick={() => navigate('/entrena')}><div className="e">🏋️</div><div className="l">{t('nav.train')}</div></div>
                <div className="hm-qbtn" onClick={() => navigate('/nutricion')}><div className="e">🥗</div><div className="l">{t('nav.nutrition')}</div></div>
                <div className="hm-qbtn" onClick={() => navigate('/progreso')}><div className="e">📊</div><div className="l">{t('nav.progress')}</div></div>
              </div>
            </DestelloCard>
          </div>
        ) : (
          <div id="brendaLocked" className="reveal d5">
            <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
              <div className="lock-pill" style={{ position: 'static', display: 'inline-block', marginBottom: 10 }}>🔒 PREMIUM</div>
              <div><span className="hm-hero-h">BRENDA FITNESS</span></div>
              <p className="hm-hero-p">{t('home.locked_p')}</p>
              {!isIOSNative() && (
                <div className="hm-hero-cta"><button className="unlock" onClick={() => openSheet('paywall')}>{t('home.unlock')}</button></div>
              )}
            </DestelloCard>
          </div>
        )}
      </div>
    </section>
  )
}
