/* Canciones disponibles SOLO para la alarma. El usuario elige una en el editor
   de alarma (AlarmSheet) y se guarda como `songId` en el modelo de alarma.
   Los retos rápidos NO usan esta lista: tienen su canción fija (CHALLENGE_AUDIO_SRC).

   TODAS las canciones son de uso libre (sin derechos de autor), empaquetadas
   en la cuenta de Cloudinary del proyecto.

   Para agregar más canciones, añade otra entrada { id, nombre, url } aquí.
   IMPORTANTE: `songUrlById` cae a la de por defecto si el `songId` guardado ya
   no existe (alarmas antiguas con canciones viejas → no truena). */

export const ALARM_SONGS = [
  { id: 'workout1', nombre: 'Workout 1', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1786411094/WORKOUT_1_kxnhvc.mp3' },
  { id: 'workout2', nombre: 'Workout 2', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1786411095/WORKOUT_2_umnaig.mp3' },
  { id: 'workout3', nombre: 'Workout 3', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1786411094/WORKOUT_3_rwoipn.mp3' },
]

// Canción por defecto: la primera. Las alarmas antiguas con un songId viejo
// (would/everything/…) caen aquí vía songUrlById / normalizeSongId.
export const DEFAULT_SONG_ID = 'workout1'

// ¿El id corresponde a una canción vigente?
export function isValidSongId(id) {
  return ALARM_SONGS.some((s) => s.id === id)
}

// Normaliza un songId: si ya no existe (canción vieja), devuelve la por defecto.
export function normalizeSongId(id) {
  return isValidSongId(id) ? id : DEFAULT_SONG_ID
}

// Devuelve la URL de la canción elegida; cae a la de por defecto si no existe.
export function songUrlById(id) {
  const found = ALARM_SONGS.find((s) => s.id === id)
  return (found || ALARM_SONGS.find((s) => s.id === DEFAULT_SONG_ID) || ALARM_SONGS[0]).url
}
