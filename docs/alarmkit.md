# AlarmKit (iOS 26) — integración de alarma que rompe Silencio/Focus

Branch: `feature/alarmkit` (desde producción con i18n). Objetivo: que la alarma de
iOS suene de verdad a través de Modo Silencio y Concentración/No molestar, como el
Reloj de Apple, manteniendo el diferenciador **"no se apaga hasta hacer squats"**.

Estrategia de compatibilidad: **weak-link + `#available(iOS 26, *)` + fallback**.
La app sigue instalándose en iOS 15+; en iOS 26 usa AlarmKit, por debajo usa el
método actual (`@capacitor/local-notifications`). **No** se sube el deployment
target a 26.

---

## Fase 0 — API confirmada (WWDC25 "Wake up to the AlarmKit API", sesión 230)

Framework `AlarmKit`, **mínimo iOS 26**. Solo se usa detrás de `#available(iOS 26, *)`.

### Autorización
```swift
import AlarmKit
switch AlarmManager.shared.authorizationState {   // .notDetermined | .authorized | .denied
  case .notDetermined: _ = try await AlarmManager.shared.requestAuthorization()
  case .authorized:    break
  case .denied:        break
}
```
Requiere `NSAlarmKitUsageDescription` en Info.plist. ✅ (añadida en Fase 1).

### Programar
```swift
try await AlarmManager.shared.schedule(id: uuid, configuration: config)
```
- El `id` va en `schedule(id:configuration:)` (UUID estable por alarma lógica).
- Lifecycle: `AlarmManager.shared.stop(id:)`, `.cancel(id:)`, `.pause/.resume(id:)`.

### Schedule (resuelve DUDA #1 — recurrencia semanal)
✅ **Multi-día en UNA sola alarma** — no hace falta 1-por-día como hoy:
```swift
// One-time:
let s1 = Alarm.Schedule.fixed(date)
// Semanal repetida (varios weekdays):
let time = Alarm.Schedule.Relative.Time(hour: 7, minute: 0)
let rec  = Alarm.Schedule.Relative.Recurrence.weekly([.monday, .wednesday, .friday])
let s2   = Alarm.Schedule.relative(.init(time: time, repeats: rec))
```

### Alerta + botones (resuelve DUDA #3 — secondaryButtonBehavior)
```swift
let stop = AlarmButton(text: "Detener",       textColor: .white, systemImageName: "xmark")
let go   = AlarmButton(text: "HACER SQUATS 🍑", textColor: .white, systemImageName: "figure.strengthtraining.functional")
let alert = AlarmPresentation.Alert(title: "¡ARRIBA! 15 squats",
                                    stopButton: stop,
                                    secondaryButton: go,
                                    secondaryButtonBehavior: .custom)  // .countdown | .custom
```
- `.custom` ejecuta un App Intent → **abrimos la app a la cámara**.

### App Intent (el puente a los squats)
```swift
struct OpenSquatsIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Hacer squats"
  static var openAppWhenRun = true                    // abre la app al tocar el botón
  @Parameter(title: "alarmID") var alarmID: String
  func perform() async throws -> some IntentResult { /* notify WebView */ .result() }
}
// Se adjunta a la config:
let config = AlarmManager.AlarmConfiguration(schedule: s2, attributes: attrs,
                                             secondaryIntent: OpenSquatsIntent(alarmID: id),
                                             sound: sound)
```

### Sonido (resuelve DUDA #2 — sonido custom)
La API soporta sonido custom del bundle, PERO en **iOS 26.0 estable el sonido custom
de AlarmKit está ROTO** (bug de Apple, varios Feedback abiertos): se ignora y suena el
default. Decisión Fase 2: **NO pasar el parámetro `sound`** → AlarmKit usa su tono de
alarma por defecto (justo el que rompe Silencio/Focus). Esto además evita depender del
nombre exacto del tipo de sonido (que en el SDK real NO es `AlertConfiguration.AlertSound`
como decía el resumen de WWDC — ese tipo no existe con ese nombre y rompía la compilación).
```swift
// Fase 2: omitimos `sound` → tono del sistema (rompe Silencio/Focus).
let config = AlarmManager.AlarmConfiguration(schedule: .fixed(fireDate), attributes: attributes)
// Cuando Apple arregle el custom (iOS 26.x): añadir `sound: <TipoDelSDK>.named("alarm")`.
```
La **canción elegida** NO va en AlarmKit: suena **in-app (Web Audio)** al abrir la
cámara. AlarmKit solo aporta el tono del sistema que despierta rompiendo Silencio/Focus.

