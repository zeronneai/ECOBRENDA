// Copia los assets wasm de MediaPipe Tasks Vision desde node_modules a
// /public para auto-hospedarlos (sin CDN externo). Se ejecuta en predev/prebuild.
// El modelo .task se versiona en el repo; el wasm se regenera desde la dependencia.
import { mkdirSync, copyFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const dest = join(root, 'public/mediapipe/wasm')

// El FilesetResolver por ruta usa la variante SIMD (con fallback a nosimd).
const FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

if (!existsSync(src)) {
  console.warn('[mediapipe] wasm no encontrado en node_modules; ¿instalaste @mediapipe/tasks-vision?')
  process.exit(0)
}

mkdirSync(dest, { recursive: true })
for (const f of FILES) copyFileSync(join(src, f), join(dest, f))
console.log('[mediapipe] wasm copiado a public/mediapipe/wasm')
