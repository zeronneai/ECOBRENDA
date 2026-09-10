/* Generación IA — función CONSOLIDADA (ruta dinámica: 1 función para las 3).
   URLs NUEVAS (solo las llama el cliente, ya actualizado en src/lib/aiPlans.js):
     POST /api/generate/workout      -> rutina semanal
     POST /api/generate/diet         -> plan de dieta 7 días
     POST /api/generate/workout-day  -> día alterno gym<->casa
   Header: Authorization: Bearer <jwt>. Ver lib/ai/handler.js para el flujo. */

import { generatePlan, generateWorkoutDay } from '../../lib/ai/handler.js'

export const maxDuration = 60

export default function handler(req, res) {
  const kind = req.query.kind
  if (kind === 'workout') return generatePlan('workout', req, res)
  if (kind === 'diet') return generatePlan('diet', req, res)
  if (kind === 'workout-day') return generateWorkoutDay(req, res)
  return res.status(404).json({ error: 'unknown_kind' })
}
