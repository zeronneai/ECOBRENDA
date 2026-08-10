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

        try await AlarmManager.shared.schedule(id: id, configuration: config)
        return id.uuidString
    }

    // MARK: - Control

    func stop(idString: String) {
        guard let uuid = UUID(uuidString: idString) else { return }
        AlarmManager.shared.stop(id: uuid)   // síncrono en iOS 26
    }

    func cancelAll() {
        // En la fase de prueba basta con stop(id) del id devuelto por scheduleTest.
        // El barrido completo (enumerar AlarmManager.shared.alarms + cancel(id:)) llega en Fase 3.
    }
}
