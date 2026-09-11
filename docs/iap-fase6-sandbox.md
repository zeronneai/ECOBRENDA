# IAP Fase 6 — pruebas en Sandbox + build iOS con IAP activo

## 0) Prerrequisitos (antes de probar)

- [ ] **Paid Applications Agreement ACTIVE** (con la constancia del SAT). Sin
      esto StoreKit no completa compras ni en Sandbox.
- [ ] Los 3 productos en **"Ready to Submit"** y en el grupo `booty_alarm`
      (all-inclusive por encima de alarm), con la intro offer de 3 días en
      `bootyalarm.alarm.monthly`.
- [ ] **Sandbox tester** creado (App Store Connect → Users and Access → Sandbox).
- [ ] **RevenueCat**: webhook apuntando a `https://ecobrenda.vercel.app/api/iap/revenuecat-webhook`
      (ya probado, devolvió `{ok:true,test:true}`), entitlements `acceso_alarma`/
      `acceso_premium` y offering default con los 3 productos.
- [ ] **Vercel (Production)**: `REVENUECAT_WEBHOOK_SECRET` puesto + redeploy.
- [ ] Supabase al día: corridos `iap_fase0`, `iap_fase2_reconcile`, `iap_fase3_states`,
      `iap_fase4_reconcile_provider` y el fix `iap_fix_founder_premium`. Bloque D
      en verde.

---

## 1) Compilar el build de iOS con IAP activo (en tu Mac)

`ios/App/App/public` está **gitignoreado**: los assets web se generan en tu Mac,
así que hay que compilar CON los flags antes de sincronizar y archivar.

```bash
# 1. Trae el código y dependencias
git pull
npm ci

# 2. Compila el web con AMBOS flags encendidos (Booty Coins + IAP)
VITE_BC_ENABLED=1 VITE_IAP_ENABLED=1 npm run build

# 3. Copia los assets + plugins al proyecto iOS (incluye RevenueCat)
npx cap sync ios

# 4. Abre Xcode
npx cap open ios
```

En **Xcode**:
- [ ] Target **App** → **Signing & Capabilities**: tu Team; capability
      **In-App Purchase** presente.
- [ ] Sube la versión: **MARKETING_VERSION = 1.2.0** (lanzamiento con IAP) y
      **CURRENT_PROJECT_VERSION = 11** (build 10 fue el último; usa el siguiente
      sin usar).
- [ ] Selecciona un **dispositivo real** (mejor que simulador para StoreKit
      sandbox) → **Product → Archive** → **Distribute App → TestFlight & App Store**.

> Verificación rápida de que el flag quedó horneado: en el build, el paywall de
> iOS muestra los **precios de StoreKit**; si vieras la card neutra, el flag no
> entró (revisa que el paso 2 corrió con `VITE_IAP_ENABLED=1`).

### Probar en Sandbox (sin subir a TestFlight)
Puedes correr el **Archive/Run en el dispositivo** directamente desde Xcode. En
el iPhone NO inicies sesión de Sandbox en Ajustes; iOS te pedirá la cuenta de
Sandbox **al confirmar la primera compra**. Las renovaciones en Sandbox son
**aceleradas** (1 mes ≈ 5 min, 1 año ≈ 1 h, trial de 3 días ≈ unos minutos).

---

## 2) Matriz de pruebas en Sandbox

Para cada caso: realiza la acción en la app y verifica (A) la UI y (B) la base.
Usa el `user_id` de la cuenta de prueba.

**Consultas de verificación (Supabase):**
```sql
select * from public.apple_subscriptions where user_id = '<UUID>';
select provider, status, acceso_alarma, acceso_premium, current_period_end, trial_end
from public.subscriptions where user_id = '<UUID>';
```

| # | Caso | Acción | Esperado UI | Esperado BD |
|---|---|---|---|---|
| 1 | **Trial de alarma** | Usuario nuevo elegible compra `alarm.monthly` | Badge "3 días gratis" visible antes; tras comprar se desbloquea la alarma | apple_subscriptions: status active, period_type `trial`; subscriptions: acceso_alarma=t, acceso_premium=f, provider `apple`, trial_end = fin del trial |
| 2 | **Conversión de trial** | Esperar (acelerado) a que renueve | Sin cambios para la usuaria | RENEWAL → period_type `normal`, trial_end → null, sigue active |
| 3 | **All-inclusive mensual** | Comprar `allinclusive.monthly` | Nutrición/Entrena desbloqueados | acceso_alarma=t, acceso_premium=t, provider `apple` |
| 4 | **All-inclusive anual** | Comprar `allinclusive.annual` | Igual que #3 | igual; current_period_end ~1 año |
| 5 | **Upgrade $9→$59** | Con alarm activo, comprar all-inclusive | Premium se desbloquea | PRODUCT_CHANGE → product_id pasa a all-inclusive, acceso_premium=t (Apple prorratea) |
| 6 | **Cancelación** | En Ajustes de Sandbox, desactivar auto-renovación | Sigue con acceso hasta expirar | CANCELLATION → auto_renew=false, status active hasta expires; luego EXPIRATION → status expired, acceso_*=f (si no hay otra fuente) |
| 7 | **Restaurar** | Borrar app, reinstalar, iniciar sesión, "Restaurar compras" | Acceso vuelve | recompute reaplica; acceso_* correcto |
| 8 | **Trial inelegible** | Reinstalar con la MISMA Apple ID que ya usó trial | El badge "3 días gratis" **NO** aparece | getTrialEligibility = ineligible |
| 9 | **Reembolso** (limitado en Sandbox) | Simular con "Refund"/evento de prueba de RevenueCat | Acceso se retira | status `revoked` → acceso_*=f (si no hay otra fuente) |
| 10 | **Cross-platform** | Cuenta que pagó por **Stripe (web)** inicia sesión en iOS | Ve premium, **no** aparece paywall | sin cambios; acceso por stripe_* |
| 11 | **Fundador en iOS** | Fundador (solo alarma) abre Nutrición | Ve el paywall de Apple; puede comprar premium | tras comprar: provider `apple`, acceso_premium=t |
| 12 | **Administrar** | Premium Apple → Perfil → "Administrar" | Abre las suscripciones de Apple | — |
| 13 | **Cumplimiento** | Abrir el paywall de iOS | Solo productos de Apple; textos de auto-renovación; enlaces a Términos y Privacidad funcionan; NO hay links a web/Stripe | — |

