import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { isIOSNative } from '../lib/platform'
import PremiumLockedIOS from '../components/PremiumLockedIOS'
import { USE_MOCK_PLANS, generateDiet } from '../lib/aiPlans'
import AiPlanFlow from '../components/AiPlanFlow'
import DietPlanView from '../components/DietPlanView'

/* Nutrición muestra la dieta generada por IA (AiPlanFlow). El contenido
   hardcodeado viejo (PLANS/RECIPES/SUPPLEMENTS + PlanDetail/RecipeDetail/
   MacroWidget) se eliminó: quedó huérfano tras el rediseño IA y traía texto en
   español sin traducir. */
export default function Nutricion() {
  const { t, openSheet } = useApp()
  const { accesoPremium } = useSubscription()

  const INTRO = {
    kick: t('nutricion.intro_kick'),
    title: t('nutricion.intro_title'),
    sub: t('nutricion.intro_sub'),
    cta: t('nutricion.intro_cta'),
  }

  // Gate premium (PRODUCCIÓN). El bypass solo ocurre con USE_MOCK_PLANS (dev).
  if (!accesoPremium && !USE_MOCK_PLANS) {
    return (
      <section className="screen active" id="s-nutricion">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1"><div><div className="hi">{t('common.premium')}</div><div className="name destello-title">{t('nutricion.header')}</div></div></div>
          <div className="pad reveal d2">
            {isIOSNative() ? (
              <PremiumLockedIOS />
            ) : (
              <div className="brenda-promo" style={{ minHeight: 240 }}>
                <div className="glow" /><div className="shimmer" />
                <div className="lock-pill">🔒 PREMIUM</div>
                <div className="inner">
                  <div className="kick">{t('nutricion.promo_kick')}</div>
                  <h3>{t('nutricion.promo_h')}</h3>
                  <p>{t('nutricion.promo_p')}</p>
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
    <section className="screen active" id="s-nutricion">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1"><div><div className="hi">{t('common.premium')}</div><div className="name destello-title">{t('nutricion.header')}</div></div></div>
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
