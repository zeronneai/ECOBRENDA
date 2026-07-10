# Checklist de submit a App Store Connect — Booty Alarm / Brenda Fitness

Versión objetivo: **1.1.0** · Build **5** · Bundle ID **com.zeronne.bootyalarm** ·
iPhone-only, portrait. Sigue este documento paso a paso en la Mac.

---

## 0. Antes de empezar (verificaciones)
- [ ] En **App Store Connect → Apps**: confirma que "Booty Alarm" existe y te deja
      crear versión / subir build (→ mismo bundle ID, es actualización).
- [ ] En **TestFlight → Builds**: anota el **último build number subido**. El nuevo
      debe ser **mayor**. El proyecto está en **Build 5**; si ya subiste un 5, sube
      `CURRENT_PROJECT_VERSION` a 6+ en Xcode antes de archivar.
- [ ] Rama de producción actualizada localmente.

---

## 1. Build en la Mac

```bash
git checkout claude/wizardly-thompson-c2YDO
git pull origin claude/wizardly-thompson-c2YDO
npm ci                 # o: npm ci --ignore-scripts  (si sharp falla)
npm run build          # genera dist/ (usa .env local con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
npx cap sync ios       # copia dist + config + plugins al proyecto iOS
npx cap open ios       # abre Xcode
```

> ⚠️ Asegúrate de que tu `.env` local tenga `VITE_SUPABASE_URL` y
> `VITE_SUPABASE_ANON_KEY` reales, si no el bundle sale sin Supabase.

### Verificaciones en Xcode (antes de archivar)
- [ ] **App → General:** Version = **1.1.0**, Build = **5** (o mayor al último subido).
- [ ] **General → Deployment Info:** iPhone (no iPad), Portrait únicamente.
- [ ] **App → Build Phases → Copy Bundle Resources:** aparece **`PrivacyInfo.xcprivacy`**.
- [ ] **Signing & Capabilities:** Team correcto, "Automatically manage signing" ✓,
      perfil de distribución válido (App Store).
- [ ] Corre en un simulador/dispositivo real y confirma que **carga** (sin
      pantalla blanca / "Load failed").

### Smoke test en dispositivo/simulador
- [ ] Onboarding completo (incluye alergias/preferencias, sin texto desbordado).
- [ ] Login con Supabase funciona.
- [ ] Cámara cuenta reps (reto rápido).
- [ ] Perfil → "Privacidad de IA" muestra el aviso.
- [ ] Perfil → "Eliminar mi cuenta" (pruébalo con **cuenta desechable**, NUNCA la demo).
- [ ] Alarma "Probar alarma" suena.

---

## 2. Archivar y subir el build

1. En Xcode, selecciona destino **"Any iOS Device (arm64)"** (no simulador).
2. **Product → Archive**. Espera a que compile.
3. En el Organizer que abre: selecciona el archive → **Distribute App** →
   **App Store Connect** → **Upload** → siguiente con las opciones por defecto
   (symbols ✓) → **Upload**.
4. **Export compliance:** NO debería preguntarte (ya pusimos
   `ITSAppUsesNonExemptEncryption = false`). Si preguntara, responde que usas solo
   encriptación estándar exenta (HTTPS).
5. Espera **15–30 min** a que el build procese; aparecerá en **TestFlight → Builds**.

---

## 3. Crear la versión 1.1.0 en App Store Connect

1. **Apps → Booty Alarm → (barra lateral) "+ Version or Platform" → iOS → 1.1.0**.
2. **What's New in This Version** (sugerencia):
   > Novedades: planes de rutina y dieta personalizados con IA, hechos para tu
   > objetivo, nivel, días y alergias. Rediseño premium, seguimiento de progreso
   > con gráficas, y marca tus ejercicios completados.
3. **Screenshots** (ver §5).
4. **Build:** selecciona el build **5** que subiste.
5. **App Review Information:** cuenta demo + notas (ver §6).
6. **App Privacy:** labels (ver §4).
7. **Age Rating:** completa el cuestionario (app de fitness, sin contenido
   objetable → probablemente 4+ o 12+; responde honestamente, sin contenido
   sexual/violento).
8. **Guardar** todo → **Add for Review** / **Submit for Review**.

---

## 4. App Privacy Labels (mapeo EXACTO)

En **App Store Connect → tu app → App Privacy → Edit**.

**Pregunta inicial:** "Do you or your third-party partners collect data from this
app?" → **Yes**.

Para CADA tipo de dato de abajo: **Linked to the user = Yes**, **Used for tracking
= No**, **Purpose = App Functionality** (marca también *Product Personalization*
en los datos de salud/fitness, porque la IA personaliza el plan).

| Categoría en Apple | Tipo exacto a marcar | Qué es en la app |
|---|---|---|
| **Contact Info** | **Email Address** | Email de la cuenta (Supabase) |
| **Contact Info** | **Name** | Nombre del perfil |
| **Health & Fitness** | **Health** | Peso, estatura, edad, alergias, preferencias dietéticas |
| **Health & Fitness** | **Fitness** | Entrenamientos, reps, racha, progreso |
| **Purchases** | **Purchase History** | Estado de suscripción |
| **Identifiers** | **User ID** | user_id (UUID de Supabase) |

