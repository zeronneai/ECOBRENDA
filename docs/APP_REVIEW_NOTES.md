# App Review Notes — Booty Alarm / Brenda Fitness

Notas para **App Review Information → Notes** de App Store Connect. Refleja el
modelo ACTUAL: la alarma requiere suscripción (con 3 días de prueba), el premium
se compra por IAP de Apple y hay acceso multiplataforma para quienes ya pagaron
en web. El bloque en inglés es el que se pega tal cual; la versión en español va
debajo por si el equipo la necesita. Llena la contraseña de la cuenta demo antes
de enviar.

---

## 🔑 Cuenta demo (LLENAR antes del submit)

> Debe tener acceso **premium activo AHORA** (`acceso_premium = true`, no trial ni
> expirado) y login por correo/contraseña. Pre-genera una rutina y una dieta para
> ella para que el reviewer vea el contenido premium completo al entrar.

- **Email:** `primostudio.us@gmail.com`
- **Password:** `__________________________`
- **Premium activo en Supabase:** [ ] sí  ·  **Planes pre-generados:** [ ] rutina  [ ] dieta

---

## 📋 PASTE INTO APP STORE CONNECT (English)

```
DEMO ACCOUNT (required to review premium content)
Email:    primostudio.us@gmail.com
Password: <FILL IN>

ABOUT THE APP
Booty Alarm is a fitness app in Spanish (Mexico). Its core is a camera-based
"active wake-up" alarm: the alarm keeps ringing until the user completes a set
number of squats/lunges, which the phone camera counts on-device. The premium
tier, "Brenda Fitness", adds AI-personalized workout routines and diet plans,
plus progress tracking.

REQUIREMENT TO TEST THE ALARM — iOS 26
The alarm uses AlarmKit, which is available only on iOS 26 and later. Please
review on a device running iOS 26 or newer; on earlier versions the app runs but
the alarm cannot be scheduled (a system limitation, not a bug).

SUBSCRIPTIONS & PAYMENTS (Guideline 3.1.1)
This build includes Apple In-App Purchases. All payments on iOS go EXCLUSIVELY
through Apple (StoreKit). The app shows no external prices, links, or mentions of
any other payment method.
- Alarm subscription: monthly, with a 3-day free trial. Unlocks the active alarm.
- All-inclusive: monthly or annual. Unlocks everything, including the "Brenda
  Fitness" premium content (AI workouts + nutrition).
- "Restore Purchases" is available on the paywall and in "Perfil" (Profile).

HOW TO REVIEW THE PREMIUM CONTENT (IMPORTANT)
Premium content is account-based. Please SIGN IN with the demo account above — it
has full access, so no purchase is needed to see the content. To see the purchase
screen (paywall) instead, create a NEW account and open "Nutrición" or "Entrena".
Steps with the demo account:
1. Tap "Ya tengo cuenta / Iniciar sesión" (I already have an account / Sign in)
   and sign in with the demo account. (Or complete the short onboarding: name,
   age, weight, height, goal, allergies.)
2. Once signed in, the sections are fully unlocked and populated:
   - "Entrena" (Train): an AI-generated weekly workout routine. Tap a day to
     expand it and mark exercises done ("Marcar" -> "✓ Hecho").
   - "Nutrición" (Nutrition): an AI-generated 7-day diet plan with daily macros.
   - "Progreso" (Progress): weight chart, streak ring, workout stats and
     achievements. Reached from the "Perfil" (Profile) tab -> "Mi Progreso" card.

HOW TO TEST THE ALARM (signed in with the demo account, which has full access)
- Quick test of the ringing screen: Home -> "TU ALARMA" (Your Alarm) ->
  "PROBAR ALARMA" (Test Alarm).
- Real alarm: on Home, set an alarm time (e.g. 1-2 minutes ahead) and save it;
  allow the alarm permission when iOS asks. Lock the phone and wait — it rings
  like a system alarm. To turn it off, open the app and complete the camera
  verification (squats): allow camera access and perform the movement shown on
  screen. Mimicking the movement in front of the camera is enough — the camera
  dismissal is the intended mechanism.
- Quick challenges: Home -> "RETOS RÁPIDOS" (Quick Challenges); the camera counts
  your reps.

CROSS-PLATFORM ACCESS (allowed by the guidelines)
A web version exists where some users previously subscribed via a web payment
provider (Stripe). Those users keep their access when they sign in on iOS,
without being asked to purchase again — this is the cross-platform model Apple's
guidelines permit (content acquired on another platform remains available). The
iOS app does NOT link to, mention, or promote that web purchase or Stripe; the
only payment method offered inside iOS is Apple. This is intentional and expected.

PRIVACY
The camera is used only to count reps locally on the device. No video or images
are captured, uploaded, or stored. Privacy Policy and Terms are available inside
the app ("Perfil" -> Legal) and at the public URLs.

Thank you for the review.
```

---

## 📋 VERSIÓN EN ESPAÑOL (referencia del equipo)

