/* Render de la DIETA generada (Nutrición). Esquema: title, note, macros{},
   days[] con meals[]. Macros destacados + acordeón por día (primer día abierto). */
import { useState } from 'react'

export default function DietPlanView({ plan, onRegenerate }) {
  const [open, setOpen] = useState(0)
  const days = plan?.days || []
  const m = plan?.macros || {}

  return (
    <div className="ai-plan reveal d2">
      <div className="ai-plan-note">
        <div className="ai-plan-note-b">B</div>
        <p>{plan.note}</p>
      </div>

      <h2 className="ai-plan-title">{plan.title}</h2>

      <div className="ai-macros">
        <div><b>{m.kcal ?? '—'}</b><span>kcal</span></div>
        <div><b>{m.protein ?? '—'}g</b><span>proteína</span></div>
        <div><b>{m.carbs ?? '—'}g</b><span>carbos</span></div>
        <div><b>{m.fat ?? '—'}g</b><span>grasas</span></div>
      </div>

      <div className="ai-days">
        {days.map((d, i) => (
          <div className={'ai-day' + (open === i ? ' open' : '')} key={i}>
            <button className="ai-day-head" onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="ai-day-t"><b>{d.day}</b><span>{(d.meals || []).length} comidas</span></div>
              <div className="ai-day-chev">{open === i ? '−' : '+'}</div>
            </button>
            {open === i && (
              <div className="ai-day-body">
                {(d.meals || []).map((meal, j) => (
                  <div className="ai-meal" key={j}>
                    <div className="ai-meal-top">
                      <div className="ai-meal-type">{meal.type}</div>
                      <span className="ai-meal-kcal">{meal.kcal} kcal</span>
                    </div>
                    <h4 className="ai-meal-name">{meal.name}</h4>
                    <ul className="ai-meal-items">
                      {(meal.items || []).map((it, k) => <li key={k}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="ai-regen" onClick={onRegenerate}>↻ Generar otro plan</button>
    </div>
  )
}