**Para cada uno, responde:**
- Used to Track You? → **No** (en TODOS).
- Linked to Identity? → **Yes** (en TODOS).
- Purposes → **App Functionality** (y *Product Personalization* en Health y Fitness).

**NO declares** (importante):
- ❌ **Payment Info / Credit Info:** NO. El pago lo maneja **Stripe** (checkout
  hosted); la app **nunca** recibe ni almacena datos de tarjeta.
- ❌ **Photos or Videos / Audio (User Content):** NO. La **cámara procesa todo en
  el dispositivo**; no se captura, sube ni guarda video/imágenes/audio.
- ❌ **Location, Contacts, Browsing/Search History, Diagnostics, Usage Data
  (analytics):** NO. No hay SDKs de analytics/ads.

**Resultado final de tracking:** al no marcar tracking en nada, la ficha mostrará
**"Data Not Used to Track You"**. ✅

> Nota: los datos de salud/fitness se procesan con un tercero (**Anthropic**) para
> generar el plan. El consentimiento in-app (regla 5.1.2i) ya lo cubre; en las
> labels basta declararlos como recolectados/vinculados como arriba.

---

## 5. Screenshots (iPhone-only)

Apple exige el tamaño de iPhone más grande; los demás se escalan solos.
- **Requerido:** **6.9"** (iPhone 16 Pro Max) **1320 × 2868 px**, *o* **6.7"**
  (iPhone 15 Pro Max) **1290 × 2796 px**. Portrait.
- **Opcional:** 6.5" (1284 × 2778).
- **iPad:** NO se necesita (la app es iPhone-only).
- **Cantidad:** 3 a 10 por tamaño. Recomiendo 5–6.

**Cómo capturarlos:** corre la app en el **simulador de iPhone 16 Pro Max** (o
15 Pro Max) → `Cmd+S` guarda la captura al tamaño correcto.

**Sugerencia de pantallas a mostrar (con la cuenta demo, contenido premium visible):**
1. Home (racha + alarma + retos).
2. Alarma sonando / configuración de alarma.
3. Entrena — rutina IA con días y botón DONE.
4. Nutrición — dieta IA con macros.
5. Progreso — gráficas + KPIs.
6. (Opcional) el aviso de IA / consentimiento.

---

## 6. App Review Information (notas al reviewer)

En **App Review Information**:
- [ ] **Sign-In required:** Yes.
- [ ] **Demo Account** — usa `docs/APP_REVIEW_NOTES.md`:
  - **Username (email):** la cuenta demo (marcada premium en Supabase +
    `ai_consent_at` seteado + rutina y dieta pre-generadas).
  - **Password:** la de esa cuenta.
- [ ] **Notes:** pega el bloque en inglés de `docs/APP_REVIEW_NOTES.md`
  (explica: app de fitness con alarma + premium por cuenta; cómo iniciar sesión
  con la demo para ver el contenido; que en iOS no hay precios/compras; que la
  cámara cuenta reps on-device; que "Privacidad de IA" está en Perfil).

**Antes de enviar, confirma en Supabase (cuenta demo):**
- [ ] `subscriptions.status = 'active'`.
- [ ] `profiles.ai_consent_at` con fecha (para que NO salga el gate y sí "Aceptaste el…").
- [ ] Tiene **1 rutina y 1 dieta** generadas (para que el reviewer vea contenido completo).

---

## 7. Otros ajustes de la ficha (una sola vez, si faltan)
- [ ] **Privacy Policy URL:** `https://ecobrenda.vercel.app/privacy` (y Terms en
      la descripción o EULA si aplica).
- [ ] **Support URL** y **Marketing URL** (pueden ser la landing).
- [ ] **Category:** Health & Fitness.
- [ ] **Age Rating** completado.
- [ ] **Descripción, keywords, subtítulo** en español.
- [ ] **Export Compliance** = sin encriptación no exenta (ya en Info.plist).

---

## 8. Enviar
- [ ] Todo verde en la versión 1.1.0 → **Add for Review** → **Submit for Review**.
- [ ] Estado pasa a **Waiting for Review**.

---

## 9. Recordatorios / trampas comunes
- **Build number 5 > último subido** (revisa TestFlight; si chocara, sube a 6+ y re-archiva).
- **Env vars del build:** el `dist/` sale de tu Mac; sin `.env` local → app sin Supabase.
- **PrivacyInfo.xcprivacy** debe estar en Copy Bundle Resources (verificado en §1).
- **Labels = manifest:** lo que declares en App Privacy debe ser coherente con
  `PrivacyInfo.xcprivacy`.
- **No borres la cuenta demo** mientras pruebas "Eliminar cuenta".
- **iOS = sin pagos visibles** (regla 3.1.1): el reviewer entra con la cuenta demo
  premium; no debe ver precios/botones de compra en iOS.
- Si Apple pide algo, responde en **Resolution Center** y re-envía con un build
  nuevo (número mayor) si hubo cambios de código.
