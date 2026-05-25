import { useApp } from '../store'
import { goalLabel } from '../data/onboarding'
import Sheet from './Sheet'

export default function MealsSheet() {
  const { plan, profile } = useApp()
  const m = plan.macros
  const lead = `Brenda lo armó para tu meta de ${goalLabel(profile.goal).toLowerCase()}.`

  return (
    <Sheet>
      <h3 id="mealsTitle">TU PLAN DE COMIDAS</h3>
      <p className="lead" id="mealsLead">{lead}</p>

      <div className="macros" style={{ margin: '0 0 18px' }}>
        <div className="macro kcal"><div className="v" id="mKcal3">{m.kcal}</div><div className="k">kcal</div></div>
        <div className="macro prot"><div className="v" id="mProt3">{m.protein}g</div><div className="k">proteína</div></div>
        <div className="macro carb"><div className="v" id="mCarb3">{m.carbs}g</div><div className="k">carbos</div></div>
      </div>

      <div id="mealList">
        {plan.meals.map((meal, i) => (
          <div className="dayrow" key={i} style={{ marginInline: 0 }}>
            <div
              className="dl"
              style={{
                fontSize: 18,
                width: 'auto',
                color: 'var(--magenta-soft)',
                fontFamily: 'Archivo',
                fontWeight: 800,
                letterSpacing: '.05em',
                minWidth: 78,
              }}
            >
              {meal.t}
            </div>
            <div className="dm">
              <div className="t">{meal.n}</div>
              <div className="d">{meal.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
