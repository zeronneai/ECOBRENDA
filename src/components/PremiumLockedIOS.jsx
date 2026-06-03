/* Card neutra que reemplaza cualquier CTA de pago en iOS — cumple App Store
   Rule 3.1.1: NO menciona "premium", "suscripción", "pago", ni linkea a la
   web. Texto suave: "acceso completo" / "iniciar sesión para continuar". */
export default function PremiumLockedIOS() {
  return (
    <div className="premium-locked">
      <div className="premium-locked-ic">🔒</div>
      <h3 className="premium-locked-title">CONTENIDO EXCLUSIVO</h3>
      <p className="premium-locked-text">
        Esta sección requiere una cuenta con acceso completo. Si ya tienes
        acceso, inicia sesión para continuar.
      </p>
    </div>
  )
}
