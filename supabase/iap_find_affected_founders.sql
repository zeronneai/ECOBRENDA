-- ============================================================================
-- DIAGNÓSTICO — fundadores que PAGAN Stripe y pudieron perder premium.
--
-- La siembra de Fase 0 excluyó a TODOS los fundadores de stripe_*, así que un
-- fundador que paga Stripe premium quedó con stripe_premium=false y, al quitar
-- `founder` de la unión, perdió acceso_premium. Estas consultas los encuentran
-- para repararlos re-disparando su webhook de Stripe (que recomputa stripe_*
-- desde Stripe en vivo y restaura el premium).
-- Solo lectura. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- (A) AFECTADOS PROBABLES: fundadores con suscripción Stripe registrada pero sin
--     premium hoy. A estos hay que re-dispararles el webhook SÍ o SÍ.
select user_id, stripe_customer_id, stripe_subscription_id, status,
       acceso_alarma, acceso_premium, stripe_premium
from public.subscriptions
where is_founder
  and stripe_subscription_id is not null
  and not acceso_premium
order by user_id;

-- (B) RED DE SEGURIDAD (más amplia): fundadores con CUALQUIER relación Stripe
--     (customer) y sin premium hoy. Algunos pueden tener suscripción premium
--     activa en Stripe aunque su stripe_subscription_id no se haya poblado aún.
--     Revisa en el dashboard de Stripe cuáles tienen premium ACTIVO y re-dispara
--     su webhook. (Re-disparar es inofensivo para los que NO pagan premium: el
--     webhook recomputa su estado real y no otorga de más.)
select user_id, stripe_customer_id, stripe_subscription_id, status, acceso_premium
from public.subscriptions
where is_founder
  and stripe_customer_id is not null
  and not acceso_premium
order by stripe_subscription_id nulls last, user_id;

-- (C) CONTEO de cuántos entran en cada red.
select
  (select count(*) from public.subscriptions
     where is_founder and stripe_subscription_id is not null and not acceso_premium) as afectados_con_sub,
  (select count(*) from public.subscriptions
     where is_founder and stripe_customer_id is not null and not acceso_premium)     as candidatos_con_customer;
