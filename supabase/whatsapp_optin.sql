-- ============================================================================
-- Opt-in de WhatsApp: número + CONSENTIMIENTO explícito para novedades,
-- actualizaciones y promociones. Vive en `profiles`, así que queda protegido
-- por el MISMO RLS que el resto del perfil: cada usuaria solo lee/escribe su
-- propia fila (policies profiles_select/insert/update/delete con auth.uid()=id).
-- No hay policies nuevas ni tablas nuevas → nada que endurecer aparte.
--
-- Guardamos por separado (auditoría de consentimiento):
--   whatsapp_phone            número en formato E.164 (ej: +5215512345678)
--   whatsapp_consent          true SOLO si marcó la casilla (nunca por default)
--   whatsapp_consent_at       fecha y hora EXACTAS en que aceptó
--   whatsapp_consent_version  versión del texto de consentimiento mostrado
--
-- Regla de negocio (aplicada en el cliente): el número/consentimiento se guarda
-- únicamente si whatsapp_consent = true. Revocar = poner whatsapp_consent=false.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
alter table public.profiles add column if not exists whatsapp_phone           text;
alter table public.profiles add column if not exists whatsapp_consent          boolean not null default false;
alter table public.profiles add column if not exists whatsapp_consent_at       timestamptz;
alter table public.profiles add column if not exists whatsapp_consent_version  text;

-- (Opcional) índice para segmentar envíos a quienes SÍ consintieron.
create index if not exists profiles_wa_consent_idx
  on public.profiles (whatsapp_consent)
  where whatsapp_consent = true;
