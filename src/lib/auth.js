/* Auth con Supabase. Mensajes de error traducidos a algo humano y en español.
   Si Supabase no está configurado, devuelve un error claro (no truena). */

import { supabase, isSupabaseConfigured } from './supabase'

export const authReady = () => isSupabaseConfigured

export async function signUp(email, password) {
  if (!supabase) return { error: 'Falta configurar Supabase.' }
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: humanError(error) }
  return { session: data.session, user: data.user }
}

export async function signIn(email, password) {
  if (!supabase) return { error: 'Falta configurar Supabase.' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: humanError(error) }
  return { session: data.session, user: data.user }
}

export async function resetPassword(email, redirectTo) {
  if (!supabase) return { error: 'Falta configurar Supabase.' }
  const opts = redirectTo ? { redirectTo } : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(email, opts)
  if (error) return { error: humanError(error) }
  return { ok: true }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

function humanError(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already')) return 'Ese email ya está registrado.'
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Email o contraseña incorrectos.'
  if (m.includes('at least 6') || m.includes('password should be at least')) return 'La contraseña necesita mínimo 6 caracteres.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Ese email no parece válido.'
  if (m.includes('email not confirmed')) return 'Tu email aún no está confirmado.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos, espera un momento.'
  if (m.includes('network') || m.includes('failed to fetch')) return 'Revisa tu conexión e inténtalo de nuevo.'
  return error?.message || 'Algo salió mal, intenta de nuevo.'
}
