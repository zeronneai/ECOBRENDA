-- ============================================================================
-- DIAGNÓSTICO + LIMPIEZA — cuentas nuevas marcadas como fundadoras por error
-- Corre bloque por bloque en Supabase -> SQL Editor.
-- ============================================================================

-- ── A) DESCARTAR UN TRIGGER en la DB en vivo ────────────────────────────────
-- ¿Hay triggers propios en auth.users? (los internos de Supabase se excluyen)
select tgname, pg_get_triggerdef(oid) as definicion
from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- ¿Alguna función que inserte/toque subscriptions? (busca un "seed" oculto)
select proname as funcion, prosrc as cuerpo
from pg_proc
where prosrc ilike '%subscriptions%';
-- → Si aparece una función/trigger que inserta en subscriptions al registrarse,
--   ESA es la causa. Bórrala:  drop trigger <nombre> on auth.users;
--                              drop function <nombre>();


-- ── B) VER a los fundadores más RECIENTES (para ubicar las 3 de prueba) ─────
-- Las cuentas de prueba estarán arriba (created_at más nuevo).
select s.user_id, u.email, u.created_at,
       s.is_founder, s.acceso_alarma, s.acceso_premium
from public.subscriptions s
join auth.users u on u.id = s.user_id
where s.is_founder = true
order by u.created_at desc
limit 20;


-- ── C) LIMPIEZA de las 3 cuentas de prueba ──────────────────────────────────
-- El estado CORRECTO de un usuario nuevo es SIN fila (así nace bloqueado).
-- Opción 1 (recomendada): BORRA la fila de las cuentas de prueba (por email).
delete from public.subscriptions
where user_id in (
  select id from auth.users
  where email in ('correo1@ejemplo.com', 'correo2@ejemplo.com', 'correo3@ejemplo.com')
);

-- Opción 2: en vez de borrar, deja los flags en false (mantiene la fila).
-- update public.subscriptions
-- set is_founder = false, acceso_alarma = false, acceso_premium = false, status = 'inactive'
-- where user_id in (
--   select id from auth.users
--   where email in ('correo1@ejemplo.com','correo2@ejemplo.com','correo3@ejemplo.com')
-- );


-- ── D) (Opcional) RESET masivo por fecha: desmarca cualquier "fundador" creado
--     DESPUÉS del corte real. Útil si hay más de 3 mal marcados.
--     Ajusta la fecha al mismo FOUNDER_CUTOFF de four_products.sql.
-- delete from public.subscriptions
-- where is_founder = true
--   and user_id in (select id from auth.users where created_at >= '2026-08-13 00:00:00+00');


-- ── E) VERIFICACIÓN final ───────────────────────────────────────────────────
-- Deben quedar solo tus fundadores reales (p. ej. 163).
-- select count(*) as fundadores from public.subscriptions where is_founder;
-- Y un usuario nuevo NO debe tener fila:
-- select * from public.subscriptions s join auth.users u on u.id=s.user_id
--   where u.email = 'correo_de_prueba@ejemplo.com';
