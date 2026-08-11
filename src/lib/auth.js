/* Auth con Supabase. Mensajes de error traducidos a algo humano y en español.
   Si Supabase no está configurado, devuelve un error claro (no truena). */

import { supabase, isSupabaseConfigured } from './supabase'
import { translate, getInitialLang } from '../i18n'

// Traductor puntual (fuera de React): el idioma vive en localStorage.
const tr = (k) => translate(getInitialLang(), k)

export const authReady = () => isSupabaseConfigured

export async function signUp(email, password) {
  if (!supabase) return { error: tr('errors.cloud_missing') }
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: humanError(error) }
  // Correo YA registrado: con la confirmación desactivada Supabase NO devuelve
  // error — ofusca con un user de `identities` vacío y sin sesión. Lo tratamos
  // como "correo en uso" (no como "revisa tu correo").
  const identities = data?.user?.identities
  if (!data.session && Array.isArray(identities) && identities.length === 0) {
    return { error: tr('autherr.email_taken') }
  }
  // needsConfirm = true SOLO si Supabase tiene activada la confirmación por correo
  // (devuelve user con identities pero sin sesión). Con la confirmación DESACTIVADA
  // (nuestro caso), la sesión llega de una y el usuario entra directo.
  return { session: data.session, user: data.user, needsConfirm: !data.session }
}

export async function signIn(email, password) {
  if (!supabase) return { error: tr('errors.cloud_missing') }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: humanError(error) }
  return { session: data.session, user: data.user }
}

export async function resetPassword(email, redirectTo) {
  if (!supabase) return { error: tr('errors.cloud_missing') }
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
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already')) return tr('autherr.email_taken')
  if (m.includes('invalid login') || m.includes('invalid credentials')) return tr('autherr.bad_login')
  if (m.includes('at least 6') || m.includes('password should be at least')) return tr('autherr.pw_short')
  if (m.includes('invalid email') || m.includes('unable to validate email')) return tr('autherr.bad_email')
  if (m.includes('email not confirmed')) return tr('autherr.not_confirmed')
  if (m.includes('rate limit') || m.includes('too many')) return tr('autherr.rate_limit')
  if (m.includes('network') || m.includes('failed to fetch')) return tr('autherr.network')
  return error?.message || tr('autherr.generic')
}
