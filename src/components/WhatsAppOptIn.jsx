/* Bloque reutilizable del opt-in de WhatsApp (onboarding, tarjeta y Perfil).
   Presentacional/controlado: recibe country/phone/consent + setters. La CASILLA
   de consentimiento va SEPARADA del campo y NO viene premarcada. El texto deja
   claro a qué acepta y que puede darse de baja cuando quiera. Quien lo usa decide
   cuándo guardar (solo debe guardar si consent === true). */
import { useApp } from '../store'
import { WA_COUNTRIES } from '../data/waConsent'

export default function WhatsAppOptIn({ country, phone, consent, onCountry, onPhone, onConsent }) {
  const { t } = useApp()
  return (
    <div className="wa-optin">
      <div className="wa-phone-row">
        <select
          className="pf-select wa-cc"
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          aria-label={t('wa.country_label')}
        >
          {WA_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
          ))}
        </select>
        <input
          className="pf-input wa-num"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t('wa.phone_ph')}
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
        />
      </div>
      <label className="wa-consent">
        <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
        <span>{t('wa.consent_text')}</span>
      </label>
    </div>
  )
}
