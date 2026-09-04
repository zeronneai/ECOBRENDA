/* Tarjeta para usuarios EXISTENTES que aún no dieron su WhatsApp. Corta, arriba
   del contenido, OMITIBLE de verdad: la X guarda la decisión (settings.
   waPromptDismissed) y no vuelve a aparecer. Solo GUARDA si marcaron la casilla
   de consentimiento (WhatsAppOptIn). Si escriben número pero no marcan, no se
   guarda nada. No aparece si ya consintió antes. */
import { useState } from 'react'
import { useApp } from '../store'
import WhatsAppOptIn from './WhatsAppOptIn'
import { WA_CONSENT_VERSION, WA_DEFAULT_COUNTRY, toE164, isValidWaLocal } from '../data/waConsent'

export default function WhatsAppOptInCard() {
  const { profile, settings, updateProfile, saveSettings, showToast, t } = useApp()
  const [country, setCountry] = useState(WA_DEFAULT_COUNTRY)
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)

  if (profile?.waConsent?.accepted) return null       // ya aceptó → no molestar
  if (settings?.waPromptDismissed) return null          // la descartó antes

  const canSave = consent && isValidWaLocal(phone)

  const save = () => {
    if (!canSave) return
    updateProfile({
      waPhone: toE164(country, phone),
      waConsent: { accepted: true, date: new Date().toISOString(), version: WA_CONSENT_VERSION },
    })
    saveSettings({ waPromptDismissed: true }) // ya respondió: no repetir la tarjeta
    showToast?.(t('wa.saved'))
  }

  return (
    <div className="train-setup reveal d1">
      <button
        className="train-setup-x"
        onClick={() => saveSettings({ waPromptDismissed: true })}
        aria-label={t('common.cancel')}
      >✕</button>
      <div className="train-setup-emoji">💬</div>
      <div className="train-setup-t">{t('wa.card_title')}</div>
      <div className="train-setup-sub">{t('wa.card_sub')}</div>
      <WhatsAppOptIn
        country={country} phone={phone} consent={consent}
        onCountry={setCountry} onPhone={setPhone} onConsent={setConsent}
      />
      <div className="train-setup-btns" style={{ marginTop: 14 }}>
        <button
          onClick={save}
          disabled={!canSave}
          style={!canSave ? { opacity: 0.5 } : undefined}
        >{t('wa.save_btn')}</button>
      </div>
    </div>
  )
}
