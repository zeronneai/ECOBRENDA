/* Banco FIJO de frases para las notificaciones motivacionales (sin IA).
   Dos categorías: afirmaciones y motivación, en es/en (mismo índice = misma
   frase traducida). Para agregar más frases: solo añade al final de cada array
   (mantén es y en alineados). La rotación evita repetir hasta agotar el banco. */
import * as dataStore from '../lib/dataStore'

export const MOTIV_BANK = {
  affirmations: {
    es: [
      'Confío plenamente en mis capacidades y en mi intuición para tomar las mejores decisiones.',
      'Cada dificultad que enfrento es una oportunidad disfrazada para aprender y evolucionar.',
      'Merezco vivir una vida plena, feliz y rodeada de paz y abundancia.',
      'Tengo el control absoluto de mis pensamientos, mis reacciones y mi felicidad.',
      'Soy suficiente tal y como soy aquí y ahora.',
      'Hoy decido avanzar con paso firme, dejando atrás los miedos del pasado.',
      'Elijo la calma por encima del caos y protejo mi energía mental.',
      'Acepto mis imperfecciones porque sé que son parte de mi historia y crecimiento.',
      'Mi cuerpo está lleno de energía, vitalidad y salud para lograr lo que me proponga.',
      'Soy más fuerte que cualquier obstáculo que se presente en mi camino hoy.',
      'Agradezco el presente y abro mi mente a todas las cosas buenas que están por llegar.',
      'Mi mente está clara, enfocada y lista para dar lo mejor de mí.',
    ],
    en: [
      'I fully trust my abilities and my intuition to make the best decisions.',
      'Every difficulty I face is an opportunity in disguise to learn and grow.',
      'I deserve a full, happy life surrounded by peace and abundance.',
      'I have complete control over my thoughts, my reactions and my happiness.',
      'I am enough exactly as I am, here and now.',
      'Today I choose to move forward with a firm step, leaving past fears behind.',
      'I choose calm over chaos and I protect my mental energy.',
      'I accept my imperfections because I know they are part of my story and growth.',
      'My body is full of energy, vitality and health to achieve whatever I set out to do.',
      'I am stronger than any obstacle that shows up on my path today.',
      "I'm grateful for the present and I open my mind to all the good things on their way.",
      'My mind is clear, focused and ready to give my best.',
    ],
  },
  motivation: {
    es: [
      'No cuentes los días, haz que los días cuenten.',
      'El mejor momento para empezar fue ayer; el segundo mejor momento es ahora mismo.',
      'Lo que hoy parece un sacrificio, mañana será tu mayor orgullo.',
      'El miedo es solo una ilusión; al otro lado del miedo está la vida que deseas.',
      'La disciplina es el puente invisible que une tus metas con tus logros.',
      'Caerse está permitido, pero levantarse y seguir adelante es obligatorio.',
      'No te conformes con lo que necesitas, lucha incansablemente por lo que mereces.',
      'Los grandes imperios no se construyeron en un día; confía en el proceso.',
      'Cambia tus pensamientos y transformarás por completo tu realidad.',
      'El éxito no llega por arte de magia; llega para quienes trabajan por él sin rendirse.',
      'Conviértete en la persona que necesitabas ver cuando eras más joven.',
      'Si el plan no funciona, cambia el plan pero nunca cambies la meta.',
      'No disminuyas el tamaño de tus sueños; aumenta el tamaño de tu esfuerzo.',
    ],
    en: [
      "Don't count the days, make the days count.",
      'The best time to start was yesterday; the second best time is right now.',
      'What feels like a sacrifice today will be your greatest pride tomorrow.',
      'Fear is just an illusion; on the other side of fear is the life you want.',
      'Discipline is the invisible bridge that connects your goals with your achievements.',
      'Falling is allowed, but getting up and moving forward is mandatory.',
      "Don't settle for what you need; fight relentlessly for what you deserve.",
      "Great empires weren't built in a day; trust the process.",
      "Change your thoughts and you'll completely transform your reality.",
      "Success doesn't come by magic; it comes to those who work for it without giving up.",
      'Become the person you needed to see when you were younger.',
      "If the plan doesn't work, change the plan but never change the goal.",
      "Don't shrink the size of your dreams; increase the size of your effort.",
    ],
  },
}

export const MOTIV_CATEGORIES = ['affirmations', 'motivation']

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Devuelve la siguiente frase de `category` en `lang`, SIN repetir hasta agotar
// el banco. Usa una "bolsa" barajada persistida; al vaciarse, se rebaraja
// evitando que la primera nueva sea igual a la última usada.
export function nextMotivPhrase(category, lang) {
  const byLang = MOTIV_BANK[category] || MOTIV_BANK.affirmations
  const arr = byLang[lang] || byLang.es || []
  if (!arr.length) return ''
  const state = dataStore.getMotivRotation() || {}
  let s = state[category] || { pool: [], last: -1 }
  if (!s.pool.length) {
    s.pool = shuffled(arr.length)
    if (arr.length > 1 && s.pool[0] === s.last) { const t = s.pool[0]; s.pool[0] = s.pool[1]; s.pool[1] = t }
  }
  const idx = s.pool.shift()
  s.last = idx
  state[category] = s
  dataStore.setMotivRotation(state)
  return arr[idx] || arr[0]
}

// Alterna categoría (afirmación/motivación) de forma pseudo-aleatoria.
export function nextMotivAny(lang) {
  const cat = MOTIV_CATEGORIES[Math.floor(Math.random() * MOTIV_CATEGORIES.length)]
  return nextMotivPhrase(cat, lang)
}
