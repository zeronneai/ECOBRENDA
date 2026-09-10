-- ============================================================================
-- IN-APP PURCHASE (Apple, vía RevenueCat) — Fase 0: cimientos + seguridad.
--
-- Objetivo: que el acceso de Apple CONVIVA con el de Stripe en la MISMA tabla
-- sin que un proveedor pise al otro. Para eso separamos la contribución de cada
-- proveedor y acceso_* pasa a ser la UNIÓN:
--     acceso_alarma  = stripe_alarma  OR (Apple activo) OR is_founder
--     acceso_premium = stripe_premium OR (Apple premium activo) OR is_founder
--
-- ⚠️  ADITIVO E INERTE en Fase 0: NADA llama todavía a recompute_entitlements.
--     El webhook de Stripe sigue escribiendo acceso_* como hoy (sin cambios).
--     En Fase 2 se conectan AMBOS webhooks (Stripe → stripe_*, RevenueCat →
--     apple_subscriptions) y ambos llaman a recompute_entitlements, con un
--     re-seed de stripe_* en ese momento. Correr esto ahora no cambia conducta.
--
-- Patrón de seguridad (igual que ai_plans / Booty Coins): cliente solo SELECT de
-- lo suyo; escribe el service_role. Incluye re-lockdown + bloque D al final.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) FUENTE DE VERDAD DE APPLE. La escribe SOLO el webhook de RevenueCat
--    (service_role). Una fila por suscripción Apple (original_transaction_id es
--    el id estable que sobrevive renovaciones).
create table if not exists public.apple_subscriptions (
  user_id                 uuid not null references auth.users(id) on delete cascade,
  original_transaction_id text not null,             -- id estable de la suscripción Apple
  product_id              text not null,             -- bootyalarm.alarm.monthly | .allinclusive.monthly | .allinclusive.annual
  status                  text not null default 'active',  -- 'active'|'expired'|'billing_retry'|'revoked'
  expires_at              timestamptz,               -- fin del período pagado/trial
  auto_renew              boolean not null default true,
  environment             text not null default 'production',  -- 'sandbox'|'production'
  updated_at              timestamptz not null default now(),
  primary key (user_id, original_transaction_id)
);
create index if not exists apple_subs_user_idx on public.apple_subscriptions(user_id);
-- índice para "¿tiene Apple activo ahora?" (por usuario, vigentes)
create index if not exists apple_subs_active_idx on public.apple_subscriptions(user_id, expires_at)
  where status = 'active';

-- 2) CONTRIBUCIÓN DE STRIPE (separada de la unión). La escribe el webhook de
--    Stripe (en Fase 2). acceso_* deja de ser "lo de Stripe" y pasa a ser la unión.
alter table public.subscriptions add column if not exists stripe_alarma  boolean not null default false;
alter table public.subscriptions add column if not exists stripe_premium boolean not null default false;

-- 2b) OVERRIDE MANUAL: acceso otorgado a mano por el equipo (pagos que fallaron,
--     cortesías, etc.), SIN Stripe activo y sin ser fundador. Vive aparte para que
--     NUNCA dependa de lo que diga Stripe/Apple. Se puebla en el reconcile de
--     Fase 2 (detecta: tiene acceso hoy, no es fundador, Stripe en vivo no muestra
--     suscripción activa → manual). También lo puedes marcar tú a mano cuando des
--     una cortesía nueva.
alter table public.subscriptions add column if not exists manual_alarma  boolean not null default false;
alter table public.subscriptions add column if not exists manual_premium boolean not null default false;

-- Seed único: hoy acceso_* = (Stripe OR fundador OR manual). Sembramos la parte
-- de Stripe excluyendo a los fundadores (su acceso vive en is_founder). Los
-- accesos manuales quedan preservados por este seed (stripe_* = acceso_*) HASTA
-- que el reconcile de Fase 2 los reclasifique correctamente a manual_*.
update public.subscriptions set
  stripe_alarma  = (acceso_alarma  and not coalesce(is_founder, false)),
  stripe_premium = (acceso_premium and not coalesce(is_founder, false));

-- 3) RLS: cliente SOLO LEE lo suyo de apple_subscriptions; escribe el service_role.
alter table public.apple_subscriptions enable row level security;
drop policy if exists apple_subscriptions_select on public.apple_subscriptions;
create policy apple_subscriptions_select on public.apple_subscriptions
  for select using (auth.uid() = user_id);
-- (sin policies de insert/update/delete → el cliente no puede escribir)

-- 4) RECOMPUTE PROVIDER-AWARE (unión Stripe + Apple + fundador). SECURITY DEFINER,
--    ejecutable SOLO por service_role (ver lockdown abajo). Idempotente por usuario.
--    Crea la fila de subscriptions si no existe (usuario iOS-only).
create or replace function public.recompute_entitlements(uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s               public.subscriptions;
  apple_alarma    boolean := false;
  apple_premium   boolean := false;
  founder         boolean := false;
  final_alarma    boolean;
  final_premium   boolean;
begin
  -- Asegura la fila (usuario que solo compró por Apple aún no la tendría).
  insert into public.subscriptions(user_id) values (uid) on conflict (user_id) do nothing;
  select * into s from public.subscriptions where user_id = uid;
  founder := coalesce(s.is_founder, false);

  -- Apple vigente: alguna suscripción activa y sin expirar.
  select
    coalesce(bool_or(product_id in
      ('bootyalarm.alarm.monthly','bootyalarm.allinclusive.monthly','bootyalarm.allinclusive.annual')), false),
    coalesce(bool_or(product_id in
      ('bootyalarm.allinclusive.monthly','bootyalarm.allinclusive.annual')), false)
  into apple_alarma, apple_premium
  from public.apple_subscriptions
  where user_id = uid and status = 'active' and expires_at > now();

  -- UNIÓN: ningún proveedor pisa al otro; el override manual nunca se cae.
  final_alarma  := coalesce(s.stripe_alarma, false)  or apple_alarma  or founder or coalesce(s.manual_alarma, false);
  final_premium := coalesce(s.stripe_premium, false) or apple_premium or founder or coalesce(s.manual_premium, false);

  update public.subscriptions set
    acceso_alarma  = final_alarma,
    acceso_premium = final_premium,
    status = case when (final_alarma or final_premium) then 'active' else status end
  where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'acceso_alarma', final_alarma, 'acceso_premium', final_premium,
    'stripe_alarma', coalesce(s.stripe_alarma,false), 'stripe_premium', coalesce(s.stripe_premium,false),
    'apple_alarma', apple_alarma, 'apple_premium', apple_premium,
    'manual_alarma', coalesce(s.manual_alarma,false), 'manual_premium', coalesce(s.manual_premium,false),
    'founder', founder
  );
end $$;

-- ── SEGURIDAD: solo service_role ejecuta recompute_entitlements ──────────────
-- (mismo cuidado que Booty Coins: Supabase concede EXECUTE directo a anon y
--  authenticated, hay que revocarles explícitamente, no solo a public.)
do $$
declare
  fn regprocedure;
  money_fns text[] := array['recompute_entitlements'];
begin
  for fn in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = any(money_fns)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant  execute on function %s to service_role', fn);
  end loop;
end $$;

-- ── BLOQUE D (verificación). Esperado: anon=false, authenticated=false,
--    service_role=true.
select p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname = 'recompute_entitlements';
