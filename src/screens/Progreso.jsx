import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { ACHIEVEMENTS } from '../data/achievements'

export default function Progreso() {
  const navigate = useNavigate()
  const { progressLog, addProgressEntry, deleteProgressEntry, streak, totals, openSheet } = useApp()
  const { isPremium } = useSubscription()

  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  if (!isPremium) {
    return (
      <section className="screen active" id="s-progreso">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
            <button className="pg-back" onClick={() => navigate('/profile')}>‹</button>
            <div><div className="hi">Premium</div><div className="name">PROGRESO</div></div>
          </div>
          <div className="pad reveal d2">
            <div className="brenda-promo" style={{ minHeight: 220 }}>
              <div className="glow" /><div className="shimmer" />
              <div className="lock-pill">🔒 PREMIUM</div>
              <div className="inner">
                <div className="kick">Tu evolución</div>
                <h3>REGISTRA TU PROGRESO</h3>
                <p>Peso, gráficas y logros desbloqueables. Disponible con Brenda.</p>
                <button className="unlock" onClick={() => openSheet('paywall')}>VER PLANES →</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!w || w <= 0) return
    addProgressEntry({ weight: w, note: note.trim() || undefined })
    setWeight('')
    setNote('')
  }

  const totalWorkouts = totals.workouts
  const latest = progressLog[0]
  const prev = progressLog[1]
  const delta = latest && prev ? +(latest.weight - prev.weight).toFixed(1) : null

  // Gráfica: últimas 30 entradas en orden cronológico.
  const chartData = progressLog.slice(0, 30).reverse().map((p) => ({ date: p.date.slice(5), weight: p.weight }))

  return (
    <section className="screen active" id="s-progreso">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          <button className="pg-back" onClick={() => navigate('/profile')}>‹</button>
          <div><div className="hi">Tu evolución</div><div className="name">PROGRESO</div></div>
        </div>

        <div className="pad">
          {/* Registrar peso */}
          <form className="pg-form reveal d2" onSubmit={submit}>
            <input
              className="wsearch"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="Tu peso (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <input
              className="wsearch"
              placeholder="Nota (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <button type="submit" className="cta full">REGISTRAR PESO</button>
          </form>

          {/* Último valor + delta */}
          {latest && (
            <div className="pg-latest reveal d3">
              <div>
                <div className="pg-latest-lbl">Peso actual</div>
                <div className="pg-latest-val">{latest.weight}<small> kg</small></div>
              </div>
              {delta !== null && delta !== 0 && (
                <div className={'pg-delta ' + (delta < 0 ? 'down' : 'up')}>
                  {delta < 0 ? '▼' : '▲'} {Math.abs(delta)} kg
                </div>
              )}
            </div>
          )}

          {/* Gráfica */}
          <div className="pg-section reveal d3">
            <h3>EVOLUCIÓN</h3>
            {chartData.length >= 2 ? (
              <div className="pg-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,.1)' }} tickLine={false} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ background: '#141418', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff' }} labelStyle={{ color: '#8a8a93' }} />
                    <Line type="monotone" dataKey="weight" stroke="#ff1f6b" strokeWidth={3} dot={{ fill: '#ff1f6b', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="pg-empty">
                <div className="pg-empty-emoji">📈</div>
                <p>Registra tu peso al menos 2 veces para ver tu evolución.</p>
              </div>
            )}
          </div>

          {/* Logros */}
          <div className="pg-section reveal d4">
            <h3>LOGROS</h3>
            <div className="pg-ach-grid">
              {ACHIEVEMENTS.map((a) => {
                const done = a.check(streak, totalWorkouts)
                return (
                  <div className={'pg-ach' + (done ? ' done' : '')} key={a.id}>
                    <div className="pg-ach-emoji">{a.emoji}</div>
                    <div className="pg-ach-name">{a.name}</div>
                    <div className="pg-ach-req">{done ? 'Desbloqueado' : a.req}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Historial */}
          <div className="pg-section reveal d5">
            <h3>HISTORIAL</h3>
            {progressLog.length === 0 ? (
              <p className="pg-hint">Aún no has registrado tu peso.</p>
            ) : (
              progressLog.map((p) => (
                <div className="pg-row" key={p.id}>
                  <div className="pg-row-date">{p.date}</div>
                  <div className="pg-row-main">
                    <b>{p.weight} kg</b>
                    {p.note && <span>{p.note}</span>}
                  </div>
                  {confirmId === p.id ? (
                    <div className="pg-confirm">
                      <button onClick={() => { deleteProgressEntry(p.id); setConfirmId(null) }}>Sí</button>
                      <button className="no" onClick={() => setConfirmId(null)}>No</button>
                    </div>
                  ) : (
                    <button className="pg-del" onClick={() => setConfirmId(p.id)}>🗑</button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Fotos */}
          <div className="pg-section reveal d6">
            <h3>FOTOS DE PROGRESO</h3>
            <div className="pg-photos">📸 Próximamente</div>
          </div>
        </div>
      </div>
    </section>
  )
}
