-- ============================================================================
-- Entrenamiento en casa: dónde entrena + equipo, y versiones alternas por día.
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) PERFIL: dónde entrena y qué equipo tiene (texto libre, puede ir vacío).
--    train_location NULL = usuario existente que nunca respondió → se trata como
--    'gym' en el prompt (default seguro) hasta que lo capture.
alter table public.profiles add column if not exists train_location text;   -- 'gym' | 'home'
alter table public.profiles add column if not exists equipment      text;   -- texto libre

-- 2) VERSIONES ALTERNAS DE UN DÍA (switch gym<->casa del día).
--    Una fila = el día alterno de una rutina base, para el lugar CONTRARIO.
--    El unique evita duplicados: regenerar el mismo día/lugar reusa la fila.
create table if not exists public.workout_day_alts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source_plan_id uuid not null,          -- ai_plans.id de la rutina base
  day_index      int  not null,          -- qué día (0-based)
  location       text not null,          -- 'gym' | 'home' (la versión CONTRARIA)
  content        jsonb,                  -- el día alterno { focus, warmup, exercises }
  created_at     timestamptz not null default now(),
  unique (source_plan_id, day_index, location)
);
create index if not exists wda_user_idx on public.workout_day_alts (user_id, source_plan_id);

-- RLS: el cliente SOLO LEE lo suyo. Escribe la Vercel Function con service_role
-- (mismo patrón que ai_plans / stripe-webhook).
alter table public.workout_day_alts enable row level security;
drop policy if exists "wda_select" on public.workout_day_alts;
create policy "wda_select"
  on public.workout_day_alts
  for select
  using (auth.uid() = user_id);
