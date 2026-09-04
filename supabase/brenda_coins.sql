-- ============================================================================
-- BRENDA COINS — Fase 0: cimientos de datos + seguridad (SIN UI).
--
-- Modelo de integridad (igual que ai_plans / workout_day_alts):
--   · El CLIENTE solo puede SELECT de SUS filas (RLS). No hay policies de
--     insert/update/delete → el cliente NO puede escribir puntos.
--   · Todo el dinero se mueve con funciones SECURITY DEFINER, ejecutables SOLO
--     por service_role (los endpoints de Vercel, que validan el JWT). Se revoca
--     execute a public/anon/authenticated para que nadie las llame por RPC.
--   · Todo el TIEMPO es del servidor: now() de Postgres. Día-negocio en
--     America/Mexico_City (fijo para todos, nunca la tz del dispositivo).
--
-- Reglas de negocio implementadas aquí:
--   · Acumulan (bc_can_earn): acceso_alarma o fundador.
--   · Canjean (bc_is_premium_paid): SOLO premium PAGADO por Stripe
--     (acceso_premium + status active + stripe_subscription_id no nulo).
--     Los fundadores acumulan y ven el catálogo, pero NO canjean hasta pagar.
--   · +10 BC por alarma, 1 vez por día-negocio (idempotente).
--   · Racha con tolerancia 48h desde la última alarma (hora del servidor).
--   · Hitos acumulativos y repetibles al reconstruir la racha (por run_id).
--   · Ruleta: máx 1 giro de alarma + 1 giro de reto por día. Premio server-side.
--   · Caducidad individual por lote: cada ganancia caduca al año; gasto FIFO
--     por caducidad; cancelar suscripción NO borra puntos.
--
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
create extension if not exists "pgcrypto";

-- ── Helpers de tiempo / elegibilidad ─────────────────────────────────────────

-- Día-negocio de un instante, en America/Mexico_City (fijo para todos).
create or replace function public.bc_biz_day(ts timestamptz default now())
returns date language sql stable as $$
  select (ts at time zone 'America/Mexico_City')::date
$$;

-- ¿Acumula puntos? acceso a la alarma (los de $9 y $59) o fundador.
create or replace function public.bc_can_earn(uid uuid)
returns boolean language sql stable as $$
  select coalesce((
    select s.acceso_alarma = true or s.is_founder = true
    from public.subscriptions s where s.user_id = uid
  ), false)
$$;

-- ¿Puede CANJEAR? SOLO premium PAGADO por Stripe (excluye fundadores comped).
create or replace function public.bc_is_premium_paid(uid uuid)
returns boolean language sql stable as $$
  select coalesce((
    select s.acceso_premium = true
       and s.status = 'active'
       and s.stripe_subscription_id is not null
    from public.subscriptions s where s.user_id = uid
  ), false)
$$;

-- Bono por hito de racha (acumulativo). 0 si el largo no es hito.
create or replace function public.bc_milestone_bonus(streak_len int)
returns integer language sql immutable as $$
  select case streak_len
    when 5 then 50 when 10 then 120 when 15 then 250 when 30 then 500
    when 60 then 1200 when 180 then 3500 when 365 then 9000 else 0 end
$$;

-- ── Tablas ───────────────────────────────────────────────────────────────────

-- 1) LIBRO MAYOR (lotes). Fuente de verdad. Cada ganancia es un lote con su
--    propia caducidad; los negativos (redeem/expire) son auditoría.
create table if not exists public.bc_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in
                ('earn_alarm','earn_milestone','earn_roulette','earn_founder','redeem','expire','adjust')),
  amount      integer not null,          -- + gana | - canje/caduca
  remaining   integer,                   -- saldo vivo del lote (solo ganancias); null en negativos
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,               -- created_at + 1 año en ganancias; null en negativos
  meta        jsonb not null default '{}'::jsonb,
  constraint bc_ledger_shape check (
    (amount > 0 and remaining is not null and remaining >= 0 and expires_at is not null)
    or (amount <= 0 and remaining is null and expires_at is null)
  )
);
create index if not exists bc_ledger_user_idx on public.bc_ledger(user_id);
create index if not exists bc_ledger_live_idx on public.bc_ledger(user_id, expires_at)
  where amount > 0 and remaining > 0;

