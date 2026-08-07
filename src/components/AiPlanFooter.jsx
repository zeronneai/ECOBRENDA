/* Pie de un plan renderizado: muestra el contador de bloqueo (plan vigente) o
   la caja de renovación (ciclo de 30 días cumplido). Con mock, un botón dev
   permite "simular +30 días". Compartido por WorkoutPlanView y DietPlanView. */
import { useApp } from '../store'

export default function AiPlanFooter({ locked, daysLeft, onRenew, onDevForce }) {
  const { t } = useApp()
  if (locked) {
    return (
      <>
        <div className="ai-lock">{t(daysLeft === 1 ? 'ai.footer_locked_one' : 'ai.footer_locked_many', { n: daysLeft })}</div>
        {onDevForce && (
          <button className="ai-devforce" onClick={onDevForce}>{t('ai.dev_force')}</button>
        )}
      </>
    )
  }
  return (
    <div className="ai-renew-box">
      <p>{t('ai.renew_p')}</p>
      <button className="ai-renew-btn" onClick={onRenew}>{t('ai.renew_btn')}</button>
    </div>
  )
}
