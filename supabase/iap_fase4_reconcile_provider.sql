-- ============================================================================
-- IAP Fase 4 — reconciliación multiplataforma (Stripe ↔ Apple) + casos borde.
--
-- La UNIÓN ya evita que un proveedor pise al otro. Esta fase agrega, en el mismo
-- recompute, lo necesario para mostrar/gestionar bien con DOS proveedores:
--   · provider            : fuente PRIMARIA del acceso (apple>stripe>founder>manual)
--   · current_period_end  : el fin de período MÁS LEJANO entre Apple y Stripe
--   · status              : definitivo (active si hay acceso por cualquier fuente)
--
-- Casos borde cubiertos por la unión + este recompute:
--   · Pagó en Stripe (web) y entra en iOS → conserva acceso (stripe_* ya true),
--     no necesita recomprar; el paywall ni aparece (no está bloqueado).
--   · Expira Apple pero Stripe sigue activo (o al revés) → NO se cae (OR).
--   · Reembolso Apple → apple inactivo; si hay Stripe/fundador/manual, se queda.
--   · Doble pago (Stripe+Apple) → acceso ok; provider='apple' (en iOS se
--     gestiona en App Store; Fase 5 enruta la UI).
--
-- Toca la función recompute_entitlements → incluye re-lockdown + bloque D.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) Proveedor primario del acceso (para mostrar y enrutar "administrar").
alter table public.subscriptions add column if not exists provider text; -- 'apple'|'stripe'|'founder'|'manual'|null

-- 2) recompute v2: unión + provider + período más lejano + status definitivo.
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

  -- Apple vigente (activo y sin expirar) + su fin de período.
  select
    coalesce(bool_or(product_id in
      ('bootyalarm.alarm.monthly','bootyalarm.allinclusive.monthly','bootyalarm.allinclusive.annual')), false),
    coalesce(bool_or(product_id in
      ('bootyalarm.allinclusive.monthly','bootyalarm.allinclusive.annual')), false),
    max(expires_at)
  into apple_alarma, apple_premium, apple_end
  from public.apple_subscriptions
  where user_id = uid and status = 'active' and expires_at > now();

  -- UNIÓN (ningún proveedor pisa al otro).
  final_alarma  := coalesce(s.stripe_alarma, false)  or apple_alarma  or founder or coalesce(s.manual_alarma, false);
  final_premium := coalesce(s.stripe_premium, false) or apple_premium or founder or coalesce(s.manual_premium, false);

  -- Proveedor primario: Apple > Stripe > fundador > manual.
  if apple_alarma or apple_premium then src := 'apple';
  elsif coalesce(s.stripe_alarma,false) or coalesce(s.stripe_premium,false) then src := 'stripe';
  elsif founder then src := 'founder';
  elsif coalesce(s.manual_alarma,false) or coalesce(s.manual_premium,false) then src := 'manual';
  else src := null;
  end if;

  -- Fin de período a mostrar: el más lejano entre Apple y Stripe.
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

-- 3) BACKFILL: recalcula para todos (idempotente; no cambia el acceso, solo
--    puebla provider/period_end/status con el modelo nuevo).
do $$
declare r record;
begin
  for r in select user_id from public.subscriptions loop
    perform public.recompute_entitlements(r.user_id);
  end loop;
end $$;

-- 4) RE-LOCKDOWN (tocamos la función) + bloque D.
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
