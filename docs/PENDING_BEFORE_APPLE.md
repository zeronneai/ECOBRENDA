# ⚠️ PENDIENTES CRÍTICOS antes de cualquier build a Apple / producción

Lista viva de cosas que DEBEN resolverse antes de un release. Revisar antes de
mergear `feature/ai-plans` a producción o subir a App Store / Google Play.

## 🔴 Eliminar la pantalla de demo temporal
- **Ruta `/demo-ui` + `src/screens/UiDemo.jsx`** — demo del kit premium (Fase 3).
  Es solo para desarrollo/referencia. Un reviewer de Apple podría marcar una
  ruta "demo" accesible por URL.
- **Acción:** quitar la `<Route path="/demo-ui" ...>` de `src/App.jsx`, borrar el
  import y eliminar `src/screens/UiDemo.jsx`.
- **Cuándo:** al terminar la Fase 3 de rediseño (antes del build de release).

## Notas
- `WorkoutDetail` (`/entrena/:id`) ya se retiró del router (queda como fallback
  en código, sin acceso por URL).
