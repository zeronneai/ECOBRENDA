-- ============================================================================
-- MODELO DE 4 PRODUCTOS — 2 permisos + FUNDADORES
-- Productos:
--   $9/mes   alarma sola            -> acceso_alarma
--   $49/mes  upgrade nutri+entrena  -> acceso_premium (SOLO si además tiene $9)
--   $59/mes  todo incluido          -> acceso_alarma + acceso_premium
--   $590/año todo incluido          -> acceso_alarma + acceso_premium
--
-- Permisos calculados por el WEBHOOK (service_role) desde las suscripciones
-- activas del cliente en Stripe. El cliente SOLO LEE estas columnas (RLS).
--
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) PERMISOS + marca de FUNDADOR en la fila de suscripción del usuario.
alter table public.subscriptions add column if not exists acceso_alarma  boolean not null default false;
alter table public.subscriptions add column if not exists acceso_premium boolean not null default false;
alter table public.subscriptions add column if not exists is_founder     boolean not null default false;

-- 2) FUNDADORES: TODOS los usuarios que YA existen conservan acceso TOTAL
--    (alarma + premium) para siempre. Se crea/actualiza su fila con los 3 flags
--    en true. Aunque nunca hayan tenido fila de suscripción, quedan cubiertos.
--
--    ⚠️ CUTOFF: por defecto marca a TODOS los usuarios registrados ANTES de la
--    fecha de abajo. Ajústala al momento EXACTO en que despliegas este cambio
--    (así los registros posteriores entran ya al modelo de bloqueo). Si corres
--    esto el mismo día del deploy, deja la fecha de hoy.
insert into public.subscriptions (user_id, status, is_founder, acceso_alarma, acceso_premium)
select id, 'active', true, true, true
from auth.users
where created_at < '2026-08-13 00:00:00+00'   -- ← CUTOFF: momento del cambio
on conflict (user_id) do update
  set is_founder     = true,
      acceso_alarma  = true,
      acceso_premium = true;

-- 3) Verificación rápida (opcional): cuántos fundadores quedaron marcados.
-- select count(*) as fundadores from public.subscriptions where is_founder;
