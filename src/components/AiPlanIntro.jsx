/* Pantalla de invitación premium (estado inicial, antes de generar).
   Copy retador de Brenda; `intro` trae el texto por pantalla (Entrena/Nutrición). */
export default function AiPlanIntro({ intro, onGenerate, error }) {
  return (
    <div className="ai-intro reveal d2">
      <div className="ai-intro-glow" />
      <div className="ai-intro-badge">✦ BRENDA IA</div>
      <div className="ai-intro-kick">{intro.kick}</div>
      <h2 className="ai-intro-title">{intro.title}</h2>
      <p className="ai-intro-sub">{intro.sub}</p>
      {error && <div className="ai-intro-error">{error}</div>}
      <button className="ai-intro-cta" onClick={onGenerate}>{intro.cta}</button>
      <div className="ai-intro-foot">100% personalizado con tu perfil</div>
    </div>
  )
}
