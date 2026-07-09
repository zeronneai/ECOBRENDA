/* Render de la RUTINA generada (Entrena). Esquema: title, note, days[] con
   focus/warmup/exercises[]. Acordeón por día (primer día abierto). */
import { useState } from 'react'

export default function WorkoutPlanView({ plan, onRegenerate }) {
  const [open, setOpen] = useState(0)
  const days = plan?.days || []

  return (
    <div className="ai-plan reveal d2">
      <div className="ai-plan-note">
        <div className="ai-plan-note-b">B</div>
        <p>{plan.note}</p>
      </div>

      <h2 className="ai-plan-title">{plan.title}</h2>

      <div className="ai-days">
        {days.map((d, i) => (
          <div className={'ai-day' + (open === i ? ' open' : '')} key={i}>
            <button className="ai-day-head" onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="ai-day-t"><b>{d.day}</b><span>{d.focus}</span></div>
              <div className="ai-day-chev">{open === i ? '−' : '+'}</div>
            </button>
            {open === i && (
              <div className="ai-day-body">
                {d.warmup && <div className="ai-warmup"><b>🔥 Calentamiento:</b> {d.warmup}</div>}
                {(d.exercises || []).map((e, j) => (
                  <div className="ai-ex" key={j}>
                    <div className="ai-ex-top">
                      <h4>{e.name}</h4>
                      <span className="ai-ex-sr">{e.sets}×{e.reps}</span>
                    </div>
                    <div className="ai-ex-meta">Descanso {e.rest}</div>
                    {e.tip && <div className="ai-ex-tip">💡 {e.tip}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="ai-regen" onClick={onRegenerate}>↻ Generar otra rutina</button>
    </div>
  )
}
