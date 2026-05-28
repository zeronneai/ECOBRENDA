/* Crea una Stripe Checkout Session para el usuario autenticado.
   Vercel Function (Node serverless). Valida el JWT de Supabase del cliente
   antes de crear nada, así solo usuarios logueados pueden iniciar un pago.

   Body esperado:
     { plan: 'monthly' | 'annual', successUrl?: string, cancelUrl?: string }
   Header:
     Authorization: Bearer <supabase_access_token>

   Responde: { url: string } (URL hosted de Stripe Checkout). */

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

    const { plan, successUrl, cancelUrl } = req.body || {}
    const priceId = plan === 'annual' ? process.env.STRIPE_PRICE_ANNUAL
                  : plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY
                  : null
    if (!priceId) return res.status(400).json({ error: 'invalid_plan' })

    // Si ya tiene stripe_customer_id en su fila, reusarlo para no duplicar customers.
    let customer = null
    const { data: subRow } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    if (subRow?.stripe_customer_id) customer = subRow.stripe_customer_id

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = req.headers.origin || ''
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer: customer || undefined,
      customer_email: customer ? undefined : (user.email || undefined),
      success_url: successUrl || `${origin}/premium-return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/?paywall=1`,
      // Mete metadata.user_id en la suscripción para que TODOS los eventos
      // posteriores (updated/deleted) la traigan sin tener que mapear.
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (e) {
    console.error('[checkout]', e)
    return res.status(500).json({ error: 'checkout_failed', message: e.message })
  }
}
