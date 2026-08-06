/* Preview de canciones (editor de alarma + onboarding). AISLADO de la alarma:
   NO toca el <audio> principal (audioRef/playSong) ni el pitido Web Audio.

   iOS/WebKit restringe un `new Audio(url).play()` "pelón": aunque nazca de un
   tap, un MP3 REMOTO no cargado suele bloquearse. Aquí usamos un <audio>
   singleton "bendecido" en el primer gesto (WAV silencioso, misma técnica que el
   unlock de la alarma) + preload, para que el play() real funcione. Combinado
   con AVAudioSession .playback (AppDelegate), suena aunque el iPhone esté en
   silencio. */

// 46-byte WAV silencioso (PCM mono 8kHz/8-bit) para bendecir el elemento en iOS.
const SILENT_WAV_DATA_URL = (() => {
  if (typeof btoa !== 'function') return ''
  const bytes = [
    0x52, 0x49, 0x46, 0x46, 0x26, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x40, 0x1f, 0x00, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x01, 0x00, 0x08, 0x00,
    0x64, 0x61, 0x74, 0x61, 0x02, 0x00, 0x00, 0x00, 0x80, 0x80,
  ]
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(s)
})()

let el = null
let blessed = false

function ensureEl() {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio()
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
  }
  return el
}

// Debe llamarse DENTRO de un gesto de usuario (tap). Idempotente.
export function unlockPreview() {
  const a = ensureEl()
  if (!a || blessed) return
  blessed = true
  if (!SILENT_WAV_DATA_URL) return
  try {
    a.src = SILENT_WAV_DATA_URL
    a.muted = true
    const p = a.play()
    const cleanup = () => { try { a.pause(); a.currentTime = 0 } catch { /* noop */ } a.muted = false }
    if (p && typeof p.then === 'function') p.then(cleanup).catch(cleanup)
    else cleanup()
  } catch { /* noop */ }
}

// Reproduce el preview de una URL remota. Surface de errores (sin catch mudo).
export function playPreview(url, onEnded) {
  const a = ensureEl()
  if (!a) return
  try {
    a.onended = null
    a.muted = false
    a.volume = 1.0
    a.src = url
    a.load()
    a.currentTime = 0
    const p = a.play()
    if (p && typeof p.catch === 'function') {
      p.catch((err) => console.warn('[preview] play falló:', err?.message || err))
    }
    a.onended = () => { if (typeof onEnded === 'function') onEnded() }
  } catch (err) {
    console.warn('[preview] error:', err?.message || err)
  }
}

export function stopPreview() {
  if (!el) return
  try { el.pause(); el.onended = null } catch { /* noop */ }
}
