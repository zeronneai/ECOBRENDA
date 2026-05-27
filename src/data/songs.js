/* Canciones disponibles SOLO para la alarma. El usuario elige una en el editor
   de alarma (AlarmSheet) y se guarda como `songId` en el modelo de alarma.
   Los retos rápidos NO usan esta lista: tienen su canción fija (CHALLENGE_AUDIO_SRC).

   Para agregar más canciones, añade otra entrada { id, nombre, url } aquí. */

export const ALARM_SONGS = [
  { id: 'junior', nombre: 'El Hijo Mayor — Junior H', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1775536848/Junior_H_con_Banda_-_El_Hijo_Mayor_En_Vivo_rofzm5.mp3' },
  { id: 'jacobo', nombre: 'Jacobo Grinberg — Víctor Mendivil', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1779845193/V%C3%ADctor_Mendivil_-_Jacobo_Grinberg_Video_Oficial_blqdkd.mp3' },
  { id: 'puntacana', nombre: 'Punta Cana — Víctor Mendivil x Kevin AMF', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1779845193/PUNTA_CANA_-_VICTOR_MENDIVIL_X_KEVIN_AMF_Video_Oficial_fhqyig.mp3' },
  { id: 'kingofwatches', nombre: 'King Of Watches — Víctor Mendivil x Netón Vega', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1779845193/17._King_Of_Watches_-_Victor_Mendivil_x_Net%C3%B3n_Vega_gmfc41.mp3' },
  { id: 'pv', nombre: 'P.V. — Víctor Mendivil x Fenix Flexin', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1779845193/5._P.V._-_Victor_Mendivil_x_Fenix_Flexin_Visualizer_Oficial_nyxbhk.mp3' },
  { id: 'tonymontana', nombre: 'Tony Montana — Víctor Mendivil x Yng Lucas', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1779845194/TONY_MONTANA_VISUALIZER_VICTOR_MENDIVIL_X_YNG_LUCAS_xp9ink.mp3' },
  { id: 'gane', nombre: 'GANÉ — Víctor Mendivil', url: 'https://res.cloudinary.com/dsprn0ew4/video/upload/v1779846012/Victor_Mendivil_-_GAN%C3%89_Letra_lhuiso.mp3' },
]

// Canción por defecto si la alarma no tiene `songId` (alarmas antiguas).
export const DEFAULT_SONG_ID = 'junior'

// Devuelve la URL de la canción elegida; cae a la de por defecto.
export function songUrlById(id) {
  const found = ALARM_SONGS.find((s) => s.id === id)
  return (found || ALARM_SONGS.find((s) => s.id === DEFAULT_SONG_ID) || ALARM_SONGS[0]).url
}
