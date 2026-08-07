/* Check-in mensual (avances) antes de regenerar el plan. Voz retadora de Brenda.
   Props:
     - kind: 'workout' | 'diet' (solo para el copy)
     - onSubmit(checkin): { weight, feel, adherence, comment }
     - onCancel() */
import { useState } from 'react'
import { getProfile } from '../lib/dataStore'
import { useApp } from '../store'

const FEELS = [
  { id: 'easy', emoji: '😎', key: 'ai.feel_easy' },
  { id: 'ok',   emoji: '💪', key: 'ai.feel_ok' },
  { id: 'hard', emoji: '🥵', key: 'ai.feel_hard' },
]
const ADHERENCE = [
  { id: 'all',  emoji: '🔥', key: 'ai.adh_all' },
  { id: 'most', emoji: '👍', key: 'ai.adh_most' },
  { id: 'few',  emoji: '😬', key: 'ai.adh_few' },
]

export default function AiCheckIn({ onSubmit, onCancel }) {
  const { t } = useApp()
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
      <button className="ai-checkin-back" onClick={onCancel} aria-label={t('ai.ck_back')}>‹</button>
      <div className="ai-checkin-kick">{t('ai.ck_kick')}</div>
      <h2 className="ai-checkin-title">{t('ai.ck_title')}</h2>
      <p className="ai-checkin-sub">{t('ai.ck_sub')}</p>

      <label className="ai-checkin-label">{t('ai.ck_weight')}</label>
      <div className="ai-checkin-weight">
        <input
          type="number" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)} placeholder="0"
        />
        <span>kg</span>
      </div>

      <label className="ai-checkin-label">{t('ai.ck_feel')}</label>
      <div className="ai-checkin-opts">
        {FEELS.map((f) => (
          <button key={f.id} className={'ai-chip' + (feel === f.id ? ' sel' : '')} onClick={() => setFeel(f.id)}>
            <span className="ai-chip-e">{f.emoji}</span>{t(f.key)}
          </button>
        ))}
      </div>

      <label className="ai-checkin-label">{t('ai.ck_adherence')}</label>
      <div className="ai-checkin-opts">
        {ADHERENCE.map((a) => (
          <button key={a.id} className={'ai-chip' + (adherence === a.id ? ' sel' : '')} onClick={() => setAdherence(a.id)}>
            <span className="ai-chip-e">{a.emoji}</span>{t(a.key)}
          </button>
        ))}
      </div>

      <label className="ai-checkin-label">{t('ai.ck_comment')}</label>
      <textarea
        className="ai-checkin-comment" rows={3}
        value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder={t('ai.ck_comment_ph')}
      />

      <button className="ai-intro-cta" onClick={submit} disabled={busy}>
        {busy ? t('ai.ck_submitting') : t('ai.ck_submit')}
      </button>
    </div>
  )
}
