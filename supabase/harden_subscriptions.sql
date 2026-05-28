-- ============================================================================
-- Endurece RLS de subscriptions: el cliente SOLO puede LEER su fila.
-- Quien escribe (status premium, plan, fechas, stripe_*) es el webhook con
-- service_role, que bypassa RLS por diseño.
-- Pega esto en Supabase -> SQL Editor -> Run. Es idempotente.
-- ============================================================================

drop policy if exists "subscriptions_insert" on public.subscriptions;
drop policy if exists "subscriptions_update" on public.subscriptions;
drop policy if exists "subscriptions_delete" on public.subscriptions;

-- Conserva SOLO el SELECT del dueño:
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);
