-- ============================================================================
-- Entrega diferida de planes de IA: preparación de 48h + APROBACIÓN MANUAL.
-- Un plan se libera al usuario SOLO cuando: approved = true  Y  han pasado ≥48h
-- desde requested_at. Brenda aprueba manualmente (approved = true) desde aquí.
--
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) Columnas nuevas en ai_plans.
alter table public.ai_plans add column if not exists requested_at timestamptz;
alter table public.ai_plans add column if not exists approved     boolean not null default false;

-- 2) BACKFILL de planes existentes (no ocultar nada a nadie):
--    - requested_at = created_at (para que el gate de 48h ya esté cumplido).
--    - approved = true SOLO para los planes creados ANTES de este despliegue.
--    ⚠️ Acotado por fecha para que re-correrlo NO apruebe planes pendientes nuevos.
update public.ai_plans set requested_at = created_at where requested_at is null;
update public.ai_plans set approved = true
  where created_at < '2026-08-13 00:00:00+00';   -- ← CUTOFF: momento del deploy

-- 3) A partir de ahora, requested_at se llena solo al crear el plan.
alter table public.ai_plans alter column requested_at set default now();

-- ============================================================================
-- CONSULTAS PARA BRENDA (aprobación manual)
-- ============================================================================

-- A) VER planes PENDIENTES (generados, aún sin aprobar). Los más viejos arriba.
--    "listo_para_liberar" = ya pasaron 48h (solo falta que Brenda apruebe).
-- select p.id, p.user_id, u.email, p.kind, p.requested_at,
--        (now() >= p.requested_at + interval '48 hours') as pasaron_48h
-- from public.ai_plans p
-- join auth.users u on u.id = p.user_id
-- where p.approved = false and p.status = 'ready'
-- order by p.requested_at asc;

-- B) APROBAR un plan concreto (copia el id de la consulta A):
-- update public.ai_plans set approved = true where id = '<PLAN_ID>';

-- C) APROBAR todos los planes pendientes de un usuario:
-- update public.ai_plans set approved = true
-- where user_id = '<USER_ID>' and approved = false;

-- D) (Opcional) VER cuándo se liberará un plan ya aprobado:
-- select id, requested_at, requested_at + interval '48 hours' as se_libera_el, approved
-- from public.ai_plans where id = '<PLAN_ID>';
