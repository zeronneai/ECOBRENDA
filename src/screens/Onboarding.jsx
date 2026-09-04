import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store'
import { GOALS, LEVELS, GENDERS, DAYS_OPTIONS, DAY_LABELS, ALLERGIES, DIET_PREFS } from '../data/onboarding'
import { ALARM_SONGS, DEFAULT_SONG_ID } from '../data/songs'
import { unlockPreview, playPreview, stopPreview as stopPreviewAudio } from '../lib/previewAudio'
import { pickAvatarPhoto } from '../lib/avatar'
import RulerPicker from '../components/RulerPicker'
import WheelPicker from '../components/WheelPicker'
import LanguageSelect from '../components/LanguageSelect'

const OB_TOTAL = 13

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
  const { updateProfile, addAlarm, finishOnboarding, showToast, cloudEnabled, openAuth, language, setLanguage, t } = useApp()

  const [langPicked, setLangPicked] = useState(false)
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const [name, setName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null) // dataUrl (se sube tras crear cuenta)
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
  const [trainLocation, setTrainLocation] = useState(null) // null = omitido → se trata como gym
  const [equipment, setEquipment] = useState('')
  const [injuries, setInjuries] = useState('')
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

  // Previsualización de canción (helper aislado, bendecido para iOS).
  const [previewId, setPreviewId] = useState(null)
  const stopPreview = () => { stopPreviewAudio(); setPreviewId(null) }
  useEffect(() => () => stopPreviewAudio(), [])
  const togglePreview = (song) => {
    if (previewId === song.id) { stopPreview(); return }
    unlockPreview() // bendice el elemento DENTRO del gesto (iOS)
    playPreview(song.url, () => setPreviewId((cur) => (cur === song.id ? null : cur)))
    setPreviewId(song.id)
  }

  const toggleAlarmDay = (d) => {
    setAlarmDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  // Foto de perfil (opcional): captura + preview. La subida ocurre tras el signup.
  const addPhoto = async () => {
    const dataUrl = await pickAvatarPhoto()
    if (dataUrl) setAvatarPreview(dataUrl)
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
      trainLocation,
      equipment: equipment.trim(),
      injuries: injuries.trim(),
      ...(avatarPreview ? { avatarPendingDataUrl: avatarPreview } : {}),
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
      showToast(t('onboarding.name.toast'))
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

  // Paso 0 real: elegir idioma (antes de cualquier texto del onboarding).
  if (!langPicked) {
    return (
      <div id="onb">
        <div className="ob-body ob-lang-screen">
          <div className="ob-lang-brand">🍑 BOOTY ALARM</div>
          <LanguageSelect current={language} onPick={(l) => { setLanguage(l); setLangPicked(true) }} />
        </div>
      </div>
    )
  }

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
            <div className="ob-kick">{t('onboarding.name.kick')}</div>
            <div className="ob-q">{t('onboarding.name.q')}</div>
            <div className="ob-sub">{t('onboarding.name.sub')}</div>
            <input
              className="ob-name-input"
              placeholder={t('onboarding.name.placeholder')}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') next() }}
            />
            {cloudEnabled && (
              <div className="ob-haveaccount">
                {t('onboarding.name.have_account')} <span className="auth-link" onClick={() => openAuth('login')}>{t('onboarding.name.sign_in')}</span>
              </div>
            )}
          </div>
        )}

        {/* 1 — FOTO DE PERFIL (opcional) */}
        {step === 1 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.photo.kick')}</div>
            <div className="ob-q">{t('onboarding.photo.q')}</div>
            <div className="ob-sub">{t('onboarding.photo.sub')}</div>
            <div className="ob-avatar-wrap">
              <button type="button" className="ob-avatar" onClick={addPhoto} aria-label={t('onboarding.photo.add')}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="" />
                  : <span>{(name.trim()[0] || '🍑').toUpperCase()}</span>}
                <span className="ob-avatar-cam">📷</span>
              </button>
            </div>
            <button className="cta full" onClick={addPhoto}>{avatarPreview ? t('onboarding.photo.change') : t('onboarding.photo.add')}</button>
          </div>
        )}

        {/* 2 — EDAD + GÉNERO */}
        {step === 2 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.age.kick')}</div>
            <div className="ob-q">{t('onboarding.age.q')}</div>
            <div className="ob-sub">{t('onboarding.age.sub')}</div>
            <RulerPicker min={16} max={80} unit={t('onboarding.age.unit')} value={age} onChange={setAge} />
            <div className="pill-row">
              {GENDERS.map((g) => (
                <div key={g.id} className={'pill' + (gender === g.id ? ' sel' : '')} onClick={() => setGender(g.id)}>
                  {t('onboarding.genders.' + g.id)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2 — PESO (kg/lb) */}
        {step === 3 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.body_kick')}</div>
            <div className="ob-q">{t('onboarding.weight.q')}</div>
            <div className="ob-sub">{t('onboarding.weight.sub')}</div>
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
        {step === 4 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.body_kick')}</div>
            <div className="ob-q">{t('onboarding.height.q')}</div>
            <div className="ob-sub">{t('onboarding.height.sub')}</div>
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
        {step === 5 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.goal.kick')}</div>
            <div className="ob-q">{t('onboarding.goal.q')}</div>
            <div className="ob-sub">{t('onboarding.goal.sub')}</div>
            <div>
              {GOALS.map((g) => (
                <div key={g.id} className={'opt' + (g.id === goal ? ' sel' : '')} onClick={() => setGoal(g.id)}>
                  <div className="oe">{g.emoji}</div>
                  <div className="ol"><b>{t('onboarding.goals.' + g.id + '.label')}</b><span>{t('onboarding.goals.' + g.id + '.desc')}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5 — NIVEL */}
        {step === 6 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.level.kick')}</div>
            <div className="ob-q">{t('onboarding.level.q')}</div>
            <div className="ob-sub">{t('onboarding.level.sub')}</div>
            <div>
              {LEVELS.map((l) => (
                <div key={l.id} className={'opt' + (l.id === level ? ' sel' : '')} onClick={() => setLevel(l.id)}>
                  <div className="oe">{l.emoji}</div>
                  <div className="ol"><b>{t('onboarding.levels.' + l.id + '.label')}</b><span>{t('onboarding.levels.' + l.id + '.desc')}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6 — DÍAS POR SEMANA */}
        {step === 7 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.days.kick')}</div>
            <div className="ob-q">{t('onboarding.days.q')}</div>
            <div className="ob-sub">{t('onboarding.days.sub')}</div>
            <div className="chip-row">
              {DAYS_OPTIONS.map((d) => (
                <div key={d} className={'chip' + (daysPerWeek === d ? ' sel' : '')} onClick={() => setDaysPerWeek(d)}>
                  {d}<span>{t('onboarding.days.unit')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8 — DÓNDE ENTRENA + EQUIPO (alimenta la generación de la rutina) */}
        {step === 8 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.train.kick')}</div>
            <div className="ob-q">{t('onboarding.train.q')}</div>
            <div className="ob-sub">{t('onboarding.train.sub')}</div>
            <div>
              <div className={'opt' + (trainLocation === 'gym' ? ' sel' : '')} onClick={() => setTrainLocation('gym')}>
                <div className="oe">🏋️</div>
                <div className="ol"><b>{t('onboarding.train.gym')}</b><span>{t('onboarding.train.gym_desc')}</span></div>
              </div>
              <div className={'opt' + (trainLocation === 'home' ? ' sel' : '')} onClick={() => setTrainLocation('home')}>
                <div className="oe">🏠</div>
                <div className="ol"><b>{t('onboarding.train.home')}</b><span>{t('onboarding.train.home_desc')}</span></div>
              </div>
            </div>
            <div className="ob-q" style={{ marginTop: 18 }}>{t('onboarding.equip.q')}</div>
            <div className="ob-sub">{t('onboarding.equip.sub')}</div>
            <input
              className="ob-name-input"
              placeholder={t('onboarding.equip.placeholder')}
              autoComplete="off"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') next() }}
            />
            <div className="ob-q" style={{ marginTop: 18 }}>{t('onboarding.injuries.q')}</div>
            <div className="ob-sub">{t('onboarding.injuries.sub')}</div>
            <input
              className="ob-name-input"
              placeholder={t('onboarding.injuries.placeholder')}
              autoComplete="off"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') next() }}
            />
          </div>
        )}

        {/* 9 — ALERGIAS (multi-select) */}
        {step === 9 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.food_kick')}</div>
            <div className="ob-q">{t('onboarding.allergy.q')}</div>
            <div className="ob-sub">{t('onboarding.allergy.sub')}</div>
            <div className="allergy-grid">
              {ALLERGIES.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={'allergy-chip' + (allergies.includes(a.id) ? ' sel' : '')}
                  onClick={() => toggleAllergy(a.id)}
                >
                  <span className="ae">{a.emoji}</span>
                  <span className="al">{t('onboarding.allergies.' + a.id)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 8 — PREFERENCIA DIETÉTICA (single-select) */}
        {step === 10 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.food_kick')}</div>
            <div className="ob-q">{t('onboarding.diet.q')}</div>
            <div className="ob-sub">{t('onboarding.diet.sub')}</div>
            <div>
              {DIET_PREFS.map((d) => (
                <div key={d.id} className={'opt' + (d.id === dietPref ? ' sel' : '')} onClick={() => setDietPref(d.id)}>
                  <div className="oe">{d.emoji}</div>
                  <div className="ol"><b>{t('onboarding.diet_prefs.' + d.id + '.label')}</b><span>{t('onboarding.diet_prefs.' + d.id + '.desc')}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9 — ALIMENTOS QUE NO TE GUSTAN (texto libre, opcional) */}
        {step === 11 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.food_kick')}</div>
            <div className="ob-q">{t('onboarding.dislikes.q')}</div>
            <div className="ob-sub">{t('onboarding.dislikes.sub')}</div>
            <input
              className="ob-name-input"
              placeholder={t('onboarding.dislikes.placeholder')}
              autoComplete="off"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') next() }}
            />
          </div>
        )}

        {/* 10 — ALARMA (Despertar Activo) — se desbloquea por secciones */}
        {step === 12 && (
          <div className="ob-step active">
            <div className="ob-kick">{t('onboarding.alarm.kick')}</div>
            <div className="ob-q">{t('onboarding.alarm.q')}</div>
            <div className="ob-sub">{t('onboarding.alarm.sub')}</div>
            <div className="wheel-wrap">
              <div className="wheel-line" />
              <WheelPicker items={HOURS} initIdx={5} onChange={(v) => { setHour(v); unlock(2) }} />
              <div className="wheel-colon">:</div>
              <WheelPicker items={MINUTES} initIdx={30} onChange={(v) => { setMinute(v); unlock(2) }} />
              <WheelPicker items={['AM', 'PM']} initIdx={0} isAP onChange={(v) => { setAmpm(v); unlock(2) }} />
            </div>

            {unlocked >= 2 && (
              <div className="cfg-stage">
                <div className="sec-h" style={{ margin: '6px 0 10px' }}><h2 style={{ fontSize: 18 }}>{t('onboarding.alarm.exercise_h')}</h2></div>
                <div className="chip-row">
                  <div className={'chip' + (exercise === 'squats' ? ' sel' : '')} onClick={() => { setExercise('squats'); unlock(3) }}>🍑<span>Squats</span></div>
                  <div className={'chip' + (exercise === 'lunges' ? ' sel' : '')} onClick={() => { setExercise('lunges'); unlock(3) }}>🦵<span>Lunges</span></div>
                </div>
                <div className="chip-row" style={{ marginTop: 10 }}>
                  {REPS_OPTIONS.map((r) => (
                    <div key={r} className={'chip' + (reps === r ? ' sel' : '')} onClick={() => { setReps(r); unlock(3) }}>
                      {r}<span>{t('onboarding.alarm.reps_unit')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unlocked >= 3 && (
              <div className="cfg-stage">
                <div className="sec-h" style={{ margin: '16px 0 10px' }}><h2 style={{ fontSize: 18 }}>{t('onboarding.alarm.days_h')}</h2></div>
                <div className="daysel">
                  {t('onboarding.alarm.day_initials').split(',').map((lbl, d) => (
                    <div key={d} className={'d' + (alarmDays.includes(d) ? ' on' : '')} onClick={() => { toggleAlarmDay(d); unlock(4) }}>{lbl}</div>
                  ))}
                </div>
              </div>
            )}

            {unlocked >= 4 && (
              <div className="cfg-stage">
                <div className="sec-h" style={{ margin: '16px 0 10px' }}><h2 style={{ fontSize: 18 }}>{t('onboarding.alarm.song_h')}</h2></div>
                <div className="songsel">
                  {ALARM_SONGS.map((song) => (
                    <div key={song.id} className={'songrow' + (songId === song.id ? ' sel' : '')} onClick={() => { setSongId(song.id); stopPreview() }}>
                      <span className="songradio" />
                      <span className="songname">{song.nombre}</span>
                      <button
                        type="button"
                        className={'songplay' + (previewId === song.id ? ' on' : '')}
                        onClick={(e) => { e.stopPropagation(); togglePreview(song) }}
                        aria-label={previewId === song.id ? t('onboarding.alarm.stop') : t('onboarding.alarm.play')}
                      >
                        {previewId === song.id ? '◼' : '▶'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unlocked < 4 && (
              <div className="cfg-hint">{unlocked === 1 ? t('onboarding.alarm.hint_hour') : unlocked === 2 ? t('onboarding.alarm.hint_ex') : t('onboarding.alarm.hint_days')}</div>
            )}
          </div>
        )}
      </div>

      <div className="ob-foot">
        <button className="cta full" onClick={next}>
          {step === OB_TOTAL - 1
            ? (unlocked < 4 ? t('onboarding.continue') : t('onboarding.start'))
            : (step === 1 && !avatarPreview) || (step === 8 && !trainLocation) ? t('onboarding.skip')
            : t('onboarding.continue')}
        </button>
      </div>
    </div>
  )
}
