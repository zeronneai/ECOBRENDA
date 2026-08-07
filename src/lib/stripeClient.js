/* Cliente del flujo de pago. Llama a /api/checkout y /api/portal y abre la URL
   de Stripe (en web redirige; en nativo abre el navegador in-app vía Capacitor
   Browser). Al pagar, Stripe redirige a:
     - web    : ${origin}/premium-return
     - nativo : com.zeronne.bootyalarm://premium-return  (deep link)
   El AppContext escucha esa vuelta y re-jala la suscripción con polling.

   API_BASE: en web es relativo (mismo origin que la app); en nativo apunta al
   despliegue de Vercel (configurable con VITE_API_BASE). */

import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import { translate, getInitialLang } from '../i18n'

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_BASE || 'https://ecobrenda.vercel.app')
  : ''

const isNative = () => Capacitor.isNativePlatform()

function returnUrls() {
  if (isNative()) {
    return {
      success: 'com.zeronne.bootyalarm://premium-return?ok=1',
      cancel: 'com.zeronne.bootyalarm://premium-return?canceled=1',
    }
  }
  const o = typeof window !== 'undefined' ? window.location.origin : ''
  return { success: `${o}/premium-return?ok=1`, cancel: `${o}/premium-return?canceled=1` }
}

async function authedFetch(path, body) {
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
    throw new Error(err.message || err.error || 'Error de red.')
  }
  return resp.json()
}

async function openExternal(url) {
  if (isNative()) await Browser.open({ url, presentationStyle: 'fullscreen' })
  else window.location.href = url
}

export async function closeNativeBrowser() {
  if (!isNative()) return
  try { await Browser.close() } catch { /* noop */ }
}

export async function startCheckout(plan) {
  const { success, cancel } = returnUrls()
  const { url } = await authedFetch('/api/checkout', { plan, successUrl: success, cancelUrl: cancel })
  if (!url) throw new Error('Sin URL de pago.')
  await openExternal(url)
}

export async function openBillingPortal() {
  const returnUrl = isNative() ? 'com.zeronne.bootyalarm://premium-return' : (typeof window !== 'undefined' ? window.location.origin + '/profile' : '')
  const { url } = await authedFetch('/api/portal', { returnUrl })
  if (!url) throw new Error('Sin URL del portal.')
  await openExternal(url)
}
