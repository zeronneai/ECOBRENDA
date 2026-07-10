/* Prueba local de generación de planes con IA (sin Supabase ni Vercel).
   Uso:
     ANTHROPIC_API_KEY=sk-ant-... node scripts/test-ai-plan.mjs workout
     ANTHROPIC_API_KEY=sk-ant-... node scripts/test-ai-plan.mjs diet
   Imprime el JSON del plan en stdout y (stop_reason / usage) en stderr.
   Sirve para juzgar la calidad del prompt antes de cablear el frontend. */

import Anthropic from '@anthropic-ai/sdk'
import {
  AI_MODEL, MAX_TOKENS,
  buildWorkoutMessages, buildDietMessages, parsePlanJSON,
} from '../lib/ai/prompts.js'

const kind = process.argv[2] === 'diet' ? 'diet' : 'workout'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta ANTHROPIC_API_KEY en el entorno.')
  process.exit(1)
}

// Perfil de ejemplo (con alergias/preferencia para probar la seguridad de la dieta).
const sampleProfile = {
  name: 'Brenda', age: 27, gender: 'female',
  weight: 62, height: 165,
  goal: 'tonificar', level: 'intermedio', workout_days: 4,
  allergies: ['lacteos', 'frutos_secos'],
  diet_pref: 'vegetariana',
  dislikes: ['brócoli', 'cilantro'],
}

const built = kind === 'diet' ? buildDietMessages(sampleProfile) : buildWorkoutMessages(sampleProfile)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const t0 = Date.now()
const stream = anthropic.messages.stream({
  model: AI_MODEL,
  max_tokens: MAX_TOKENS[kind],
  system: built.system,
  messages: built.messages,
})

let text = ''
for await (const evt of stream) {
  if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') text += evt.delta.text
}
const final = await stream.finalMessage()

console.error(`[${kind}] stop_reason=${final.stop_reason} · ${((Date.now() - t0) / 1000).toFixed(1)}s · usage=`, final.usage)
try {
  console.log(JSON.stringify(parsePlanJSON(text), null, 2))
} catch (e) {
  console.error('No se pudo parsear el JSON:', e.message)
  console.error('--- texto crudo ---\n{' + text)
  process.exit(2)
}
