/* Tarjeta (Entrena) para usuarios EXISTENTES que nunca respondieron dónde
   entrenan. Corta, orientada al beneficio, arriba del contenido (no lo tapa).
   Un toque responde (gym/casa) → el próximo plan se adapta. La X la descarta de
   forma PERSISTENTE (settings.trainPromptDismissed, guardado en localStorage,
   como permsPrimed): no vuelve a aparecer. Al responder, train_location deja de
   ser null y la tarjeta también desaparece. */
import { useApp } from '../store'

export default function TrainSetupCard() {
  const { profile, settings, updateProfile, saveSettings, showToast, t } = useApp()

  if (profile?.trainLocation != null) return null      // ya respondió
  if (settings?.trainPromptDismissed) return null       // la descartó antes

  const pick = (loc) => {
    updateProfile({ trainLocation: loc })
    showToast?.(t('entrena.setup_done'))
  }

  return (
    <div className="train-setup reveal d1">
      <button className="train-setup-x" onClick={() => saveSettings({ trainPromptDismissed: true })} aria-label={t('common.cancel')}>✕</button>
      <div className="train-setup-emoji">🏋️</div>
      <div className="train-setup-t">{t('entrena.setup_title')}</div>
      <div className="train-setup-sub">{t('entrena.setup_sub')}</div>
      <div className="train-setup-btns">
        <button onClick={() => pick('gym')}>{t('onboarding.train.gym')}</button>
        <button onClick={() => pick('home')}>{t('onboarding.train.home')}</button>
      </div>
    </div>
  )
}
