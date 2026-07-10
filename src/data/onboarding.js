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

// Alergias alimentarias (multi-select). 'ninguna' es exclusiva: si se marca,
// se limpian las demás (y viceversa). Se usan para que la IA arme dietas seguras.
export const ALLERGIES = [
  { id: 'lacteos',      emoji: '🥛', label: 'Lácteos' },
  { id: 'gluten',       emoji: '🌾', label: 'Gluten' },
  { id: 'frutos_secos', emoji: '🥜', label: 'Frutos secos' },
  { id: 'mariscos',     emoji: '🦐', label: 'Mariscos' },
  { id: 'huevo',        emoji: '🥚', label: 'Huevo' },
  { id: 'soya',         emoji: '🫘', label: 'Soya' },
  { id: 'pescado',      emoji: '🐟', label: 'Pescado' },
  { id: 'ninguna',      emoji: '✅', label: 'Ninguna' },
]

// Preferencia dietética (single-select).
export const DIET_PREFS = [
  { id: 'todo',        emoji: '🍽️', label: 'Como de todo',        desc: 'Sin restricciones' },
  { id: 'vegetariana', emoji: '🥗', label: 'Vegetariana',         desc: 'Sin carne ni pescado' },
  { id: 'vegana',      emoji: '🌱', label: 'Vegana',              desc: 'Nada de origen animal' },
  { id: 'keto',        emoji: '🥑', label: 'Keto / Baja en carbos', desc: 'Pocos carbohidratos' },
  { id: 'ninguna',     emoji: '🤷‍♀️', label: 'Sin restricción específica', desc: 'Tú decides' },
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

// Días de la semana para alarmas (0=Lun … 6=Dom).
export const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
export function formatDays(days = []) {
  if (days.length === 7) return 'Diario'
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return 'L a V'
  if (sorted.length === 0) return 'Sin días'
  return sorted.map((d) => DAY_LABELS[d]).join('·')
}

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
