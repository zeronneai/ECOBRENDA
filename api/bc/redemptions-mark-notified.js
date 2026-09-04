/* Respaldo del correo de canjes: tras enviar los correos, el poller de Apps
   Script marca AQUÍ los canjes como notificados (notified_at), para no reenviar.
   Endpoint ESTRECHO protegido por TEAM_SYNC_SECRET.
   POST { ids: [uuid, ...] } con header 'x-team-secret'. */

import { createClient } from '@supabase/supabase-js'

function secretOk(got) {
  const want = process.env.TEAM_SYNC_SECRET || ''
  if (!want || !got || got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i)
  return diff === 0
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!secretOk(req.headers['x-team-secret'])) return res.status(401).json({ error: 'unauthorized' })

  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x) => typeof x === 'string') : []
    if (!ids.length) return res.status(200).json({ ok: true, updated: 0 })

    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await svc
      .from('reward_redemptions')
      .update({ notified_at: new Date().toISOString() })
      .in('id', ids)
      .is('notified_at', null)
      .select('id')
    if (error) return res.status(500).json({ error: 'update_failed', message: error.message })
    return res.status(200).json({ ok: true, updated: (data || []).length })
  } catch (e) {
    return res.status(500).json({ error: 'update_failed', message: e?.message || 'unknown' })
  }
}
