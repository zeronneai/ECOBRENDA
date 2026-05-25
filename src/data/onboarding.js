// Opciones del onboarding premium. Los 6 objetivos seleccionables mapean a
// uno de los 4 planes Brenda (WORKOUTS/MEALS en plans.js) vía `plan`.

export const GOALS = [
  { id: 'perder_grasa',  emoji: '🔥', label: 'Perder grasa',  desc: 'Define y baja de talla',        plan: 'perder_grasa' },
  { id: 'ganar_musculo', emoji: '💪', label: 'Ganar músculo', desc: 'Construye volumen y fuerza',     plan: 'ganar_musculo' },
  { id: 'tonificar',     emoji: '✨', label: 'Tonificar',     desc: 'Firmeza en todo el cuerpo',      plan: 'tonificar' },
  { id: 'gluteos',       emoji: '🍑', label: 'Glúteos',       desc: 'Volumen y forma de glúteo',      plan: 'tonificar' },
  { id: 'resistencia',   emoji: '🏃‍♀️', label: 'Resistencia',  desc: 'Cardio y aguante',               plan: 'perder_grasa' },
  { id: 'bienestar',     emoji: '🧘‍♀️', label: 'Bienestar',    desc: 'Energía y equilibrio',           plan: 'mantener' },
]

export const LEVELS = [
  { id: 'principiante', emoji: '🌱', label: 'Principiante', desc: 'Empiezo desde cero' },
  { id: 'intermedio',   emoji: '⚡', label: 'Intermedio',   desc: 'Ya entreno a veces' },
  { id: 'avanzado',     emoji: '🚀', label: 'Avanzado',     desc: 'Entreno constante' },
]

export const GENDERS = [
  { id: 'female', label: 'Mujer' },
  { id: 'male',   label: 'Hombre' },
  { id: 'other',  label: 'Prefiero no decir' },
]

export const DAYS_OPTIONS = [2, 3, 4, 5, 6]

export function goalById(id) {
  return GOALS.find((g) => g.id === id)
}
export function goalLabel(id) {
  return goalById(id)?.label || 'tu meta'
}
// Plan Brenda (WORKOUTS/MEALS/GOALS de plans.js) que corresponde al objetivo.
export function planKeyFor(id) {
  return goalById(id)?.plan || 'tonificar'
}
