-- ============================================================================
-- Lesiones / limitaciones físicas (dato de SALUD → restricción de seguridad).
-- Texto libre, opcional. Vive en profiles, así que queda protegido por el MISMO
-- RLS que el resto del perfil: cada usuaria solo lee/escribe su propia fila
-- (policies profiles_select/insert/update/delete con auth.uid() = id).
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
alter table public.profiles add column if not exists injuries text;