Marca cada fila al pasar. Los casos 1–8 y 10–13 son los críticos para App Review;
el 9 (reembolso) es difícil en Sandbox — basta validar el manejo con un evento de
prueba de RevenueCat o monitorearlo en producción.

---

## 2b) Notas de App Review (listas para pegar — rellena [correo]/[contraseña])

**Español:**
```
Booty Alarm es una alarma con verificación por cámara (sentadillas), gratuita. El contenido premium "Brenda Fitness" (planes de nutrición y entrenamiento generados con IA) se desbloquea mediante suscripción.

PAGO EN iOS: las suscripciones se compran ÚNICAMENTE mediante compras dentro de la app de Apple (StoreKit). La app no contiene enlaces, botones ni menciones a métodos de pago externos.

CUENTA DEMO (premium activo): correo [correo] / contraseña [contraseña]. Con esta cuenta verán desbloqueadas las secciones "Nutrición" y "Entrena". Para ver la pantalla de compra (paywall), creen una cuenta nueva y abran "Nutrición" o "Entrena".

PRODUCTOS: alarma mensual (con 3 días de prueba gratis), todo incluido mensual y todo incluido anual. El botón "Restaurar compras" está disponible en el paywall y en el Perfil.

ACCESO MULTIPLATAFORMA: existe una versión web donde algunos usuarios se suscribieron previamente con un proveedor de pago web. Esos usuarios conservan su acceso al iniciar sesión en iOS, sin que se les pida volver a comprar. La app iOS NO enlaza ni promociona esa compra web; el único método de pago ofrecido en iOS es Apple. Esto es intencional y esperado.

Gracias por la revisión.
```

**English:**
```
Booty Alarm is a free camera-verified alarm (squats). The premium "Brenda Fitness" content (AI-generated nutrition and workout plans) is unlocked via subscription.

PAYMENT ON iOS: subscriptions are purchased EXCLUSIVELY through Apple In-App Purchase (StoreKit). The app contains no links, buttons, or mentions of external payment methods.

DEMO ACCOUNT (active premium): email [correo] / password [contraseña]. This account has the "Nutrición" and "Entrena" sections unlocked. To see the purchase screen (paywall), create a new account and open "Nutrición" or "Entrena".

PRODUCTS: monthly alarm (with a 3-day free trial), all-inclusive monthly, and all-inclusive annual. A "Restore Purchases" button is available on the paywall and in the Profile.

CROSS-PLATFORM ACCESS: a web version exists where some users previously subscribed via a web payment provider. Those users keep their access when signing in on iOS, without being asked to purchase again. The iOS app does NOT link to or promote that web purchase; the only payment method offered on iOS is Apple. This is intentional and expected.

Thank you for the review.
```

---

## 3) Envío a App Review

- [ ] Adjunta los 3 productos de suscripción a la versión de la app.
- [ ] **App Review notes**: explica que (a) el pago en iOS es 100% vía Apple IAP;
      (b) existe una versión web con Stripe pero la app iOS **no** la enlaza ni la
      menciona; (c) usuarios que ya pagaron en web conservan acceso al iniciar
      sesión (no se les pide recomprar) — esto es esperado y compatible.
- [ ] Da una **cuenta demo** (correo/clave de una cuenta con premium) para que el
      revisor vea el contenido desbloqueado sin comprar, y una libre para ver el
      paywall.
- [ ] Confirma que `/terms` y `/privacy` cargan en `ecobrenda.vercel.app`.
- [ ] Envía.

---

## 4) El día del lanzamiento (resumen)

1. Paid Apps Agreement **Active**.
2. Correr (si falta) los SQL de IAP + bloque D en verde.
3. En Vercel Production: `VITE_IAP_ENABLED=1` (web) — opcional, el paywall web
   seguirá siendo Stripe; el flag IAP solo aplica en iOS. En iOS el flag se
   hornea en el build (paso 1).
4. Build iOS 1.2.0 (11) con `VITE_BC_ENABLED=1 VITE_IAP_ENABLED=1` → Archive →
   enviar.
5. Tras aprobación, publicar.
