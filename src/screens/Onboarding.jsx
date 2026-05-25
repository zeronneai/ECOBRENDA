import { useState } from 'react'
import { useApp } from '../store'
import { GOALS, LEVELS, GENDERS, DAYS_OPTIONS } from '../data/onboarding'
import RulerPicker from '../components/RulerPicker'
import WheelPicker from '../components/WheelPicker'

const OB_TOTAL = 8

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const REPS_OPTIONS = [5, 8, 10, 12, 15, 20]

// Conversiones (canónico: kg + cm).
const kgToLb = (kg) => Math.round(kg * 2.20462)
const lbToKg = (lb) => Math.round(lb / 2.20462)
const cmToIn = (cm) => Math.round(cm / 2.54)
const inToCm = (inch) => Math.round(inch * 2.54)
const fmtFt = (inch) => `${Math.floor(inch / 12)}'${inch % 12}"`

export default function Onboarding() {
  const { updateProfile, finishOnboarding, showToast } = useApp()

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
  const [hour, setHour] = useState('6')
  const [minute, setMinute] = useState('30')
  const [ampm, setAmpm] = useState('AM')
  const [exercise, setExercise] = useState('squats')
  const [reps, setReps] = useState(10)

  const computeWakeTime = () => {
    let H = parseInt(hour, 10)
    if (ampm === 'PM' && H !== 12) H += 12
    if (ampm === 'AM' && H === 12) H = 0
    return String(H).padStart(2, '0') + ':' + minute
  }

  const finish = () => {
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
      wakeTime: computeWakeTime(),
      exercise,
      reps,
      onboarded: true,
    })
    setLeaving(true)
    setTimeout(() => finishOnboarding(), 500)
  }

  const next = () => {
    if (step === 0 && !name.trim()) {
      showToast('Escribe tu nombre 😊')
      return
    }
    if (step < OB_TOTAL - 1) setStep((s) => s + 1)
    else finish()
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

        {/* 7 — ALARMA (Despertar Activo) */}
        {step === 7 && (
          <div className="ob-step active">
            <div className="ob-kick">Despertar Activo</div>
            <div className="ob-q">CONFIGURA<br />TU ALARMA</div>
            <div className="ob-sub">Sonará a esta hora y no para hasta que completes tus reps.</div>
            <div className="wheel-wrap">
              <div className="wheel-line" />
              <WheelPicker items={HOURS} initIdx={5} onChange={(v) => setHour(v)} />
              <div className="wheel-colon">:</div>
              <WheelPicker items={MINUTES} initIdx={30} onChange={(v) => setMinute(v)} />
              <WheelPicker items={['AM', 'PM']} initIdx={0} isAP onChange={(v) => setAmpm(v)} />
            </div>
            <div className="chip-row" style={{ marginTop: 4 }}>
              <div className={'chip' + (exercise === 'squats' ? ' sel' : '')} onClick={() => setExercise('squats')}>🍑<span>Squats</span></div>
              <div className={'chip' + (exercise === 'lunges' ? ' sel' : '')} onClick={() => setExercise('lunges')}>🦵<span>Lunges</span></div>
            </div>
            <div className="chip-row" style={{ marginTop: 10 }}>
              {REPS_OPTIONS.map((r) => (
                <div key={r} className={'chip' + (reps === r ? ' sel' : '')} onClick={() => setReps(r)}>
                  {r}<span>reps</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ob-foot">
        <button className="cta full" onClick={next}>
          {step === OB_TOTAL - 1 ? 'EMPEZAR 🔥' : 'CONTINUAR'}
        </button>
      </div>
    </div>
  )
}
