# Brenda Coins — plan de prueba completo

## 1) Activar `VITE_BC_ENABLED=1` en un preview (sin tocar producción)

`VITE_*` es build-time (se hornea al compilar), así que se controla por entorno
de Vercel:

1. **Vercel → Project → Settings → Environment Variables → Add**
   - Key: `VITE_BC_ENABLED` · Value: `1`
   - **Environments: SOLO Preview** (desmarca Production). Guardar.
2. Genera un **deploy de Preview** que NO sea la rama de producción:
   ```
   git checkout -b bc-preview && git push -u origin bc-preview
   ```
   Vercel construye una **URL de Preview** con el flag encendido. Producción
   sigue OFF porque su entorno no tiene la variable.
3. Prueba en esa URL de Preview (navegador). Los binarios iOS/Android son otra
   compilación aparte; para esta ronda probamos en web.

> Producción nunca ve Brenda Coins hasta que pongas `VITE_BC_ENABLED=1` en el
> entorno **Production** y redepliegues. Hasta entonces, todo inerte.

Para el canje además necesitas en el entorno **Preview** (y redeploy):
`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, `TEAM_SYNC_SECRET` (ver
`docs/apps-script-canjes.md`).

---

## 2) SQL: qué correr y en qué orden

Ya corriste Fases 0–1 (tablas, RLS, funciones, fix de grants, siembra de racha).
Las Fases 2–5 **no tienen SQL**. Lo único pendiente:

| Orden | Archivo | Cuándo |
|---|---|---|
| (ya corrido) | `brenda_coins.sql` + `brenda_coins_fix_grants.sql` + `bc_fase1_streak_seed.sql` | Fase 0–1 |
| **1 (al lanzar)** | `bc_fase6_founder_bonus.sql` | **Tú, al decidir el lanzamiento** |

`bc_fase6_founder_bonus.sql` otorga 500 BC a cada fundador (idempotente, pero no
reversible fácil). Trae su propia verificación (con_bono = fundadores,
bc_otorgados = fundadores × 500). No toca funciones → **no** necesita bloque D.

> Para un entorno NUEVO desde cero, el orden sería `brenda_coins.sql` (ya incluye
> la siembra de racha y el lockdown correcto) y luego, al lanzar,
> `bc_fase6_founder_bonus.sql`.

---

## 3) Qué debe ver cada tipo de cuenta (con el flag ON)

| Cuenta | Píldora | Acumula (10/día, racha, hitos, ruleta) | Bono fundador | Catálogo | Canjear |
|---|---|---|---|---|---|
| **Premium pagado (Stripe)** | Sí | Sí | No | Desbloqueado al alcanzar | **Sí** (botón + formulario) |
| **Alarma sola $9** | Sí | Sí | No | Visible, con progreso | No — banner "canje exclusivo del plan completo" |
| **Fundador sin pagar** | Sí | Sí | **+500** (si corriste el SQL) | Visible, con progreso | No — banner de plan; sus puntos crecen esperando a que pague |
| **Usuario sin nada** | **No** | No (bc_can_earn false) | No | No ve nada de BC | — |

Detalle:
- "Premium pagado" = `acceso_premium` + `status='active'` + `stripe_subscription_id`.
  Un fundador que *luego paga* pasa a poder canjear automáticamente.
- La píldora solo aparece para participantes (`acceso_alarma` true → alarma-sola,
  premium y fundadores lo tienen; el usuario sin nada no).
- Recompensa alcanzable: premium pagado ve **"Canjear"**; alarma/fundador ven
  **"¡Ya lo alcanzaste!"** pero con el canje bloqueado.

---

## 4) Probar el canje completo hasta el correo

Prerrequisito: Apps Script publicado + las 3 env vars en Preview + redeploy.

1. Usa una cuenta **premium pagado**. Para tener saldo suficiente sin esperar
   días, inyecta BC de prueba en el SQL Editor (service_role):
   ```sql
   select public.bc_add_earn('<UUID_DE_LA_USUARIA>', 'adjust', 5000,
     jsonb_build_object('reason','test'));
   ```
   (5000 BC alcanza para cualquier recompensa.)
2. En la app (Preview): toca la **píldora** → **Recompensas** → en una recompensa
   alcanzable toca **Canjear** → llena el formulario → confirma.
3. Verifica:
   - Pantalla de **confirmación**.
   - Fila en `reward_redemptions` con `status='pending'`:
     ```sql
     select id, reward_slug, cost, status, notified_at, created_at
     from public.reward_redemptions order by created_at desc limit 5;
     ```
   - **Correo** a los 3 del equipo en segundos (push). `notified_at` debe quedar
     puesto.
   - Descuento correcto (FIFO, sin resetear):
     ```sql
     select kind, amount, remaining, meta, created_at
     from public.bc_ledger where user_id='<UUID>' order by created_at desc limit 10;
     ```
     Debe haber una fila `redeem` negativa con `meta.consumed` (lotes usados) y
     los lotes más próximos a caducar con `remaining` reducido primero.
4. Probar el **poller de respaldo**: pon `notified_at = null` en un canje y
   ejecuta `pollPending` a mano en el editor de Apps Script → llega el correo y
   `notified_at` se vuelve a poner.
5. **Ciclo de estados**: en `reward_redemptions`, cambia `status` a `shipped` y
   luego `delivered` conforme envías/entregas.

---

## 5) Verificar puntos, racha y ruleta en la base

Reemplaza `<UUID>` por el id de la usuaria (`auth.users.id`).

```sql
-- Saldo vivo (owner puede ejecutar la función en el SQL Editor)
select public.bc_balance('<UUID>');

-- Ledger completo (puntos otorgados, canjes, caducidades)
select kind, amount, remaining, created_at, expires_at, meta
from public.bc_ledger where user_id='<UUID>' order by created_at desc;

-- Estado diario: +10 una vez, giros usados (hora-servidor America/Mexico_City)
select * from public.bc_daily where user_id='<UUID>' order by day desc;

-- Racha autoritativa: current/best/run_id y deadline (última alarma + 48h)
select current, best, run_id, last_completed_at, deadline_at
from public.bc_streak where user_id='<UUID>';

-- Premios de ruleta otorgados
select amount, meta->>'source' as fuente, created_at
from public.bc_ledger where user_id='<UUID>' and kind='earn_roulette'
order by created_at desc;
```

Qué comprobar:
- **+10 idempotente:** completa la alarma 2 veces el mismo día → solo un
  `earn_alarm` y `alarm_awarded=true`. No suma dos veces.
- **Racha 48h:** `deadline_at = last_completed_at + 48h`. Completar dentro de la
  ventana sube `current`; pasado eso, `current` vuelve a 1 y `run_id` sube.
- **Hitos:** al llegar a 5/10/15/30/60/180/365 aparece un `earn_milestone` con
  el bono, único por `(run_id, milestone)`.
- **Ruleta 2/día:** máximo un `earn_roulette` fuente `alarm` y uno `challenge`
  por día; los retos siguientes no agregan.

### Reiniciar el estado de una cuenta de prueba (para repetir)

```sql
delete from public.bc_ledger  where user_id='<UUID>';
delete from public.bc_daily   where user_id='<UUID>';
delete from public.bc_streak  where user_id='<UUID>';
```
(Con esto la cuenta vuelve a cero para volver a probar ganar/girar/canjear.)