```
CUENTA DEMO (necesaria para revisar el contenido premium)
Correo:     primostudio.us@gmail.com
Contraseña: <LLENAR>

SOBRE LA APP
Booty Alarm es una app de fitness en español (México). Su núcleo es una alarma
con "despertar activo" por cámara: la alarma suena hasta que la persona completa
cierto número de sentadillas/zancadas, que la cámara del teléfono cuenta en el
dispositivo. El nivel premium, "Brenda Fitness", añade rutinas de entrenamiento y
planes de dieta personalizados con IA, además de seguimiento de progreso.

REQUISITO PARA PROBAR LA ALARMA — iOS 26
La alarma usa AlarmKit, disponible solo desde iOS 26. Por favor revisen en un
dispositivo con iOS 26 o superior; en versiones anteriores la app funciona pero
la alarma no se puede programar (es una limitación del sistema, no un fallo).

SUSCRIPCIONES Y PAGOS (Guía 3.1.1)
Este build incluye compras dentro de la app de Apple. Todos los pagos en iOS se
hacen ÚNICAMENTE por Apple (StoreKit). La app no muestra precios, enlaces ni
menciones a ningún otro método de pago.
- Suscripción de alarma: mensual, con 3 días de prueba gratis. Desbloquea la
  alarma activa.
- Todo incluido: mensual o anual. Desbloquea todo, incluido el contenido premium
  "Brenda Fitness" (entrenamiento + nutrición con IA).
- "Restaurar compras" está disponible en el paywall y en "Perfil".

CÓMO REVISAR EL CONTENIDO PREMIUM (IMPORTANTE)
El contenido premium depende de la cuenta. Por favor INICIEN SESIÓN con la cuenta
demo de arriba — tiene acceso completo, así que no hace falta comprar para ver el
contenido. Para ver la pantalla de compra (paywall), creen una cuenta NUEVA y
abran "Nutrición" o "Entrena".
Pasos con la cuenta demo:
1. Toquen "Ya tengo cuenta / Iniciar sesión" e inicien con la cuenta demo. (O
   completen el onboarding corto: nombre, edad, peso, estatura, objetivo,
   alergias.)
2. Ya con sesión iniciada, las secciones quedan desbloqueadas y con contenido:
   - "Entrena": rutina semanal generada con IA. Toquen un día para expandirlo y
     marquen ejercicios como hechos ("Marcar" -> "✓ Hecho").
   - "Nutrición": plan de dieta de 7 días con macros diarios.
   - "Progreso": gráfica de peso, anillo de racha, estadísticas y logros. Se llega
     desde la pestaña "Perfil" -> tarjeta "Mi Progreso".

CÓMO PROBAR LA ALARMA (con sesión iniciada en la cuenta demo, que tiene acceso completo)
- Prueba rápida de la pantalla de sonido: Inicio -> "TU ALARMA" -> "PROBAR ALARMA".
- Alarma real: en Inicio fijen una hora (p. ej. 1-2 minutos en el futuro) y
  guárdenla; acepten el permiso de alarma cuando iOS lo pida. Bloqueen el teléfono
  y esperen — sonará como una alarma del sistema. Para apagarla, abran la app y
  completen la verificación con la cámara (sentadillas): permitan el acceso a la
  cámara y hagan el movimiento indicado. Basta simular el movimiento frente a la
  cámara — el apagado por cámara es el mecanismo por diseño.
- Retos rápidos: Inicio -> "RETOS RÁPIDOS"; la cámara cuenta las repeticiones.

ACCESO MULTIPLATAFORMA (permitido por las guías)
Existe una versión web donde algunos usuarios se suscribieron antes con un
proveedor de pago web (Stripe). Esos usuarios conservan su acceso al iniciar
sesión en iOS, sin que se les pida volver a comprar — este es el modelo
multiplataforma que las guías de Apple permiten (el contenido adquirido en otra
plataforma sigue disponible). La app iOS NO enlaza, NO menciona ni promociona esa
compra web ni Stripe; el único método de pago dentro de iOS es Apple. Es
intencional y esperado.

PRIVACIDAD
La cámara se usa solo para contar repeticiones localmente en el dispositivo. No se
captura, sube ni almacena ningún video o imagen. La Política de Privacidad y los
Términos están dentro de la app ("Perfil" -> Legal) y en las URLs públicas.

Gracias por la revisión.
```

---

## 🇪🇸 Checklist antes de enviar (no se pega en Apple)

1. Cuenta demo `primostudio.us@gmail.com` con **premium activo** (`acceso_premium =
   true`) y login por correo/contraseña funcionando.
2. Iniciar sesión con ella y **pre-generar** una rutina y una dieta (con
   `ANTHROPIC_API_KEY` + créditos listos en producción) para que el reviewer vea
   el contenido completo.
3. Confirmar en un iPhone real **con iOS 26** que, logueada, se ve TODO el premium
   y la alarma se programa y se apaga por cámara.
4. Poner la contraseña en las notas de arriba y en App Store Connect.
5. Adjuntar los 3 productos de suscripción a la versión.
6. Confirmar que `/terms` y `/privacy` cargan en las URLs públicas.
