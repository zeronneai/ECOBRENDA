/* Stripe (checkout + portal) — función CONSOLIDADA (ruta dinámica: 1 función).
   URLs NUEVAS (solo las llama el cliente, ya actualizado en src/lib/stripeClient.js):
     POST /api/stripe/checkout  -> crea Checkout Session (body { plan, successUrl?, cancelUrl? })
     POST /api/stripe/portal    -> crea Customer Portal Session (body { returnUrl? })
   OJO: el WEBHOOK de Stripe NO vive aquí — sigue en /api/stripe-webhook.js con su
   bodyParser:false para validar la firma. Este archivo NO lo toca. */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const ALLOW = process.env.CORS_ORIGIN || '*'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const action = req.query.action

  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'missing_token' })

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid_token' })
    const user = userData.user
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = req.headers.origin || ''

    // ── /api/stripe/checkout ────────────────────────────────────────────────
    if (action === 'checkout') {
      const { plan, successUrl, cancelUrl } = req.body || {}
      const PRICE_BY_PLAN = {
        alarm: process.env.STRIPE_PRICE_ALARM,
        upgrade: process.env.STRIPE_PRICE_UPGRADE,
        monthly: process.env.STRIPE_PRICE_MONTHLY,
        annual: process.env.STRIPE_PRICE_ANNUAL,
      }
      const priceId = PRICE_BY_PLAN[plan] || null
      if (!priceId) return res.status(400).json({ error: 'invalid_plan' })

      const { data: subRow } = await supabase.from('subscriptions')
        .select('stripe_customer_id, acceso_alarma, acceso_premium').eq('user_id', user.id).maybeSingle()

      // DOBLE CANDADO del $49: requiere alarma y NO tener premium (misma regla
      // que reaplica el webhook al calcular permisos).
      if (plan === 'upgrade') {
        if (!subRow?.acceso_alarma) return res.status(409).json({ error: 'upgrade_requires_alarm' })
        if (subRow?.acceso_premium) return res.status(409).json({ error: 'already_premium' })
      }

      const customer = subRow?.stripe_customer_id || null

      // FREE TRIAL de 3 días SOLO en alarma ($9) y SOLO la primera vez (evita el
      // abuso de cancelar-y-resuscribir). Los demás planes nunca llevan trial.
      const subscriptionData = { metadata: { user_id: user.id } }
      if (plan === 'alarm') {
        let firstTimer = true
        if (customer) {
          try {
            const prev = await stripe.subscriptions.list({ customer, status: 'all', limit: 1 })
            firstTimer = (prev.data || []).length === 0
          } catch { firstTimer = false }
        }
        if (firstTimer) subscriptionData.trial_period_days = 3
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.id,
        customer: customer || undefined,
        customer_email: customer ? undefined : (user.email || undefined),
        success_url: successUrl || `${origin}/premium-return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${origin}/?paywall=1`,
        subscription_data: subscriptionData,
        metadata: { user_id: user.id },
        allow_promotion_codes: true,
      })
      return res.status(200).json({ url: session.url })
    }

    // ── /api/stripe/portal ──────────────────────────────────────────────────
    if (action === 'portal') {
      const { data: subRow } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
      const customer = subRow?.stripe_customer_id
      if (!customer) return res.status(400).json({ error: 'no_customer', message: 'Aún no tienes suscripción.' })
      const { returnUrl } = req.body || {}
      const session = await stripe.billingPortal.sessions.create({
        customer,
        return_url: returnUrl || origin || 'https://example.com',
      })
      return res.status(200).json({ url: session.url })
    }

    return res.status(404).json({ error: 'unknown_action' })
  } catch (e) {
    console.error('[stripe/' + action + ']', e?.message || e)
    return res.status(500).json({ error: (action === 'portal' ? 'portal_failed' : 'checkout_failed'), message: e.message })
  }
}
