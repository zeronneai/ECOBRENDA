import { useState } from 'react'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { goalLabel } from '../data/onboarding'
import { calculateMacros } from '../lib/dataStore'
import { PLANS, getPlan, getSupplement } from '../data/nutrition'

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

export default function Nutricion() {
  const { profile, openSheet } = useApp()
  const { isPremium } = useSubscription()
  const [tab, setTab] = useState('planes')
  const [planId, setPlanId] = useState(null)

  if (!isPremium) {
    return (
      <section className="screen active" id="s-nutricion">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">NUTRICIÓN</div></div></div>
          <div className="pad reveal d2">
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
          </div>
        </div>
      </section>
    )
  }

  const plan = planId ? getPlan(planId) : null

  return (
    <section className="screen active" id="s-nutricion">
      <div className="scroll">
        {plan ? (
          <PlanDetail plan={plan} profile={profile} onBack={() => setPlanId(null)} />
        ) : (
          <>
            <div className="topgap" />
            <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">NUTRICIÓN</div></div></div>

            <div className="subtabs pad reveal d2">
              <button className={'subtab' + (tab === 'planes' ? ' sel' : '')} onClick={() => setTab('planes')}>Planes</button>
              <button className={'subtab' + (tab === 'recetas' ? ' sel' : '')} onClick={() => setTab('recetas')}>Recetas</button>
              <button className={'subtab' + (tab === 'suplementos' ? ' sel' : '')} onClick={() => setTab('suplementos')}>Suplementos</button>
            </div>

            {tab === 'planes' && (
              <div className="pad">
                <div className="brenda-signature reveal d3" style={{ margin: '0 0 16px' }}>
                  <div className="ba">B</div>
                  <div className="bt"><b>Tip de Brenda</b><br /><span>Tu cuerpo se construye en la cocina. Apunta a tu proteína cada día y el resto fluye 💕</span></div>
                </div>

                <MacroWidget profile={profile} />

                <div className="nplan-list reveal d4">
                  {PLANS.map((p) => (
                    <div className="nplan-card" key={p.id} onClick={() => setPlanId(p.id)}>
                      <div className="nplan-thumb" style={{ background: p.gradient }}>{p.emoji}</div>
                      <div className="nplan-info">
                        <h4>{p.title}</h4>
                        <p>{p.tagline}</p>
                      </div>
                      <div className="nplan-arrow">›</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'recetas' && (
              <div className="wempty pad reveal d3">
                <div className="wempty-emoji">🥗</div>
                <h4>Recetas</h4>
                <p>Próximamente (siguiente paso).</p>
              </div>
            )}
            {tab === 'suplementos' && (
              <div className="wempty pad reveal d3">
                <div className="wempty-emoji">💊</div>
                <h4>Suplementos</h4>
                <p>Próximamente (siguiente paso).</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