-- 2) ESTADO DIARIO por día-negocio: idempotencia (+10 una vez) y giros (máx 2).
create table if not exists public.bc_daily (
  user_id             uuid not null references auth.users(id) on delete cascade,
  day                 date not null,               -- día-negocio America/Mexico_City
  alarm_awarded       boolean not null default false,
  alarm_spin_used     boolean not null default false,
  challenge_spin_used boolean not null default false,
  updated_at          timestamptz not null default now(),
  primary key (user_id, day)
);

-- 3) RACHA autoritativa del servidor (tolerancia 48h).
create table if not exists public.bc_streak (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  current           integer not null default 0,
  best              integer not null default 0,
  run_id            integer not null default 0,    -- sube en cada reinicio (hitos repetibles por run)
  last_completed_at timestamptz,
  deadline_at       timestamptz,                   -- last_completed_at + 48h
  updated_at        timestamptz not null default now()
);

-- 4) CATÁLOGO (6 recompensas, siluetas; sin marcas). Referencia editable.
create table if not exists public.reward_catalog (
  slug          text primary key,
  name_key      text not null,        -- clave i18n
  cost          integer not null check (cost > 0),
  requires_size boolean not null default false,
  sort          integer not null default 0,
  active        boolean not null default true
);
insert into public.reward_catalog (slug, name_key, cost, requires_size, sort) values
  ('shaker',   'bc.reward.shaker',    900, false, 1),
  ('termo',    'bc.reward.termo',    1400, false, 2),
  ('colageno', 'bc.reward.colageno', 2300, false, 3),
  ('creatina', 'bc.reward.creatina', 2800, false, 4),
  ('proteina', 'bc.reward.proteina', 3800, false, 5),
  ('outfit',   'bc.reward.outfit',   4300, true,  6)
on conflict (slug) do update
  set name_key=excluded.name_key, cost=excluded.cost,
      requires_size=excluded.requires_size, sort=excluded.sort;

-- 5) CANJES. status: pending -> shipped -> delivered (o canceled).
create table if not exists public.reward_redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  reward_slug  text not null,
  reward_name  text not null,        -- snapshot (name_key)
  cost         integer not null,     -- snapshot
  status       text not null default 'pending' check (status in ('pending','shipped','delivered','canceled')),
  full_name    text not null,
  email        text not null,
  phone        text not null,
  address      text not null,
  size         text,
  notified_at  timestamptz,          -- respaldo del correo (Apps Script)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists rr_user_idx on public.reward_redemptions(user_id);
create index if not exists rr_pending_idx on public.reward_redemptions(status) where status='pending';

-- ── RLS: el cliente SOLO LEE lo suyo; escribe el service_role (endpoints) ─────
alter table public.bc_ledger          enable row level security;
alter table public.bc_daily           enable row level security;
alter table public.bc_streak          enable row level security;
alter table public.reward_catalog     enable row level security;
alter table public.reward_redemptions enable row level security;

drop policy if exists bc_ledger_select on public.bc_ledger;
create policy bc_ledger_select on public.bc_ledger for select using (auth.uid() = user_id);

drop policy if exists bc_daily_select on public.bc_daily;
create policy bc_daily_select on public.bc_daily for select using (auth.uid() = user_id);

drop policy if exists bc_streak_select on public.bc_streak;
create policy bc_streak_select on public.bc_streak for select using (auth.uid() = user_id);

drop policy if exists reward_redemptions_select on public.reward_redemptions;
create policy reward_redemptions_select on public.reward_redemptions for select using (auth.uid() = user_id);

