/* Pantalla de PREPARACIÓN del plan: el plan ya se pidió y se está generando/
   revisando, pero aún no se libera (faltan 48h y/o la aprobación de Brenda).
   NO es un error: comunica que se está preparando algo, con una estimación. */
import { useApp } from '../store'

const RELEASE_MS = 48 * 60 * 60 * 1000

export default function AiPreparing({ requestedAt }) {
  const { t, language } = useApp()

  let etaStr = ''
  if (requestedAt) {
    const eta = new Date(new Date(requestedAt).getTime() + RELEASE_MS)
    if (!Number.isNaN(eta.getTime())) {
      etaStr = eta.toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    }
  }

  return (
    <div className="ai-gen reveal">
      <div className="ai-gen-orb"><span>B</span></div>
      <h2 className="ai-gen-title">{t('ai.prep_title')}</h2>
      <p className="ai-gen-sub">{t('ai.prep_sub')}</p>
      <div className="ai-gen-bar"><i /></div>
      {etaStr && <p className="ai-prep-eta">{t('ai.prep_eta', { date: etaStr })}</p>}
    </div>
  )
}
