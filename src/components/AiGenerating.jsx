/* Estado de carga premium mientras la IA (o el mock) arma el plan. */
import { useApp } from '../store'

export default function AiGenerating({ kind }) {
  const { t } = useApp()
  return (
    <div className="ai-gen reveal">
      <div className="ai-gen-orb"><span>B</span></div>
      <h2 className="ai-gen-title">{t('ai.gen_title')}</h2>
      <p className="ai-gen-sub">{t(kind === 'diet' ? 'ai.gen_sub_diet' : 'ai.gen_sub_workout')}</p>
      <div className="ai-gen-bar"><i /></div>
    </div>
  )
}
