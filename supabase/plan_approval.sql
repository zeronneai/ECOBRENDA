-- ============================================================================
-- Entrega diferida de planes de IA: preparación AUTOMÁTICA de 48h.
-- Un plan se libera al usuario en cuanto pasan ≥48h desde requested_at.
-- SIN aprobación manual: es 100% automático por tiempo.
--
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) Columna que marca CUÁNDO se pidió el plan (base del contador de 48h).
alter table public.ai_plans add column if not exists requested_at timestamptz;

-- 2) BACKFILL de planes existentes: requested_at = created_at → su gate de 48h
--    ya está cumplido, así que siguen visibles (no se oculta nada a nadie).
update public.ai_plans set requested_at = created_at where requested_at is null;

-- 3) A partir de ahora, requested_at se llena solo al crear el plan.
alter table public.ai_plans alter column requested_at set default now();

-- Nota: la columna `approved` (de la versión con aprobación manual) YA NO se usa.
-- Si la creaste antes, no molesta dejarla; el cliente ahora solo mira requested_at.

-- ── Consulta útil: ver cuándo se libera cada plan ───────────────────────────
-- select id, user_id, kind, requested_at,
--        requested_at + interval '48 hours' as se_libera_el,
--        (now() >= requested_at + interval '48 hours') as ya_liberado
-- from public.ai_plans
-- where status = 'ready'
-- order by requested_at desc;
