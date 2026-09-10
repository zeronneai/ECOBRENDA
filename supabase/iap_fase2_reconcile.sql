-- ============================================================================
-- IAP Fase 2 — RECONCILE de cuentas manuales (antes de activar la unión).
--
-- Al conectar el webhook de Stripe a la unión, empezará a escribir stripe_* desde
-- los datos EN VIVO de Stripe. Una cuenta de cortesía (acceso otorgado a mano,
-- sin suscripción Stripe activa) obtendría stripe_*=false → se caería. Este
-- reconcile las BLINDA marcando manual_* = true. Solo AGREGA protección
-- (idempotente); nunca quita acceso.
--
-- Heurística (fiable ya que el webhook fix pobló stripe_subscription_id para los
-- pagadores reales): tiene acceso hoy + NO es fundador + NO tiene suscripción
-- Stripe activa (stripe_subscription_id null) → es cortesía/manual.
--
-- ⚠️  CÓRRELO ANTES (o junto) al deploy del webhook de Stripe de Fase 2.
-- Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
update public.subscriptions
set manual_alarma  = manual_alarma  or acceso_alarma,
    manual_premium = manual_premium or acceso_premium
where (acceso_alarma or acceso_premium)
  and not coalesce(is_founder, false)
  and stripe_subscription_id is null;

-- Verificación: revisa que el número de cuentas con override manual sea razonable
-- (tus cortesías conocidas + los 4 que ya blindaste). Si sale un número enorme,
-- PARA y avísame antes de seguir.
select
  (select count(*) from public.subscriptions where manual_alarma or manual_premium) as con_override_manual,
  (select count(*) from public.subscriptions
     where (acceso_alarma or acceso_premium) and not coalesce(is_founder,false)
       and stripe_subscription_id is null) as cortesias_detectadas;
