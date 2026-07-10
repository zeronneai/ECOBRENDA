/* Render premium de la DIETA generada (Nutrición). Esquema: title, note,
   macros{kcal,protein,carbs,fat}, days[]{ day, meals[]{type,name,kcal,items[]} }.
   Hero (DestelloCard) con título Anton + note + macros en bloques de color;
   acordeón por día con kcal del día; comidas con tipo, kcal e ingredientes. */
import { useState } from 'react'
import DestelloCard from './ui/DestelloCard'
import AiPlanFooter from './AiPlanFooter'

export default function DietPlanView({ plan, locked, daysLeft, onRenew, onDevForce }) {
  const [open, setOpen] = useState(0)
  const days = plan?.days || []
  const m = plan?.macros || {}
  const target = Number(m.kcal) || 0

  const dayKcal = (d) => (d.meals || []).reduce((s, meal) => s + (Number(meal.kcal) || 0), 0)

  return (
    <div className="ai-plan reveal d2">
      {/* Hero */}
      <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
        <span className="destello-title" style={{ fontSize: 26, color: 'var(--txt)' }}>{plan.title}</span>
        <div className="nu-hero-note">
          <div className="b">B</div>
          <p>{plan.note}</p>
        </div>
        <div className="nu-macros">
          <div className="nu-macro kcal"><span className="n">{m.kcal ?? '—'}</span><div className="k">kcal</div></div>
          <div className="nu-macro prot"><span className="n">{m.protein ?? '—'}g</span><div className="k">proteína</div></div>
          <div className="nu-macro carb"><span className="n">{m.carbs ?? '—'}g</span><div className="k">carbos</div></div>
          <div className="nu-macro fat"><span className="n">{m.fat ?? '—'}g</span><div className="k">grasas</div></div>
        </div>
      </DestelloCard>

      {/* Días */}
      <div className="nu-days">
        {days.map((d, i) => {
          const kc = dayKcal(d)
          const pct = target ? Math.min(100, Math.round((kc / target) * 100)) : 0
          return (
            <div className="nu-day" key={i}>
              <button className="nu-day-head" onClick={() => setOpen(open === i ? -1 : i)}>
                <div className="nu-day-badge">🍽️</div>
                <div className="nu-day-t">
                  <b>{d.day}</b>
                  <span className="kc">{kc} kcal · {(d.meals || []).length} comidas</span>
                  {target > 0 && (
                    <div className="wk-dayprog">
                      <div className="wk-bar"><i style={{ width: pct + '%' }} /></div>
                      <span className="c">{pct}%</span>
                    </div>
                  )}
                </div>
                <div className="nu-day-chev">{open === i ? '−' : '+'}</div>
              </button>
              {open === i && (
                <div className="nu-day-body">
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
          )
        })}
      </div>

      <AiPlanFooter locked={locked} daysLeft={daysLeft} onRenew={onRenew} onDevForce={onDevForce} />
    </div>
  )
}
