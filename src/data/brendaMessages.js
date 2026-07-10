/* Banco de mensajes FIJOS con la voz de Brenda (retador, atrabancado, mexicano).
   Cero API: se eligen al azar dentro de cada categoría. getBrendaMessage()
   reemplaza variables como {streak}. */

export const BRENDA_MESSAGES = {
  homeStreak: [
    "{streak} días seguidos. ¿Vas a tirar todo hoy o le sigues? Demuéstrame. 🔥",
    "Llevas {streak} días. Los débiles ya se habrían rendido. Tú no. Dale. 💪",
    "{streak} días de racha. No me falles hoy. 🔥",
  ],
  homeNoWorkoutYet: [
    "¿Qué esperas? Tu cuerpo no se mueve solo. Órale. 💪",
    "El día se te va y tú sin moverte. ¿Vas a poder o no? 🔥",
    "Las excusas no queman calorías. ¡Muévete! 💪",
  ],
  homeStreakBroken: [
    "Se te fue la racha. ¿Y qué? Los que ganan vuelven a empezar. Hoy. 🔥",
    "Caíste. Levántate. No me hagas repetírtelo. 💪",
  ],
  exerciseDone: [
    "¡Esa! 💥", "Una menos 🔥", "No aflojes 💪", "¡Así! 🔥", "Séguele 💥", "Eso es 👊",
  ],
  dayCompleted: [
    "¡DÍA COMPLETADO! Eso es carácter. No cualquiera. 🔥",
    "¡Terminaste! Así se ve la disciplina. Orgullosa de ti. 💪",
    "¡LISTO! ¿Viste que sí podías? Mañana otra vez. 🔥",
  ],
  achievement: [
    "Nuevo logro. Te lo ganaste a pulso. Sigue. 💪",
    "¡Desbloqueaste algo! Esto es de pocos. 🔥",
  ],
  alarm: [
    "¡ARRIBA! Squats YA. No me hagas esperar. 🔥",
    "¡Órale, flojera afuera! A moverse. 💪",
    "La cama no te va a dar el cuerpo que quieres. ¡Arriba! 🔥",
  ],
  emptyProgress: [
    "Aquí va a estar tu historia. Empieza a escribirla. 💪",
  ],
  emptyPlan: [
    "Tengo algo preparado para ti. ¿Te atreves? 🔥",
  ],
}

// Helper: elige aleatorio y reemplaza {var} si aplica.
export function getBrendaMessage(category, vars = {}) {
  const list = BRENDA_MESSAGES[category] || []
  if (list.length === 0) return ''
  let msg = list[Math.floor(Math.random() * list.length)]
  Object.keys(vars).forEach((k) => {
    msg = msg.replace(new RegExp(`{${k}}`, 'g'), vars[k])
  })
  return msg
}
