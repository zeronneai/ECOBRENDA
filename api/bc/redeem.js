/* Brenda Coins — CANJE. Vercel Function.
   - Valida el JWT; el user.id sale del token, nunca del body.
   - bc_redeem (service_role, SECURITY DEFINER) hace TODO en el servidor:
     exige premium PAGADO por Stripe, valida el saldo, descuenta FIFO por
     caducidad y crea el canje en 'pending'. El saldo del cliente NO se usa.
   - Tras crear el canje: PUSH instantáneo al Web App de Apps Script (correo a
     los 3 del equipo). Si el push responde 200, marca notified_at para que el
     poller de respaldo no reenvíe. Si falla, notified_at queda null y el poller
     lo tomará luego.
   Body: { slug, full_name, email, phone, address, size? }. */

import { createClient } from '@supabase/supabase-js'

const ALLOW = process.env.CORS_ORIGIN || '*'
// Nombre legible por recompensa para el correo (sin marcas).
const LABELS = { shaker: 'Shaker', termo: 'Termo', colageno: 'Colágeno', creatina: 'Creatina', proteina: 'Proteína', outfit: 'Outfit de gym' }

export const maxDuration = 20

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

    const b = req.body || {}
    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await svc.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid_token' })
    const user = userData.user

    // El servidor manda: valida premium pagado, saldo y descuenta FIFO.
    const { data, error } = await svc.rpc('bc_redeem', {
      uid: user.id,
      p_slug: b.slug,
      p_full_name: b.full_name,
      p_email: b.email,
      p_phone: b.phone,
      p_address: b.address,
      p_size: b.size ?? null,
    })
    if (error) {
      console.error('[bc/redeem] rpc', error.message)
      return res.status(500).json({ error: 'redeem_failed', message: error.message })
    }
    if (!data?.ok) return res.status(200).json(data) // { ok:false, reason }

    // Push instantáneo del aviso al equipo (Apps Script). Best-effort.
    const payload = {
      redemption_id: data.redemption_id,
      reward_slug: data.reward,
      reward_label: LABELS[data.reward] || data.reward,
      cost: data.cost,
      full_name: b.full_name, email: b.email, phone: b.phone, address: b.address, size: b.size || '',
      user_id: user.id, created_at: new Date().toISOString(),
    }
    let notified = false
    if (process.env.APPS_SCRIPT_URL) {
      try {
        const r = await fetch(process.env.APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: process.env.APPS_SCRIPT_SECRET || '', ...payload }),
        })
        // OJO: Apps Script SIEMPRE responde HTTP 200, incluso al rechazar por
        // secreto o al fallar el envío. Hay que mirar el CUERPO (ok:true), no
        // r.ok. Así, si no se envió el correo, NO marcamos notified y el poller
        // de respaldo lo reintenta.
        const j = await r.json().catch(() => ({}))
        notified = j.ok === true
        if (!notified) console.error('[bc/redeem] push no confirmado por Apps Script:', JSON.stringify(j).slice(0, 200))
      } catch (e) {
        console.error('[bc/redeem] push', e?.message || e)
      }
    }
    if (notified) {
      await svc.from('reward_redemptions').update({ notified_at: new Date().toISOString() }).eq('id', data.redemption_id)
    }

    return res.status(200).json({ ok: true, redemption_id: data.redemption_id, balance: data.balance })
  } catch (e) {
    console.error('[bc/redeem]', e?.message || e)
    return res.status(500).json({ error: 'redeem_failed', message: e?.message || 'unknown' })
  }
}
