/* Canciones disponibles SOLO para la alarma. El usuario elige una en el editor
   de alarma (AlarmSheet) y se guarda como `songId` en el modelo de alarma.
   Los retos rápidos NO usan esta lista: tienen su canción fija (CHALLENGE_AUDIO_SRC).

   TODAS las canciones son de uso libre (sin derechos de autor), empaquetadas
   en la cuenta de Cloudinary del proyecto.

   Para agregar más canciones, añade otra entrada { id, nombre, url } aquí. */

export const ALARM_SONGS = [
  { id: 'would',      nombre: 'Would It Matter — Rose Campbell',            url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1780939526/Would_It_Matter_-_Rose_Campbell_uvmool.mp3' },
  { id: 'everything', nombre: 'Everything — Rodina feat. Alfie Tito',       url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1780939525/Everything_feat._Rodina_Alfie_Tito_-_Rodina_feat._Alfie_Tito_jhnd7f.mp3' },
  { id: 'hardred',    nombre: 'Hard Red Heart — Blue Beat Review',          url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1780939524/Hard_Red_Heart_-_Blue_Beat_Review_vcmgpt.mp3' },
  { id: 'never',      nombre: 'Never Coming Down — The Soundlings',         url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1780939523/Never_Coming_Down_-_The_Soundlings_p7h5nr.mp3' },
  { id: 'fearless',   nombre: 'Fearless — The Soundlings feat. Ruby Jay',   url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1780939523/Fearless_-_The_Soundlings_feat._Ruby_Jay_wwfgha.mp3' },
  { id: 'ancient',    nombre: 'Ancient History — Bosley',                   url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1780939522/Ancient_History_-_Bosley_mwwqzo.mp3' },
]

// Canción por defecto si la alarma no tiene `songId` (alarmas antiguas o
// migración de usuarios que tenían 'junior'/etc — ahora caen aquí).
export const DEFAULT_SONG_ID = 'would'

// Devuelve la URL de la canción elegida; cae a la de por defecto.
export function songUrlById(id) {
  const found = ALARM_SONGS.find((s) => s.id === id)
  return (found || ALARM_SONGS.find((s) => s.id === DEFAULT_SONG_ID) || ALARM_SONGS[0]).url
}
