-- ============================================================================
-- Booty Alarm / Brenda Fitness — Planes generados por IA (Etapa 1)
-- Pega TODO esto en Supabase -> SQL Editor -> Run. Re-ejecutable (idempotente).
--
-- Contiene:
--   1) Tabla public.ai_plans (planes de dieta/rutina generados por IA)
--   2) RLS: el cliente SOLO puede LEER sus propias filas. La escritura la hace
--      la Vercel Function con service_role (mismo patrón que stripe-webhook).
--   3) ALTER de public.profiles: agrega allergies / diet_pref / dislikes
--      (NO borra datos existentes; usa "add column if not exists").
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── AI_PLANS ─────────────────────────────────────────────────────────────────
create table if not exists public.ai_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,                      -- 'diet' | 'workout'
  content       jsonb,                               -- el plan generado (estructurado)
  inputs        jsonb,                               -- snapshot del perfil usado
  model         text,                                -- ej. 'claude-sonnet-5'
  status        text default 'generating',           -- 'generating' | 'ready' | 'error'
  locked_until  timestamptz,                         -- bloqueo de 30 días (Etapa 4)
  created_at    timestamptz not null default now()
);

create index if not exists ai_plans_user_kind_idx
  on public.ai_plans (user_id, kind, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.ai_plans enable row level security;

-- El cliente SOLO lee sus propias filas. No hay políticas de insert/update/delete:
-- la Function con service_role bypassa RLS y es la única que escribe.
drop policy if exists "ai_plans_select" on public.ai_plans;
create policy "ai_plans_select"
  on public.ai_plans
  for select
  using (auth.uid() = user_id);

-- ── PROFILES: nuevas columnas para personalizar los planes de IA ──────────────
alter table public.profiles add column if not exists allergies text[];
alter table public.profiles add column if not exists diet_pref text;
alter table public.profiles add column if not exists dislikes  text[];
