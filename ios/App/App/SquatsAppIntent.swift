/*  SquatsAppIntent.swift — App Intent del botón "HACER SQUATS" de la alarma.

    ⚠️ NUEVO ARCHIVO: agrégalo al target "App" en Xcode (Add Files to "App"… →
    marcar el target App), igual que AlarmKitPlugin/Service/MainViewController.

    Al tocar "HACER SQUATS" en la alerta de AlarmKit:
    - `openAppWhenRun = true` abre la app.
    - `perform()` guarda el alarmId pendiente y avisa (NotificationCenter).
    El plugin (AlarmKitPlugin) escucha ese aviso y emite el evento JS `alarmFired`,
    o lo lee vía `getPending()` en cold start. El JS entonces abre AlarmRing → cámara.
*/
import Foundation

#if canImport(AppIntents)
import AppIntents
#endif

// Puente sin dependencia de AlarmKit (sirve en cualquier iOS): guarda el pending
// y postea una notificación in-proceso para el plugin.
enum AlarmBridge {
    static let pendingKey = "alarmkit.pendingAlarmId"
    static let firedNotification = Notification.Name("BootyAlarmKitFired")

    static func fire(alarmId: String) {
        UserDefaults.standard.set(alarmId, forKey: pendingKey)
        NotificationCenter.default.post(name: firedNotification, object: nil, userInfo: ["alarmId": alarmId])
    }

    // Devuelve y limpia el pending (cold start).
    static func consumePending() -> String? {
        let id = UserDefaults.standard.string(forKey: pendingKey)
        UserDefaults.standard.removeObject(forKey: pendingKey)
        return id
    }
}

@available(iOS 26.0, *)
struct OpenSquatsIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Hacer squats"
    static var openAppWhenRun: Bool = true

    @Parameter(title: "alarmID")
    var alarmID: String

    init() {}
    init(alarmID: String) { self.alarmID = alarmID }

    func perform() async throws -> some IntentResult {
        AlarmBridge.fire(alarmId: alarmID)
        return .result()
    }
}