-- Catálogo: lectura para cualquier sesión (referencia pública, sin datos privados).
drop policy if exists reward_catalog_select on public.reward_catalog;
create policy reward_catalog_select on public.reward_catalog for select using (true);
-- (NINGUNA tabla tiene policy de insert/update/delete → el cliente no puede
--  escribir. service_role y las funciones SECURITY DEFINER saltan RLS.)

-- ── Funciones de saldo / lotes ───────────────────────────────────────────────

-- Saldo VIVO: suma de remaining de lotes no caducados.
create or replace function public.bc_balance(uid uuid)
returns integer language sql stable as $$
  select coalesce(sum(remaining), 0)::int
  from public.bc_ledger
  where user_id = uid and amount > 0 and remaining > 0 and expires_at > now()
$$;

-- Agrega un lote de ganancia (caduca al año). Interna.
create or replace function public.bc_add_earn(uid uuid, p_kind text, p_amount int, p_meta jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.bc_ledger(user_id, kind, amount, remaining, created_at, expires_at, meta)
  values (uid, p_kind, p_amount, p_amount, now(), now() + interval '1 year', coalesce(p_meta,'{}'::jsonb))
  returning id into new_id;
  return new_id;
end $$;

-- ── Ganar por alarma (+10, racha 48h, hitos) ─────────────────────────────────
create or replace function public.bc_award_alarm(uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d date := bc_biz_day(now());
  row_daily public.bc_daily;
  st public.bc_streak;
  new_current int;
  new_run int;
  bonus int := 0;
  msg_bonus int := 0;
begin
  if not bc_can_earn(uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_eligible');
  end if;

  -- Idempotencia por día-negocio (bloquea la fila; evita carreras).
  insert into public.bc_daily(user_id, day) values (uid, d) on conflict (user_id, day) do nothing;
  select * into row_daily from public.bc_daily where user_id=uid and day=d for update;

  -- Estado de racha (crea y bloquea).
  insert into public.bc_streak(user_id) values (uid) on conflict (user_id) do nothing;
  select * into st from public.bc_streak where user_id=uid for update;

  if row_daily.alarm_awarded then
    return jsonb_build_object('ok', true, 'already', true,
      'balance', bc_balance(uid), 'streak', st.current, 'best', st.best, 'deadline_at', st.deadline_at);
  end if;

  -- 1) +10 BC del día
  perform bc_add_earn(uid, 'earn_alarm', 10, jsonb_build_object('day', d));

  -- 2) Racha con tolerancia 48h (hora del servidor)
  if st.last_completed_at is null or now() > st.deadline_at then
    new_current := 1;  new_run := st.run_id + 1;   -- rota o primer día
  else
    new_current := st.current + 1;  new_run := st.run_id;
  end if;

  -- 3) Hito (acumulativo, repetible por run; único por run+hito)
  msg_bonus := bc_milestone_bonus(new_current);
  if msg_bonus > 0 and not exists (
       select 1 from public.bc_ledger
       where user_id=uid and kind='earn_milestone'
         and (meta->>'run')::int = new_run and (meta->>'milestone')::int = new_current
     ) then
    perform bc_add_earn(uid, 'earn_milestone', msg_bonus,
      jsonb_build_object('run', new_run, 'milestone', new_current));
    bonus := msg_bonus;
  end if;

  update public.bc_streak set
    current = new_current, best = greatest(best, new_current), run_id = new_run,
    last_completed_at = now(), deadline_at = now() + interval '48 hours', updated_at = now()
  where user_id = uid;

  update public.bc_daily set alarm_awarded = true, updated_at = now()
  where user_id=uid and day=d;

  return jsonb_build_object('ok', true, 'already', false,
    'earned', 10 + bonus, 'milestone_bonus', bonus, 'balance', bc_balance(uid),
    'streak', new_current, 'best', greatest(st.best, new_current),
    'deadline_at', now() + interval '48 hours');
end $$;

