/* Audio de la alarma "imposible de apagar".

   Comportamiento por plataforma (la parte de notificaciones se cablea en la
   Fase 4 con @capacitor/local-notifications; aquí vive el audio in-app):

   - Android: la notificación de alta prioridad puede sonar ~30s + vibrar
     incluso en segundo plano (full-screen intent). Al tocarla, la app abre
     en AlarmRing y aquí arranca la canción en loop a volumen alto.
   - iOS: Apple NO permite que una notificación local mantenga sonido infinito
     ni abra la app sola. La notificación suena el máximo permitido (~30s) +
     vibración; al tocarla, la app abre en AlarmRing y la canción arranca
     ENTONCES (al abrir la app), nunca antes.

   Autoplay: los navegadores exigen un gesto del usuario para reproducir audio.
   El tap que lleva a AlarmRing (tocar la notificación, "PROBAR ALARMA" o
   "A DARLE") cuenta como ese gesto. Si aun así el play() es bloqueado, se
   reintenta en el siguiente toque del usuario.

   DESBLOQUEO DE AUDIO (para que la alarma del scheduler suene SOLA):
   En el primer gesto del usuario (cualquier toque, p. ej. activar/guardar una
   alarma) se hace un play/pause SILENCIOSO del <audio> (unlockAudio). Eso
   "bendice" el elemento para que un play() programático posterior —cuando la
   alarma se dispara sin un gesto directo— sea permitido por el navegador.
   - Android / Chrome: funciona bien; tras el desbloqueo la alarma suena sola.
   - iOS Safari: el autoplay es más restrictivo y puede seguir bloqueando aun
     con el desbloqueo. La solución completa (sonido con app cerrada y sin
     depender del autoplay del WebView) llega con la alarma NATIVA de Capacitor.

   El audio NO se detiene con ningún botón: solo para cuando se completan las
   reps (Fase 5: detección por cámara; por ahora: el flujo de "completar").

   Nota: el volumen del elemento es 1.0 (máximo); el volumen real depende del
   volumen de medios del dispositivo, que la web no puede forzar. */

// Canción de la alarma de la mañana.
export const ALARM_AUDIO_SRC =
  'https://res.cloudinary.com/dsprn0ew4/video/upload/v1775536848/Junior_H_con_Banda_-_El_Hijo_Mayor_En_Vivo_rofzm5.mp3'

// Canción de los retos rápidos (distinta de la alarma).
export const CHALLENGE_AUDIO_SRC =
  'https://res.cloudinary.com/dsprn0ew4/video/upload/v1775681660/Eden_Mu%C3%B1oz_Cosme_Tadeo_-_La_Nena_LETRA_e70dkv.mp3'

// WAV silencioso (50 ms) para "bendecir" el <audio> en el primer gesto, sin red.
let _silentUrl = null
export function getSilentAudioUrl() {
  if (_silentUrl) return _silentUrl
  const rate = 8000
  const n = Math.floor(rate * 0.05)
  const buf = new ArrayBuffer(44 + n * 2)
  const dv = new DataView(buf)
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
  wr(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); wr(8, 'WAVE'); wr(12, 'fmt ')
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true)
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true)
  wr(36, 'data'); dv.setUint32(40, n * 2, true) // muestras en silencio (ceros)
  _silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
  return _silentUrl
}
