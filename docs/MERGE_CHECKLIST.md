# Checklist de merge — `feature/ai-plans` → producción

Rama de producción (la que Vercel despliega): **`claude/wizardly-thompson-c2YDO`**.
Rama de la feature: **`feature/ai-plans`**.

> ⚠️ NO mergear hasta tener **créditos de Anthropic** y haber **probado una
> generación real** (rutina y dieta) contra producción. Ver S2.

---

## 0. Precondiciones (todo ✅ antes de tocar git)

- [ ] `ANTHROPIC_API_KEY` con **créditos** disponible.
- [ ] Generación IA real **probada** (script local o endpoint) → devuelve JSON válido, sin timeout.
- [ ] Cuenta demo premium creada y con **rutina + dieta pre-generadas** (para Apple).
- [ ] `docs/APP_REVIEW_NOTES.md` con credenciales llenas.
- [ ] Precios del Paywall verificados vs Stripe (M2).
- [ ] Imagen Cloudinary de `Celebration.jsx` verificada (carga 200).

## 1. Migraciones de base de datos (Supabase PRODUCCIÓN)

Correr en Supabase → SQL Editor del proyecto de **producción** (idempotente):

- [ ] `supabase/ai_plans.sql` (crea `ai_plans` + RLS + columnas nuevas de `profiles`:
      `allergies`, `diet_pref`, `dislikes`).
- [ ] Verificar en Table Editor que existen `ai_plans` y las 3 columnas en `profiles`.

## 2. Variables de entorno en Vercel (PRODUCCIÓN)

Settings → Environment Variables (scope **Production**):

- [ ] `ANTHROPIC_API_KEY` = (server-only, **sin** prefijo `VITE_`).
- [ ] `VITE_USE_MOCK_PLANS` = **AUSENTE** o `false`. 🔴 **NUNCA `true` en producción**
      (activaría el mock y saltaría el gate premium).
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` presentes.
- [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` presentes (para las Functions).
- [ ] Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`,
      `STRIPE_PRICE_ANNUAL`.

## 3. Verificación PRE-merge (en `feature/ai-plans`)

```bash
git checkout feature/ai-plans
git pull origin feature/ai-plans
npm ci --ignore-scripts        # o npm ci si tu entorno compila sharp
npm run build                  # DEBE terminar en verde
```
- [ ] `npm run build` verde.
- [ ] Working tree limpio (`git status` sin cambios).
- [ ] `/demo-ui` y `WorkoutDetail.jsx` ya NO existen (limpieza pre-Apple hecha).

## 4. Merge (CLI)

```bash
# Traer la base y asegurarse de que no divergió
git fetch origin
git checkout claude/wizardly-thompson-c2YDO
git pull origin claude/wizardly-thompson-c2YDO

# Merge con commit de merge explícito (historial claro)
git merge --no-ff feature/ai-plans -m "Merge feature/ai-plans: IA de planes + rediseño premium + voz de Brenda"

# Si hay conflictos: resolver, luego `git add -A && git commit`
# (No debería haber: solo trabajamos en feature/ai-plans.)

npm run build                  # build verde también en la base ya mergeada
git push origin claude/wizardly-thompson-c2YDO
```
- [ ] Merge sin conflictos (o resueltos).
- [ ] `npm run build` verde tras el merge.
- [ ] Push hecho.

> Alternativa por GitHub: abrir un PR `feature/ai-plans` → `claude/wizardly-thompson-c2YDO`
> y mergearlo desde la UI. (Solo si lo prefieres; el CLI de arriba es suficiente.)

## 5. Verificación POST-merge (producción desplegada)

- [ ] Vercel disparó un **Production Deployment** desde `claude/wizardly-thompson-c2YDO`
      y terminó en verde.
- [ ] Abrir la URL de producción y hacer smoke test:
  - [ ] Onboarding nuevo (incluye pasos de alergias/preferencia/dislikes).
  - [ ] Home carga (racha, KPIs, alarma, retos).
  - [ ] Login con la cuenta demo premium → Entrena y Nutrición muestran plan
        (o invitación → **Generar** funciona de verdad con la API).
  - [ ] Progreso accesible desde Perfil → "Mi Progreso".
  - [ ] No aparece el botón "⏩ Simular +30 días" (confirma mock apagado en prod).
  - [ ] `/demo-ui` responde 404/redirect (ya no existe).
- [ ] Revisar logs de las Functions `generate-workout` / `generate-diet` sin errores.

## 6. Cierre (opcional)

- [ ] Borrar la rama de feature si ya no se necesita:
      `git push origin --delete feature/ai-plans` (o dejarla como respaldo).
- [ ] Etiquetar el release si aplica.

---

### Notas
- El merge va directo a la rama **por defecto** del repo, que es la que Vercel
  despliega — por eso "llega a producción" al pushear.
- Nada de esto ejecutar hasta la luz verde (créditos + IA probada).
