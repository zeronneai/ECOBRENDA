import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { GOALS, LEVELS, DAYS_OPTIONS, goalLabel } from '../data/onboarding'

const kgToLb = (kg) => Math.round(kg * 2.20462)
const lbToKg = (lb) => Math.round(lb / 2.20462)
const cmToIn = (cm) => Math.round(cm / 2.54)
const inToCm = (i) => Math.round(i * 2.54)
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export default function Profile() {
  const navigate = useNavigate()
  const { profile, updateProfile, subscription, settings, saveSettings, resetProgress, openSheet, showToast } = useApp()
  const { isPremium } = useSubscription()

  // Medidas con estado local (para escribir decimales / pies+pulgadas).
  const [wUnit, setWUnit] = useState(profile.weightUnit || 'kg')
  const [wVal, setWVal] = useState(String((profile.weightUnit === 'lb' ? kgToLb(profile.weight) : profile.weight)))
  const [hUnit, setHUnit] = useState(profile.heightUnit || 'cm')
  const [cmVal, setCmVal] = useState(String(profile.height))
  const [ftVal, setFtVal] = useState(String(Math.floor(cmToIn(profile.height) / 12)))
  const [inVal, setInVal] = useState(String(cmToIn(profile.height) % 12))

  const [confirm, setConfirm] = useState(null) // 'reset' | 'startover'

  const firstName = profile.name ? profile.name.split(' ')[0].toUpperCase() : 'HOLA'
  const avatarLetter = firstName[0] || 'B'
  const memberSince = profile.createdAt
    ? cap(new Date(profile.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))
    : null

  // ── Medidas ──
  const onWeight = (val) => {
    setWVal(val)
    const n = parseFloat(val)
    if (!Number.isFinite(n) || n <= 0) return
    updateProfile({ weight: wUnit === 'kg' ? n : lbToKg(n), weightUnit: wUnit })
  }
  const onWUnit = (u) => {
    setWUnit(u)
    setWVal(String(u === 'lb' ? kgToLb(profile.weight) : profile.weight))
    updateProfile({ weightUnit: u })
  }
  const onCm = (val) => {
    setCmVal(val)
    const n = parseFloat(val)
    if (Number.isFinite(n) && n > 0) updateProfile({ height: n, heightUnit: 'cm' })
  }
  const onFtIn = (ft, inch) => {
    setFtVal(ft); setInVal(inch)
    const f = parseInt(ft, 10) || 0
    const i = parseInt(inch, 10) || 0
    if (f > 0 || i > 0) updateProfile({ height: inToCm(f * 12 + i), heightUnit: 'ft' })
  }
  const onHUnit = (u) => {
    setHUnit(u)
    if (u === 'cm') setCmVal(String(profile.height))
    else { setFtVal(String(Math.floor(cmToIn(profile.height) / 12))); setInVal(String(cmToIn(profile.height) % 12)) }
    updateProfile({ heightUnit: u })
  }

  // ── Zona de peligro ──
  const doReset = () => { resetProgress(); setConfirm(null); showToast('Progreso reiniciado') }
  const doStartOver = () => {
    Object.keys(localStorage).filter((k) => k.startsWith('bf:') || k.startsWith('bac:')).forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }

  const Toggle = ({ on, onClick }) => (
    <div className={'toggle' + (on ? ' on' : '')} onClick={onClick}><div className="knob" /></div>
  )

  return (
    <section className="screen active" id="s-profile">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1"><div><div className="hi">Cuenta</div><div className="name">PERFIL</div></div></div>

        <div className="pad">
          {/* Tarjeta de usuario */}
          <div className="pf-user reveal d1">
            <div className="pf-avatar">{avatarLetter}</div>
            <div>
              <div className="pf-name">{firstName}</div>
              <div className="pf-meta">{goalLabel(profile.goal)}{profile.level ? ` · ${cap(profile.level)}` : ''}</div>
              {memberSince && <div className="pf-since">Miembro desde {memberSince}</div>}
            </div>
          </div>

          {/* Suscripción */}
          <div className={'pf-sub reveal d2' + (isPremium ? ' prem' : '')}>
            <div>
              <div className="pf-sub-t">{isPremium ? 'Premium · Brenda Fitness' : 'Plan gratuito'}</div>
              <div className="pf-sub-d">{isPremium ? `Plan ${subscription.plan || 'activo'} · activo` : 'Booty Alarm · alarma incluida'}</div>
            </div>
            {isPremium ? (
              <button onClick={() => showToast('Gestión de suscripción próximamente')}>Gestionar</button>
            ) : (
              <button onClick={() => openSheet('paywall')}>Hazte premium</button>
            )}
          </div>

          {/* Mi cuenta */}
          <div className="pf-sec reveal d3">
            <h3>MI CUENTA</h3>
            <div className="pf-field">
              <label>Nombre</label>
              <input className="pf-input" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
            </div>
            <div className="pf-field">
              <label>Objetivo</label>
              <select className="pf-select" value={profile.goal} onChange={(e) => updateProfile({ goal: e.target.value })}>
                {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Nivel</label>
              <select className="pf-select" value={profile.level || 'principiante'} onChange={(e) => updateProfile({ level: e.target.value })}>
                {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Días por semana</label>
              <select className="pf-select" value={profile.daysPerWeek || 4} onChange={(e) => updateProfile({ daysPerWeek: parseInt(e.target.value, 10) })}>
                {DAYS_OPTIONS.map((d) => <option key={d} value={d}>{d} días</option>)}
              </select>
            </div>
          </div>

          {/* Medidas */}
          <div className="pf-sec reveal d4">
            <h3>MEDIDAS</h3>
            <div className="pf-field">
              <label>Peso</label>
              <div className="pf-measure">
                <input className="pf-input" type="number" step="0.1" inputMode="decimal" value={wVal} onChange={(e) => onWeight(e.target.value)} />
                <div className="unit-toggle">
                  <button className={wUnit === 'kg' ? 'sel' : ''} onClick={() => onWUnit('kg')}>KG</button>
                  <button className={wUnit === 'lb' ? 'sel' : ''} onClick={() => onWUnit('lb')}>LB</button>
                </div>
              </div>
            </div>
            <div className="pf-field">
              <label>Altura</label>
              <div className="pf-measure">
                {hUnit === 'cm' ? (
                  <input className="pf-input" type="number" inputMode="numeric" value={cmVal} onChange={(e) => onCm(e.target.value)} />
                ) : (
                  <div className="pf-ft">
                    <input className="pf-input" type="number" inputMode="numeric" placeholder="pies" value={ftVal} onChange={(e) => onFtIn(e.target.value, inVal)} />
                    <input className="pf-input" type="number" inputMode="numeric" placeholder="pulg" value={inVal} onChange={(e) => onFtIn(ftVal, e.target.value)} />
                  </div>
                )}
                <div className="unit-toggle">
                  <button className={hUnit === 'cm' ? 'sel' : ''} onClick={() => onHUnit('cm')}>CM</button>
                  <button className={hUnit === 'ft' ? 'sel' : ''} onClick={() => onHUnit('ft')}>FT</button>
                </div>
              </div>
            </div>
          </div>

          {/* Notificaciones */}
          <div className="pf-sec reveal d5">
            <h3>NOTIFICACIONES</h3>
            <div className="set-row">
              <div><div className="t">Recordatorio diario</div><div className="d">Un empujón para moverte</div></div>
              <Toggle on={settings.reminder} onClick={() => saveSettings({ reminder: !settings.reminder })} />
            </div>
            {settings.reminder && (
              <div className="pf-field" style={{ marginTop: 12 }}>
                <label>Hora del recordatorio</label>
                <input className="pf-input" type="time" value={settings.reminderTime} onChange={(e) => saveSettings({ reminderTime: e.target.value })} />
              </div>
            )}
            <div className="set-row">
              <div><div className="t">Alertas de racha</div><div className="d">Avísame si voy a perder mi racha</div></div>
              <Toggle on={settings.streakAlerts} onClick={() => saveSettings({ streakAlerts: !settings.streakAlerts })} />
            </div>
            <div className="set-row">
              <div><div className="t">Reporte semanal</div><div className="d">Resumen de tu semana</div></div>
              <Toggle on={settings.weeklyReport} onClick={() => saveSettings({ weeklyReport: !settings.weeklyReport })} />
            </div>
          </div>

          {/* Acerca de */}
          <div className="pf-sec reveal d6">
            <h3>ACERCA DE</h3>
            <div className="pf-link-row" onClick={() => navigate('/privacy')}>
              <span>Privacidad</span><span className="v">›</span>
            </div>
            <div className="pf-link-row">
              <span>Versión</span><span className="v">0.1.0</span>
            </div>
          </div>

          {/* Zona de peligro */}
          <div className="pf-sec reveal d6">
            <h3>ZONA DE PELIGRO</h3>

            {confirm === 'reset' ? (
              <div className="pf-danger-confirm">
                <p>¿Reiniciar tu progreso? Se borran tus entrenamientos y registros de peso. Tu perfil y suscripción se mantienen.</p>
                <div className="row">
                  <button className="yes" onClick={doReset}>Sí, reiniciar</button>
                  <button className="no" onClick={() => setConfirm(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="pf-danger-btn" onClick={() => setConfirm('reset')}>Reiniciar progreso</button>
            )}

            {confirm === 'startover' ? (
              <div className="pf-danger-confirm">
                <p>¿Empezar de nuevo? Se borra TODO (perfil, alarmas, progreso) y volverás al onboarding. No se puede deshacer.</p>
                <div className="row">
                  <button className="yes" onClick={doStartOver}>Sí, borrar todo</button>
                  <button className="no" onClick={() => setConfirm(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="pf-danger-btn hard" onClick={() => setConfirm('startover')}>Empezar de nuevo</button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
