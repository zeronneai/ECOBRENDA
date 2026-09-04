-- ============================================================================
-- CORRECCIÓN Brenda Coins: cerrar EXECUTE de las funciones de dinero.
--
-- Causa del fallo del bloque D: el "revoke ... from public" original NO alcanzó
-- los grants que Supabase concede DIRECTO a anon y authenticated (vía ALTER
-- DEFAULT PRIVILEGES al crear la función). Revocar solo de PUBLIC dejó vivos los
-- grants directos → anon/authenticated seguían pudiendo ejecutar por RPC.
--
-- Este fix revoca de public, anon Y authenticated, e itera con oid::regprocedure
-- para que la firma exacta siempre coincida (inmune a typos/overloads).
-- Idempotente y re-ejecutable. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================
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

-- ── Verificación (re-corre el bloque D). Esperado tras el fix:
--    anon = false, authenticated = false, service_role = true en las 9.
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
