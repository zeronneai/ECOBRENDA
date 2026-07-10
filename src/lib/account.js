/* Cliente de eliminación de cuenta. Llama a /api/delete-account con el JWT de
   Supabase (mismo patrón que stripeClient/aiPlans). El servidor borra al dueño
   del token (cascada + cancela Stripe). */
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_BASE || 'https://ecobrenda.vercel.app')
  : ''

export async function deleteAccountRequest() {
  if (!supabase) throw new Error('Falta configurar la nube.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('no_session')
  const resp = await fetch(`${API_BASE}/api/delete-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}',
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.message || err.error || 'No se pudo eliminar la cuenta.')
  }
  return resp.json()
}
