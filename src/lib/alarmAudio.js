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

   El audio NO se detiene con ningún botón: solo para cuando se completan las
   reps (Fase 5: detección por cámara; por ahora: el flujo de "completar").

   Nota: el volumen del elemento es 1.0 (máximo); el volumen real depende del
   volumen de medios del dispositivo, que la web no puede forzar. */

export const ALARM_AUDIO_SRC =
  'https://res.cloudinary.com/dsprn0ew4/video/upload/v1775536848/Junior_H_con_Banda_-_El_Hijo_Mayor_En_Vivo_rofzm5.mp3'
