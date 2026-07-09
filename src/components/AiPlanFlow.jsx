/* Orquesta la máquina de estados del plan de IA (compartido por Entrena y
   Nutrición): loading → invite → generating → ready → (checkin → generating) …
   Incluye el ciclo de 30 días: si el plan está bloqueado (lockedUntil futuro)
   se muestra el contador; si ya venció, se ofrece el check-in y la renovación.
   Props:
     - kind: 'workout' | 'diet'
     - intro: { kick, title, sub, cta }
     - generate: async (checkin?) => { content, lockedUntil }
     - renderPlan: (content, meta) => JSX
       meta = { locked, daysLeft, onRenew, onDevForce } */
import { useState, useEffect } from 'react'
import { getLatestPlan, USE_MOCK_PLANS } from '../lib/aiPlans'
import AiPlanIntro from './AiPlanIntro'
import AiGenerating from './AiGenerating'
import AiCheckIn from './AiCheckIn'

const DAY_MS = 24 * 60 * 60 * 1000

export default function AiPlanFlow({ kind, intro, generate, renderPlan }) {
  const [status, setStatus] = useState('loading') // loading|invite|generating|ready|checkin|error
  const [plan, setPlan] = useState(null)          // { content, lockedUntil }
  const [forced, setForced] = useState(false)     // override dev "simular +30 días"
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let alive = true
    getLatestPlan(kind)
      .then((r) => {
        if (!alive) return
        if (r?.content) { setPlan(r); setStatus('ready') } else setStatus('invite')
      })
      .catch(() => { if (alive) setStatus('invite') })
    return () => { alive = false }
  }, [kind])

  const runGenerate = async (checkin) => {
    setStatus('generating'); setErrMsg('')
    try {
      const r = await generate(checkin)
      setPlan(r); setForced(false); setStatus('ready')
    } catch (e) {
      setErrMsg(e?.message || 'No se pudo generar el plan.'); setStatus('error')
    }
  }

  if (status === 'loading') return <div className="ai-loading-min" />
  if (status === 'generating') return <AiGenerating kind={kind} />
  if (status === 'checkin') return <AiCheckIn kind={kind} onSubmit={runGenerate} onCancel={() => setStatus('ready')} />

  if (status === 'ready' && plan?.content) {
    const lu = plan.lockedUntil ? new Date(plan.lockedUntil).getTime() : 0
    const now = Date.now()
    const locked = lu > now && !forced
    const daysLeft = locked ? Math.max(1, Math.ceil((lu - now) / DAY_MS)) : 0
    return renderPlan(plan.content, {
      locked,
      daysLeft,
      onRenew: () => setStatus('checkin'),
      onDevForce: USE_MOCK_PLANS && locked ? () => setForced(true) : null,
    })
  }

  // invite y error comparten pantalla (error muestra el mensaje).
  return <AiPlanIntro intro={intro} onGenerate={() => runGenerate()} error={status === 'error' ? errMsg : ''} />
}
