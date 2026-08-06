-- ============================================================================
-- Idioma de la app (i18n): columna profiles.language ('es' | 'en').
-- Pega esto en Supabase -> SQL Editor -> Run. Idempotente.
-- Persiste el idioma en la nube para que siga a la cuenta al iniciar sesión.
-- ============================================================================
alter table public.profiles add column if not exists language text;
