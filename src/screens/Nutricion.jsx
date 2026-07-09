import { useState } from 'react'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { goalLabel } from '../data/onboarding'
import { calculateMacros } from '../lib/dataStore'
import { isIOSNative } from '../lib/platform'
import PremiumLockedIOS from '../components/PremiumLockedIOS'
import { PLANS, RECIPES, RECIPE_CATEGORIES, SUPPLEMENTS, getPlan, getRecipe, getSupplement, recipeDifficultyColor, supplementColor } from '../data/nutrition'
import { USE_MOCK_PLANS, generateDiet } from '../lib/aiPlans'
import AiPlanFlow from '../components/AiPlanFlow'
import DietPlanView from '../components/DietPlanView'

/* NOTA: el contenido hardcodeado viejo (PLANS/RECIPES/SUPPLEMENTS + PlanDetail/
   RecipeDetail/MacroWidget) queda en el código como FALLBACK pero ya NO se
   renderiza — ahora Nutrición muestra la dieta generada por IA (AiPlanFlow). */

// eslint-disable-next-line no-unused-vars
function MacroWidget({ profile }) {
  const m = calculateMacros(profile)
  return (
    <div className="macro-widget">
      <div className="macro-grid">
        <div><div className="mv kcal">{m.kcal}</div><div className="mk">kcal</div></div>
        <div><div className="mv prot">{m.protein}g</div><div className="mk">proteína</div></div>
        <div><div className="mv carb">{m.carbs}g</div><div className="mk">carbos</div></div>
        <div><div className="mv fat">{m.fat}g</div><div className="mk">grasas</div></div>
      </div>
      <div className="macro-sub">Basado en tu peso de {profile.weight} kg y tu objetivo {goalLabel(profile.goal).toLowerCase()}</div>
    </div>
  )
}

// eslint-disable-next-line no-unused-vars
function PlanDetail({ plan, profile, onBack }) {
  const [open, setOpen] = useState({})
  const m = calculateMacros(profile)
  const toggle = (i) => setOpen((o) => ({ ...o, [i]: !o[i] }))

  return (
    <>
      <div className="nd-hero" style={{ background: plan.gradient }}>
        <div className="wd-hero-shade" />
        <button className="wd-back" onClick={onBack}>‹</button>
        <div className="wd-hero-inner">
          <div className="wfeatured-emoji">{plan.emoji}</div>
          <h1 className="wd-title">{plan.title}</h1>
          <div className="nd-macros">
            <span>{m.kcal} kcal</span><span>{m.protein}g P</span><span>{m.carbs}g C</span><span>{m.fat}g G</span>
          </div>
        </div>
      </div>

      <div className="wd-body">
        <div className="nd-hydra">💧 {plan.hydration}</div>

        <div className="wd-section">
          <h3>COMIDAS</h3>
          {plan.meals.map((meal, i) => (
            <div className={'wd-ex' + (open[i] ? ' open' : '')} key={i}>
              <div className="wd-ex-head" onClick={() => toggle(i)}>
                <div className="nd-time">{meal.time}</div>
                <div className="wd-ex-meta">
                  <h4>{meal.name}</h4>
                  <span>{meal.kcal} kcal</span>
                </div>
                <div className="wd-ex-chev">{open[i] ? '−' : '+'}</div>
              </div>
              {open[i] && (
                <div className="wd-ex-body">
                  {meal.foods.map((f, j) => (
                    <div className="nd-food" key={j}>
                      <span>{f.name} <small>· {f.qty}</small></span>
                      <span className="nd-food-kcal">{f.kcal} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="wd-section">
          <h3>SUPLEMENTOS DEL PLAN</h3>
          {plan.supplements.map((sid) => {
            const s = getSupplement(sid)
            if (!s) return null
            return (
              <div className="nd-supp-line" key={sid}>
                <span className="nd-supp-emoji">{s.emoji}</span>
                <div><b>{s.name}</b><span>{s.dose} · {s.timing}</span></div>
              </div>
            )
          })}
        </div>

        <div className="wd-section">
          <h3>TIPS DE BRENDA</h3>
          {plan.tips.map((t, i) => (
            <div key={i} className="wd-line"><span className="wd-dot" />{t}</div>
          ))}
        </div>
      </div>
    </>
  )
}

// eslint-disable-next-line no-unused-vars
function RecipeDetail({ recipe, onBack }) {
  return (
    <>
      <div className="nd-hero" style={{ background: 'linear-gradient(135deg,#ff1f6b,#7a28ff)' }}>
        <div className="wd-hero-shade" />
        <button className="wd-back" onClick={onBack}>‹</button>
        <div className="wd-hero-inner">
          <div className="wfeatured-emoji">{recipe.emoji}</div>
          <h1 className="wd-title">{recipe.name}</h1>
          <div className="wd-stats">
            <span>⏱ {recipe.time} min</span>
            <span style={{ color: recipeDifficultyColor(recipe.difficulty) }}>{recipe.difficulty}</span>
            <span>🔥 {recipe.kcal} cal</span>
          </div>
        </div>
      </div>
      <div className="wd-body">
        <div className="wd-section">
          <h3>INGREDIENTES</h3>
          {recipe.ingredients.map((ing, i) => (
            <div className="nd-food" key={i}>
              <span>{ing.name}</span>
              <span className="nd-food-kcal">{ing.qty}</span>
            </div>
          ))}
        </div>
        <div className="wd-section">
          <h3>PREPARACIÓN</h3>
          {recipe.steps.map((s, i) => (
            <div className="rstep" key={i}><span className="rstep-n">{i + 1}</span><span>{s}</span></div>
          ))}
        </div>
      </div>
    </>
  )
}
// Referencias para conservar imports de fallback sin romper el build.
void PLANS; void RECIPES; void RECIPE_CATEGORIES; void SUPPLEMENTS; void getPlan; void getRecipe; void supplementColor

const INTRO = {
  kick: 'Tu plan de comidas personalizado',
  title: 'BRENDA TIENE TU PLAN DE COMIDAS',
  sub: 'Hecho para tu cuerpo y tus metas. ¿Vas a poder seguirlo? 💪',
  cta: 'GENERAR MI PLAN CON BRENDA',
}

export default function Nutricion() {
  const { openSheet } = useApp()
  const { isPremium } = useSubscription()

  // Gate premium (PRODUCCIÓN). El bypass solo ocurre con USE_MOCK_PLANS (dev).
  if (!isPremium && !USE_MOCK_PLANS) {
    return (
      <section className="screen active" id="s-nutricion">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">NUTRICIÓN</div></div></div>
          <div className="pad reveal d2">
            {isIOSNative() ? (
              <PremiumLockedIOS />
            ) : (
              <div className="brenda-promo" style={{ minHeight: 240 }}>
                <div className="glow" /><div className="shimmer" />
                <div className="lock-pill">🔒 PREMIUM</div>
                <div className="inner">
                  <div className="kick">Nutrición de Brenda</div>
                  <h3>PLANES, RECETAS<br />Y SUPLEMENTOS</h3>
                  <p>Planes de comida según tu objetivo, recetas fáciles y guía de suplementos.</p>
                  <button className="unlock" onClick={() => openSheet('paywall')}>VER PLANES →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="screen active" id="s-nutricion">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">NUTRICIÓN</div></div></div>
        <div className="pad">
          <AiPlanFlow
            kind="diet"
            intro={INTRO}
            generate={generateDiet}
            renderPlan={(plan, meta) => <DietPlanView plan={plan} {...meta} />}
          />
        </div>
      </div>
    </section>
  )
}
