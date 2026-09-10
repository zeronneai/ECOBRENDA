-- ============================================================================
-- IAP Fase 3 — estados de ciclo de vida en apple_subscriptions.
--
-- Agrega period_type para distinguir prueba/intro de pago normal (para mostrar
-- "prueba termina el…" y para analítica). El ACCESO no depende de esto: sigue
-- siendo (status='active' AND expires_at > now()) en recompute_entitlements.
--
-- No toca funciones → no requiere re-lockdown ni bloque D.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
alter table public.apple_subscriptions
  add column if not exists period_type text;   -- 'trial' | 'intro' | 'normal' | 'promo'
