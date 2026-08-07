/* Banco de mensajes FIJOS con la voz de Brenda (retador, atrabancado).
   Cero API: se eligen al azar dentro de cada categoría. getBrendaMessage(lang, …)
   elige el banco según el idioma del usuario y reemplaza variables como {streak}.
   El inglés NO es traducción literal: mantiene la misma actitud exigente. */

const BRENDA_MESSAGES_ES = {
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

const BRENDA_MESSAGES_EN = {
  homeStreak: [
    "{streak} days straight. You gonna throw it all away today or keep going? Prove it. 🔥",
    "{streak} days in. The weak would've quit by now. Not you. Let's go. 💪",
    "{streak}-day streak. Don't you dare flake on me today. 🔥",
  ],
  homeNoWorkoutYet: [
    "What are you waiting for? Your body won't move itself. Come on. 💪",
    "Day's slipping away and you haven't moved. You got this or you don't? 🔥",
    "Excuses don't burn calories. Move it! 💪",
  ],
  homeStreakBroken: [
    "Streak's gone. So what? Winners start over. Today. 🔥",
    "You slipped. Get up. Don't make me say it twice. 💪",
  ],
  exerciseDone: [
    "That's it! 💥", "One down 🔥", "Don't ease up 💪", "Yes! 🔥", "Keep it up 💥", "That's it 👊",
  ],
  dayCompleted: [
    "DAY DONE! That's character. Not everyone's got it. 🔥",
    "You finished! That's what discipline looks like. Proud of you. 💪",
    "DONE! See? You had it in you. Again tomorrow. 🔥",
  ],
  achievement: [
    "New achievement. You earned every bit of it. Keep going. 💪",
    "You unlocked something! This is for the few. 🔥",
  ],
  alarm: [
    "UP! Squats NOW. Don't keep me waiting. 🔥",
    "Come on, drop the excuses! Let's move. 💪",
    "The bed won't give you the body you want. Get up! 🔥",
  ],
  emptyProgress: [
    "Your story goes right here. Start writing it. 💪",
  ],
  emptyPlan: [
    "I've got something ready for you. You up for it? 🔥",
  ],
}

const BANKS = { es: BRENDA_MESSAGES_ES, en: BRENDA_MESSAGES_EN }

// Helper: elige aleatorio del banco del idioma y reemplaza {var} si aplica.
// `lang` = 'es' | 'en' (viene del Context/perfil). Cae a español si no existe.
export function getBrendaMessage(lang, category, vars = {}) {
  const bank = BANKS[lang] || BANKS.es
  const list = bank[category] || BANKS.es[category] || []
  if (list.length === 0) return ''
  let msg = list[Math.floor(Math.random() * list.length)]
  Object.keys(vars).forEach((k) => {
    msg = msg.replace(new RegExp(`{${k}}`, 'g'), vars[k])
  })
  return msg
}
