/*  AlarmKitService.swift — Envoltura de AlarmKit (iOS 26), aislada tras
    @available(iOS 26.0, *). Solo la llama AlarmKitPlugin dentro de checks de
    disponibilidad, así la app corre en iOS 15–25 vía fallback.

    ⚠️ WEAK-LINK: AlarmKit debe enlazarse como "Optional" en Xcode.
    SONIDO: sin `sound:` → tono de alarma por defecto (rompe Silencio/Focus).

    Fase 4 — modelo por alarma:
    - PRIMARIO: recurrencia semanal (suena a su hora, app-independiente).
    - RÁFAGA: 10 alarmas .fixed a T+60…T+600 de la PRÓXIMA ocurrencia (re-armado
      pre-programado; funciona con la app cerrada).
    Ambos con el botón "HACER SQUATS" (App Intent → abre la app a la cámara).
    - complete(logicalId): cancela la ráfaga restante (corta el re-armado). El
      primario recurrente se queda.
    - engage(logicalId): silencia el tono que está sonando al abrir por "HACER SQUATS"
      (NO toca la ráfaga → el re-armado se corta solo al COMPLETAR).
*/
import Foundation

#if canImport(AlarmKit)
import AlarmKit
import AppIntents
import SwiftUI
#endif

@available(iOS 26.0, *)
final class AlarmKitService {
    static let shared = AlarmKitService()
    private init() {}

    // Constantes de re-armado (ajustables). 15 × 20s ≈ 5 min de insistencia.
    private let REARM_MAX = 15
    private let REARM_INTERVAL_SEC = 20

    struct BootyAlarmMetadata: AlarmMetadata {}

    private let ownedKey   = "alarmkit.ownedIds"          // [uuidString] de todo lo que programamos
    private let mapKey     = "alarmkit.uuidToLogicalId"   // uuidString → logicalId
    private let primaryKey = "alarmkit.primaryIds"        // [uuidString] que son PRIMARIO (no ráfaga)
    private var defaults: UserDefaults { .standard }

    // MARK: - Autorización

    func authorizationStatusString() -> String {
        switch AlarmManager.shared.authorizationState {
        case .notDetermined: return "notDetermined"
        case .authorized:    return "authorized"
        case .denied:        return "denied"
        @unknown default:    return "unknown"
        }
    }

    func requestAuthorization() async throws -> String {
        let state = try await AlarmManager.shared.requestAuthorization()
        switch state {
        case .authorized: return "authorized"
        case .denied:     return "denied"
        default:          return "notDetermined"
        }
    }

    // MARK: - Alarma de prueba (Fase 2, debug: window.AlarmKitTest.scheduleTest)

