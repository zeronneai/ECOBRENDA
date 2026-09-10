/* Webhook de RevenueCat (Apple IAP). RevenueCat valida el recibo con Apple y nos
   notifica compras/renovaciones/cancelaciones/reembolsos. Aquí NUNCA se confía en
   el cliente: esta es la fuente de verdad de Apple.

   Autenticación: RevenueCat envía el header Authorization con el valor que
   configuremos (REVENUECAT_WEBHOOK_SECRET). Se compara en tiempo casi constante.

   Flujo: mapea app_user_id (= user_id de Supabase, porque el SDK hace
   Purchases.logIn(user_id)) → upsert en apple_subscriptions → recompute_
   entitlements(uid) (unión Stripe/Apple/fundador/manual). El acceso lo escribe
   SOLO recompute_entitlements. */

import { createClient } from '@supabase/supabase-js'

// Tipos de evento que dejan la suscripción VIGENTE (acceso mientras expires>now).
const ACTIVE_TYPES = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED', 'NON_RENEWING_PURCHASE', 'TEMPORARY_ENTITLEMENT_GRANT',
  'BILLING_ISSUE', 'CANCELLATION', // CANCELLATION = auto-renovación OFF; sigue con acceso hasta expirar
])

function secretOk(got) {
  const want = process.env.REVENUECAT_WEBHOOK_SECRET || ''
  if (!want || !got || got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i)
  return diff === 0
}

// Estado a persistir según el tipo de evento. El acceso real se decide luego con
// (status='active' AND expires_at > now()) en recompute_entitlements.
function statusFor(type) {
  if (type === 'EXPIRATION') return 'expired'
  if (type === 'REFUND' || type === 'REVOKE' || type === 'SUBSCRIPTION_PAUSED') return 'revoked'
  if (ACTIVE_TYPES.has(type)) return 'active'
  return 'active' // desconocido pero con datos: deja que mande el expires_at
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!secretOk(req.headers.authorization)) return res.status(401).json({ error: 'unauthorized' })

  const ev = req.body?.event || {}
  const type = ev.type

  // Evento de PRUEBA que RevenueCat manda al configurar el webhook: OK sin escribir.
  if (type === 'TEST') return res.status(200).json({ ok: true, test: true })

  const uid = ev.app_user_id || null
  const otxn = ev.original_transaction_id || ev.transaction_id || null
  const productId = ev.product_id || null
  if (!uid || !otxn || !productId) {
    // Sin datos mínimos no hay nada que aplicar (p. ej. eventos no de suscripción).
    return res.status(200).json({ ok: true, skipped: 'missing_fields' })
  }

  const status = statusFor(type)
  const periodType = (ev.period_type || 'NORMAL').toLowerCase() // 'trial'|'intro'|'normal'|'promotional'
  const inTrial = (periodType === 'trial' || periodType === 'intro') && status === 'active'
  // En BILLING_ISSUE Apple da un periodo de gracia: usa su fin si viene, para no
  // cortar el acceso durante el reintento de cobro.
  const expiresMs = ev.grace_period_expiration_at_ms || ev.expiration_at_ms || null
  const expiresISO = expiresMs ? new Date(expiresMs).toISOString() : null

  try {
    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

    const row = {
      user_id: uid,
      original_transaction_id: otxn,
      product_id: productId,
      status,
      period_type: periodType,
      expires_at: expiresISO,
      auto_renew: type === 'CANCELLATION' ? false : true,
      environment: (ev.environment || 'PRODUCTION').toLowerCase(),
      updated_at: new Date().toISOString(),
    }

    const { error: upErr } = await svc.from('apple_subscriptions')
      .upsert(row, { onConflict: 'user_id,original_transaction_id' })
    if (upErr) {
      // user_id inexistente (evento huérfano / de prueba con uid falso) → ignora.
      if (/foreign key/i.test(upErr.message || '')) return res.status(200).json({ ok: true, skipped: 'unknown_user' })
      throw upErr
    }

    // Recalcula la UNIÓN de entitlements (Stripe OR Apple OR fundador OR manual).
    // Crea la fila de subscriptions si el usuario es iOS-only.
    const { error: rpcErr } = await svc.rpc('recompute_entitlements', { uid })
    if (rpcErr) throw rpcErr

    // Muestra en el Perfil "prueba termina el…" durante el trial de Apple; lo
    // limpia cuando ya no está en prueba (renovó a pago, expiró, etc.).
    await svc.from('subscriptions')
      .update({ trial_end: inTrial ? expiresISO : null })
      .eq('user_id', uid)

    return res.status(200).json({ ok: true, type, uid, period_type: periodType })
  } catch (e) {
    console.error('[iap/webhook]', e?.message || e)
    return res.status(500).json({ error: 'handler_failed', message: e?.message || 'unknown' })
  }
}
