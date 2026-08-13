import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'
import { useApp } from '../store'
import { ACHIEVEMENTS } from '../data/achievements'
import { getWakeStreak } from '../lib/dataStore'
import { weightSeries, workoutsByWeek, squatLungeSplit } from '../lib/progressStats'
import { getBrendaMessage } from '../data/brendaMessages'
import Button3D from '../components/ui/Button3D'

const MAGENTA = '#ff1f6b'
const LIME = '#d8ff3e'
const tooltipStyle = { background: '#141418', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff' }

function SectionTitle({ children }) {
  return <div className="pg2-h"><span className="destello-title">{children}</span></div>
}

function StreakRing({ current, best }) {
  const { t } = useApp()
  const goal = Math.max(best, 7, current, 1)
  const pct = Math.min(1, current / goal)
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  return (
    <div className="pg2-ring">
      <div className="pg2-ring-svg">
        <svg width="118" height="118" viewBox="0 0 118 118">
          <defs>
            <linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={MAGENTA} />
              <stop offset="100%" stopColor="#7a28ff" />
            </linearGradient>
          </defs>
          <circle cx="59" cy="59" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
          <circle
            cx="59" cy="59" r={r} fill="none" stroke="url(#ringgrad)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
          />
        </svg>
        <div className="pg2-ring-center">
          <div className="num">{current}</div>
          <div className="u">{t('progreso.ring_unit')}</div>
        </div>
      </div>
      <div className="pg2-ring-info">
        <h4>{t('progreso.ring_active')}</h4>
        <p>{current > 0 ? t('progreso.ring_p_on') : t('progreso.ring_p_off')}</p>
        <span className="pg2-best">{t(best === 1 ? 'progreso.ring_best_one' : 'progreso.ring_best_many', { n: best })}</span>
      </div>
    </div>
  )
}


export default function Progreso() {
  const navigate = useNavigate()
  const { t, language, progressLog, addProgressEntry, deleteProgressEntry, streak, totals, workoutLog, openSheet } = useApp()

  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!w || w <= 0) return
    addProgressEntry({ weight: w, note: note.trim() || undefined })
    setWeight('')
    setNote('')
  }

  const latest = progressLog[0]
  const prev = progressLog[1]
  const delta = latest && prev ? +(latest.weight - prev.weight).toFixed(1) : null

  const series = weightSeries(progressLog, 30)
  const weeks = workoutsByWeek(workoutLog, 8)
  const hasWeeks = weeks.some((w) => w.count > 0)
  const maxWeek = Math.max(...weeks.map((w) => w.count), 0)
  const donut = squatLungeSplit(totals)
  const best = getWakeStreak().best || 0

  return (
    <section className="screen active" id="s-progreso">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          <button className="pg-back" onClick={() => navigate('/profile')}>‹</button>
          <div><div className="hi">{t('progreso.hi')}</div><div className="name">{t('progreso.header')}</div></div>
        </div>

        <div className="pad pg2-wrap">
          {/* 1 — Registrar peso */}
          <SectionTitle>{t('progreso.t_log')}</SectionTitle>
          <form className="pg2-form reveal d2" onSubmit={submit}>
            <input className="pg2-input" type="number" step="0.1" inputMode="decimal" placeholder={t('progreso.ph_weight')} value={weight} onChange={(e) => setWeight(e.target.value)} />
            <input className="pg2-input" placeholder={t('progreso.ph_note')} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button3D type="submit" fullWidth>{t('progreso.btn_log')}</Button3D>
          </form>

          {/* 2 — Peso: hero + área */}
          <SectionTitle>{t('progreso.t_weight')}</SectionTitle>
          {latest && (
            <div className="pg2-hero reveal d3">
              <div>
                <div className="pg2-hero-lbl">{t('progreso.current_weight')}</div>
                <div className="pg2-hero-val">{latest.weight}<small> kg</small></div>
              </div>
              {delta !== null && delta !== 0 && (
                <div className={'pg2-delta ' + (delta < 0 ? 'down' : 'up')}>
                  {delta < 0 ? '▼' : '▲'} {Math.abs(delta)} kg
                </div>
              )}
            </div>
          )}
          {series.points.length >= 2 ? (
            <div className="pg2-chartcard reveal d3">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={series.points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={MAGENTA} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={MAGENTA} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,.1)' }} tickLine={false} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#8a8a93' }} />
                  <Area type="monotone" dataKey="weight" stroke={MAGENTA} strokeWidth={3} fill="url(#wgrad)" dot={{ fill: MAGENTA, r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="pg2-sub" style={{ textAlign: 'center', paddingBottom: 6 }}>{t('progreso.minmax', { min: series.min, max: series.max })}</div>
            </div>
          ) : (
            <div className="pg2-empty reveal d3">
              <div className="pg2-empty-emoji">📈</div>
              <p>{t('progreso.empty_weight')}</p>
            </div>
          )}

          {/* 3 — KPIs */}
          <SectionTitle>{t('progreso.t_numbers')}</SectionTitle>
          <div className="pg2-kpis reveal d3">
            <div className="pg2-kpi pg2-kpi--m"><span className="n">{totals.squat || 0}</span><div className="k">Squats</div></div>
            <div className="pg2-kpi pg2-kpi--l"><span className="n">{totals.lunge || 0}</span><div className="k">Lunges</div></div>
            <div className="pg2-kpi pg2-kpi--m"><span className="n">{totals.reps || 0}</span><div className="k">{t('progreso.kpi_reps_total')}</div></div>
            <div className="pg2-kpi pg2-kpi--l"><span className="n">{totals.workouts || 0}</span><div className="k">{t('progreso.kpi_workouts')}</div></div>
          </div>

          {/* 4 — Racha */}
          <SectionTitle>{t('progreso.t_streak')}</SectionTitle>
          <div className="reveal d4"><StreakRing current={streak} best={best} /></div>

          {/* 5 — Entrenamientos por semana */}
          <SectionTitle>{t('progreso.t_weekly')}</SectionTitle>
          {hasWeeks ? (
            <div className="pg2-chartcard pad-r reveal d4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeks} margin={{ top: 8, right: 0, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#8a8a93', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,.1)' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#8a8a93' }} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {weeks.map((w, i) => <Cell key={i} fill={w.count === maxWeek && maxWeek > 0 ? LIME : MAGENTA} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="pg2-empty reveal d4">
              <div className="pg2-empty-emoji">📊</div>
              <p>{t('progreso.empty_weekly')}</p>
            </div>
          )}

          {/* 6 — Donut Squats vs Lunges */}
          <SectionTitle>{t('progreso.t_split')}</SectionTitle>
          {donut.total > 0 ? (
            <div className="pg2-chartcard pad-r reveal d5" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={donut.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={donut.squat && donut.lunge ? 3 : 0} stroke="none">
                    <Cell fill={MAGENTA} />
                    <Cell fill={LIME} />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: MAGENTA }} /><b style={{ fontFamily: 'Archivo', fontWeight: 800 }}>{donut.squat}</b> <span style={{ color: 'var(--txt-dim)', fontSize: 13 }}>Squats</span></div></div>
                <div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: LIME }} /><b style={{ fontFamily: 'Archivo', fontWeight: 800 }}>{donut.lunge}</b> <span style={{ color: 'var(--txt-dim)', fontSize: 13 }}>Lunges</span></div></div>
              </div>
            </div>
          ) : (
            <div className="pg2-empty reveal d5">
              <div className="pg2-empty-emoji">🍑</div>
              <p>{t('progreso.empty_split')}</p>
            </div>
          )}

          {/* 7 — Logros */}
          <SectionTitle>{t('progreso.t_ach')}</SectionTitle>
          <div className="pg2-badges reveal d5">
            {ACHIEVEMENTS.map((a) => {
              const done = a.check(streak, totals.workouts)
              return (
                <div className={'pg2-badge' + (done ? ' done' : ' locked')} key={a.id}>
                  <div className="e">{a.emoji}</div>
                  <div className="nm">{t('progreso.ach.' + a.id + '.name')}</div>
                  <div className="rq">{done ? t('progreso.unlocked') : t('progreso.ach.' + a.id + '.req')}</div>
                </div>
              )
            })}
          </div>

          {/* 8 — Historial */}
          <SectionTitle>{t('progreso.t_history')}</SectionTitle>
          {progressLog.length === 0 ? (
            <div className="pg2-empty reveal d6">
              <div className="pg2-empty-emoji">📝</div>
              <p>{getBrendaMessage(language, 'emptyProgress')}</p>
            </div>
          ) : (
            <div className="pg2-hist reveal d6">
              {progressLog.map((p) => (
                <div className="pg2-hrow" key={p.id}>
                  <div className="pg2-hrow-date">{p.date}</div>
                  <div className="pg2-hrow-main">
                    <b>{p.weight} kg</b>
                    {p.note && <span>{p.note}</span>}
                  </div>
                  {confirmId === p.id ? (
                    <div className="pg2-confirm">
                      <button onClick={() => { deleteProgressEntry(p.id); setConfirmId(null) }}>{t('progreso.yes')}</button>
                      <button className="no" onClick={() => setConfirmId(null)}>{t('progreso.no')}</button>
                    </div>
                  ) : (
                    <button className="pg2-del" onClick={() => setConfirmId(p.id)}>🗑</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