-- ── Ruleta (máx 1 alarma + 1 reto por día) ───────────────────────────────────
create or replace function public.bc_spin(uid uuid, p_source text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d date := bc_biz_day(now());
  row_daily public.bc_daily;
  used boolean;
  prize int;
  r double precision;
begin
  if p_source not in ('alarm','challenge') then
    return jsonb_build_object('ok', false, 'reason', 'bad_source');
  end if;
  if not bc_can_earn(uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_eligible');
  end if;

  insert into public.bc_daily(user_id, day) values (uid, d) on conflict (user_id, day) do nothing;
  select * into row_daily from public.bc_daily where user_id=uid and day=d for update;

  -- El giro de alarma exige haber completado la alarma del día.
  if p_source='alarm' and not row_daily.alarm_awarded then
    return jsonb_build_object('ok', false, 'reason', 'alarm_not_done');
  end if;

  if p_source='alarm' then used := row_daily.alarm_spin_used; else used := row_daily.challenge_spin_used; end if;
  if used then
    return jsonb_build_object('ok', false, 'reason', 'already_spun', 'source', p_source);
  end if;

  -- Premio server-side por pesos: 0 (~50%), 5 (~30%), 10 (~18%), 100 raro (~2%).
  r := random();
  if    r < 0.50 then prize := 0;
  elsif r < 0.80 then prize := 5;
  elsif r < 0.98 then prize := 10;
  else                prize := 100;
  end if;

  if prize > 0 then
    perform bc_add_earn(uid, 'earn_roulette', prize, jsonb_build_object('source', p_source, 'day', d));
  end if;

  if p_source='alarm' then
    update public.bc_daily set alarm_spin_used=true, updated_at=now() where user_id=uid and day=d;
  else
    update public.bc_daily set challenge_spin_used=true, updated_at=now() where user_id=uid and day=d;
  end if;

  return jsonb_build_object('ok', true, 'prize', prize, 'source', p_source, 'balance', bc_balance(uid));
end $$;

-- ── Canje (SOLO premium pagado; descuento FIFO por caducidad) ─────────────────
create or replace function public.bc_redeem(
  uid uuid, p_slug text,
  p_full_name text, p_email text, p_phone text, p_address text, p_size text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rw public.reward_catalog;
  bal int;
  need int;
  lot record;
  redemption_id uuid;
  consumed jsonb := '[]'::jsonb;
begin
  -- 1) SOLO premium PAGADO por Stripe (fundadores NO pueden canjear).
  if not bc_is_premium_paid(uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_paid_premium');
  end if;

  select * into rw from public.reward_catalog where slug=p_slug and active=true;
  if not found then return jsonb_build_object('ok', false, 'reason', 'reward_unavailable'); end if;

  if rw.requires_size and coalesce(btrim(p_size),'')='' then
    return jsonb_build_object('ok', false, 'reason', 'size_required');
  end if;
  if coalesce(btrim(p_full_name),'')='' or coalesce(btrim(p_email),'')=''
     or coalesce(btrim(p_phone),'')='' or coalesce(btrim(p_address),'')='' then
    return jsonb_build_object('ok', false, 'reason', 'missing_fields');
  end if;

  -- 2) Saldo suficiente.
  need := rw.cost;
  select bc_balance(uid) into bal;
  if bal < need then
    return jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', bal, 'cost', need);
  end if;

  -- 3) Consumo FIFO por caducidad (los que caducan primero), bloqueando lotes.
  for lot in
    select id, remaining from public.bc_ledger
    where user_id=uid and amount>0 and remaining>0 and expires_at>now()
    order by expires_at asc, created_at asc
    for update
  loop
    exit when need <= 0;
    if lot.remaining <= need then
      update public.bc_ledger set remaining=0 where id=lot.id;
      need := need - lot.remaining;
      consumed := consumed || jsonb_build_object('lot', lot.id, 'used', lot.remaining);
    else
      update public.bc_ledger set remaining=remaining-need where id=lot.id;
      consumed := consumed || jsonb_build_object('lot', lot.id, 'used', need);
      need := 0;
    end if;
  end loop;

  -- 4) Auditoría del canje (fila negativa; nunca resetea el total).
  insert into public.bc_ledger(user_id, kind, amount, remaining, created_at, expires_at, meta)
  values (uid, 'redeem', -rw.cost, null, now(), null,
          jsonb_build_object('reward', rw.slug, 'consumed', consumed));

  -- 5) Registro del canje (pending) con los datos de envío.
  insert into public.reward_redemptions(user_id, reward_slug, reward_name, cost,
      full_name, email, phone, address, size)
  values (uid, rw.slug, rw.name_key, rw.cost,
      btrim(p_full_name), btrim(p_email), btrim(p_phone), btrim(p_address),
      nullif(btrim(coalesce(p_size,'')),''))
  returning id into redemption_id;

  return jsonb_build_object('ok', true, 'redemption_id', redemption_id,
    'reward', rw.slug, 'cost', rw.cost, 'balance', bc_balance(uid));
