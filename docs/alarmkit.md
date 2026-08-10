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
✅ **Soportado** — archivo del bundle (o `Library/Sounds`):
```swift
let sound = AlertConfiguration.AlertSound.named("alarm")   // reutilizamos el sonido ya empaquetado
```
La **canción elegida** sigue sonando in-app (Web Audio) al abrir la cámara; AlarmKit
aporta el sonido que rompe el Silencio/Focus.

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
REARM_MAX = 10           // máx re-armados (~10 min de persistencia)
REARM_INTERVAL_SEC = 60  // intervalo entre re-armados
```
Off duro (desactivar la alarma) o completar squats → cancela la cadena al instante.
Nota App Review: comportamiento acotado (≈snooze múltiple) + control del usuario; se
explica en las notas de la build.

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
- [x] **Fase 0** — API confirmada (arriba). Dudas #1 (recurrencia) y #2 (sonido) y #3
      (secondaryButtonBehavior) resueltas ✅. Pendiente confirmar en device: Widget
      Extension para alert-only y nombre de `alarmUpdates`.
- [x] **Fase 1** — `NSAlarmKitUsageDescription` en Info.plist; deployment target 15.0
      (sin cambio); baseline web verde. Sin código AlarmKit todavía.
- [ ] **Fase 2** — Plugin Swift (auth + schedule de prueba) + **hito: alarma que rompe Silencio**.
- [ ] **Fase 3** — schedule/cancel/reschedule (one-time + semanal).
- [ ] **Fase 4** — alerta + `OpenSquatsIntent` + re-armado.
- [ ] **Fase 5** — dispatcher JS + fallback.
- [ ] **Fase 6** — QA device + notas App Review.
