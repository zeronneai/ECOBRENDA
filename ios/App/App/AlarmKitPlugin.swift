/*  AlarmKitPlugin.swift — Puente Capacitor ⇄ AlarmKit (iOS 26).

    Este archivo NO importa AlarmKit: es seguro en cualquier iOS. Toda la lógica
    que toca AlarmKit vive en AlarmKitService.swift, detrás de @available(iOS 26).

    ⚠️ Para que compile debe estar añadido al target "App" en Xcode (ya lo está).

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
        CAPPluginMethod(name: "reschedule",             returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "engage",                 returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "complete",               returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending",             returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop",                   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAll",              returnType: CAPPluginReturnPromise),
    ]

    // El App Intent "HACER SQUATS" postea AlarmBridge.firedNotification (in-proceso).
    // Lo reenviamos al WebView como evento `alarmFired`.
    override public func load() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(onAlarmFired(_:)),
            name: AlarmBridge.firedNotification, object: nil)
    }

    @objc private func onAlarmFired(_ note: Notification) {
        if let id = note.userInfo?["alarmId"] as? String {
            notifyListeners("alarmFired", data: ["alarmId": id])
        }
    }

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
        call.resolve(["status": AlarmKitService.shared.authorizationStatusString()])
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

    // Reagenda TODAS las alarmas activas. El JS manda `alarmsJson` (JSON.stringify)
    // para evitar los quirks de arrays tipados de Capacitor.
    @objc func reschedule(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(["ok": false]); return }
        let json = call.getString("alarmsJson") ?? "[]"
        Task {
            do {
                let data = Data(json.utf8)
                let arr = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
                try await AlarmKitService.shared.reschedule(arr)
                call.resolve(["ok": true])
            } catch {
                call.reject("reschedule_failed", nil, error)
            }
        }
    }

    // Silencia el tono que suena al abrir por "HACER SQUATS" (no corta la ráfaga).
    @objc func engage(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        guard let id = call.getString("id") else { call.reject("missing_id"); return }
        AlarmKitService.shared.engage(logicalId: id)
        call.resolve()
    }

    // Squats completados → cancela la ráfaga restante de esta alarma.
    @objc func complete(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        guard let id = call.getString("id") else { call.reject("missing_id"); return }
        AlarmKitService.shared.complete(logicalId: id)
        call.resolve()
    }

    // Cold start: devuelve (y limpia) el alarmId pendiente que dejó el App Intent.
    @objc func getPending(_ call: CAPPluginCall) {
        call.resolve(["alarmId": AlarmBridge.consumePending() as Any])
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        guard let id = call.getString("id") else { call.reject("missing_id"); return }
        AlarmKitService.shared.stop(idString: id)
        call.resolve()
    }

    @objc func cancelAll(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        AlarmKitService.shared.cancelAll()
        call.resolve()
    }
}