**Arranque de la canción in-app (garantizado):** el botón "HACER SQUATS" abre la app a
AlarmRing; el tap de **"A DARLE 💪"** dentro del WebView es el gesto que iOS exige para
desbloquear Web Audio → ahí arrancan canción + cámara (patrón `unlockPreview` +
`AVAudioSession .playback` que ya existe). Validar en device (Fase 2/4).

### Atributos
```swift
let attrs = AlarmAttributes<BootyAlarmMetadata>(presentation: .init(alert: alert), tintColor: .pink)
```

### ⚠️ Hallazgo nuevo con implicación de build: Widget Extension
La sesión indica que una **Live Activity (Widget Extension)** es necesaria **solo para
el modo COUNTDOWN** (timers). Nuestra alarma es **alert-only** (sin cuenta regresiva),
así que **en principio NO requiere Widget Extension**. **A confirmar en device (Fase 2):**
si la alerta alert-only se presenta sin extensión. Si resultara necesaria, se añade un
target Widget Extension al proyecto (implicación de build).

### Observación de estado (re-armado)
`AlarmManager.shared.alarmUpdates` (async sequence) para detectar stop/dismiss y
disparar la cadena de re-armado. *(Confirmar nombre exacto al implementar Fase 2.)*

---

## Mecánica "no se apaga hasta squats" (compatible con Apple)
Apple obliga a un botón **Detener** (no existe alarma indestructible). Se logra con:
1. AlarmKit rompe Silencio/Focus y muestra **"HACER SQUATS"** (`.custom` → abre la app a la cámara).
2. Si le dan **Detener** sin completar → observamos vía `alarmUpdates` y **re-armamos** en
   60s, hasta un **tope**. Solo completar los squats corta la cadena.

Constantes (fáciles de tunear):
```
REARM_MAX = 15           // máx re-armados
REARM_INTERVAL_SEC = 20  // intervalo entre re-armados → 15 × 20s ≈ 5 min de insistencia
```
Off duro (desactivar la alarma) o completar squats → cancela la cadena al instante.
Nota App Review: comportamiento acotado (≈snooze múltiple) + control del usuario; se
explica en las notas de la build.

**Matiz Fase 4 — re-armado llaveado a COMPLETAR, no al stop:** al abrir por el botón
`.custom` hay que **silenciar el tono de AlarmKit** (`stop(id)`) para que no se encime
con la canción in-app. Ese stop NO debe disparar re-armado. Por eso la cadena se decide
por "¿se completó el workout?", no por el evento de stop: al abrir se marca **engaged**;
solo se re-arma si abandonan sin completar (app al fondo + timeout). Completar → cancela.

---

## Reparto Nativo (Swift) / JS
- **Swift (plugin `AlarmKit`):** auth, schedule/cancel/stop, presentación + botones,
  `OpenSquatsIntent`, observer `alarmUpdates` + re-armado, pending (cold start).
- **JS (`nativeAlarm.js` dispatcher + `iosAlarm.js`):** rutea iOS26+auth→AlarmKit,
  si no→local-notifications; mapea nuestro modelo → `AlarmInput` con **textos ya
  localizados (i18n)**; listener `alarmFired` → AlarmRing/cámara; `stop(completed)`.

Interfaz JS del plugin (aprobada): `isSupported`, `getAuthorizationStatus`,
`requestAuthorization`, `reschedule`, `cancel`, `cancelAll`, `stop`, `getPending`,
`setRearmPolicy` + eventos `alarmFired` / `alarmStopped` / `authorizationChanged`.

---

## Build / target
- **Deployment target: se mantiene en 15.0** (AlarmKit va gated con `#available(iOS 26)`;
  ningún API obliga a subirlo — mantenerlo bajo = cero usuarios perdidos).
- Requiere **Xcode 26 + iOS 26 SDK** para compilar (máquina de build).
- Weak-link de `AlarmKit.framework` (Optional) al añadir `import AlarmKit` (Fase 2).
- Pruebas de "rompe Silencio/Focus": **solo en iPhone real con iOS 26**.

### Usage string ES/EN (Info.plist)
Hoy la app muestra los permisos solo en español (patrón actual). `NSAlarmKitUsageDescription`
se añadió en español. Para prompts ES/EN reales hace falta localizar el Info.plist
(`InfoPlist.strings` en `en.lproj`/`es.lproj` + regiones en el proyecto Xcode), idealmente
cubriendo también cámara/fotos. Tarea pequeña aparte (requiere Xcode). Texto EN sugerido:
> "Booty Alarm uses system alarms to really wake you up: they ring even when your iPhone is silenced or in a Focus, and won't stop until you finish your reps."

