/* Check-in mensual (avances) antes de regenerar el plan. Voz retadora de Brenda.
   Props:
     - kind: 'workout' | 'diet' (solo para el copy)
     - onSubmit(checkin): { weight, feel, adherence, comment }
     - onCancel() */
import { useState } from 'react'
import { getProfile } from '../lib/dataStore'

const FEELS = [
  { id: 'easy', emoji: '😎', label: 'Muy fácil' },
  { id: 'ok',   emoji: '💪', label: 'Bien' },
  { id: 'hard', emoji: '🥵', label: 'Muy difícil' },
]
const ADHERENCE = [
  { id: 'all',  emoji: '🔥', label: 'Sí, todos' },
  { id: 'most', emoji: '👍', label: 'La mayoría' },
  { id: 'few',  emoji: '😬', label: 'Pocos' },
]

export default function AiCheckIn({ onSubmit, onCancel }) {
  const prof = getProfile() || {}
  const [weight, setWeight] = useState(prof.weight ?? '')
  const [feel, setFeel] = useState('ok')
  const [adherence, setAdherence] = useState('most')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = () => {
    if (busy) return
    setBusy(true)
    const w = parseFloat(weight)
    onSubmit({
      weight: Number.isFinite(w) ? w : null,
      feel, adherence,
      comment: comment.trim(),
    })
  }

  return (
    <div className="ai-checkin reveal d2">
      <button className="ai-checkin-back" onClick={onCancel} aria-label="Volver">‹</button>
      <div className="ai-checkin-kick">Check-in del mes</div>
      <h2 className="ai-checkin-title">¿CÓMO TE FUE?</h2>
      <p className="ai-checkin-sub">Un mes completo. Ahora dime la verdad y te armo el siguiente nivel. 🔥</p>

      <label className="ai-checkin-label">Tu peso actual</label>
      <div className="ai-checkin-weight">
        <input
          type="number" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)} placeholder="0"
        />
        <span>kg</span>
      </div>

      <label className="ai-checkin-label">¿Cómo se sintió el plan?</label>
      <div className="ai-checkin-opts">
        {FEELS.map((f) => (
          <button key={f.id} className={'ai-chip' + (feel === f.id ? ' sel' : '')} onClick={() => setFeel(f.id)}>
            <span className="ai-chip-e">{f.emoji}</span>{f.label}
          </button>
        ))}
      </div>

      <label className="ai-checkin-label">¿Cumpliste tus entrenamientos?</label>
      <div className="ai-checkin-opts">
        {ADHERENCE.map((a) => (
          <button key={a.id} className={'ai-chip' + (adherence === a.id ? ' sel' : '')} onClick={() => setAdherence(a.id)}>
            <span className="ai-chip-e">{a.emoji}</span>{a.label}
          </button>
        ))}
      </div>

      <label className="ai-checkin-label">Algo que contarme (opcional)</label>
      <textarea
        className="ai-checkin-comment" rows={3}
        value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Ej. me costó el cardio, quiero más glúteo…"
      />

      <button className="ai-intro-cta" onClick={submit} disabled={busy}>
        {busy ? 'ARMANDO…' : 'ARMAR MI SIGUIENTE NIVEL'}
      </button>
    </div>
  )
}
