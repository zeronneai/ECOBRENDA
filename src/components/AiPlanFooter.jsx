/* Pie de un plan renderizado: muestra el contador de bloqueo (plan vigente) o
   la caja de renovación (ciclo de 30 días cumplido). Con mock, un botón dev
   permite "simular +30 días". Compartido por WorkoutPlanView y DietPlanView. */
export default function AiPlanFooter({ locked, daysLeft, onRenew, onDevForce }) {
  if (locked) {
    return (
      <>
        <div className="ai-lock">🔒 Tu plan se renueva en <b>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</b></div>
        {onDevForce && (
          <button className="ai-devforce" onClick={onDevForce}>⏩ Simular +30 días (dev)</button>
        )}
      </>
    )
  }
  return (
    <div className="ai-renew-box">
      <p>Ya pasó un mes. ¿Cómo te fue? Cuéntame tus avances y te armo el siguiente nivel. 🔥</p>
      <button className="ai-renew-btn" onClick={onRenew}>ACTUALIZAR MI PLAN</button>
    </div>
  )
}
