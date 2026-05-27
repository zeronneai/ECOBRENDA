/* Permisos nativos pedidos UNA sola vez con explicación previa (priming):
   - Notificaciones: para que la alarma suene a su hora aunque la app esté cerrada.
   - Cámara: la detección de reps usa getUserMedia (video en vivo); pedir el
     permiso aquí evita el prompt abrupto al abrir la cámara.
   En web es no-op (Capacitor.isNativePlatform() === false). */

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Camera } from '@capacitor/camera'

export const isNativeApp = () => Capacitor.isNativePlatform()

export async function primeNativePermissions() {
  if (!isNativeApp()) return { notifications: false, camera: false }
  let notifications = false
  let camera = false
  try { notifications = (await LocalNotifications.requestPermissions()).display === 'granted' } catch { /* noop */ }
  try { camera = (await Camera.requestPermissions({ permissions: ['camera'] })).camera === 'granted' } catch { /* noop */ }
  return { notifications, camera }
}
