-- ============================================================================
-- Regeneración ILIMITADA de planes para cuentas internas (grabación de contenido).
-- Con unlimited_plans = true, la cuenta ignora AMBAS restricciones de tiempo:
--   - el ciclo de 30 días (locked_until)
--   - la espera de 48h de entrega
-- El plan se genera y se muestra de inmediato. El FLUJO (preguntas, check-in,
-- pantallas) es IDÉNTICO al de una usuaria normal que cumplió el mes; lo único
-- que cambia es que no hay bloqueo por tiempo.
--
-- La bandera SOLO se activa por este SQL manual. El cliente nunca la escribe
-- (RLS de subscriptions = solo SELECT), así que no hay ninguna ruta en la app
-- para que un usuario se la active.
--
-- Idempotente. Pega en Supabase -> SQL Editor -> Run.
-- ============================================================================

-- 1) Columna nueva (default false → nadie la tiene salvo que se marque a mano).
alter table public.subscriptions add column if not exists unlimited_plans boolean not null default false;


-- ============================================================================
-- 2) MARCAR las 4 cuentas internas (reemplaza los 4 correos).
--    Además de unlimited_plans, se les da acceso completo permanente
--    (is_founder + ambos accesos) para que puedan entrar a los planes sin pagar
--    y sin que el webhook se los quite. Crea la fila si no existe.
-- ============================================================================
-- insert into public.subscriptions (user_id, unlimited_plans, is_founder, acceso_alarma, acceso_premium, status)
-- select id, true, true, true, true, 'active'
-- from auth.users
-- where email in ('correo1@ejemplo.com','correo2@ejemplo.com','correo3@ejemplo.com','correo4@ejemplo.com')
-- on conflict (user_id) do update
--   set unlimited_plans = true, is_founder = true, acceso_alarma = true, acceso_premium = true;

-- Verificación:
-- select u.email, s.unlimited_plans, s.acceso_premium, s.is_founder
-- from public.subscriptions s join auth.users u on u.id = s.user_id
-- where s.unlimited_plans = true;

-- Para QUITARLE el permiso a una cuenta después (sin borrar la fila):
-- update public.subscriptions set unlimited_plans = false
-- where user_id in (select id from auth.users where email = 'correo@ejemplo.com');
