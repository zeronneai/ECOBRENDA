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
    // 4 productos: alarma ($9), upgrade ($49), todo mensual ($59), todo anual ($590).
    const PRICE_BY_PLAN = {
      alarm: process.env.STRIPE_PRICE_ALARM,
      upgrade: process.env.STRIPE_PRICE_UPGRADE,
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      annual: process.env.STRIPE_PRICE_ANNUAL,
    }
    const priceId = PRICE_BY_PLAN[plan] || null
    if (!priceId) return res.status(400).json({ error: 'invalid_plan' })

    // Lee la fila para reusar el customer y aplicar el DOBLE CANDADO del upgrade.
    const { data: subRow } = await supabase.from('subscriptions')
      .select('stripe_customer_id, acceso_alarma, acceso_premium').eq('user_id', user.id).maybeSingle()

    // DOBLE CANDADO del $49: solo se puede comprar si el usuario YA tiene alarma
    // ($9 o superior) y aún NO tiene premium. La misma regla la reaplica el
    // webhook al calcular los permisos (red de seguridad si alguien fuerza la API).
    if (plan === 'upgrade') {
      if (!subRow?.acceso_alarma) return res.status(409).json({ error: 'upgrade_requires_alarm' })
      if (subRow?.acceso_premium) return res.status(409).json({ error: 'already_premium' })
    }

    // Si ya tiene stripe_customer_id en su fila, reusarlo para no duplicar customers.
    let customer = subRow?.stripe_customer_id || null

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // subscription_data: metadata.user_id para que TODOS los eventos posteriores
    // (updated/deleted) la traigan sin mapear. FREE TRIAL de 3 días SOLO en el
    // plan de alarma ($9) y SOLO la PRIMERA VEZ: si este customer ya tuvo alguna
    // suscripción (activa, cancelada o pasada), NO se le da otro trial. Así se
    // evita el abuso de cancelar-y-resuscribir para trials infinitos en la MISMA
    // cuenta. Los demás planes ($49/$59/$590) nunca llevan trial.
    const subscriptionData = { metadata: { user_id: user.id } }
    if (plan === 'alarm') {
      let firstTimer = true
      if (customer) {
        try {
          const prev = await stripe.subscriptions.list({ customer, status: 'all', limit: 1 })
          firstTimer = (prev.data || []).length === 0
        } catch { firstTimer = false } // ante la duda, no regalar trial
      }
      if (firstTimer) subscriptionData.trial_period_days = 3
    }

    const origin = req.headers.origin || ''
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
  } catch (e) {
    console.error('[checkout]', e)
    return res.status(500).json({ error: 'checkout_failed', message: e.message })
  }
}
