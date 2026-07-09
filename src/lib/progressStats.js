/* Helpers puros para la pantalla Progreso. Sin UI, sin efectos: transforman los
   datos reales (progressLog, totals, workoutLog) en series listas para recharts.
   Todo tolerante a datos vacíos/parciales. */

// ── Peso: serie cronológica + min/max ─────────────────────────────────────────
// progressLog viene más reciente primero: [{ id, ts, date, weight, note }]
export function weightSeries(progressLog = [], max = 30) {
  const pts = progressLog
    .slice(0, max)
    .filter((p) => typeof p.weight === 'number')
    .reverse()
    .map((p) => ({ date: (p.date || '').slice(5), weight: p.weight }))
  if (!pts.length) return { points: [], min: null, max: null }
  const weights = pts.map((p) => p.weight)
  return { points: pts, min: Math.min(...weights), max: Math.max(...weights) }
}

// ── Entrenamientos por semana (últimas N semanas, lunes como inicio) ───────────
// workoutLog: [{ id, ts, date, source, exercise, reps }]
function startOfWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = (x.getDay() + 6) % 7 // 0 = lunes
  x.setDate(x.getDate() - day)
  return x
}
function weekKey(d) {
  const s = startOfWeek(d)
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`
}

export function workoutsByWeek(workoutLog = [], weeks = 8, now = new Date()) {
  // Construye los N cubos de semana (del más viejo al más reciente).
  const buckets = []
  const base = startOfWeek(now)
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i * 7)
    buckets.push({ key: weekKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 })
  }
  const index = new Map(buckets.map((b) => [b.key, b]))
  for (const w of workoutLog) {
    if (!w?.date && !w?.ts) continue
    const d = w.date ? new Date(w.date) : new Date(w.ts)
    const b = index.get(weekKey(d))
    if (b) b.count += 1
  }
  return buckets
}

// ── Donut Squats vs Lunges ────────────────────────────────────────────────────
export function squatLungeSplit(totals = {}) {
  const squat = Math.max(0, totals.squat || 0)
  const lunge = Math.max(0, totals.lunge || 0)
  return {
    data: [
      { name: 'Squats', value: squat },
      { name: 'Lunges', value: lunge },
    ],
    total: squat + lunge,
    squat,
    lunge,
  }
}
