/* Tarjeta (Entrena) para usuarios EXISTENTES que nunca respondieron dónde
   entrenan. Corta, orientada al beneficio, arriba del contenido (no lo tapa).
   Captura lugar (un toque) + opcionalmente equipo/lesión (texto). Al elegir
   gym/casa se guarda todo y la tarjeta desaparece (train_location deja de ser
   null). La X la descarta de forma PERSISTENTE (settings.trainPromptDismissed en
   localStorage, como permsPrimed): no vuelve a aparecer. */
import { useState } from 'react'
import { useApp } from '../store'

export default function TrainSetupCard() {
  const { profile, settings, updateProfile, saveSettings, showToast, t } = useApp()
  const [injuries, setInjuries] = useState('')

  if (profile?.trainLocation != null) return null      // ya respondió
  if (settings?.trainPromptDismissed) return null       // la descartó antes

  const pick = (loc) => {
    updateProfile({ trainLocation: loc, ...(injuries.trim() ? { injuries: injuries.trim() } : {}) })
    showToast?.(t('entrena.setup_done'))
  }

  return (
    <div className="train-setup reveal d1">
      <button className="train-setup-x" onClick={() => saveSettings({ trainPromptDismissed: true })} aria-label={t('common.cancel')}>✕</button>
      <div className="train-setup-emoji">🏋️</div>
      <div className="train-setup-t">{t('entrena.setup_title')}</div>
      <div className="train-setup-sub">{t('entrena.setup_sub')}</div>
      <input
        className="pf-input"
        style={{ marginBottom: 12 }}
        placeholder={t('onboarding.injuries.placeholder')}
        value={injuries}
        onChange={(e) => setInjuries(e.target.value)}
      />
      <div className="train-setup-btns">
        <button onClick={() => pick('gym')}>{t('onboarding.train.gym')}</button>
        <button onClick={() => pick('home')}>{t('onboarding.train.home')}</button>
      </div>
    </div>
  )
}
