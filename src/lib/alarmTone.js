/* Pitido de alarma con Web Audio API (réplica del de la app vieja).

   ¿Por qué Web Audio y no un <audio>? En iPhone (Chrome en iOS = WebKit, igual
   que Safari) un elemento <audio> queda muy restringido: aunque lo "bendigas",
   iOS suele bloquear un play() posterior que no nazca de un gesto. En cambio, un
   AudioContext que se "resume()" DENTRO de un gesto queda en estado 'running', y
   a partir de ahí puedes crear y arrancar osciladores en cualquier momento (p.
   ej. desde el scheduler, sin gesto) y SÍ suenan. No depende de la red.

   El pitido es el shock fuerte de arranque: suena fuerte ~10s y luego se
   desvanece. La canción elegida (elemento <audio>) suena EN PARALELO desde el
   inicio y continúa hasta que se completan las reps; el pitido solo refuerza el
   despertar. Pasa por un DynamicsCompressor maestro para sonar más fuerte. */

const LOUD_MS = 10000   // pitido a tope los primeros ~10s
const FADE_MS = 4000    // luego se desvanece ~4s hasta apagarse

let ctx = null
let compressor = null
let toneGain = null     // controla el desvanecimiento global del pitido
let ringing = false
let loopTimer = null
let stopTimer = null
let keepAlive = null    // oscilador inaudible que evita que iOS suspenda el contexto
let visInstalled = false

function ensureCtx() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  // Cadena maestra: compresor (sube el volumen percibido) -> salida.
  compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -24
  compressor.knee.value = 30
  compressor.ratio.value = 12
  compressor.attack.value = 0.003
  compressor.release.value = 0.25
  compressor.connect(ctx.destination)
  return ctx
}

// Keep-alive: un oscilador prácticamente inaudible (gain ~-80dB) que corre
// SIEMPRE. Mientras hay una fuente activa, iOS NO suspende el contexto en primer
// plano, así que al dispararse la alarma el pitido suena al instante, sin gesto
// y sin delay. Es la clave para que NO haya que tocar la pantalla.
function startKeepAlive() {
  if (!ctx || keepAlive) return
  try {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = 0.0001
    osc.frequency.value = 30
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start()
    keepAlive = { osc, g }
  } catch { /* noop */ }
}

// Si iOS suspende el contexto (al irse a segundo plano / bloquear pantalla),
// lo reanuda al volver a primer plano.
function installVisibilityResume() {
  if (visInstalled) return
  visInstalled = true
  const resume = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}) }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume() })
  window.addEventListener('focus', resume)
}

// Desbloqueo: crea/reanuda el contexto, reproduce un buffer silencioso (truco
// que iOS exige) y arranca el keep-alive. Debe llamarse DENTRO de un gesto del
// usuario. Idempotente.
export function unlockAlarmAudio() {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  try {
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch { /* noop */ }
  startKeepAlive()
  installVisibilityResume()
}

// ¿El contexto ya está listo para sonar sin gesto?
export function isAlarmAudioReady() {
  return !!ctx && ctx.state === 'running'
}

// Tres pitidos sawtooth 1100->820 Hz, como la vieja.
function scheduleBeeps(t0) {
  const freqs = [1100, 1100, 1100]
  freqs.forEach((f, i) => {
    const t = t0 + i * 0.26
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(f, t)
    osc.frequency.exponentialRampToValueAtTime(820, t + 0.18)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    osc.connect(g)
    g.connect(toneGain)
    osc.start(t)
    osc.stop(t + 0.22)
  })
}

// Arranca el pitido: fuerte ~10s, luego se desvanece y se apaga solo.
export function startAlarmTone() {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  if (ringing) return
  ringing = true

  const now = c.currentTime
  toneGain = c.createGain()
  toneGain.gain.setValueAtTime(1, now)
  toneGain.gain.setValueAtTime(1, now + LOUD_MS / 1000)               // mantiene a tope ~10s
  toneGain.gain.linearRampToValueAtTime(0.0001, now + (LOUD_MS + FADE_MS) / 1000) // y desvanece
  toneGain.connect(compressor)

  const tick = () => {
    if (!ringing) return
    scheduleBeeps(ctx.currentTime)
    const elapsed = (ctx.currentTime - now) * 1000
    if (navigator.vibrate && elapsed < LOUD_MS) navigator.vibrate([200, 80, 200, 80, 200])
    loopTimer = setTimeout(tick, 1100)
  }
  tick()

  // Se apaga solo al terminar el desvanecimiento (la canción sigue sonando).
  stopTimer = setTimeout(stopAlarmTone, LOUD_MS + FADE_MS + 300)
}

export function stopAlarmTone() {
  ringing = false
  clearTimeout(loopTimer); loopTimer = null
  clearTimeout(stopTimer); stopTimer = null
  if (navigator.vibrate) navigator.vibrate(0)
  if (toneGain) {
    try { toneGain.disconnect() } catch { /* noop */ }
    toneGain = null
  }
}
