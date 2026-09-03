/* Genera la versión del día para el LUGAR CONTRARIO (switch gym<->casa en Entrena).
   Gate premium en servidor, sin candado de 30 días (contenido diario), dedup por
   workout_day_alts. Ver lib/ai/handler.js → generateWorkoutDay.
   Body: { source_plan_id, day_index, lang }. Header: Authorization: Bearer <jwt>. */
import { generateWorkoutDay } from '../lib/ai/handler.js'

export const maxDuration = 60

export default function handler(req, res) {
  return generateWorkoutDay(req, res)
}
