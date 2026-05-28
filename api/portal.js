/* Crea una sesión del Stripe Customer Portal para que el usuario gestione su
   suscripción (cancelar, cambiar plan, actualizar tarjeta) sin que nosotros lo
   atendamos. Requiere usuario autenticado (Supabase JWT) con un
   stripe_customer_id ya creado (lo crea el flujo de checkout). */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const ALLOW = process.env.CORS_ORIGIN || '*'

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

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid_token' })
    const user = userData.user

    const { data: subRow } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    const customer = subRow?.stripe_customer_id
    if (!customer) return res.status(400).json({ error: 'no_customer', message: 'Aún no tienes suscripción.' })

    const { returnUrl } = req.body || {}
    const origin = req.headers.origin || ''
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: returnUrl || origin || 'https://example.com',
    })
    return res.status(200).json({ url: session.url })
  } catch (e) {
    console.error('[portal]', e)
    return res.status(500).json({ error: 'portal_failed', message: e.message })
  }
}
