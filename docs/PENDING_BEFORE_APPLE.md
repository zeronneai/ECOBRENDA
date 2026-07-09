# ⚠️ PENDIENTES antes del submit a Apple / producción

Lista viva. Revisar antes de mergear `feature/ai-plans` a producción o subir a
App Store / Google Play.

## ✅ Hecho
- Eliminada la pantalla de demo temporal `/demo-ui` + `UiDemo.jsx`.
- Eliminado `WorkoutDetail.jsx` (código muerto con placeholder "próximamente").
- Retirada la ruta `/entrena/:id` del router.

## 🔴 Antes del submit
- **S1 — Acceso premium en iOS (raíz del rechazo 5.6/3.1.1).** No se implementa
  IAP por ahora. Estrategia: **cuenta demo premium** para el reviewer.
    - Marcar la cuenta demo con `subscriptions.status = 'active'` en Supabase.
    - Recomendado: **pre-generar** una rutina y una dieta para esa cuenta, para
      que el reviewer vea el contenido premium COMPLETO (no solo la invitación).
    - Incluir email + contraseña de la cuenta demo en las "App Review notes".
    - No requiere cambios de código: el gate es `subscription.status==='active'`.
- **S2 — La generación IA debe funcionar en producción.** Configurar
  `ANTHROPIC_API_KEY` + créditos en Vercel producción y probar una generación
  real ANTES del submit. No submitear sin esto.

## 🟡 Recomendado / verificar
- **M2 — Precios del Paywall** (`Paywall.jsx`: $99/mes, $999/año) deben coincidir
  con los Stripe Price IDs reales (solo web/Android; en iOS están ocultos).
- Verificar que la imagen de Cloudinary de `Celebration.jsx` cargue en el review.
