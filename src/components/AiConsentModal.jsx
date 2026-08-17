/* Consentimiento de uso de IA (Apple 5.1.2(i)). Un solo texto, dos usos:
   - variant="gate": aparece ANTES de generar un plan (aceptar/declinar). Bloquea
     la primera transmisión de datos a la IA (Anthropic).
   - variant="info": consulta desde Perfil en cualquier momento (solo lectura).
   Nombra al proveedor (Anthropic) y lista los datos que se comparten. */
import { useApp } from '../store'
import Button3D from './ui/Button3D'
import { openLegal } from '../lib/openLegal'

export default function AiConsentModal({ variant = 'gate', consentDate, onAccept, onDecline, onClose }) {
  const { t, language } = useApp()

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="ai-consent-overlay" role="dialog" aria-modal="true">
      <div className="ai-consent">
        <div className="ai-consent-badge">✦ BRENDA FITNESS</div>
        <h2 className="destello-title ai-consent-title">{t('consent.title')}</h2>

        <div className="ai-consent-body">
          <p>
            {t('consent.p1_a')}<b>Anthropic</b>{t('consent.p1_b')}
          </p>
          <p className="ai-consent-sub">{t('consent.datalist_intro')}</p>
          <ul className="ai-consent-list">
            <li>{t('consent.data_1')}</li>
            <li>{t('consent.data_2')}</li>
            <li>{t('consent.data_3')}</li>
          </ul>
          <p>{t('consent.p2')}</p>
          {variant === 'gate' && <p className="ai-consent-ask">{t('consent.ask')}</p>}
          {variant === 'info' && consentDate && (
            <p className="ai-consent-date">{t('consent.accepted_on', { date: formatDate(consentDate) })}</p>
          )}
        </div>

        <span className="ai-consent-link" onClick={() => openLegal('/privacy')}>{t('consent.privacy_link')}</span>

        {variant === 'gate' ? (
          <div className="ai-consent-actions">
            <Button3D fullWidth onClick={onAccept}>{t('consent.accept')}</Button3D>
            <button type="button" className="ai-consent-no" onClick={onDecline}>{t('consent.decline')}</button>
          </div>
        ) : (
          <div className="ai-consent-actions">
            <Button3D fullWidth onClick={onClose}>{t('common.understood')}</Button3D>
          </div>
        )}
      </div>
    </div>
  )
}
