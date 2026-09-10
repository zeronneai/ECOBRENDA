/* Booty Coins — función CONSOLIDADA (ruta dinámica de Vercel: 1 función atiende
   todas las sub-rutas /api/bc/*). Las URLs NO cambian respecto a antes:
     POST /api/bc/alarm-complete           (JWT)  -> bc_award_alarm
     POST /api/bc/spin                     (JWT)  -> bc_spin
     POST /api/bc/redeem                   (JWT)  -> bc_redeem + push Apps Script
     GET  /api/bc/redemptions-pending      (x-team-secret) -> canjes pendientes
     POST /api/bc/redemptions-mark-notified(x-team-secret) -> marca notified_at
   El user.id SIEMPRE sale del JWT (nunca del body). Los endpoints del poller van
   protegidos por TEAM_SYNC_SECRET. Comportamiento idéntico a los archivos previos. */

import { createClient } from '@supabase/supabase-js'

const ALLOW = process.env.CORS_ORIGIN || '*'
const LABELS = { shaker: 'Shaker', termo: 'Termo', colageno: 'Colágeno', creatina: 'Creatina', proteina: 'Proteína', outfit: 'Outfit de gym' }

export const maxDuration = 20

const svc = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function corsClient(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
}

// Comparación de secreto del poller en tiempo (casi) constante.
function teamSecretOk(got) {
  const want = process.env.TEAM_SYNC_SECRET || ''
  if (!want || !got || got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i)
  return diff === 0
}

// Resuelve el usuario del JWT. Devuelve { user } o escribe el error y devuelve null.
async function userFromJwt(req, res, db) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) { res.status(401).json({ error: 'missing_token' }); return null }
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) { res.status(401).json({ error: 'invalid_token' }); return null }
  return data.user
}

export default async function handler(req, res) {
  const action = req.query.action

  // ── Poller de Apps Script (secreto compartido, sin CORS: server-to-server) ──
  if (action === 'redemptions-pending') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
    if (!teamSecretOk(req.headers['x-team-secret'])) return res.status(401).json({ error: 'unauthorized' })
    try {
      const { data, error } = await svc()
        .from('reward_redemptions')
        .select('id,reward_slug,cost,full_name,email,phone,address,size,created_at')
        .eq('status', 'pending').is('notified_at', null)
        .order('created_at', { ascending: true }).limit(50)
      if (error) return res.status(500).json({ error: 'query_failed', message: error.message })
      const pending = (data || []).map((r) => ({ ...r, reward_label: LABELS[r.reward_slug] || r.reward_slug }))
      return res.status(200).json({ ok: true, pending })
    } catch (e) { return res.status(500).json({ error: 'query_failed', message: e?.message || 'unknown' }) }
  }

  if (action === 'redemptions-mark-notified') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
    if (!teamSecretOk(req.headers['x-team-secret'])) return res.status(401).json({ error: 'unauthorized' })
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x) => typeof x === 'string') : []
      if (!ids.length) return res.status(200).json({ ok: true, updated: 0 })
      const { data, error } = await svc()
        .from('reward_redemptions')
        .update({ notified_at: new Date().toISOString() })
        .in('id', ids).is('notified_at', null).select('id')
      if (error) return res.status(500).json({ error: 'update_failed', message: error.message })
      return res.status(200).json({ ok: true, updated: (data || []).length })
    } catch (e) { return res.status(500).json({ error: 'update_failed', message: e?.message || 'unknown' }) }
  }

  // ── Endpoints del cliente (JWT + CORS) ──────────────────────────────────────
  corsClient(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const db = svc()

  if (action === 'alarm-complete') {
    try {
      const user = await userFromJwt(req, res, db); if (!user) return
      const { data, error } = await db.rpc('bc_award_alarm', { uid: user.id })
      if (error) { console.error('[bc/alarm-complete] rpc', error.message); return res.status(500).json({ error: 'award_failed', message: error.message }) }
      return res.status(200).json(data)
    } catch (e) { console.error('[bc/alarm-complete]', e?.message || e); return res.status(500).json({ error: 'award_failed', message: e?.message || 'unknown' }) }
  }

  if (action === 'spin') {
    try {
      const source = req.body?.source
      if (source !== 'alarm' && source !== 'challenge') return res.status(400).json({ error: 'bad_source' })
      const user = await userFromJwt(req, res, db); if (!user) return
      const { data, error } = await db.rpc('bc_spin', { uid: user.id, p_source: source })
      if (error) { console.error('[bc/spin] rpc', error.message); return res.status(500).json({ error: 'spin_failed', message: error.message }) }
      return res.status(200).json(data)
    } catch (e) { console.error('[bc/spin]', e?.message || e); return res.status(500).json({ error: 'spin_failed', message: e?.message || 'unknown' }) }
  }

  if (action === 'redeem') {
    try {
      const b = req.body || {}
      const user = await userFromJwt(req, res, db); if (!user) return
      const { data, error } = await db.rpc('bc_redeem', {
        uid: user.id, p_slug: b.slug, p_full_name: b.full_name, p_email: b.email,
        p_phone: b.phone, p_address: b.address, p_size: b.size ?? null,
      })
      if (error) { console.error('[bc/redeem] rpc', error.message); return res.status(500).json({ error: 'redeem_failed', message: error.message }) }
      if (!data?.ok) return res.status(200).json(data) // { ok:false, reason }

      // Push instantáneo al equipo (Apps Script). Best-effort; solo marca notified
      // si Apps Script confirma en el CUERPO (ok:true), no por el status HTTP.
      const payload = {
        redemption_id: data.redemption_id, reward_slug: data.reward,
        reward_label: LABELS[data.reward] || data.reward, cost: data.cost,
        full_name: b.full_name, email: b.email, phone: b.phone, address: b.address, size: b.size || '',
        user_id: user.id, created_at: new Date().toISOString(),
      }
      let notified = false
      if (process.env.APPS_SCRIPT_URL) {
        try {
          const r = await fetch(process.env.APPS_SCRIPT_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: process.env.APPS_SCRIPT_SECRET || '', ...payload }),
          })
          const j = await r.json().catch(() => ({}))
          notified = j.ok === true
          if (!notified) console.error('[bc/redeem] push no confirmado por Apps Script:', JSON.stringify(j).slice(0, 200))
        } catch (e) { console.error('[bc/redeem] push', e?.message || e) }
      }
      if (notified) await db.from('reward_redemptions').update({ notified_at: new Date().toISOString() }).eq('id', data.redemption_id)

      return res.status(200).json({ ok: true, redemption_id: data.redemption_id, balance: data.balance })
    } catch (e) { console.error('[bc/redeem]', e?.message || e); return res.status(500).json({ error: 'redeem_failed', message: e?.message || 'unknown' }) }
  }

  return res.status(404).json({ error: 'unknown_action' })
}
