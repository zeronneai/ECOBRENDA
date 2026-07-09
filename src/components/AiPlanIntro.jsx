/* Pantalla de invitación premium (estado inicial, antes de generar).
   Copy retador de Brenda; `intro` trae el texto por pantalla (Entrena/Nutrición). */
import Button3D from './ui/Button3D'

export default function AiPlanIntro({ intro, onGenerate, error }) {
  return (
    <div className="ai-intro reveal d2">
      <div className="ai-intro-glow" />
      <div className="ai-intro-badge">✦ BRENDA IA</div>
      <div className="ai-intro-kick">{intro.kick}</div>
      <h2 className="ai-intro-title">{intro.title}</h2>
      <p className="ai-intro-sub">{intro.sub}</p>
      {error && <div className="ai-intro-error">{error}</div>}
      <div style={{ marginTop: 4 }}><Button3D fullWidth onClick={onGenerate}>{intro.cta}</Button3D></div>
      <div className="ai-intro-foot">100% personalizado con tu perfil</div>
    </div>
  )
}