end $$;

-- ── Bono de fundador (500 BC, una sola vez). Se ejecuta en Fase 6. ────────────
-- Elegibles = fundadores (is_founder). Se lo ganan por confiar desde el inicio;
-- les queda esperando a que paguen para poder canjear.
create or replace function public.bc_grant_founder_bonus(uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.bc_ledger where user_id=uid and kind='earn_founder') then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  perform bc_add_earn(uid, 'earn_founder', 500, jsonb_build_object('reason','founder_launch'));
  return jsonb_build_object('ok', true, 'already', false, 'balance', bc_balance(uid));
end $$;
-- Fase 6 (NO ahora):
--   select public.bc_grant_founder_bonus(user_id) from public.subscriptions where is_founder;

-- ── Barrido de caducidad (opcional; lo lazy ya basta para el saldo/gasto) ─────
-- Escribe filas 'expire' de auditoría y pone a cero los lotes vencidos.
create or replace function public.bc_expire_sweep()
returns integer language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  insert into public.bc_ledger(user_id, kind, amount, remaining, created_at, expires_at, meta)
  select user_id, 'expire', -remaining, null, now(), null,
         jsonb_build_object('lot', id, 'expired', remaining)
  from public.bc_ledger
  where amount > 0 and remaining > 0 and expires_at <= now();
  get diagnostics n = row_count;

  update public.bc_ledger set remaining = 0
  where amount > 0 and remaining > 0 and expires_at <= now();
  return n;
end $$;
-- (opcional, requiere pg_cron habilitado): barrer cada día 8am hora MX (14:00 UTC)
--   select cron.schedule('bc_expire_daily', '0 14 * * *', $$select public.bc_expire_sweep()$$);

-- ── SEGURIDAD: solo service_role ejecuta las funciones que mueven dinero ──────
-- OJO (lección aprendida): NO basta con "revoke ... from public". Supabase tiene
-- ALTER DEFAULT PRIVILEGES que concede EXECUTE *directo* a anon y authenticated
-- al crear cada función, así que hay que revocarles a ELLOS explícitamente, no
-- solo a PUBLIC. Iteramos con oid::regprocedure para que la firma exacta siempre
-- coincida (inmune a typos de firma y a overloads). Sin esto, un autenticado
-- podría llamar bc_redeem(otro_uid, ...) por RPC (corren como owner).
do $$
declare
  fn regprocedure;
  money_fns text[] := array[
    'bc_add_earn','bc_award_alarm','bc_spin','bc_redeem',
    'bc_grant_founder_bonus','bc_expire_sweep',
    'bc_balance','bc_is_premium_paid','bc_can_earn'
  ];
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any(money_fns)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant  execute on function %s to service_role', fn);
  end loop;
end $$;
-- (bc_biz_day y bc_milestone_bonus son helpers puros sin acceso a datos: se dejan.)
