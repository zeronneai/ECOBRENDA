/* Runner compartido de generación de planes con IA.
   Lo usan api/generate-workout.js y api/generate-diet.js.

   Flujo (mismo patrón de seguridad que checkout.js / stripe-webhook.js):
     1. Valida el JWT de Supabase (Authorization: Bearer).
     2. Lee el perfil de la usuaria con SUPABASE_SERVICE_ROLE_KEY.
     3. Llama a Anthropic con streaming (mantiene viva la conexión).
     4. Parsea el JSON, con guard de tiempo (~55s) y detección de truncado.
     5. Persiste en ai_plans (status 'ready' o 'error') con service_role.
     6. Responde { ok, id, plan } o un error limpio. */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import {
  AI_MODEL, MAX_TOKENS,
  buildWorkoutMessages, buildDietMessages, parsePlanJSON,
} from './prompts.js'

const ALLOW = process.env.CORS_ORIGIN || '*'
const SAFETY_TIMEOUT_MS = 55000 // por debajo del maxDuration=60 de Vercel

// Snapshot del perfil usado (auditoría en ai_plans.inputs).
function snapshot(p) {
  return {
    name: p.name, age: p.age, gender: p.gender,
    weight: p.weight, height: p.height,
    goal: p.goal, level: p.level, daysPerWeek: p.workout_days,
    allergies: p.allergies, dietPref: p.diet_pref, dislikes: p.dislikes,
  }
}

// Localización del check-in guardado en el historial (progress_logs.notes).
const CK = {
  es: { header: 'Check-in mensual:', felt: 'se sintió', met: 'cumplió',
        feel: { easy: 'muy fácil', ok: 'bien', hard: 'muy difícil' },
        done: { all: 'sí, todos', most: 'la mayoría', few: 'pocos' } },
  en: { header: 'Monthly check-in:', felt: 'felt', met: 'completed',
        feel: { easy: 'too easy', ok: 'good', hard: 'too hard' },
        done: { all: 'yes, all', most: 'most', few: 'few' } },
}

// Renovación: actualiza profiles.weight y guarda el check-in en progress_logs.
async function persistCheckin(svc, userId, checkin, lang) {
  try {
    if (checkin.weight != null) {
      await svc.from('profiles').update({ weight: checkin.weight }).eq('id', userId)
    }
    const c = CK[lang] || CK.es
    const notes = [
      c.header,
      checkin.feel ? `${c.felt} ${c.feel[checkin.feel] || checkin.feel}` : null,
      checkin.adherence ? `${c.met} ${c.done[checkin.adherence] || checkin.adherence}` : null,
      checkin.comment ? `— ${checkin.comment}` : null,
    ].filter(Boolean).join(' ')
    await svc.from('progress_logs').insert({
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      weight: checkin.weight ?? null,
      notes,
    })
  } catch (e) {
    console.error('[persistCheckin]', e?.message || e)
  }
}

function withTimeout(promise, ms) {
  let t
  const timer = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('timeout')), ms) })
  return Promise.race([promise.finally(() => clearTimeout(t)), timer])
}

// Consume el stream de Anthropic, acumula el texto y parsea el JSON del plan.
async function runStream(anthropic, kind, built) {
  const stream = anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS[kind],
    system: built.system,
    messages: built.messages,
  })

  let text = ''
  for await (const evt of stream) {
    if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
      text += evt.delta.text
    }
  }

  const final = await stream.finalMessage()
  if (final.stop_reason === 'max_tokens') {
    // Se cortó por límite de tokens: el JSON viene incompleto → Plan B (partir).
    throw new Error('truncated_max_tokens')
  }
  return parsePlanJSON(text)
}

export async function generatePlan(kind, req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'missing_anthropic_key' })

  const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // 1) Auth
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'missing_token' })
  const { data: userData, error: userErr } = await svc.auth.getUser(token)
  if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid_token' })
  const user = userData.user

  // 2) Perfil
  const { data: profile, error: profErr } = await svc.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profErr) return res.status(500).json({ error: 'profile_read_failed' })
  if (!profile) return res.status(400).json({ error: 'no_profile' })

  // 2a) Idioma del plan: body.lang (idioma vivo del cliente) → profiles.language → 'es'.
  const bodyLang = req.body && req.body.lang
  const lang = (bodyLang === 'en' || bodyLang === 'es')
    ? bodyLang
    : (profile.language === 'en' ? 'en' : 'es')

  // 2b) Contexto de renovación (check-in mensual, opcional).
  const checkin = (req.body && req.body.checkin) || null
  let ctx
  if (checkin) {
    // Título del plan anterior (referencia ligera para "progresar, no repetir").
    const { data: prev } = await svc.from('ai_plans')
      .select('content').eq('user_id', user.id).eq('kind', kind).eq('status', 'ready')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    ctx = { checkin, prevTitle: prev?.content?.title }
  }
  // Si el check-in trae peso nuevo, el prompt usa ese peso.
  const profileForPrompt = checkin?.weight != null ? { ...profile, weight: checkin.weight } : profile

  // 3-4) Generación con IA
  const built = kind === 'diet' ? buildDietMessages(profileForPrompt, ctx, lang) : buildWorkoutMessages(profileForPrompt, ctx, lang)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const plan = await withTimeout(runStream(anthropic, kind, built), SAFETY_TIMEOUT_MS)

    // 5) Persistir 'ready' + bloqueo de 30 días.
    const lockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: row, error: insErr } = await svc.from('ai_plans').insert({
      user_id: user.id, kind, content: plan, inputs: snapshot(profileForPrompt),
      model: AI_MODEL, status: 'ready', locked_until: lockedUntil,
    }).select('id').single()
    if (insErr) console.error('[ai_plans insert ready]', insErr)

    // 5b) En renovación: actualiza peso del perfil y guarda el check-in en progress_logs.
    if (checkin) await persistCheckin(svc, user.id, checkin, lang)

    // 6) Responder
    return res.status(200).json({ ok: true, id: row?.id || null, plan, lockedUntil })
  } catch (e) {
    console.error(`[generate-${kind}]`, e?.message || e)
    // Persistir 'error' para dejar rastro (no bloquea la respuesta).
    await svc.from('ai_plans').insert({
      user_id: user.id, kind, inputs: snapshot(profile), model: AI_MODEL, status: 'error',
    }).then(() => {}, () => {})

    const isTimeout = e?.message === 'timeout'
    const isTruncated = e?.message === 'truncated_max_tokens'
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'timeout' : isTruncated ? 'truncated' : 'generation_failed',
      message: e?.message || 'unknown',
    })
  }
}
