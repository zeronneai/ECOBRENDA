/* Orquesta la máquina de estados del plan de IA (compartido por Entrena y
   Nutrición): loading → invite → generating → ready → (checkin → generating) …
   Incluye el ciclo de 30 días y el GATE DE CONSENTIMIENTO DE IA (Apple 5.1.2i):
   antes de la primera generación (rutina o dieta), si la usuaria no ha aceptado,
   se muestra el modal; solo tras aceptar se envían datos a la IA (Anthropic).
   Cubre también cuentas viejas: como el gate está en runGenerate, cualquier
   regeneración/check-in sin consentimiento previo pide el modal primero.
   Props:
     - kind: 'workout' | 'diet'
     - intro: { kick, title, sub, cta }
     - generate: async (checkin?) => { content, lockedUntil }
     - renderPlan: (content, meta) => JSX */
import { useState, useEffect } from 'react'
import { useApp } from '../store'
import { getLatestPlan, USE_MOCK_PLANS } from '../lib/aiPlans'
import AiPlanIntro from './AiPlanIntro'
import AiGenerating from './AiGenerating'
import AiPreparing from './AiPreparing'
import AiCheckIn from './AiCheckIn'
import AiConsentModal from './AiConsentModal'

const DAY_MS = 24 * 60 * 60 * 1000
const RELEASE_MS = 48 * 60 * 60 * 1000 // el plan se libera 48h después de pedirlo

// Un plan solo se muestra si Brenda lo aprobó Y ya pasaron 48h desde que se pidió.
function isReleased(p) {
  if (!p?.approved) return false
  const req = p.requestedAt ? new Date(p.requestedAt).getTime() : 0
  return req > 0 && Date.now() - req >= RELEASE_MS
}

export default function AiPlanFlow({ kind, intro, generate, renderPlan }) {
  const { profile, updateProfile, t } = useApp()
  const hasConsent = !!profile?.aiConsent?.accepted

  const [status, setStatus] = useState('loading') // loading|invite|generating|pending|ready|checkin|error
  const [plan, setPlan] = useState(null)          // { content, lockedUntil, approved, requestedAt }
  const [pendingSince, setPendingSince] = useState(null) // requestedAt del plan en preparación
  const [forced, setForced] = useState(false)     // override dev "simular +30 días"
  const [errMsg, setErrMsg] = useState('')
  const [consent, setConsent] = useState(null)    // null | { checkin } mientras se pide consentimiento

  useEffect(() => {
    let alive = true
    getLatestPlan(kind)
      .then((r) => {
        if (!alive) return
        if (r?.content && isReleased(r)) { setPlan(r); setStatus('ready') }
        else if (r?.content) { setPendingSince(r.requestedAt); setStatus('pending') } // pedido, aún no liberado
        else setStatus('invite')
      })
      .catch(() => { if (alive) setStatus('invite') })
    return () => { alive = false }
  }, [kind])

  // Generación real (tras consentimiento).
  const doGenerate = async (checkin) => {
    setStatus('generating'); setErrMsg('')
    try {
      await generate(checkin)
      // El plan se genera y guarda, pero NO se muestra al instante: pasa a
      // "preparación" (se libera a las 48h + aprobación de Brenda). El plan
      // recién creado nace approved=false, así que aún no se libera.
      setForced(false); setPendingSince(new Date().toISOString()); setStatus('pending')
    } catch (e) {
      setErrMsg(e?.message || t('errors.plan_generate')); setStatus('error')
    }
  }

  // Punto de entrada: intercepta con el consentimiento si aún no se ha dado.
  const runGenerate = (checkin) => {
    if (!hasConsent) { setConsent({ checkin }); return }
    doGenerate(checkin)
  }

  const acceptConsent = () => {
    updateProfile({ aiConsent: { accepted: true, date: new Date().toISOString() } })
    const checkin = consent?.checkin
    setConsent(null)
    doGenerate(checkin)
  }
  const declineConsent = () => setConsent(null) // no genera, no pierde acceso al resto

  let content
  if (status === 'loading') {
    content = <div className="ai-loading-min" />
  } else if (status === 'generating') {
    content = <AiGenerating kind={kind} />
  } else if (status === 'pending') {
    content = <AiPreparing requestedAt={pendingSince} />
  } else if (status === 'checkin') {
    content = <AiCheckIn kind={kind} onSubmit={runGenerate} onCancel={() => setStatus('ready')} />
  } else if (status === 'ready' && plan?.content) {
    const lu = plan.lockedUntil ? new Date(plan.lockedUntil).getTime() : 0
    const now = Date.now()
    const locked = lu > now && !forced
    const daysLeft = locked ? Math.max(1, Math.ceil((lu - now) / DAY_MS)) : 0
    content = renderPlan(plan.content, {
      locked,
      daysLeft,
      onRenew: () => setStatus('checkin'),
      onDevForce: USE_MOCK_PLANS && locked ? () => setForced(true) : null,
    })
  } else {
    content = <AiPlanIntro intro={intro} onGenerate={() => runGenerate()} error={status === 'error' ? errMsg : ''} />
  }

  return (
    <>
      {content}
      {consent && (
        <AiConsentModal variant="gate" onAccept={acceptConsent} onDecline={declineConsent} />
      )}
    </>
  )
}
