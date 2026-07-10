-- ============================================================================
-- Booty Alarm — Esquema Supabase (tablas + RLS + políticas)
-- Pega TODO esto en Supabase -> SQL Editor -> Run.
-- Re-ejecutable (idempotente). RLS: cada usuario solo ve/edita SUS datos.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  age             int,
  gender          text,
  height          numeric,
  weight          numeric,
  units           text,
  goal            text,
  level           text,
  workout_days    int,
  wake_time       text,
  alarm_exercise  text,
  alarm_reps      int,
  allergies       text[],
  diet_pref       text,
  dislikes        text[],
  created_at      timestamptz not null default now()
);

-- ── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  status                  text default 'inactive',
  plan                    text,
  current_period_end      timestamptz,
  stripe_customer_id      text,
  stripe_subscription_id  text
);

-- ── WORKOUT_LOGS ─────────────────────────────────────────────────────────────
create table if not exists public.workout_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workout_id    text,
  title         text,
  calories      int,
  date          date,
  completed_at  timestamptz not null default now()
);
create index if not exists workout_logs_user_idx on public.workout_logs(user_id);

-- ── PROGRESS_LOGS ────────────────────────────────────────────────────────────
create table if not exists public.progress_logs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  date     date,
  weight   numeric,
  notes    text
);
create index if not exists progress_logs_user_idx on public.progress_logs(user_id);

-- ── WAKE_STREAKS ─────────────────────────────────────────────────────────────
create table if not exists public.wake_streaks (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  current         int default 0,
  best            int default 0,
  last_completed  date,
  week_days       jsonb default '[]'::jsonb
);

-- ── ALARMS ───────────────────────────────────────────────────────────────────
create table if not exists public.alarms (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  hour            text,
  exercise        text,
  reps            int,
  days            jsonb default '[]'::jsonb,
  active          boolean default true,
  song_id         text,
  last_triggered  text
);
create index if not exists alarms_user_idx on public.alarms(user_id);

-- ── TOTALS ───────────────────────────────────────────────────────────────────
create table if not exists public.totals (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  squat                  int default 0,
  lunge                  int default 0,
  workouts               int default 0,
  challenges_completed   int default 0
);

-- ── SETTINGS ─────────────────────────────────────────────────────────────────
create table if not exists public.settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  units          text,
  notifications  jsonb default '{}'::jsonb
);

-- ── AI_PLANS (planes de dieta/rutina generados por IA) ───────────────────────
-- El cliente SOLO lee; la Vercel Function con service_role es la única que
-- escribe. Ver también supabase/ai_plans.sql (misma definición, idempotente).
create table if not exists public.ai_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,                      -- 'diet' | 'workout'
  content       jsonb,
  inputs        jsonb,
  model         text,
  status        text default 'generating',           -- 'generating' | 'ready' | 'error'
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists ai_plans_user_kind_idx
  on public.ai_plans (user_id, kind, created_at desc);

-- ============================================================================
-- RLS: activar en todas las tablas
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.workout_logs   enable row level security;
alter table public.progress_logs  enable row level security;
alter table public.wake_streaks   enable row level security;
alter table public.alarms         enable row level security;
alter table public.totals         enable row level security;
alter table public.settings       enable row level security;
alter table public.ai_plans       enable row level security;

-- ============================================================================
-- POLÍTICAS: cada usuario solo accede a SUS filas.
-- profiles usa `id`; el resto usa `user_id`.
-- ============================================================================

-- PROFILES (id = auth.uid())
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete" on public.profiles for delete using (auth.uid() = id);

-- SUBSCRIPTIONS
drop policy if exists "subs_select" on public.subscriptions;
drop policy if exists "subs_insert" on public.subscriptions;
drop policy if exists "subs_update" on public.subscriptions;
drop policy if exists "subs_delete" on public.subscriptions;
create policy "subs_select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subs_insert" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subs_update" on public.subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subs_delete" on public.subscriptions for delete using (auth.uid() = user_id);

-- WORKOUT_LOGS
drop policy if exists "wlogs_select" on public.workout_logs;
drop policy if exists "wlogs_insert" on public.workout_logs;
drop policy if exists "wlogs_update" on public.workout_logs;
drop policy if exists "wlogs_delete" on public.workout_logs;
create policy "wlogs_select" on public.workout_logs for select using (auth.uid() = user_id);
create policy "wlogs_insert" on public.workout_logs for insert with check (auth.uid() = user_id);
create policy "wlogs_update" on public.workout_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wlogs_delete" on public.workout_logs for delete using (auth.uid() = user_id);

-- PROGRESS_LOGS
drop policy if exists "plogs_select" on public.progress_logs;
drop policy if exists "plogs_insert" on public.progress_logs;
drop policy if exists "plogs_update" on public.progress_logs;
drop policy if exists "plogs_delete" on public.progress_logs;
create policy "plogs_select" on public.progress_logs for select using (auth.uid() = user_id);
create policy "plogs_insert" on public.progress_logs for insert with check (auth.uid() = user_id);
create policy "plogs_update" on public.progress_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plogs_delete" on public.progress_logs for delete using (auth.uid() = user_id);

-- WAKE_STREAKS
drop policy if exists "streaks_select" on public.wake_streaks;
drop policy if exists "streaks_insert" on public.wake_streaks;
drop policy if exists "streaks_update" on public.wake_streaks;
drop policy if exists "streaks_delete" on public.wake_streaks;
create policy "streaks_select" on public.wake_streaks for select using (auth.uid() = user_id);
create policy "streaks_insert" on public.wake_streaks for insert with check (auth.uid() = user_id);
create policy "streaks_update" on public.wake_streaks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "streaks_delete" on public.wake_streaks for delete using (auth.uid() = user_id);

-- ALARMS
drop policy if exists "alarms_select" on public.alarms;
drop policy if exists "alarms_insert" on public.alarms;
drop policy if exists "alarms_update" on public.alarms;
drop policy if exists "alarms_delete" on public.alarms;
create policy "alarms_select" on public.alarms for select using (auth.uid() = user_id);
create policy "alarms_insert" on public.alarms for insert with check (auth.uid() = user_id);
create policy "alarms_update" on public.alarms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "alarms_delete" on public.alarms for delete using (auth.uid() = user_id);

-- TOTALS
drop policy if exists "totals_select" on public.totals;
drop policy if exists "totals_insert" on public.totals;
drop policy if exists "totals_update" on public.totals;
drop policy if exists "totals_delete" on public.totals;
create policy "totals_select" on public.totals for select using (auth.uid() = user_id);
create policy "totals_insert" on public.totals for insert with check (auth.uid() = user_id);
create policy "totals_update" on public.totals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "totals_delete" on public.totals for delete using (auth.uid() = user_id);

-- SETTINGS
drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_insert" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_delete" on public.settings;
create policy "settings_select" on public.settings for select using (auth.uid() = user_id);
create policy "settings_insert" on public.settings for insert with check (auth.uid() = user_id);
create policy "settings_update" on public.settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_delete" on public.settings for delete using (auth.uid() = user_id);

-- AI_PLANS (solo SELECT del dueño; la Function con service_role escribe)
drop policy if exists "ai_plans_select" on public.ai_plans;
create policy "ai_plans_select" on public.ai_plans for select using (auth.uid() = user_id);
