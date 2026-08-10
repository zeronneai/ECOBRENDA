/*  AlarmKitPlugin.swift — Puente Capacitor ⇄ AlarmKit (iOS 26).

    Este archivo NO importa AlarmKit: es seguro en cualquier iOS. Toda la lógica
    que toca AlarmKit vive en AlarmKitService.swift, detrás de @available(iOS 26).

    ⚠️ Para que compile debes AÑADIR ESTE ARCHIVO (y AlarmKitService.swift) al
    target "App" en Xcode (Add Files to "App"… → marcar el target App).

    Fase 2 (validación): isSupported / auth / scheduleTest / stop / cancelAll.
    El schedule real (semanal), la alerta con "HACER SQUATS" y el re-armado
    llegan en Fases 3–4.
*/
import Foundation
import Capacitor

@objc(AlarmKitPlugin)
public class AlarmKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AlarmKitPlugin"
    public let jsName = "AlarmKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported",            returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAuthorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleTest",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop",                   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAll",              returnType: CAPPluginReturnPromise),
    ]

    // true solo en iOS 26+: el JS rutea a AlarmKit o al fallback (local-notifications).
    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 26.0, *) {
            call.resolve(["supported": true])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func getAuthorizationStatus(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(["status": "unsupported"]); return }
        Task {
            let status = AlarmKitService.shared.authorizationStatusString()
            call.resolve(["status": status])
        }
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(["status": "unsupported"]); return }
        Task {
            do {
                let status = try await AlarmKitService.shared.requestAuthorization()
                call.resolve(["status": status])
            } catch {
                call.reject("authorization_failed", nil, error)
            }
        }
    }

    // Alarma de PRUEBA: one-shot a `seconds` segundos (default 10), tono del sistema.
    @objc func scheduleTest(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.reject("unsupported"); return }
        let seconds = call.getInt("seconds") ?? 10
        let title = call.getString("title") ?? "¡ARRIBA! Booty Alarm 🍑"
        let stopLabel = call.getString("stopLabel") ?? "Detener"
        Task {
            do {
                let id = try await AlarmKitService.shared.scheduleTest(seconds: seconds, title: title, stopLabel: stopLabel)
                call.resolve(["id": id])
            } catch {
                call.reject("schedule_failed", nil, error)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        guard let id = call.getString("id") else { call.reject("missing_id"); return }
        Task {
            await AlarmKitService.shared.stop(idString: id)
            call.resolve()
        }
    }

    @objc func cancelAll(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        Task {
            await AlarmKitService.shared.cancelAll()
            call.resolve()
        }
    }
}
