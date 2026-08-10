/*  AlarmKitService.swift — Envoltura de AlarmKit (iOS 26), aislada tras
    @available(iOS 26.0, *). Solo la llama AlarmKitPlugin dentro de checks de
    disponibilidad, así la app corre en iOS 15–25 vía fallback.

    ⚠️ WEAK-LINK: AlarmKit debe enlazarse como "Optional" en Xcode
    (Target App → General → Frameworks, Libraries → AlarmKit.framework → Optional),
    porque el deployment target es iOS 15 y el framework solo existe en iOS 26+.

    SONIDO (Fase 2): NO pasamos `sound` → AlarmKit usa su tono de alarma por
    defecto, que es justo el que ROMPE Silencio/Focus. (Los sonidos custom de
    AlarmKit están rotos en iOS 26.0; cuando Apple lo arregle añadimos el parámetro
    `sound:` con el tipo correcto del SDK — ver nota en scheduleTest.)
*/
import Foundation

#if canImport(AlarmKit)
import AlarmKit
import AppIntents
import SwiftUI   // Color (tintColor)
#endif

@available(iOS 26.0, *)
final class AlarmKitService {
    static let shared = AlarmKitService()
    private init() {}

    // Metadata que viaja con la alarma. En Fase 2 va vacía; en Fase 3/4 llevará
    // logicalId, exercise, reps, rearmCount, completed.
    struct BootyAlarmMetadata: AlarmMetadata {}

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

    // MARK: - Alarma de prueba (Fase 2)

    /// One-shot a `seconds` segundos, tono de alarma del sistema (por defecto),
    /// con botón Detener. Objetivo del hito: validar que suena y ROMPE Silencio/Focus.
    func scheduleTest(seconds: Int, title: String, stopLabel: String) async throws -> String {
        let id = UUID()
        let fireDate = Date().addingTimeInterval(TimeInterval(max(1, seconds)))

        let stopButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: stopLabel),
            textColor: .white,
            systemImageName: "xmark.circle.fill"
        )

        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: stopButton
        )

        let attributes = AlarmAttributes<BootyAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: BootyAlarmMetadata(),
            tintColor: Color.pink
        )

        // Sin `sound:` → tono de alarma por defecto (rompe Silencio/Focus).
        // Para sonido custom más adelante (cuando Apple arregle iOS 26.0):
        //   añadir `sound: <AlarmSoundType>.named("alarm")` al init de abajo, con el
        //   tipo exacto que exponga el SDK.
        let config = AlarmManager.AlarmConfiguration(
            schedule: .fixed(fireDate),
            attributes: attributes
        )

        _ = try await AlarmManager.shared.schedule(id: id, configuration: config)
        return id.uuidString
    }

    // MARK: - Scheduling real (Fase 3)

    private let ownedKey = "alarmkit.ownedIds"          // [uuidString] de las alarmas que programamos
    private let mapKey   = "alarmkit.uuidToLogicalId"   // uuidString → logicalId (para routing en Fase 4)
    private var defaults: UserDefaults { .standard }

    /// Reagenda TODAS las alarmas activas (cancela lo previo y reescribe).
    /// Fase 3: solo el ring PRIMARIO con recurrencia semanal + botón Detener.
    /// (El botón "HACER SQUATS" y la ráfaga de re-armado llegan en Fase 4.)
    /// `alarms`: [{ id, hour, minute, days:[0..6 Lun..Dom], exercise, reps, title, stopLabel }]
    func reschedule(_ alarms: [[String: Any]]) async throws {
        cancelAll()
        var owned: [String] = []
        var map: [String: String] = [:]

        for a in alarms {
            guard let logicalId = a["id"] as? String else { continue }
            let hour = a["hour"] as? Int ?? 7
            let minute = a["minute"] as? Int ?? 0
            let days = (a["days"] as? [Int]) ?? [0, 1, 2, 3, 4]
            let title = a["title"] as? String ?? "Booty Alarm"
            let stopLabel = a["stopLabel"] as? String ?? "Detener"

            let stopButton = AlarmButton(
                text: LocalizedStringResource(stringLiteral: stopLabel),
                textColor: .white,
                systemImageName: "xmark.circle.fill"
            )
            let alert = AlarmPresentation.Alert(
                title: LocalizedStringResource(stringLiteral: title),
                stopButton: stopButton
            )
            let attributes = AlarmAttributes<BootyAlarmMetadata>(
                presentation: AlarmPresentation(alert: alert),
                metadata: BootyAlarmMetadata(),
                tintColor: Color.pink
            )

            // ⚠️ CONFIRMAR SDK: Alarm.Schedule.Relative.Time / .Recurrence.weekly([Locale.Weekday]).
            let time = Alarm.Schedule.Relative.Time(hour: hour, minute: minute)
            let weekdays = days.map { weekday(fromDow: $0) }
            let recurrence = Alarm.Schedule.Relative.Recurrence.weekly(weekdays)
            let schedule = Alarm.Schedule.relative(.init(time: time, repeats: recurrence))

            let config = AlarmManager.AlarmConfiguration(schedule: schedule, attributes: attributes)

            let id = UUID()
            _ = try await AlarmManager.shared.schedule(id: id, configuration: config)
            owned.append(id.uuidString)
            map[id.uuidString] = logicalId
        }

        defaults.set(owned, forKey: ownedKey)
        defaults.set(map, forKey: mapKey)
    }

    // MARK: - Control

    func stop(idString: String) {
        guard let uuid = UUID(uuidString: idString) else { return }
        try? AlarmManager.shared.stop(id: uuid)   // síncrono pero throwing en iOS 26
    }

    /// Cancela todas las alarmas que programamos nosotros (las "owned").
    func cancelAll() {
        let owned = defaults.stringArray(forKey: ownedKey) ?? []
        for s in owned {
            if let uuid = UUID(uuidString: s) {
                // ⚠️ CONFIRMAR SDK: cancel(id:) — síncrono throwing (como stop).
                try? AlarmManager.shared.cancel(id: uuid)
            }
        }
        defaults.set([String](), forKey: ownedKey)
        defaults.set([String: String](), forKey: mapKey)
    }

    // 0=Lun … 6=Dom  →  Locale.Weekday
    // ⚠️ CONFIRMAR SDK: tipo exacto que espera Recurrence.weekly (Locale.Weekday).
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
}