---

## Estado de fases
- [x] **Fase 0** — API confirmada (arriba). Dudas resueltas: #1 recurrencia semanal ✅,
      #2 sonido → **`.default` por bug de custom en iOS 26.0** (flag listo para custom) ✅,
      #3 secondaryButtonBehavior ✅. Pendiente confirmar en device: Widget Extension para
      alert-only y nombre exacto de `alarmUpdates`.
- [x] **Fase 1** — `NSAlarmKitUsageDescription` en Info.plist; deployment target 15.0
      (sin cambio); baseline web verde. Sin código AlarmKit todavía.
- [x] **Fase 2 (código)** — Plugin Swift redactado (`ios/App/App/AlarmKitPlugin.swift`,
      `AlarmKitService.swift`) + hook JS (`src/lib/alarmKitTest.js`, `window.AlarmKitTest`).
      ⚠️ Escrito contra la API de WWDC25, NO contra headers del SDK → esperar 1–3 ajustes
      de firma al compilar en Xcode 26 (marcados `⚠️ CONFIRMAR SDK`). **Pendiente: compilar
      + HITO en device (¿rompe Silencio/Focus?).**

### ⚠️ Registro del plugin (Capacitor 6+)
Los plugins locales del target App **no se auto-descubren** en Capacitor 6+. Hay que
registrarlos con `bridge?.registerPluginInstance(...)` en `capacitorDidLoad()` de una
subclase de `CAPBridgeViewController`. Implementado en `MainViewController.swift` +
`Main.storyboard` apuntando su VC a `MainViewController` (module `App`). Sin esto, el
JS da "plugin is not implemented on ios". `MainViewController.swift` debe estar en el
target App.

### Fase 2 — pasos para compilar y probar (device iPhone iOS 26)
1. `git pull` de `feature/alarmkit`; `npx cap sync ios`.
2. En **Xcode 26**, añadir los 2 `.swift` al target **App**: click derecho en el grupo
   `App` → *Add Files to "App"…* → seleccionar `AlarmKitPlugin.swift` y
   `AlarmKitService.swift` → marcar el target **App**. (Si ya aparecen en el target, saltar.)
3. **Weak-link**: Target App → General → *Frameworks, Libraries, and Embedded Content* →
   `+` → **AlarmKit.framework** → ponerlo en **Optional** (imprescindible con target iOS 15).
4. Compilar. Si hay errores de firma, corregir los puntos `⚠️ CONFIRMAR SDK` con el
   autocompletado (son de AlarmKit, framework nuevo). Mandarme el error si algo no cuadra.
5. Correr en el **iPhone real (iOS 26)**. Con el iPhone conectado al Mac:
   Safari → Desarrollo → [iPhone] → [app] → Consola:
   ```js
   await window.AlarmKitTest.isSupported()          // { supported: true }
   await window.AlarmKitTest.requestAuthorization()  // aceptar el permiso
   await window.AlarmKitTest.scheduleTest(10)        // suena en 10s
   ```
6. **Escenarios a probar** (dispara scheduleTest(10) y en <10s):
   Silencio ON (switch lateral) · un Focus/No molestar activo · pantalla bloqueada ·
   app cerrada (swipe up para matarla).
7. **Qué observar:** ¿suena el tono de alarma? ¿rompe Silencio y Focus? ¿aparece la
   alerta **grande a pantalla completa** en el lock screen (estilo Reloj) + Dynamic Island?
   ¿el botón **Detener** la silencia? — Si algo NO aparece alert-only sin countdown,
   probablemente pida **Widget Extension** (target extra en Xcode; te aviso).
- [x] **Fase 3 (código)** — scheduling real conectado al flujo de la app:
      - Swift: `reschedule([alarms])` (ring primario con recurrencia semanal
        `Alarm.Schedule.Relative.Recurrence.weekly`), `cancelAll` real (owned ids en
        UserDefaults), mapeo día 0=Lun..6=Dom → `Locale.Weekday`. Plugin: método
        `reschedule` (recibe `alarmsJson`). ⚠️ `Locale.Weekday`, `.weekly(_:)` y
        `cancel(id:)` marcados CONFIRMAR SDK.
      - JS: `src/lib/iosAlarm.js` (binding + dispatcher `rescheduleAppleAlarms`:
        AlarmKit si iOS26+autorizado, si no fallback a `rescheduleNativeAlarms`).
        `nativeAlarm.cancelLocalPending` para no duplicar al cambiar de modo.
      - AppContext: dispatcher en los 2 sitios de reagenda; permiso AlarmKit pedido
        en `primePermissions` (priming). PermissionsPriming: fila "Alarma imparable"
        en iOS 26. i18n: `notif.alarm_title`, `perms.alarmkit_t/_d` (es/en, paridad 476).
      - Fase 3 = solo botón Detener (sin "HACER SQUATS" ni re-armado → Fase 4).
      **Pendiente: compilar + HITO en device.**

