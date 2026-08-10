/*  AlarmKitService.swift — Envoltura de AlarmKit (iOS 26), aislada tras
    @available(iOS 26.0, *). Solo la llama AlarmKitPlugin dentro de checks de
    disponibilidad, así la app corre en iOS 15–25 vía fallback.

    ⚠️⚠️ IMPORTANTE — AlarmKit es un framework NUEVO (iOS 26 / WWDC25). Este código
    está escrito contra la API mostrada en la sesión WWDC25 230, NO contra los
    headers reales del SDK. Es MUY probable que 1–3 firmas necesiten un ajuste
    menor al compilar en Xcode 26. Cada punto dudoso está marcado con
    "⚠️ CONFIRMAR SDK". Usa el autocompletado de Xcode para fijar la firma exacta.

    ⚠️ WEAK-LINK: AlarmKit debe enlazarse como "Optional" en Xcode
    (Target App → General → Frameworks, Libraries → AlarmKit.framework → Optional),
    porque el deployment target es iOS 15 y el framework solo existe en iOS 26+.
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
    // ⚠️ CONFIRMAR SDK: requisitos del protocolo AlarmMetadata (probablemente
    // Codable & Sendable, sintetizables para un struct vacío).
    struct BootyAlarmMetadata: AlarmMetadata {}

    // MARK: - Autorización

    func authorizationStatusString() -> String {
        // ⚠️ CONFIRMAR SDK: nombre exacto de la propiedad (authorizationState) y casos.
        switch AlarmManager.shared.authorizationState {
        case .notDetermined: return "notDetermined"
        case .authorized:    return "authorized"
        case .denied:        return "denied"
        @unknown default:    return "unknown"
        }
    }

    func requestAuthorization() async throws -> String {
        // ⚠️ CONFIRMAR SDK: requestAuthorization() devuelve el AuthorizationState.
        let state = try await AlarmManager.shared.requestAuthorization()
        switch state {
        case .authorized: return "authorized"
        case .denied:     return "denied"
        default:          return "notDetermined"
        }
    }

    // MARK: - Alarma de prueba (Fase 2)

    /// One-shot a `seconds` segundos, tono del sistema (.default), con botón Detener.
    /// Objetivo del hito: validar que suena y ROMPE Silencio/Focus.
    func scheduleTest(seconds: Int, title: String, stopLabel: String) async throws -> String {
        let id = UUID()
        let fireDate = Date().addingTimeInterval(TimeInterval(max(1, seconds)))

        // ⚠️ CONFIRMAR SDK: AlarmButton(text:textColor:systemImageName:). `text`
        // podría ser String o LocalizedStringResource (ExpressibleByStringLiteral).
        let stopButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: stopLabel),
            textColor: .white,
            systemImageName: "xmark.circle.fill"
        )

        // ⚠️ CONFIRMAR SDK: AlarmPresentation.Alert(title:stopButton:) — con secondary
        // opcional. En Fase 2 solo Detener (validamos sonido, no el flujo de squats).
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: stopButton
        )

        // ⚠️ CONFIRMAR SDK: AlarmAttributes<Metadata>(presentation:metadata:tintColor:).
        let attributes = AlarmAttributes<BootyAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: BootyAlarmMetadata(),
            tintColor: Color.pink
        )

        // iOS 26.0: sonidos custom de AlarmKit ROTOS (bug de Apple) → usamos .default.
        // Poner true cuando Apple lo arregle para usar el sonido "alarm" del bundle.
        let USE_CUSTOM_ALARM_SOUND = false
        // ⚠️ CONFIRMAR SDK: AlertConfiguration.AlertSound (.default / .named("alarm")).
        let sound: AlertConfiguration.AlertSound = USE_CUSTOM_ALARM_SOUND ? .named("alarm") : .default

        // ⚠️ CONFIRMAR SDK: init de AlarmConfiguration para ALARMA (schedule:) con sound.
        // La sesión mostró AlarmConfiguration(schedule:attributes:) y variantes con
        // countdownDuration/secondaryIntent/sound. Para alarma alert-only usamos schedule.
        let config = AlarmManager.AlarmConfiguration(
            schedule: .fixed(fireDate),
            attributes: attributes,
            sound: sound
        )

        // ⚠️ CONFIRMAR SDK: schedule(id:configuration:) — id es UUID.
        try await AlarmManager.shared.schedule(id: id, configuration: config)
        return id.uuidString
    }

    // MARK: - Control

    func stop(idString: String) async {
        guard let uuid = UUID(uuidString: idString) else { return }
        // ⚠️ CONFIRMAR SDK: stop(id:) — puede ser sync o async, throwing o no.
        try? await AlarmManager.shared.stop(id: uuid)
    }

    func cancelAll() async {
        // ⚠️ CONFIRMAR SDK: enumerar alarmas (AlarmManager.shared.alarms) y cancel(id:).
        // En la fase de prueba basta con stop(id) del id devuelto por scheduleTest.
        // Placeholder seguro: intentar cancelar lo que haya vía la lista si existe.
        // (Se completa en Fase 3.)
    }
}
