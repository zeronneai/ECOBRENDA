-- ============================================================================
-- Foto de perfil (avatar) — Supabase Storage + columna en profiles.
-- Pega TODO esto en Supabase -> SQL Editor -> Run. Re-ejecutable (idempotente).
--
-- Bucket PÚBLICO 'avatars' (lectura pública; escritura/borrado solo del dueño).
-- Ruta por usuario: <user_id>/avatar.jpg  → la RLS exige que la primera carpeta
-- del path sea el auth.uid() de quien sube.
-- ============================================================================

-- ── Bucket público ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ── RLS en storage.objects: cada usuario SOLO su carpeta ─────────────────────
-- (La lectura es pública porque el bucket es public; no requiere policy select.)
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Columna avatar_url en profiles ───────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;
