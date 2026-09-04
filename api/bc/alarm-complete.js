/* Brenda Coins — otorga los puntos por completar la alarma del día.
   Vercel Function (Node serverless). El user.id SIEMPRE sale del JWT validado,
   nunca de un body → nadie puede otorgar puntos a otra persona.

   Flujo:
     1. Valida el JWT de Supabase (Authorization: Bearer).
     2. Llama a bc_award_alarm(uid) con service_role (SECURITY DEFINER):
        +10 BC (idempotente por día-negocio), racha con tolerancia 48h,
        hitos acumulativos. Todo con hora del servidor.
   Responde el jsonb de la función: { ok, already, earned, milestone_bonus,
   balance, streak, best, deadline_at } o { ok:false, reason }. */

import { createClient } from '@supabase/supabase-js'

const ALLOW = process.env.CORS_ORIGIN || '*'

export const maxDuration = 15

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'missing_token' })

    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await svc.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid_token' })
    const user = userData.user

    const { data, error } = await svc.rpc('bc_award_alarm', { uid: user.id })
    if (error) {
      console.error('[bc/alarm-complete] rpc', error.message)
      return res.status(500).json({ error: 'award_failed', message: error.message })
    }
    return res.status(200).json(data)
  } catch (e) {
    console.error('[bc/alarm-complete]', e?.message || e)
    return res.status(500).json({ error: 'award_failed', message: e?.message || 'unknown' })
  }
}
