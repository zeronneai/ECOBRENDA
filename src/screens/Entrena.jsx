import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { ROUTINES, PROGRAMS, CATEGORIES, difficultyColor } from '../data/workouts'
import { isIOSNative } from '../lib/platform'
import PremiumLockedIOS from '../components/PremiumLockedIOS'
import { USE_MOCK_PLANS, generateWorkout } from '../lib/aiPlans'
import AiPlanFlow from '../components/AiPlanFlow'
import WorkoutPlanView from '../components/WorkoutPlanView'

/* NOTA: el contenido hardcodeado viejo (ROUTINES/PROGRAMS + RoutineCard) queda
   en el código como FALLBACK pero ya NO se renderiza — ahora Entrena muestra la
   rutina generada por IA (AiPlanFlow). */
// eslint-disable-next-line no-unused-vars
function RoutineCard({ r, onClick }) {
  return (
    <div className="wcard" onClick={onClick}>
      <div className="wthumb" style={{ background: r.gradient }}>
        <span>{r.emoji}</span>
        {r.isNew && <div className="badge-new">NUEVO</div>}
      </div>
      <div className="winfo">
        <h4>{r.title}</h4>
        <div className="wmeta">
          <span>{r.duration} min</span><span>·</span>
          <span>{r.calories} cal</span><span>·</span>
          <span style={{ color: difficultyColor(r.difficulty) }}>{r.difficulty}</span>
        </div>
        <div className="wrating">⭐ {r.rating} <small>({r.reviews})</small></div>
      </div>
    </div>
  )
}
// Referencias para conservar los imports de fallback sin romper el build.
void ROUTINES; void PROGRAMS; void CATEGORIES

export default function Entrena() {
  const { t, openSheet } = useApp()
  const { isPremium } = useSubscription()

  const INTRO = {
    kick: t('entrena.intro_kick'),
    title: t('entrena.intro_title'),
    sub: t('entrena.intro_sub'),
    cta: t('entrena.intro_cta'),
  }

  // Gate premium (PRODUCCIÓN). El bypass solo ocurre con USE_MOCK_PLANS (dev).
  if (!isPremium && !USE_MOCK_PLANS) {
    return (
      <section className="screen active" id="s-entrena">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">{t('entrena.header')}</div></div></div>
          <div className="pad reveal d2">
            {isIOSNative() ? (
              <PremiumLockedIOS />
            ) : (
              <div className="brenda-promo" style={{ minHeight: 240 }}>
                <div className="glow" /><div className="shimmer" />
                <div className="lock-pill">🔒 PREMIUM</div>
                <div className="inner">
                  <div className="kick">{t('entrena.promo_kick')}</div>
                  <h3>{t('entrena.promo_h')}</h3>
                  <p>{t('entrena.promo_p')}</p>
                  <button className="unlock" onClick={() => openSheet('paywall')}>{t('paywall.see_plans')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="screen active" id="s-entrena">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">{t('entrena.header')}</div></div></div>
        <div className="pad">
          <AiPlanFlow
            kind="workout"
            intro={INTRO}
            generate={generateWorkout}
            renderPlan={(plan, meta) => <WorkoutPlanView plan={plan} {...meta} />}
          />
        </div>
      </div>
    </section>
  )
}
