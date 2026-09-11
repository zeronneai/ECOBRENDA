-- ============================================================================
-- CORRECCIÓN — is_founder NO debe otorgar premium (solo alarma).
--
-- Bug: recompute_entitlements ponía `or founder` en final_premium, así que el
-- backfill de Fase 4 le dio acceso_premium a TODOS los fundadores (premium pasó
-- de 8 a 162). Regla correcta (de siempre): los FUNDADORES conservan SOLO la
-- alarma. El premium solo viene de stripe_premium, Apple all-inclusive o
-- manual_premium.
--
-- Fix: quitar `founder` de final_premium. Backfill para revertir a quienes no
-- debían tener premium, SIN tocar a los legítimos (stripe/apple/manual).
-- Toca la función → incluye re-lockdown + bloque D.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
create or replace function public.recompute_entitlements(uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s             public.subscriptions;
  apple_alarma  boolean := false;
  apple_premium boolean := false;
  apple_end     timestamptz;
  founder       boolean;
  final_alarma  boolean;
  final_premium boolean;
  src           text;
  period_end    timestamptz;
begin
  insert into public.subscriptions(user_id) values (uid) on conflict (user_id) do nothing;
  select * into s from public.subscriptions where user_id = uid;
  founder := coalesce(s.is_founder, false);

  select
    coalesce(bool_or(product_id in
      ('bootyalarm.alarm.monthly','bootyalarm.allinclusive.monthly','bootyalarm.allinclusive.annual')), false),
    coalesce(bool_or(product_id in
      ('bootyalarm.allinclusive.monthly','bootyalarm.allinclusive.annual')), false),
    max(expires_at)
  into apple_alarma, apple_premium, apple_end
  from public.apple_subscriptions
  where user_id = uid and status = 'active' and expires_at > now();

  -- ALARMA: fundador SÍ la conserva. PREMIUM: fundador NO (solo stripe/apple/manual).
  final_alarma  := coalesce(s.stripe_alarma, false)  or apple_alarma  or founder or coalesce(s.manual_alarma, false);
  final_premium := coalesce(s.stripe_premium, false) or apple_premium or coalesce(s.manual_premium, false);

  if apple_alarma or apple_premium then src := 'apple';
  elsif coalesce(s.stripe_alarma,false) or coalesce(s.stripe_premium,false) then src := 'stripe';
  elsif founder then src := 'founder';
  elsif coalesce(s.manual_alarma,false) or coalesce(s.manual_premium,false) then src := 'manual';
  else src := null;
  end if;

  period_end := nullif(greatest(
    coalesce(apple_end, 'epoch'::timestamptz),
    coalesce(s.current_period_end, 'epoch'::timestamptz)
  ), 'epoch'::timestamptz);

  update public.subscriptions set
    acceso_alarma      = final_alarma,
    acceso_premium     = final_premium,
    status             = case when (final_alarma or final_premium) then 'active' else 'inactive' end,
    provider           = src,
    current_period_end = coalesce(period_end, current_period_end)
  where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'acceso_alarma', final_alarma, 'acceso_premium', final_premium,
    'provider', src, 'current_period_end', period_end,
    'stripe_alarma', coalesce(s.stripe_alarma,false), 'stripe_premium', coalesce(s.stripe_premium,false),
    'apple_alarma', apple_alarma, 'apple_premium', apple_premium,
    'manual_alarma', coalesce(s.manual_alarma,false), 'manual_premium', coalesce(s.manual_premium,false),
    'founder', founder
  );
end $$;

-- BACKFILL: recalcula para todos con la regla corregida (revierte el premium mal
-- otorgado a fundadores; no toca a stripe/apple/manual legítimos).
do $$
declare r record;
begin
  for r in select user_id from public.subscriptions loop
    perform public.recompute_entitlements(r.user_id);
  end loop;
end $$;

-- RE-LOCKDOWN + bloque D.
do $$
declare fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'recompute_entitlements'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant  execute on function %s to service_role', fn);
  end loop;
end $$;

select p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname = 'recompute_entitlements';

-- CONTEO esperado: alarma alto (incluye fundadores), premium solo legítimos.
select
  (select count(*) from public.subscriptions where acceso_alarma)  as con_alarma,
  (select count(*) from public.subscriptions where acceso_premium) as con_premium,
  (select count(*) from public.subscriptions where is_founder and acceso_premium) as fundadores_con_premium_debe_ser_0;
