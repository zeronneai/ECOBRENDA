// data/achievements.js — Logros desbloqueables (fuente única).
// `check(streak, totalWorkouts)` decide si está desbloqueado.
// `req` = etiqueta corta para el estado bloqueado (Progreso).
// `desc` + `brendaMsg` = textos para la celebración.

export const ACHIEVEMENTS = [
  { id: 'semana', emoji: '🔥', name: 'Primera semana', req: '3 entrenamientos', desc: 'Completaste tus primeros 3 entrenamientos.', brendaMsg: '¡Lo estás logrando! El hábito empieza justo así 💪 — Brenda', check: (s, w) => w >= 3 },
  { id: 'mes', emoji: '💪', name: 'Mes completo', req: '12 entrenamientos', desc: '12 entrenamientos completados.', brendaMsg: '¡Un mes de constancia! Esto ya es parte de ti 🔥 — Brenda', check: (s, w) => w >= 12 },
  { id: 'racha7', emoji: '⭐', name: 'Racha de 7 días', req: 'Racha de 7', desc: '7 días seguidos sin fallar.', brendaMsg: '¡Imparable! Una semana entera activa 🌟 — Brenda', check: (s) => s >= 7 },
  { id: 'cincuenta', emoji: '🏆', name: '50 entrenamientos', req: '50 entrenamientos', desc: 'Llegaste a 50 sesiones.', brendaMsg: '¡50 sesiones! Eres otra persona ya 🏆 — Brenda', check: (s, w) => w >= 50 },
  { id: 'racha30', emoji: '💎', name: 'Racha de 30 días', req: 'Racha de 30', desc: '30 días de pura disciplina.', brendaMsg: '¡30 días! Esto es nivel élite 💎 — Brenda', check: (s) => s >= 30 },
  { id: 'cien', emoji: '🌟', name: '100 entrenamientos', req: '100 entrenamientos', desc: '100 sesiones completadas.', brendaMsg: '¡100! Una verdadera leyenda 🌟 — Brenda', check: (s, w) => w >= 100 },
]

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
