import { useState } from 'react'
import { useApp } from '../store'
import { GOALS } from '../data/plans'
import RulerPicker from '../components/RulerPicker'
import WheelPicker from '../components/WheelPicker'

const OB_TOTAL = 5

const GOAL_SUBS = {
  perder_grasa: 'Define y baja de talla',
  tonificar: 'Curvas y firmeza',
  ganar_musculo: 'Construye volumen',
  mantener: 'Energía y equilibrio',
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export default function Onboarding() {
  const { updateProfile, finishOnboarding, showToast } = useApp()

  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('tonificar')
  const [weight, setWeight] = useState(62)
  const [height, setHeight] = useState(165)
  const [hour, setHour] = useState('6')
  const [minute, setMinute] = useState('30')
  const [ampm, setAmpm] = useState('AM')

  const computeWakeTime = () => {
    let H = parseInt(hour, 10)
    if (ampm === 'PM' && H !== 12) H += 12
    if (ampm === 'AM' && H === 12) H = 0
    return String(H).padStart(2, '0') + ':' + minute
  }

  const finish = () => {
    updateProfile({ name, goal, weight, height, wakeTime: computeWakeTime() })
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

  const prev = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const onbStyle = leaving
    ? { transition: 'opacity .5s, transform .5s', opacity: 0, transform: 'scale(1.04)' }
    : undefined

  return (
    <div id="onb" style={onbStyle}>
      <div className="ob-top">
        <button
          className="ob-back"
          onClick={prev}
          style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          ‹
        </button>
        <div className="progress">
          <i style={{ width: ((step + 1) / OB_TOTAL) * 100 + '%' }} />
        </div>
      </div>

      <div className="ob-body">
        {step === 0 && (
          <div className="ob-step active" data-step="0">
            <div className="ob-kick">Bienvenida 🍑</div>
            <div className="ob-q">¿CÓMO TE LLAMAS?</div>
            <div className="ob-sub">Para que Brenda arme tu plan con tu nombre.</div>
            <input
              className="ob-name-input"
              placeholder="Tu nombre"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') next()
              }}
            />
          </div>
        )}

        {step === 1 && (
          <div className="ob-step active" data-step="1">
            <div className="ob-kick">Tu meta</div>
            <div className="ob-q">¿QUÉ QUIERES LOGRAR?</div>
            <div className="ob-sub">Brenda diseña todo alrededor de esto.</div>
            <div>
              {Object.values(GOALS).map((g) => (
                <div
                  key={g.id}
                  className={'opt' + (g.id === goal ? ' sel' : '')}
                  onClick={() => setGoal(g.id)}
                >
                  <div className="oe">{g.emoji}</div>
                  <div className="ol">
                    <b>{g.label}</b>
                    <span>{GOAL_SUBS[g.id]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step active" data-step="2">
            <div className="ob-kick">Tu cuerpo</div>
            <div className="ob-q">¿CUÁNTO PESAS?</div>
            <div className="ob-sub">Desliza la regla. Brenda ajusta tus calorías exactas.</div>
            <RulerPicker min={40} max={120} unit="kg" value={weight} onChange={setWeight} />
          </div>
        )}

        {step === 3 && (
          <div className="ob-step active" data-step="3">
            <div className="ob-kick">Tu cuerpo</div>
            <div className="ob-q">¿CUÁNTO MIDES?</div>
            <div className="ob-sub">Desliza para tu estatura exacta.</div>
            <RulerPicker min={140} max={200} unit="cm" value={height} onChange={setHeight} />
          </div>
        )}

        {step === 4 && (
          <div className="ob-step active" data-step="4">
            <div className="ob-kick">Tu rutina diaria</div>
            <div className="ob-q">
              ¿A QUÉ HORA<br />DESPIERTAS?
            </div>
            <div className="ob-sub">
              Tu Booty Alarm sonará a esta hora. No para hasta que te muevas.
            </div>
            <div className="wheel-wrap">
              <div className="wheel-line" />
              <WheelPicker items={HOURS} initIdx={5} onChange={(v) => setHour(v)} />
              <div className="wheel-colon">:</div>
              <WheelPicker items={MINUTES} initIdx={30} onChange={(v) => setMinute(v)} />
              <WheelPicker items={['AM', 'PM']} initIdx={0} isAP onChange={(v) => setAmpm(v)} />
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
