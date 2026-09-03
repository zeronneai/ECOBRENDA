/* Cliente de planes generados por IA. Llama a los endpoints serverless
   /api/generate-workout y /api/generate-diet (con el JWT de Supabase) y lee los
   planes guardados desde la tabla ai_plans.

   Igual que stripeClient: API_BASE es relativo en web y apunta al deploy de
   Vercel en nativo (configurable con VITE_API_BASE). La generación puede tardar
   ~30-50s: quien llame debe mostrar estado de carga.

   Cada plan trae { content, lockedUntil }: lockedUntil marca el fin del ciclo
   de 30 días. El check-in mensual (peso, dificultad, cumplimiento, comentario)
   se manda al regenerar. */

import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { MOCK_WORKOUT, MOCK_DIET } from '../../lib/ai/mockPlans'
import { saveProfile, addProgressEntry } from './dataStore'
import { translate, getInitialLang } from '../i18n'

/* USE_MOCK_PLANS: bandera de DESARROLLO.
   - true  → NO se llama la API (0 créditos): generate* simula una espera y
     devuelve el mock; getLatestPlan devuelve null (para ver siempre la
     invitación). Además el frontend hace bypass del gate premium (dev).
   - false → comportamiento de PRODUCCIÓN: endpoints reales de Etapa 2 y el gate
     premium bloquea normal (paywall web / PremiumLockedIOS en iOS).
   Se puede forzar por env (VITE_USE_MOCK_PLANS='true'|'false'); por defecto,
   activo solo en desarrollo (import.meta.env.DEV). */
const envFlag = import.meta.env.VITE_USE_MOCK_PLANS
export const USE_MOCK_PLANS = envFlag != null
  ? String(envFlag) === 'true'
  : Boolean(import.meta.env.DEV)

const MOCK_DELAY_MS = 2500
const DAY_MS = 24 * 60 * 60 * 1000
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const lockISO = () => new Date(Date.now() + 30 * DAY_MS).toISOString()

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_BASE || 'https://ecobrenda.vercel.app')
  : ''

async function authedPost(path, body) {
  if (!supabase) throw new Error('Falta configurar la nube.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error(translate(getInitialLang(), 'errors.login_first'))
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    if (err.error === 'timeout' || err.error === 'truncated') {
      throw new Error(translate(getInitialLang(), 'errors.gen_timeout'))
    }
    if (err.error === 'plan_locked') {
      throw new Error(translate(getInitialLang(), 'errors.plan_locked'))
    }
    throw new Error(err.message || err.error || 'No se pudo generar el plan.')
  }
  return resp.json() // { ok, id, plan, lockedUntil }
}

// En mock: refleja el check-in localmente (peso al perfil + entrada de progreso),
// para que el ciclo se vea completo sin API. Nota localizada al idioma actual.
const CK_MOCK = {
  es: { header: 'Check-in mensual:', felt: 'se sintió', met: 'cumplió',
        feel: { easy: 'muy fácil', ok: 'bien', hard: 'muy difícil' },
        done: { all: 'sí, todos', most: 'la mayoría', few: 'pocos' } },
  en: { header: 'Monthly check-in:', felt: 'felt', met: 'completed',
        feel: { easy: 'too easy', ok: 'good', hard: 'too hard' },
        done: { all: 'yes, all', most: 'most', few: 'few' } },
}
function mockPersistCheckin(checkin) {
  if (!checkin) return
  if (checkin.weight != null) saveProfile({ weight: checkin.weight })
  const c = CK_MOCK[getInitialLang()] || CK_MOCK.es
  const feel = c.feel[checkin.feel] || checkin.feel
  const done = c.done[checkin.adherence] || checkin.adherence
  const note = [c.header, feel && `${c.felt} ${feel}`, done && `${c.met} ${done}`, checkin.comment && `— ${checkin.comment}`]
    .filter(Boolean).join(' ')
  addProgressEntry({ weight: checkin.weight ?? null, note })
}

// Genera una rutina nueva. `checkin` opcional (renovación mensual).
// Devuelve { content, lockedUntil }.
export async function generateWorkout(checkin) {
  if (USE_MOCK_PLANS) {
    await wait(MOCK_DELAY_MS)
    mockPersistCheckin(checkin)
    return { content: MOCK_WORKOUT, lockedUntil: lockISO() }
  }
  const { plan, lockedUntil, id } = await authedPost('/api/generate-workout', { checkin, lang: getInitialLang() })
  return { content: plan, lockedUntil, id }
}

// Genera una dieta nueva. `checkin` opcional (renovación mensual).
export async function generateDiet(checkin) {
  if (USE_MOCK_PLANS) {
    await wait(MOCK_DELAY_MS)
    mockPersistCheckin(checkin)
    return { content: MOCK_DIET, lockedUntil: lockISO() }
  }
  const { plan, lockedUntil, id } = await authedPost('/api/generate-diet', { checkin, lang: getInitialLang() })
  return { content: plan, lockedUntil, id }
}

// Trae el plan más reciente 'ready' de un tipo ('workout' | 'diet').
// Switch gym<->casa: genera (o reusa) la versión del día para el lugar CONTRARIO.
// Devuelve { location, day, cached }. El servidor deduplica: una sola generación
// por día+lugar; llamarlo de nuevo reusa la fila (no gasta créditos).
export async function generateWorkoutDay(sourcePlanId, dayIndex) {
  const r = await authedPost('/api/generate-workout-day', {
    source_plan_id: sourcePlanId, day_index: dayIndex, lang: getInitialLang(),
  })
  return { location: r.location, day: r.day, cached: !!r.cached }
}

// Devuelve { content, lockedUntil, id, createdAt, requestedAt } o null.
// requestedAt permite al cliente decidir si el plan ya se puede LIBERAR
// (≥48h desde requested_at) o si sigue "en preparación".
export async function getLatestPlan(kind) {
  if (USE_MOCK_PLANS) return null // en dev siempre arranca en la invitación
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) return null
  const { data: rows, error } = await supabase
    .from('ai_plans')
    .select('id, content, locked_until, created_at, requested_at')
    .eq('user_id', uid)
    .eq('kind', kind)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
  if (error || !rows?.length) return null
  const r = rows[0]
  return {
    content: r.content,
    lockedUntil: r.locked_until,
    id: r.id,
    createdAt: r.created_at,
    requestedAt: r.requested_at || r.created_at,
  }
}
