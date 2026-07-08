import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store'
import { GOALS, LEVELS, GENDERS, DAYS_OPTIONS, DAY_LABELS, ALLERGIES, DIET_PREFS } from '../data/onboarding'
import { ALARM_SONGS, DEFAULT_SONG_ID } from '../data/songs'
import RulerPicker from '../components/RulerPicker'
import WheelPicker from '../components/WheelPicker'

const OB_TOTAL = 11

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const REPS_OPTIONS = [10, 12, 15, 20]

// Conversiones (canónico: kg + cm).
const kgToLb = (kg) => Math.round(kg * 2.20462)
const lbToKg = (lb) => Math.round(lb / 2.20462)
const cmToIn = (cm) => Math.round(cm / 2.54)
const inToCm = (inch) => Math.round(inch * 2.54)
const fmtFt = (inch) => `${Math.floor(inch / 12)}'${inch % 12}"`

export default function Onboarding() {
  const { updateProfile, addAlarm, finishOnboarding, showToast, cloudEnabled, openAuth } = useApp()

  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const [name, setName] = useState('')
  const [age, setAge] = useState(25)
  const [gender, setGender] = useState('female')
  const [weightKg, setWeightKg] = useState(62)
  const [weightUnit, setWeightUnit] = useState('kg')
  const [heightCm, setHeightCm] = useState(165)
  const [heightUnit, setHeightUnit] = useState('cm')
  const [goal, setGoal] = useState('tonificar')
  const [level, setLevel] = useState('principiante')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [allergies, setAllergies] = useState([])
  const [dietPref, setDietPref] = useState('todo')
  const [dislikes, setDislikes] = useState('')
  const [hour, setHour] = useState('6')
  const [minute, setMinute] = useState('30')
  const [ampm, setAmpm] = useState('AM')
  const [exercise, setExercise] = useState('squats')
  const [reps, setReps] = useState(10)
  const [alarmDays, setAlarmDays] = useState([0, 1, 2, 3, 4])
  const [songId, setSongId] = useState(DEFAULT_SONG_ID)

  // Desbloqueo progresivo del paso de alarma: hora→ejercicio→días→canción.
  const [unlocked, setUnlocked] = useState(1)
  const unlock = (n) => setUnlocked((u) => Math.max(u, n))

  // Previsualización de canción (objeto Audio aparte).
  const [previewId, setPreviewId] = useState(null)
  const previewRef = useRef(null)
  const stopPreview = () => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null }
    setPreviewId(null)
  }
  useEffect(() => stopPreview, [])
  const togglePreview = (song) => {
    if (previewId === song.id) { stopPreview(); return }
    stopPreview()
    const a = new Audio(song.url)
    a.volume = 1.0
    a.play().catch(() => {})
    a.onended = () => setPreviewId((cur) => (cur === song.id ? null : cur))
    previewRef.current = a
    setPreviewId(song.id)
  }

  const toggleAlarmDay = (d) => {
    setAlarmDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  // Alergias: "ninguna" es exclusiva. Marcarla limpia el resto; marcar otra la quita.
  const toggleAllergy = (id) => {
    setAllergies((prev) => {
      if (id === 'ninguna') return prev.includes('ninguna') ? [] : ['ninguna']
      const base = prev.filter((x) => x !== 'ninguna')
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })
  }

  const computeWakeTime = () => {
    let H = parseInt(hour, 10)
    if (ampm === 'PM' && H !== 12) H += 12
    if (ampm === 'AM' && H === 12) H = 0
    return String(H).padStart(2, '0') + ':' + minute
  }

  const finish = () => {
    stopPreview()
    const wakeTime = computeWakeTime()
    updateProfile({
      name,
      age,
      gender,
      weight: weightKg,
      weightUnit,
      height: heightCm,
      heightUnit,
      goal,
      level,
      daysPerWeek,
      allergies,
      dietPref,
      dislikes: dislikes.trim(),
      wakeTime,
      exercise,
      reps,
      onboarded: true,
    })
    // Crea la primera alarma con TODO lo elegido (incl. canción y días).
    addAlarm({ hour: wakeTime, exercise, reps, days: alarmDays, songId, active: true })
    setLeaving(true)
    setTimeout(() => finishOnboarding(), 500)
  }

  const next = () => {
    if (leaving) return // ya terminando: evita crear la alarma dos veces
    if (step === 0 && !name.trim()) {
      showToast('Escribe tu nombre 😊')
      return
    }
    if (step < OB_TOTAL - 1) { setStep((s) => s + 1); return }
    // Último paso (alarma): desbloquea sección por sección antes de terminar.
    if (unlocked < 4) { setUnlocked((u) => u + 1); return }
    finish()
  }
  const prev = () => { if (step > 0) setStep((s) => s - 1) }

  const onbStyle = leaving
    ? { transition: 'opacity .5s, transform .5s', opacity: 0, transform: 'scale(1.04)' }
    : undefined

  return (
    <div id="onb" style={onbStyle}>
      <div className="ob-top">
        <button className="ob-back" onClick={prev} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>‹</button>
        <div className="progress"><i style={{ width: ((step + 1) / OB_TOTAL) * 100 + '%' }} /></div>
      </div>

      <div className="ob-body">
        {/* 0 — NOMBRE */}
        {step === 0 && (
          <div className="ob-step active">
            <div className="ob-kick">Bienvenida 🍑</div>
            <div className="ob-q">¿CÓMO TE LLAMAS?</div>
            <div className="ob-sub">Para que Brenda arme tu plan con tu nombre.</div>
            <input
              className="ob-name-input"
              placeholder="Tu nombre"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') next() }}
            />
            {cloudEnabled && (
              <div className="ob-haveaccount">
                ¿Ya tienes cuenta? <span className="auth-link" onClick={() => openAuth('login')}>Inicia sesión</span>
              </div>
            )}
          </div>
        )}

        {/* 1 — EDAD + GÉNERO */}
        {step === 1 && (
          <div className="ob-step active">
            <div className="ob-kick">Sobre ti</div>
            <div className="ob-q">¿CUÁNTOS AÑOS<br />TIENES?</div>
            <div className="ob-sub">Brenda calibra tus calorías con tu edad y género.</div>
            <RulerPicker min={16} max={80} unit="años" value={age} onChange={setAge} />
            <div className="pill-row">
              {GENDERS.map((g) => (
                <div key={g.id} className={'pill' + (gender === g.id ? ' sel' : '')} onClick={() => setGender(g.id)}>
                  {g.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2 — PESO (kg/lb) */}
        {step === 2 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu cuerpo</div>
            <div className="ob-q">¿CUÁNTO PESAS?</div>
            <div className="ob-sub">Desliza o escribe. Brenda ajusta tus calorías exactas.</div>
            <div className="unit-toggle">
              <button className={weightUnit === 'kg' ? 'sel' : ''} onClick={() => setWeightUnit('kg')}>KG</button>
              <button className={weightUnit === 'lb' ? 'sel' : ''} onClick={() => setWeightUnit('lb')}>LB</button>
            </div>
            {weightUnit === 'kg' ? (
              <RulerPicker key="kg" min={40} max={120} unit="kg" value={weightKg} onChange={setWeightKg} />
            ) : (
              <RulerPicker key="lb" min={88} max={265} unit="lb" value={kgToLb(weightKg)} onChange={(v) => setWeightKg(lbToKg(v))} />
            )}
          </div>
        )}

        {/* 3 — ALTURA (cm/ft) */}
        {step === 3 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu cuerpo</div>
            <div className="ob-q">¿CUÁNTO MIDES?</div>
            <div className="ob-sub">Desliza o escribe para tu estatura exacta.</div>
            <div className="unit-toggle">
              <button className={heightUnit === 'cm' ? 'sel' : ''} onClick={() => setHeightUnit('cm')}>CM</button>
              <button className={heightUnit === 'ft' ? 'sel' : ''} onClick={() => setHeightUnit('ft')}>FT</button>
            </div>
            {heightUnit === 'cm' ? (
              <RulerPicker key="cm" min={140} max={210} unit="cm" value={heightCm} onChange={setHeightCm} />
            ) : (
              <RulerPicker key="ft" min={55} max={83} unit="" value={cmToIn(heightCm)} onChange={(v) => setHeightCm(inToCm(v))} format={fmtFt} />
            )}
          </div>
        )}

        {/* 4 — OBJETIVO (6) */}
        {step === 4 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu meta</div>
            <div className="ob-q">¿QUÉ QUIERES LOGRAR?</div>
            <div className="ob-sub">Brenda diseña todo alrededor de esto.</div>
            <div>
              {GOALS.map((g) => (
                <div key={g.id} className={'opt' + (g.id === goal ? ' sel' : '')} onClick={() => setGoal(g.id)}>
                  <div className="oe">{g.emoji}</div>
                  <div className="ol"><b>{g.label}</b><span>{g.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5 — NIVEL */}
        {step === 5 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu experiencia</div>
            <div className="ob-q">¿CUÁL ES TU NIVEL?</div>
            <div className="ob-sub">Para ajustar la intensidad de tu plan.</div>
            <div>
              {LEVELS.map((l) => (
                <div key={l.id} className={'opt' + (l.id === level ? ' sel' : '')} onClick={() => setLevel(l.id)}>
                  <div className="oe">{l.emoji}</div>
                  <div className="ol"><b>{l.label}</b><span>{l.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6 — DÍAS POR SEMANA */}
        {step === 6 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu compromiso</div>
            <div className="ob-q">¿CUÁNTOS DÍAS<br />A LA SEMANA?</div>
            <div className="ob-sub">Sé realista. Brenda arma la semana para ti.</div>
            <div className="chip-row">
              {DAYS_OPTIONS.map((d) => (
                <div key={d} className={'chip' + (daysPerWeek === d ? ' sel' : '')} onClick={() => setDaysPerWeek(d)}>
                  {d}<span>días</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7 — ALERGIAS (multi-select) */}
        {step === 7 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu alimentación</div>
            <div className="ob-q">¿ALGUNA ALERGIA<br />O INTOLERANCIA?</div>
            <div className="ob-sub">Brenda evitará estos alimentos en tu plan. Marca todas las que apliquen.</div>
            <div className="chip-row" style={{ flexWrap: 'wrap' }}>
              {ALLERGIES.map((a) => (
                <div key={a.id} className={'chip' + (allergies.includes(a.id) ? ' sel' : '')} onClick={() => toggleAllergy(a.id)}>
                  {a.emoji}<span>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8 — PREFERENCIA DIETÉTICA (single-select) */}
        {step === 8 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu alimentación</div>
            <div className="ob-q">¿CÓMO PREFIERES<br />COMER?</div>
            <div className="ob-sub">Brenda arma tu dieta con base en esto.</div>
            <div>
              {DIET_PREFS.map((d) => (
                <div key={d.id} className={'opt' + (d.id === dietPref ? ' sel' : '')} onClick={() => setDietPref(d.id)}>
                  <div className="oe">{d.emoji}</div>
                  <div className="ol"><b>{d.label}</b><span>{d.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9 — ALIMENTOS QUE NO TE GUSTAN (texto libre, opcional) */}
        {step === 9 && (
          <div className="ob-step active">
            <div className="ob-kick">Tu alimentación</div>
            <div className="ob-q">¿ALGO QUE NO<br />TE GUSTE?</div>
            <div className="ob-sub">Opcional. Escribe alimentos que prefieres evitar (ej. brócoli, atún). Puedes saltarlo.</div>
            <input
              className="ob-name-input"
              placeholder="Ej. brócoli, hígado, cilantro…"
              autoComplete="off"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') next() }}
            />
          </div>
        )}

        {/* 10 — ALARMA (Despertar Activo) — se desbloquea por secciones */}
        {step === 10 && (
          <div className="ob-step active">
            <div className="ob-kick">Despertar Activo</div>
            <div className="ob-q">CONFIGURA<br />TU ALARMA</div>
            <div className="ob-sub">Sonará a esta hora y no para hasta que completes tus reps.</div>
            <div className="wheel-wrap">
              <div className="wheel-line" />
              <WheelPicker items={HOURS} initIdx={5} onChange={(v) => { setHour(v); unlock(2) }} />
              <div className="wheel-colon">:</div>
              <WheelPicker items={MINUTES} initIdx={30} onChange={(v) => { setMinute(v); unlock(2) }} />
              <WheelPicker items={['AM', 'PM']} initIdx={0} isAP onChange={(v) => { setAmpm(v); unlock(2) }} />
            </div>

            {unlocked >= 2 && (
              <div className="cfg-stage">
                <div className="sec-h" style={{ margin: '6px 0 10px' }}><h2 style={{ fontSize: 18 }}>EJERCICIO</h2></div>
                <div className="chip-row">
                  <div className={'chip' + (exercise === 'squats' ? ' sel' : '')} onClick={() => { setExercise('squats'); unlock(3) }}>🍑<span>Squats</span></div>
                  <div className={'chip' + (exercise === 'lunges' ? ' sel' : '')} onClick={() => { setExercise('lunges'); unlock(3) }}>🦵<span>Lunges</span></div>
                </div>
                <div className="chip-row" style={{ marginTop: 10 }}>
                  {REPS_OPTIONS.map((r) => (
                    <div key={r} className={'chip' + (reps === r ? ' sel' : '')} onClick={() => { setReps(r); unlock(3) }}>
                      {r}<span>reps</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unlocked >= 3 && (
              <div className="cfg-stage">
                <div className="sec-h" style={{ margin: '16px 0 10px' }}><h2 style={{ fontSize: 18 }}>DÍAS</h2></div>
                <div className="daysel">
                  {DAY_LABELS.map((lbl, d) => (
                    <div key={d} className={'d' + (alarmDays.includes(d) ? ' on' : '')} onClick={() => { toggleAlarmDay(d); unlock(4) }}>{lbl}</div>
                  ))}
                </div>
              </div>
            )}

            {unlocked >= 4 && (
              <div className="cfg-stage">
                <div className="sec-h" style={{ margin: '16px 0 10px' }}><h2 style={{ fontSize: 18 }}>CANCIÓN</h2></div>
                <div className="songsel">
                  {ALARM_SONGS.map((song) => (
                    <div key={song.id} className={'songrow' + (songId === song.id ? ' sel' : '')} onClick={() => { setSongId(song.id); stopPreview() }}>
                      <span className="songradio" />
                      <span className="songname">{song.nombre}</span>
                      <button
                        type="button"
                        className={'songplay' + (previewId === song.id ? ' on' : '')}
                        onClick={(e) => { e.stopPropagation(); togglePreview(song) }}
                        aria-label={previewId === song.id ? 'Detener' : 'Escuchar'}
                      >
                        {previewId === song.id ? '◼' : '▶'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unlocked < 4 && (
              <div className="cfg-hint">{unlocked === 1 ? 'Ajusta la hora ▾' : unlocked === 2 ? 'Elige ejercicio y reps ▾' : 'Elige los días ▾'}</div>
            )}
          </div>
        )}
      </div>

      <div className="ob-foot">
        <button className="cta full" onClick={next}>
          {step === OB_TOTAL - 1 ? (unlocked < 4 ? 'CONTINUAR' : 'EMPEZAR 🔥') : 'CONTINUAR'}
        </button>
      </div>
    </div>
  )
}
