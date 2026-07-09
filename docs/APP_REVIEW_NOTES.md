# App Review Notes — Booty Alarm / Brenda Fitness

Plantilla para las **App Review Notes** de App Store Connect. Llena las
credenciales de la cuenta demo antes de enviar. La sección "PASTE INTO APP STORE
CONNECT" está en inglés (los reviewers de Apple leen inglés) y es la que se pega
tal cual en el campo *App Review Information → Notes*.

---

## 🔑 Cuenta demo (LLENAR antes del submit)

> Marca esta cuenta como premium en Supabase (`subscriptions.status = 'active'`)
> y pre-genera una rutina y una dieta para ella, así el reviewer ve el contenido
> premium COMPLETO al entrar.

- **Email:** `__________________________`
- **Password:** `__________________________`
- **Premium activo en Supabase:** [ ] sí  ·  **Planes pre-generados:** [ ] rutina  [ ] dieta

---

## 📋 PASTE INTO APP STORE CONNECT (English)

```
DEMO ACCOUNT (required to review premium content)
Email:    <FILL IN>
Password: <FILL IN>

ABOUT THE APP
Booty Alarm is a fitness app in Spanish. The free layer is a camera-based
"active wake-up" alarm: the alarm keeps ringing until the user completes a set
number of squats or lunges, which the phone camera counts on-device (no video is
uploaded or stored). The premium layer, "Brenda Fitness", adds AI-personalized
workout routines and diet plans, plus progress tracking.

HOW TO REVIEW THE PREMIUM CONTENT (IMPORTANT)
Premium content is account-based. Please SIGN IN with the demo account above to
see the full premium experience. Steps:
1. Complete the short onboarding (name, age, weight, height, goal, allergies) OR
   tap "Ya tengo cuenta / Iniciar sesión" and sign in with the demo account.
2. Once signed in with the demo account, the premium sections are fully
   unlocked and populated:
   - "Entrena" (Train): an AI-generated weekly workout routine. Tap a day to
     expand it and mark exercises as done ("Marcar" → "✓ Hecho").
   - "Nutrición" (Nutrition): an AI-generated 7-day diet plan with daily macros.
   - "Progreso" (Progress): weight chart, streak ring, workout stats and
     achievements. Reached from the "Perfil" tab → "Mi Progreso" card.

FEATURES TO TRY
- Active alarm: Home → "TU ALARMA" → "PROBAR ALARMA" (test the ringing screen).
- Quick challenges: Home → "RETOS RÁPIDOS" (camera counts your reps).
- AI routine: Entrena → open a day → mark exercises done (DONE button).
- AI diet: Nutrición → open a day → view meals, ingredients and macros.
- Progress: Perfil → "Mi Progreso".

NOTES ON PAYMENTS (Guideline 3.1.1)
On iOS the app does NOT display any prices, purchase buttons, or links to
external payment. Premium access for this review is provided via the demo
account above. There is no in-app purchase flow in this build.

PRIVACY
The camera is used only to count reps locally on the device. No video or images
are captured, uploaded, or stored. Privacy Policy and Terms are available inside
the app (Perfil → Legal) and at the public URLs.
```

---

## 🇪🇸 Contexto para ti (no se pega en Apple)

- **Por qué damos cuenta demo:** en iOS el contenido premium está detrás de una
  cuenta (no hay IAP en este build y el pago está oculto por la regla 3.1.1). Sin
  una cuenta premium, el reviewer solo vería la tarjeta "CONTENIDO EXCLUSIVO" y no
  podría ver el contenido → fue la causa probable del rechazo 5.6. La cuenta demo
  premium lo resuelve.
- **Checklist antes de enviar:**
  1. Crear/elegir la cuenta demo y ponerla `active` en Supabase `subscriptions`.
  2. Iniciar sesión con ella una vez y **generar** una rutina y una dieta (deja
     `ANTHROPIC_API_KEY` + créditos listos en producción — pendiente S2).
  3. Confirmar en un iPhone real que, logueada, se ve TODO el contenido premium.
  4. Pegar las credenciales arriba y en App Store Connect.
  5. Adjuntar (opcional) capturas del flujo premium.
- **Idioma de la app:** español (México). Las review notes van en inglés para el
  reviewer; la app se revisa en español sin problema.
