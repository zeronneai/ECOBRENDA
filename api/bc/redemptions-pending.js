/* Respaldo del correo de canjes: el poller de Apps Script lee AQUÍ los canjes
   pendientes que aún no se notificaron. Endpoint ESTRECHO protegido por un
   secreto compartido (TEAM_SYNC_SECRET). Nunca expone el service_role a Apps
   Script; Supabase queda cerrado por RLS + service_role detrás de este endpoint.
   GET con header 'x-team-secret'. Devuelve { ok, pending: [...] }. */

import { createClient } from '@supabase/supabase-js'

const LABELS = { shaker: 'Shaker', termo: 'Termo', colageno: 'Colágeno', creatina: 'Creatina', proteina: 'Proteína', outfit: 'Outfit de gym' }

// Comparación de secreto en tiempo (casi) constante.
function secretOk(got) {
  const want = process.env.TEAM_SYNC_SECRET || ''
  if (!want || !got || got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i)
  return diff === 0
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  if (!secretOk(req.headers['x-team-secret'])) return res.status(401).json({ error: 'unauthorized' })

  try {
    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await svc
      .from('reward_redemptions')
      .select('id,reward_slug,cost,full_name,email,phone,address,size,created_at')
      .eq('status', 'pending')
      .is('notified_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) return res.status(500).json({ error: 'query_failed', message: error.message })
    const pending = (data || []).map((r) => ({ ...r, reward_label: LABELS[r.reward_slug] || r.reward_slug }))
    return res.status(200).json({ ok: true, pending })
  } catch (e) {
    return res.status(500).json({ error: 'query_failed', message: e?.message || 'unknown' })
  }
}
