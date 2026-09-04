-- ============================================================================
-- BRENDA COINS — Fase 6: BONO DE FUNDADOR (500 BC, una sola vez).
--
-- ⚠️  CÓRRELO SOLO AL DECIDIR EL LANZAMIENTO. No es fácil de revertir: crea un
--     lote de 500 BC por cada fundador. Es IDEMPOTENTE (bc_grant_founder_bonus
--     salta si el usuario ya tiene un lote 'earn_founder'), así que re-correrlo
--     no duplica — pero deshacerlo requiere borrar filas del ledger a mano.
--
-- Elegibles = fundadores (is_founder = true) al momento de correrlo. Se lo ganan
-- por confiar desde el inicio; las monedas quedan esperando a que paguen para
-- poder canjear (los fundadores NO canjean hasta tener premium pagado por Stripe).
--
-- No toca funciones → no requiere re-lockdown ni bloque D.
-- Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) Otorga el bono a cada fundador (una vez). Devuelve una fila por fundador
--    con { ok, already } — 'already:true' = ya lo tenía (no se duplicó).
select s.user_id, public.bc_grant_founder_bonus(s.user_id) as result
from public.subscriptions s
where s.is_founder = true;

-- 2) Verificación: cuántos fundadores recibieron el bono y cuántos BC en total.
select
  (select count(*) from public.subscriptions where is_founder) as fundadores,
  (select count(*) from public.bc_ledger where kind = 'earn_founder') as con_bono,
  (select coalesce(sum(amount), 0) from public.bc_ledger where kind = 'earn_founder') as bc_otorgados;
-- Esperado: con_bono = fundadores, bc_otorgados = fundadores * 500.
