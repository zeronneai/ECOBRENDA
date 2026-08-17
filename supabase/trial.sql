-- ============================================================================
-- Free trial de 3 días en el plan de ALARMA ($9/mes).
-- Columna para exponer al cliente CUÁNDO termina la prueba (para el Perfil).
-- La escribe el webhook (service_role) cuando la suscripción está en 'trialing'.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
alter table public.subscriptions add column if not exists trial_end timestamptz;
