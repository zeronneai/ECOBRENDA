-- ============================================================================
-- ENDURECE RLS de subscriptions — el cliente SOLO puede LEER su fila.
-- Quien escribe (status, acceso_alarma, acceso_premium, is_founder, stripe_*) es
-- el webhook con service_role, que bypassa RLS por diseño.
--
-- ⚠️ FUGA CORREGIDA: la versión anterior intentaba borrar políticas llamadas
--    "subscriptions_insert/update/delete", pero los nombres REALES creados por
--    schema.sql son "subs_insert/update/delete". Por eso el drop no hacía nada y
--    las políticas de ESCRITURA seguían activas → cualquier usuario podía
--    auto-otorgarse premium con:
--        supabase.from('subscriptions').update({acceso_premium:true}).eq('user_id', <su id>)
--    Este archivo borra los nombres CORRECTOS. Pégalo en Supabase -> SQL Editor.
-- ============================================================================

alter table public.subscriptions enable row level security;

-- 1) Borra TODA política de escritura del cliente (ambos esquemas de nombres).
drop policy if exists "subs_insert" on public.subscriptions;
drop policy if exists "subs_update" on public.subscriptions;
drop policy if exists "subs_delete" on public.subscriptions;
drop policy if exists "subscriptions_insert" on public.subscriptions;
drop policy if exists "subscriptions_update" on public.subscriptions;
drop policy if exists "subscriptions_delete" on public.subscriptions;

-- 2) Deja SOLO lectura del dueño (una sola política de select, sin duplicados).
drop policy if exists "subs_select" on public.subscriptions;
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subs_select"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- 3) VERIFICACIÓN: deben quedar SOLO políticas de SELECT (cmd = 'r').
-- select policyname, cmd from pg_policies
-- where schemaname='public' and tablename='subscriptions';

-- ── DETECCIÓN de cuentas que se auto-otorgaron premium (sin pagar, sin ser
--    fundador): tienen acceso pero NO son fundador y NO tienen customer de Stripe.
-- select s.user_id, u.email, s.acceso_alarma, s.acceso_premium, s.is_founder, s.stripe_customer_id
-- from public.subscriptions s join auth.users u on u.id = s.user_id
-- where s.is_founder = false
--   and s.stripe_customer_id is null
--   and (s.acceso_alarma or s.acceso_premium);

-- ── RESET de esas cuentas sospechosas (revisa la lista de arriba ANTES de correr):
-- update public.subscriptions
-- set acceso_alarma = false, acceso_premium = false, status = 'inactive'
-- where is_founder = false
--   and stripe_customer_id is null
--   and (acceso_alarma or acceso_premium);
