/* Webhook de Stripe. Verifica la firma con STRIPE_WEBHOOK_SECRET y escribe
   public.subscriptions usando SUPABASE_SERVICE_ROLE_KEY (bypassa RLS — solo
   este servidor puede tocar la fila). Idempotente: upsert por user_id.

   Eventos manejados:
     - checkout.session.completed  -> activa la suscripción del usuario.
     - customer.subscription.updated -> refresca status / plan / period_end.
     - customer.subscription.deleted -> marca canceled.
     - invoice.payment_failed -> marca past_due (opcional).
*/

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Vercel: opt-out del body parser para verificar la firma con el raw body.
export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function planFromPriceId(priceId) {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return 'annual'
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'monthly'
  return null
}

async function upsertSubscription(supabase, row) {
  const { error } = await supabase.from('subscriptions').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  let event
  try {
    const raw = await readRawBody(req)
    const sig = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    console.error('[webhook] bad signature', e.message)
    return res.status(400).send(`Webhook Error: ${e.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        const userId = s.client_reference_id || s.metadata?.user_id
        if (!userId) break
        // Recupera la suscripción para conocer status/period/price.
        const subId = s.subscription
        const sub = subId ? await stripe.subscriptions.retrieve(subId) : null
        const priceId = sub?.items?.data?.[0]?.price?.id
        await upsertSubscription(supabase, {
          user_id: userId,
          status: sub?.status || 'active',
          plan: planFromPriceId(priceId),
          current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          stripe_customer_id: s.customer || sub?.customer || null,
          stripe_subscription_id: subId || null,
        })
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        if (!userId) break
        const priceId = sub.items?.data?.[0]?.price?.id
        await upsertSubscription(supabase, {
          user_id: userId,
          status: sub.status,
          plan: planFromPriceId(priceId),
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          stripe_customer_id: sub.customer || null,
          stripe_subscription_id: sub.id,
        })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        if (!userId) break
        await upsertSubscription(supabase, {
          user_id: userId,
          status: 'canceled',
          plan: planFromPriceId(sub.items?.data?.[0]?.price?.id),
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          stripe_customer_id: sub.customer || null,
          stripe_subscription_id: sub.id,
        })
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object
        const subId = inv.subscription
        if (!subId) break
        const sub = await stripe.subscriptions.retrieve(subId)
        const userId = sub.metadata?.user_id
        if (!userId) break
        await upsertSubscription(supabase, {
          user_id: userId,
          status: 'past_due',
          plan: planFromPriceId(sub.items?.data?.[0]?.price?.id),
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          stripe_customer_id: sub.customer || null,
          stripe_subscription_id: sub.id,
        })
        break
      }
      default:
        // Eventos no relevantes: ignorar (responder 200 para no reintentar).
        break
    }
    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('[webhook] handler error', e)
    return res.status(500).json({ error: 'handler_failed', message: e.message })
  }
}
