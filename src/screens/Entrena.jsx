import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { isIOSNative } from '../lib/platform'
import PremiumLockedIOS from '../components/PremiumLockedIOS'
import { USE_MOCK_PLANS, generateWorkout } from '../lib/aiPlans'
import AiPlanFlow from '../components/AiPlanFlow'
import WorkoutPlanView from '../components/WorkoutPlanView'
import TrainSetupCard from '../components/TrainSetupCard'

/* Entrena muestra la rutina generada por IA (AiPlanFlow). El contenido
   hardcodeado viejo (ROUTINES/PROGRAMS + RoutineCard) se eliminó: quedó huérfano
   tras el rediseño IA y traía texto en español sin traducir. */
export default function Entrena() {
  const { t, openSheet } = useApp()
  const { accesoPremium } = useSubscription()

  const INTRO = {
    kick: t('entrena.intro_kick'),
    title: t('entrena.intro_title'),
    sub: t('entrena.intro_sub'),
    cta: t('entrena.intro_cta'),
  }

  // Gate premium (PRODUCCIÓN). El bypass solo ocurre con USE_MOCK_PLANS (dev).
  if (!accesoPremium && !USE_MOCK_PLANS) {
    return (
      <section className="screen active" id="s-entrena">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1"><div><div className="hi">{t('common.premium')}</div><div className="name">{t('entrena.header')}</div></div></div>
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
        <div className="hdr reveal d1"><div><div className="hi">{t('common.premium')}</div><div className="name">{t('entrena.header')}</div></div></div>
        <div className="pad">
          <TrainSetupCard />
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