    func scheduleTest(seconds: Int, title: String, stopLabel: String) async throws -> String {
        let id = UUID()
        let fireDate = Date().addingTimeInterval(TimeInterval(max(1, seconds)))
        let stopButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: stopLabel),
            textColor: .white, systemImageName: "xmark.circle.fill")
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: stopButton)
        let attributes = AlarmAttributes<BootyAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: BootyAlarmMetadata(),
            tintColor: Color.pink)
        let config = AlarmManager.AlarmConfiguration(schedule: .fixed(fireDate), attributes: attributes)
        _ = try await AlarmManager.shared.schedule(id: id, configuration: config)
        return id.uuidString
    }

    // MARK: - Construcción de la alerta + config (primario y ráfaga comparten esto)

    private func makeConfig(schedule: Alarm.Schedule, title: String, stopLabel: String,
                            squatsLabel: String, logicalId: String)
        -> AlarmManager.AlarmConfiguration<BootyAlarmMetadata> {

        let stopButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: stopLabel),
            textColor: .white, systemImageName: "xmark.circle.fill")
        let squatsButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: squatsLabel),
            textColor: .white, systemImageName: "figure.strengthtraining.functional")

        // ⚠️ CONFIRMAR SDK: Alert(title:stopButton:secondaryButton:secondaryButtonBehavior:)
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: stopButton,
            secondaryButton: squatsButton,
            secondaryButtonBehavior: .custom)

        let attributes = AlarmAttributes<BootyAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: BootyAlarmMetadata(),
            tintColor: Color.pink)

        // ⚠️ CONFIRMAR SDK: init con `schedule:` + `secondaryIntent:` (coexisten).
        return AlarmManager.AlarmConfiguration(
            schedule: schedule,
            attributes: attributes,
            secondaryIntent: OpenSquatsIntent(alarmID: logicalId))
    }

    // MARK: - Reagenda (primario recurrente + ráfaga pre-programada)

    /// `alarms`: [{ id, hour, minute, days:[0..6 Lun..Dom], exercise, reps, title, stopLabel, squatsLabel }]
    func reschedule(_ alarms: [[String: Any]]) async throws {
        cancelAll()
        var owned: [String] = []
        var primaries: [String] = []
        var map: [String: String] = [:]

        for a in alarms {
            guard let logicalId = a["id"] as? String else { continue }
            let hour = a["hour"] as? Int ?? 7
            let minute = a["minute"] as? Int ?? 0
            let days = (a["days"] as? [Int]) ?? [0, 1, 2, 3, 4]
            let title = a["title"] as? String ?? "Booty Alarm"
            let stopLabel = a["stopLabel"] as? String ?? "Detener"
            let squatsLabel = a["squatsLabel"] as? String ?? "HACER SQUATS"

            // 1) PRIMARIO: recurrencia semanal.
            let time = Alarm.Schedule.Relative.Time(hour: hour, minute: minute)
            let weekdays = days.map { weekday(fromDow: $0) }
            let recurrence = Alarm.Schedule.Relative.Recurrence.weekly(weekdays)
            let primarySchedule = Alarm.Schedule.relative(.init(time: time, repeats: recurrence))
            let primaryConfig = makeConfig(schedule: primarySchedule, title: title,
                                           stopLabel: stopLabel, squatsLabel: squatsLabel, logicalId: logicalId)
            let primaryId = UUID()
            _ = try await AlarmManager.shared.schedule(id: primaryId, configuration: primaryConfig)
            owned.append(primaryId.uuidString); primaries.append(primaryId.uuidString)
            map[primaryId.uuidString] = logicalId

            // 2) RÁFAGA: 15 .fixed a T+20…T+300 de la PRÓXIMA ocurrencia.
            let base = nextOccurrence(hour: hour, minute: minute, days: days)
            print("[AlarmKit] alarma \(logicalId): primario ~\(hour):\(minute), base ráfaga = \(base)")
            for i in 1...REARM_MAX {
                let fireDate = base.addingTimeInterval(TimeInterval(i * REARM_INTERVAL_SEC))
                let cfg = makeConfig(schedule: .fixed(fireDate), title: title,
                                     stopLabel: stopLabel, squatsLabel: squatsLabel, logicalId: logicalId)
                let rid = UUID()
                _ = try await AlarmManager.shared.schedule(id: rid, configuration: cfg)
                owned.append(rid.uuidString)
                map[rid.uuidString] = logicalId
                if i == 1 || i == REARM_MAX { print("[AlarmKit]   ráfaga \(i) → \(fireDate)") }
            }
        }

        defaults.set(owned, forKey: ownedKey)
        defaults.set(primaries, forKey: primaryKey)
        defaults.set(map, forKey: mapKey)
    }

    // MARK: - Runtime (squats)

    /// Silencia el tono que está SONANDO para este logicalId (al abrir por "HACER SQUATS").
    /// NO toca las alarmas .fixed futuras (la ráfaga) ni la recurrencia → el re-armado
    /// se corta solo al COMPLETAR.
    /// ⚠️ CONFIRMAR SDK: obtención de alarmas + estado. Si `alarms` es async, añade `await`;
    /// si el chequeo de estado difiere, ajusta el filtro. Es el punto más probable de ajuste.
    func engage(logicalId: String) {
        let map = defaults.dictionary(forKey: mapKey) as? [String: String] ?? [:]
        let mine = Set(map.filter { $0.value == logicalId }.map { $0.key })
        // `alarms` es un getter throwing en iOS 26 → try?.
        let current = (try? AlarmManager.shared.alarms) ?? []
        for alarm in current where mine.contains(alarm.id.uuidString) {
            // Solo el que está alertando (no los .fixed pendientes).
            if String(describing: alarm.state).lowercased().contains("alert") {
                try? AlarmManager.shared.stop(id: alarm.id)
            }
        }
    }

    /// Squats completados → cancela la ráfaga restante de este logicalId. El primario recurrente se queda.
    func complete(logicalId: String) {
        let map = defaults.dictionary(forKey: mapKey) as? [String: String] ?? [:]
        let primaries = Set(defaults.stringArray(forKey: primaryKey) ?? [])
        var owned = defaults.stringArray(forKey: ownedKey) ?? []
        for (uuidStr, lid) in map where lid == logicalId && !primaries.contains(uuidStr) {
            if let uuid = UUID(uuidString: uuidStr) { try? AlarmManager.shared.cancel(id: uuid) }
            owned.removeAll { $0 == uuidStr }
        }
        defaults.set(owned, forKey: ownedKey)
    }

    // MARK: - Debug (window.AlarmKitTest.list)

    /// Lista las alarmas que AlarmKit tiene programadas ahora mismo (id + estado).
    func debugList() -> [[String: String]] {
        let current = (try? AlarmManager.shared.alarms) ?? []
        return current.map { ["id": $0.id.uuidString, "state": String(describing: $0.state)] }
    }

    /// Cuántas alarmas creímos programar (las guardadas en UserDefaults).
    func ownedCount() -> Int { (defaults.stringArray(forKey: ownedKey) ?? []).count }

    // MARK: - Control

    func stop(idString: String) {
        guard let uuid = UUID(uuidString: idString) else { return }
        try? AlarmManager.shared.stop(id: uuid)
    }

    /// Cancela TODAS las alarmas de nuestra app (barre zombies de pruebas/reschedules
    /// viejos). `AlarmManager.shared.alarms` solo lista las de esta app, así que es
    /// seguro. Esto libera el cupo (AlarmKit ~64 alarmas por app) para que la ráfaga
    /// nueva SÍ se programe.
    func cancelAll() {
        let current = (try? AlarmManager.shared.alarms) ?? []
        for alarm in current { try? AlarmManager.shared.cancel(id: alarm.id) }
        print("[AlarmKit] cancelAll → canceladas \(current.count) alarmas (barrido total)")
        defaults.set([String](), forKey: ownedKey)
        defaults.set([String](), forKey: primaryKey)
        defaults.set([String: String](), forKey: mapKey)
    }

    // MARK: - Helpers

    // 0=Lun … 6=Dom → Locale.Weekday
    private func weekday(fromDow dow: Int) -> Locale.Weekday {
        switch dow {
        case 0: return .monday
        case 1: return .tuesday
        case 2: return .wednesday
        case 3: return .thursday
        case 4: return .friday
        case 5: return .saturday
        default: return .sunday
        }
    }

    // Próxima fecha futura que cae en `days` (0=Lun..6=Dom) a hour:minute.
    private func nextOccurrence(hour: Int, minute: Int, days: [Int]) -> Date {
        let cal = Calendar.current
        let now = Date()
        for offset in 0...7 {
            guard let day = cal.date(byAdding: .day, value: offset, to: now) else { continue }
            var comps = cal.dateComponents([.year, .month, .day], from: day)
            comps.hour = hour; comps.minute = minute; comps.second = 0
            guard let candidate = cal.date(from: comps), candidate > now else { continue }
            // Calendar weekday: 1=Dom..7=Sáb → dow 0=Lun..6=Dom.
            let dow = (cal.component(.weekday, from: candidate) + 5) % 7
            if days.contains(dow) { return candidate }
        }
        return now.addingTimeInterval(60)
    }
}
