/* Brenda Coins — ruleta. Un giro por fuente al día (alarma / primer reto).
   Vercel Function. El user.id sale del JWT; el resultado (premio) lo decide el
   SERVIDOR en bc_spin (pesos server-side). El cliente solo anima y revela.

   Body: { source: 'alarm' | 'challenge' }.
   Responde el jsonb de bc_spin: { ok, prize, source, balance } o
   { ok:false, reason: 'already_spun' | 'alarm_not_done' | 'not_eligible' | ... }. */

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

    const source = req.body?.source
    if (source !== 'alarm' && source !== 'challenge') {
      return res.status(400).json({ error: 'bad_source' })
    }

    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await svc.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid_token' })
    const user = userData.user

    const { data, error } = await svc.rpc('bc_spin', { uid: user.id, p_source: source })
    if (error) {
      console.error('[bc/spin] rpc', error.message)
      return res.status(500).json({ error: 'spin_failed', message: error.message })
    }
    return res.status(200).json(data)
  } catch (e) {
    console.error('[bc/spin]', e?.message || e)
    return res.status(500).json({ error: 'spin_failed', message: e?.message || 'unknown' })
  }
}
