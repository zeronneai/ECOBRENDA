/* Webhook de Stripe. Verifica la firma con STRIPE_WEBHOOK_SECRET y escribe
   public.subscriptions usando SUPABASE_SERVICE_ROLE_KEY (bypassa RLS — solo
   este servidor puede tocar la fila). Idempotente: upsert por user_id.

   MODELO DE 4 PRODUCTOS (2 permisos): en vez de mapear "1 evento -> 1 plan",
   ante CUALQUIER evento relevante RECALCULAMOS los permisos leyendo TODAS las
   suscripciones activas del cliente en Stripe. Esto maneja el caso de dos
   suscripciones simultáneas ($9 alarma + $49 upgrade), cancelaciones y el orden
   de los eventos, de forma robusta.

   Permisos:
     acceso_alarma  = $9  OR $59 OR $590 activos
     acceso_premium = $59 OR $590 activos  OR  ($49 activo Y $9 activo)   ← regla $49
   Los FUNDADORES (is_founder=true) NUNCA se degradan: acceso = calculado OR is_founder.

   Precios (env, Vercel):
     STRIPE_PRICE_ALARM ($9), STRIPE_PRICE_UPGRADE ($49),
     STRIPE_PRICE_MONTHLY ($59), STRIPE_PRICE_ANNUAL ($590)
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

// Estados de Stripe que consideramos "con acceso".
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

// Calcula los 2 permisos a partir de TODAS las suscripciones del cliente.
function entitlementsFrom(subs) {
  const activePrices = new Set()
  let anyActive = false
  let periodEnd = null
  let trialing = false   // ¿alguna suscripción en periodo de prueba?
  let trialEnd = null    // fin del trial (unix) para mostrarlo en el Perfil
  for (const sub of subs) {
    // 'trialing' cuenta como válida (el free trial de 3 días otorga acceso aunque
    // aún no se cobre). ACTIVE_STATUSES = {active, trialing}. 'canceled'/'past_due'
    // quedan fuera → NO dan acceso.
    if (!ACTIVE_STATUSES.has(sub.status)) continue
    anyActive = true
    if (sub.current_period_end && (!periodEnd || sub.current_period_end > periodEnd)) periodEnd = sub.current_period_end
    if (sub.status === 'trialing') {
      trialing = true
      const te = sub.trial_end || sub.current_period_end
      if (te && (!trialEnd || te > trialEnd)) trialEnd = te
    }
    for (const item of sub.items?.data || []) {
      const pid = item.price?.id
      if (pid) activePrices.add(pid)
    }
  }
  const has = (env) => !!process.env[env] && activePrices.has(process.env[env])
  const hasAlarm9 = has('STRIPE_PRICE_ALARM')
  const hasUpgrade49 = has('STRIPE_PRICE_UPGRADE')
  const allInclusive = has('STRIPE_PRICE_MONTHLY') || has('STRIPE_PRICE_ANNUAL')

  const acceso_alarma = hasAlarm9 || allInclusive
  const acceso_premium = allInclusive || (hasUpgrade49 && hasAlarm9) // regla del $49: requiere $9

  // Plan representativo (solo para mostrar en Perfil).
  let plan = null
  if (has('STRIPE_PRICE_ANNUAL')) plan = 'annual'
  else if (has('STRIPE_PRICE_MONTHLY')) plan = 'monthly'
  else if (hasUpgrade49 && hasAlarm9) plan = 'upgrade'
  else if (hasUpgrade49) plan = 'upgrade_pending' // $49 sin $9: premium NO otorgado
  else if (hasAlarm9) plan = 'alarm'

  return { acceso_alarma, acceso_premium, anyActive, periodEnd, plan, trialing, trialEnd }
}

// Núcleo: resuelve el cliente, lista sus suscripciones, recalcula y hace upsert.
async function recomputeAndUpsert(stripe, supabase, { userId, customerId }) {
  // Resuelve user/customer faltantes desde nuestra propia fila si hace falta.
  let uid = userId || null
  let cust = customerId || null
  if (!uid && cust) {
    const { data } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', cust).maybeSingle()
    if (data?.user_id) uid = data.user_id
  }
  if (!uid) return // sin usuario no podemos escribir
  if (!cust) {
    const { data } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', uid).maybeSingle()
    if (data?.stripe_customer_id) cust = data.stripe_customer_id
  }

  // Respeta a los FUNDADORES: lee el flag actual (nunca lo degradamos).
  const { data: existing } = await supabase.from('subscriptions').select('is_founder').eq('user_id', uid).maybeSingle()
  const isFounder = !!existing?.is_founder

  // Lista TODAS las suscripciones del cliente (activas y no) y recalcula.
  let subs = []
  if (cust) {
    const list = await stripe.subscriptions.list({ customer: cust, status: 'all', limit: 100 })
    subs = list.data || []
  }
  const ent = entitlementsFrom(subs)

  const row = {
    user_id: uid,
    status: ent.anyActive || isFounder ? 'active' : 'inactive',
    plan: ent.plan,
    acceso_alarma: ent.acceso_alarma || isFounder,
    acceso_premium: ent.acceso_premium || isFounder,
    current_period_end: ent.periodEnd ? new Date(ent.periodEnd * 1000).toISOString() : null,
    trial_end: ent.trialing && ent.trialEnd ? new Date(ent.trialEnd * 1000).toISOString() : null,
    stripe_customer_id: cust || null,
  }
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
        const userId = s.client_reference_id || s.metadata?.user_id || null
        const customerId = s.customer || null
        await recomputeAndUpsert(stripe, supabase, { userId, customerId })
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await recomputeAndUpsert(stripe, supabase, { userId: sub.metadata?.user_id || null, customerId: sub.customer || null })
        break
      }
      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded': {
        const inv = event.data.object
        await recomputeAndUpsert(stripe, supabase, { userId: inv.metadata?.user_id || null, customerId: inv.customer || null })
        break
      }
      default:
        // Eventos no relevantes: ignorar (200 para no reintentar).
        break
    }
    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('[webhook] handler error', e)
    return res.status(500).json({ error: 'handler_failed', message: e.message })
  }
}
