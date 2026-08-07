/* Texto provocador que aparece a mitad de la rutina (mientras la cámara cuenta
   reps) para empujar al usuario. Se muestra grande a toda pantalla unos segundos
   y desaparece solo, SIN interrumpir el conteo (overlay con pointer-events:none).

   Para agregar más frases, añádelas a TAUNTS. Cada vez que se dispara se elige
   una al azar de la lista.

   ⚠️ MARCA / BRANDING — NO TRADUCIR: la firma icónica de Brenda "¿O NO PUEDES?"
   se mantiene SIEMPRE en español, incluso con la app en inglés. Es parte de su
   personalidad mexicana y suena mejor en español (decisión de producto). Si en
   el futuro se agregan taunts en inglés, ESTA frase se queda en español. */

export const TAUNTS = [
  '¿O NO PUEDES?', // ← firma de marca: SIEMPRE en español (ver nota arriba)
]

// Cuánto tiempo se queda en pantalla.
export const TAUNT_DURATION_MS = 2500

// ¿En qué repetición aparece? Por defecto, a la mitad del reto.
// Cambia esta función para fijarlo (p. ej. `return 5`).
export function tauntTriggerRep(goal) {
  return Math.max(1, Math.ceil(goal / 2))
}

// Frase al azar de la lista.
export function randomTaunt() {
  return TAUNTS[Math.floor(Math.random() * TAUNTS.length)]
}
