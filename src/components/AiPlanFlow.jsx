/* Orquesta la máquina de estados del plan de IA (compartido por Entrena y
   Nutrición): loading → invite → generating → ready (o error).
   Props:
     - kind: 'workout' | 'diet'
     - intro: { kick, title, sub, cta }  (copy de la invitación)
     - generate: async () => plan         (mock o API real, vía aiPlans.js)
     - renderPlan: (plan, onRegenerate) => JSX */
import { useState, useEffect } from 'react'
import { getLatestPlan } from '../lib/aiPlans'
import AiPlanIntro from './AiPlanIntro'
import AiGenerating from './AiGenerating'

export default function AiPlanFlow({ kind, intro, generate, renderPlan }) {
  const [status, setStatus] = useState('loading') // loading|invite|generating|ready|error
  const [plan, setPlan] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let alive = true
    getLatestPlan(kind)
      .then((p) => {
        if (!alive) return
        if (p) { setPlan(p); setStatus('ready') } else setStatus('invite')
      })
      .catch(() => { if (alive) setStatus('invite') })
    return () => { alive = false }
  }, [kind])

  const onGenerate = async () => {
    setStatus('generating'); setErrMsg('')
    try {
      const p = await generate()
      setPlan(p); setStatus('ready')
    } catch (e) {
      setErrMsg(e?.message || 'No se pudo generar el plan.'); setStatus('error')
    }
  }

  if (status === 'loading') return <div className="ai-loading-min" />
  if (status === 'generating') return <AiGenerating kind={kind} />
  if (status === 'ready' && plan) return renderPlan(plan, onGenerate)
  // invite y error comparten la misma pantalla (error muestra el mensaje).
  return <AiPlanIntro intro={intro} onGenerate={onGenerate} error={status === 'error' ? errMsg : ''} />
}
