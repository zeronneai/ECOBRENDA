/* Consentimiento de uso de IA (Apple 5.1.2(i)). Un solo texto, dos usos:
   - variant="gate": aparece ANTES de generar un plan (aceptar/declinar). Bloquea
     la primera transmisión de datos a la IA (Anthropic).
   - variant="info": consulta desde Perfil en cualquier momento (solo lectura).
   Nombra al proveedor (Anthropic) y lista los datos que se comparten. */
import Button3D from './ui/Button3D'
import { openLegal } from '../lib/openLegal'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function AiConsentModal({ variant = 'gate', consentDate, onAccept, onDecline, onClose }) {
  return (
    <div className="ai-consent-overlay" role="dialog" aria-modal="true">
      <div className="ai-consent">
        <div className="ai-consent-badge">✦ BRENDA IA</div>
        <h2 className="destello-title ai-consent-title">Antes de empezar</h2>

        <div className="ai-consent-body">
          <p>
            Para armarte un plan perfecto y a tu medida, me apoyo en una herramienta de
            inteligencia artificial (<b>Anthropic</b>) que me ayuda a procesar tu información
            y crear tu rutina y dieta en segundos.
          </p>
          <p className="ai-consent-sub">Estos son los datos que se usan para personalizar tu plan:</p>
          <ul className="ai-consent-list">
            <li>Edad, peso y estatura</li>
            <li>Tu objetivo y nivel</li>
            <li>Tus alergias y preferencias alimenticias</li>
          </ul>
          <p>
            Yo diseñé el método; la IA me ayuda a personalizarlo para TI, rápido. Tus datos
            se usan solo para crear tu plan.
          </p>
          {variant === 'gate' && <p className="ai-consent-ask">¿Le entramos? 🔥</p>}
          {variant === 'info' && consentDate && (
            <p className="ai-consent-date">✅ Aceptaste el {formatDate(consentDate)}</p>
          )}
        </div>

        <span className="ai-consent-link" onClick={() => openLegal('/privacy')}>Ver aviso de privacidad</span>

        {variant === 'gate' ? (
          <div className="ai-consent-actions">
            <Button3D fullWidth onClick={onAccept}>ACEPTO, DALE 🔥</Button3D>
            <button type="button" className="ai-consent-no" onClick={onDecline}>Ahora no</button>
          </div>
        ) : (
          <div className="ai-consent-actions">
            <Button3D fullWidth onClick={onClose}>Entendido</Button3D>
          </div>
        )}
      </div>
    </div>
  )
}
