/* Elimina la cuenta de la usuaria AUTENTICADA (Apple 5.1.1(v)).
   Vercel Function (Node serverless). Solo borra la cuenta del dueño del JWT:
   el user.id sale del token validado, NUNCA de un body.

   Flujo:
     1. Valida el JWT de Supabase (Authorization: Bearer).
     2. Si tiene suscripción de Stripe activa, la cancela (no cobrar a cuentas
        borradas).
     3. auth.admin.deleteUser(user.id) con service_role → la cascada
        (on delete cascade) borra profiles, ai_plans, progress_logs,
        subscriptions, workout_logs, wake_streaks, totals, settings, alarms.
   Responde: { ok: true }. */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const ALLOW = process.env.CORS_ORIGIN || '*'

export const maxDuration = 30

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

    // 1) Cancela la suscripción de Stripe si existe (best-effort, no bloquea el borrado).
    try {
      const { data: sub } = await svc.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).maybeSingle()
      if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch((e) => {
          console.error('[delete-account] cancelar Stripe', e?.message || e)
        })
      }
    } catch (e) {
      console.error('[delete-account] lookup subscription', e?.message || e)
    }

    // 2) Borra el usuario de auth → cascada borra TODOS sus datos.
    const { error: delErr } = await svc.auth.admin.deleteUser(user.id)
    if (delErr) {
      console.error('[delete-account] deleteUser', delErr)
      return res.status(500).json({ error: 'delete_failed', message: delErr.message })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[delete-account]', e?.message || e)
    return res.status(500).json({ error: 'delete_failed', message: e?.message || 'unknown' })
  }
}