#### Fase 3 — pasos para compilar y probar (device iPhone iOS 26)
1. `git pull origin feature/alarmkit` → `npx cap sync ios`.
2. Xcode: **⌘B**. Corregir cualquier `⚠️ CONFIRMAR SDK` nuevo (weekday/recurrence/cancel)
   con el autocompletado; si algo no cuadra, mandar el error.
3. Correr en el iPhone (iOS 26). Si es la primera vez, pasar el priming y **aceptar
   el permiso de "Alarma imparable"** (AlarmKit). Si ya lo pasaste, borrar y reinstalar
   la app para volver a ver el priming, o aceptar el permiso cuando lo pida.
4. En la app, **crear/activar una alarma** 1–2 min en el futuro, en ciertos días.
5. **Hito Fase 3:** a esa hora suena vía AlarmKit (tono del sistema), **rompe Silencio/
   Focus**, aparece grande; en los días correctos. Solo botón **Detener** (aún sin squats).
6. **Fallback:** en un iPhone con iOS < 26 (o denegando el permiso), la alarma sigue
   funcionando por local-notifications igual que antes (sin romper silencio).
- [x] **Fase 4 (código)** — botón "HACER SQUATS" + re-armado pre-programado:
      - 🆕 `SquatsAppIntent.swift` (**agregar al target App**): `OpenSquatsIntent`
        (`LiveActivityIntent`, `openAppWhenRun`) + `AlarmBridge` (pending + NotificationCenter).
      - `AlarmKitService`: alerta con `secondaryButton` "HACER SQUATS" + `secondaryIntent`;
        `reschedule` ahora programa PRIMARIO (recurrente) + RÁFAGA (10 `.fixed` a
        T+60…T+600 de la próxima ocurrencia); `engage(logicalId)` (silencia el que suena),
        `complete(logicalId)` (cancela la ráfaga), `nextOccurrence`. Consts REARM_MAX=10,
        REARM_INTERVAL_SEC=60. ⚠️ CONFIRMAR SDK en: Alert con secondary, `secondaryIntent:`,
        y **`engage` (lectura de `AlarmManager.shared.alarms` + estado)** ← el más probable de ajustar.
      - `AlarmKitPlugin`: métodos `engage`/`complete`/`getPending`; `load()` observa
        `AlarmBridge.firedNotification` → emite evento `alarmFired`.
      - JS: `iosAlarm` (`engageAlarmKit`/`completeAlarmKit`/`getPendingAlarmKit`/`onAlarmFired`,
        `squatsLabel` en el payload); `AppContext` (listener `alarmFired` → engage+trigger,
        `getPending` cold start, `complete` en `completeWakeWorkout`, refresh de ráfaga en `resume`).
      - i18n: `notif.squats_btn` (es/en, paridad 477). Build web verde.
      **Pendiente: compilar + HITO en device.**

#### Fase 4 — pasos para compilar y probar (device iPhone iOS 26)
1. `git pull origin feature/alarmkit` → `npx cap sync ios`.
2. Xcode: **agregar `SquatsAppIntent.swift` al target App** (Add Files to "App"… → marcar App).
   Luego **⌘B**. Corregir `⚠️ CONFIRMAR SDK` si aparecen (sobre todo `engage`); mandar el error.
3. Correr en iPhone iOS 26 (permiso AlarmKit concedido). Crear/activar una alarma 1–2 min futuro.
4. **HITO Fase 4 — validar:**
   - Suena → **Detener** sin squats → **vuelve a sonar en ~20s** (hasta 15×, ≈5 min). ✅
   - Tocar **"HACER SQUATS"** → **abre la app a la cámara**. ✅
     (Si abre pero la cámara NO arranca → el App Intent corre fuera de proceso → añadimos
     **App Group** en Xcode; avisar.)
   - Hacer squats → **se apaga y se corta la ráfaga** (no vuelve a sonar). ✅
   - Desactivar la alarma (**off duro**) → **se cancela todo**. ✅
   - Al abrir por squats, ¿el tono de AlarmKit **se silencia**? (si no, ajustamos `engage`).
- [ ] **Fase 5** — dispatcher JS + fallback.
- [ ] **Fase 6** — QA device + notas App Review.
