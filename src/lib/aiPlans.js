/* Cliente de planes generados por IA. Llama a los endpoints serverless
   /api/generate-workout y /api/generate-diet (con el JWT de Supabase) y lee los
   planes guardados desde la tabla ai_plans.

   Igual que stripeClient: API_BASE es relativo en web y apunta al deploy de
   Vercel en nativo (configurable con VITE_API_BASE). La generación puede tardar
   ~30-50s: quien llame debe mostrar estado de carga. */

import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { MOCK_WORKOUT, MOCK_DIET } from '../../lib/ai/mockPlans'

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
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_BASE || 'https://ecobrenda.vercel.app')
  : ''

async function authedPost(path) {
  if (!supabase) throw new Error('Falta configurar la nube.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Inicia sesión primero.')
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}',
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    if (err.error === 'timeout' || err.error === 'truncated') {
      throw new Error('La generación tardó demasiado. Intenta de nuevo.')
    }
    throw new Error(err.message || err.error || 'No se pudo generar el plan.')
  }
  return resp.json() // { ok, id, plan }
}

// Genera y persiste una rutina nueva. Devuelve el plan (content).
export async function generateWorkout() {
  if (USE_MOCK_PLANS) { await wait(MOCK_DELAY_MS); return MOCK_WORKOUT }
  const { plan } = await authedPost('/api/generate-workout')
  return plan
}

// Genera y persiste una dieta nueva. Devuelve el plan (content).
export async function generateDiet() {
  if (USE_MOCK_PLANS) { await wait(MOCK_DELAY_MS); return MOCK_DIET }
  const { plan } = await authedPost('/api/generate-diet')
  return plan
}

// Trae el plan más reciente 'ready' de un tipo ('workout' | 'diet').
// Devuelve el content (objeto) o null si no hay ninguno.
export async function getLatestPlan(kind) {
  if (USE_MOCK_PLANS) return null // en dev siempre arranca en la invitación
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) return null
  const { data: rows, error } = await supabase
    .from('ai_plans')
    .select('id, content, created_at')
    .eq('user_id', uid)
    .eq('kind', kind)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
  if (error || !rows?.length) return null
  return rows[0].content
}
