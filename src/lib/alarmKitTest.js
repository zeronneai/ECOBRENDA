/* Hook de PRUEBA para el plugin nativo AlarmKit (Fase 2). TEMPORAL — quitar antes
   de mergear a producción.

   Cómo probar en device (iPhone iOS 26, conectado al Mac):
     Safari (Mac) → Desarrollo → [tu iPhone] → [la app] → Consola, y ejecuta:
       await window.AlarmKitTest.isSupported()          // { supported: true } en iOS 26
       await window.AlarmKitTest.requestAuthorization()  // acepta el permiso del sistema
       await window.AlarmKitTest.scheduleTest(10)        // suena en 10s → BLOQUEA la pantalla
   No se llama en web/Android (el plugin no existe ahí); exponer el global es inofensivo. */
import { registerPlugin } from '@capacitor/core'

const AlarmKit = registerPlugin('AlarmKit')

export const AlarmKitTest = {
  isSupported: () => AlarmKit.isSupported(),
  getStatus: () => AlarmKit.getAuthorizationStatus(),
  requestAuthorization: () => AlarmKit.requestAuthorization(),
  scheduleTest: (seconds = 10) =>
    AlarmKit.scheduleTest({ seconds, title: '¡ARRIBA! Booty Alarm 🍑', stopLabel: 'Detener' }),
  stop: (id) => AlarmKit.stop({ id }),
  cancelAll: () => AlarmKit.cancelAll(),
  list: () => AlarmKit.list(),           // DEBUG: cuántas alarmas hay programadas
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-underscore-dangle
  window.AlarmKitTest = AlarmKitTest
}
