/*  MainViewController.swift — Subclase del bridge de Capacitor para REGISTRAR
    plugins locales del target App.

    En Capacitor 6+ los plugins definidos dentro del proyecto iOS (no como paquete
    npm) YA NO se auto-descubren: hay que registrarlos a mano con
    `bridge?.registerPluginInstance(...)` en `capacitorDidLoad()`. Sin esto,
    `registerPlugin('AlarmKit')` en JS crea el proxy pero la llamada nativa devuelve
    "plugin is not implemented on ios".

    ⚠️ Requisitos para que funcione:
    - Este archivo debe estar en el target "App" (Add Files to "App"…).
    - Main.storyboard debe apuntar su View Controller a `MainViewController`
      (customClass = MainViewController, module = App). Ya editado en el .storyboard.
*/
import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AlarmKitPlugin())
    }
}
