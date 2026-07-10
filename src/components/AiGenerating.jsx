/* Estado de carga premium mientras la IA (o el mock) arma el plan. */
export default function AiGenerating({ kind }) {
  const what = kind === 'diet' ? 'tu plan de comidas' : 'tu rutina'
  return (
    <div className="ai-gen reveal">
      <div className="ai-gen-orb"><span>B</span></div>
      <h2 className="ai-gen-title">Brenda está analizando tu perfil…</h2>
      <p className="ai-gen-sub">Armando {what} a tu medida. Aguanta, esto vale la pena. 🔥</p>
      <div className="ai-gen-bar"><i /></div>
    </div>
  )
}
