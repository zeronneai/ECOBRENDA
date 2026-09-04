-- ============================================================================
-- BRENDA COINS — Fase 1: racha server-side que NO rompe las rachas actuales.
--
-- Problema: bc_streak arranca vacío. Si un usuario con racha activa (p.ej. 15)
-- completa la alarma por primera vez bajo el nuevo sistema, la lógica vería
-- last_completed_at = null y la reiniciaría a 1. MAL.
--
-- Solución (sin ventana de tiempo): en el PRIMER award de cada usuario, si aún
-- no existe su fila en bc_streak, la SEMBRAMOS desde la tabla legacy wake_streaks
-- (current/best/last_completed) ANTES de aplicar el incremento. Así:
--   · Racha viva (última alarma reciente) → continúa (16), no se pierde.
--   · Racha ya muerta (hueco grande)      → se reinicia a 1 (correcto).
-- La siembra usa last_completed a fin-de-día America/Mexico_City + 48h de plazo,
-- lo más generoso posible para no romper nada activo en la migración.
--
-- Solo reemplaza bc_award_alarm. Idempotente. Incluye re-lockdown + bloque D.
-- Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
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

  -- Estado de racha: SIEMBRA desde wake_streaks si es la primera vez (migración
  -- que preserva rachas activas). Los que ya tienen fila no se tocan.
  insert into public.bc_streak(user_id, current, best, run_id, last_completed_at, deadline_at)
  select uid,
         coalesce(w.current, 0),
         coalesce(w.best, 0),
         0,
         case when w.last_completed is not null
              then ((w.last_completed + 1)::timestamp at time zone 'America/Mexico_City')
              else null end,
         case when w.last_completed is not null
              then ((w.last_completed + 1)::timestamp at time zone 'America/Mexico_City') + interval '48 hours'
              else null end
  from (select 1) one
  left join public.wake_streaks w on w.user_id = uid
  on conflict (user_id) do nothing;

  select * into st from public.bc_streak where user_id=uid for update;

  if row_daily.alarm_awarded then
    return jsonb_build_object('ok', true, 'already', true,
      'balance', bc_balance(uid), 'streak', st.current, 'best', st.best, 'deadline_at', st.deadline_at);
  end if;

  -- 1) +10 BC del día
  perform bc_add_earn(uid, 'earn_alarm', 10, jsonb_build_object('day', d));

  -- 2) Racha con tolerancia 48h (hora del servidor). st ya viene sembrado.
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

-- ── RE-LOCKDOWN (obligatorio tras tocar funciones): revoca a public/anon/
--    authenticated y concede solo a service_role. Inmune a firmas/overloads.
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
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = any(money_fns)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant  execute on function %s to service_role', fn);
  end loop;
end $$;

-- ── BLOQUE D (verificación). Esperado: anon=false, authenticated=false,
--    service_role=true en las 9.
select p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('bc_add_earn','bc_award_alarm','bc_spin','bc_redeem',
                    'bc_grant_founder_bonus','bc_expire_sweep',
                    'bc_balance','bc_is_premium_paid','bc_can_earn')
order by p.proname;
