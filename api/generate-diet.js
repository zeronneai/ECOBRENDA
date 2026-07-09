/* Genera un PLAN DE DIETA de 7 días personalizado con IA para la usuaria
   autenticada, respetando alergias/preferencia/dislikes (regla inquebrantable).
   Vercel Function (Node serverless). Ver lib/ai/handler.js para el flujo.
   Body: {} (usa el perfil de Supabase). Header: Authorization: Bearer <jwt>. */

import { generatePlan } from '../lib/ai/handler.js'

export const maxDuration = 60

export default function handler(req, res) {
  return generatePlan('diet', req, res)
}
