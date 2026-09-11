/* Cliente de In-App Purchase (Apple) vía RevenueCat. TODO gateado por
   IAP_ENABLED + iOS nativo: en web / Android / con el flag apagado, estas
   funciones son no-ops. El SDK de RevenueCat se carga con import() dinámico para
   que NO entre al bundle web.

   Fase 1: configurar + logIn(user_id de Supabase) + leer el offering con precios
   localizados. La COMPRA y el otorgamiento de acceso llegan en la Fase 2. */
import { isIOSNative } from './platform'
import { IAP_ENABLED } from './features'

// Public SDK Key de Apple (RevenueCat). Es pública por diseño (no es secreta como
// el service_role): identifica la app en el SDK del cliente.
const APPLE_SDK_KEY = 'appl_saDtSnJjRpfWsGWSrenrpdbSwcp'

export const iapAvailable = () => IAP_ENABLED && isIOSNative()

const log = (...a) => { try { console.log('[iap]', ...a) } catch { /* noop */ } }

// Evita que una llamada nativa que no resuelve deje todo colgado (el bug: la
// promesa de configure() no resolvía → ni logIn ni getOfferings se ejecutaban).
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('iap_timeout_' + label)), ms)),
  ])
}

// Carga el plugin por import dinámico y extrae Purchases de forma defensiva
// (según el bundling, puede venir en .Purchases o .default).
async function getPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor')
  const P = mod?.Purchases || mod?.default?.Purchases || mod?.default || null
  log('module cargado; configure=', typeof P?.configure, 'getOfferings=', typeof P?.getOfferings, 'logIn=', typeof P?.logIn)
  return P
}

let configured = false
async function ensureConfigured() {
  const Purchases = await getPurchases()
  if (!Purchases) throw new Error('iap_no_plugin')
  if (!configured) {
    configured = true // marca ANTES para que otra llamada no re-configure en paralelo
    try {
      log('configure →')
      // NO se bloquea si configure() no resuelve: RC ya recibió el configure en
      // nativo; con el timeout seguimos a logIn/getOfferings igual.
      await withTimeout(Purchases.configure({ apiKey: APPLE_SDK_KEY }), 4000, 'configure')
      log('configure ✓')
    } catch (e) {
      log('configure no resolvió (continuo igual):', e?.message || e)
    }
  }
  return Purchases
}

/* Configura RevenueCat e identifica al usuario con su user_id de Supabase, para
   que el webhook mapee app_user_id -> user_id 1:1. Best-effort. */
export async function initIap(userId) {
  log('initIap start; available=', iapAvailable(), 'uid=', !!userId)
  if (!iapAvailable() || !userId) return
  try {
    const Purchases = await ensureConfigured()
    log('logIn →')
    await withTimeout(Purchases.logIn({ appUserID: userId }), 6000, 'logIn')
    log('logIn ✓')
  } catch (e) {
    console.warn('[iap] init', e?.message || e)
  }
}

/* Al cerrar sesión: vuelve RevenueCat a un usuario anónimo (evita mezclar
   compras entre cuentas en el mismo dispositivo). Best-effort. */
export async function logoutIap() {
  if (!iapAvailable() || !configured) return
  try {
    const Purchases = await getPurchases()
    await withTimeout(Purchases.logOut(), 6000, 'logOut')
  } catch (e) {
    console.warn('[iap] logout', e?.message || e)
  }
}

// Caché del offering actual (los objetos Package crudos que necesita la compra).
let cachedOffering = null

async function loadCurrentOffering() {
  const Purchases = await ensureConfigured()
  log('getOfferings →')
  const res = await withTimeout(Purchases.getOfferings(), 12000, 'offerings')
  const all = res?.all || {}
  log('getOfferings ✓ current=', res?.current?.identifier || null, 'all=', Object.keys(all), 'pkgs=', res?.current?.availablePackages?.length ?? 0)
  // 'current' = el offering marcado como actual en RevenueCat. Si NO está marcado
  // (p.ej. existe 'default' pero sin fijarlo como current), caemos a 'default' o
  // al primero disponible. Así no dependemos de esa config para pintar planes.
  cachedOffering = res?.current || all.default || Object.values(all)[0] || null
  return cachedOffering
}

/* Devuelve los paquetes del offering actual con precios LOCALIZADOS de StoreKit
   (nunca hardcodeados). [{ identifier, productId, title, priceString, period }].
   null si no hay offering o IAP no aplica. */
export async function getOfferings() {
  if (!iapAvailable()) return null
  try {
    const current = await loadCurrentOffering()
    if (!current?.availablePackages?.length) return null
    return current.availablePackages.map((p) => ({
      identifier: p.identifier,
      productId: p.product?.identifier ?? null,
      title: p.product?.title ?? '',
      priceString: p.product?.priceString ?? '',          // ej. "$9.00" ya localizado
      period: p.product?.subscriptionPeriod ?? null,       // ej. "P1M" / "P1Y"
    }))
  } catch (e) {
    console.warn('[iap] getOfferings', e?.message || e)
    return null
  }
}

/* Elegibilidad de la oferta introductoria (trial). Devuelve { [productId]:
   'eligible'|'ineligible'|'unknown' }. Apple/StoreKit deciden a nivel Apple ID:
   quien ya usó el trial sale 'ineligible'. Se usa para NO prometer "3 días
   gratis" a quien no aplica. */
export async function getTrialEligibility(productIds) {
  if (!iapAvailable() || !productIds?.length) return {}
  try {
    const Purchases = await ensureConfigured()
    const res = await Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: productIds })
    const out = {}
    for (const pid of productIds) {
      const st = res?.[pid]?.status // 2=ELIGIBLE, 1=INELIGIBLE, 0/3=desconocido/sin-oferta
      out[pid] = st === 2 ? 'eligible' : st === 1 ? 'ineligible' : 'unknown'
    }
    return out
  } catch (e) {
    console.warn('[iap] eligibility', e?.message || e)
    return {}
  }
}

/* Compra el paquete (por identifier). Abre la hoja de StoreKit. El ACCESO NO se
   otorga aquí: lo escribe el webhook de RevenueCat en el servidor; el cliente
   luego consulta al servidor (refreshPremium) hasta ver el acceso. Devuelve
   { ok } | { cancelled:true } | { ok:false, error }. */
export async function purchase(packageIdentifier) {
  if (!iapAvailable()) return { ok: false }
  try {
    const Purchases = await ensureConfigured()
    const offering = cachedOffering || await loadCurrentOffering()
    const pkg = offering?.availablePackages?.find((p) => p.identifier === packageIdentifier)
    if (!pkg) return { ok: false, error: 'no_package' }
    await Purchases.purchasePackage({ aPackage: pkg })
    return { ok: true }
  } catch (e) {
    if (e?.userCancelled === true || e?.code === 'PURCHASE_CANCELLED' || /cancel/i.test(e?.message || '')) {
      return { ok: false, cancelled: true }
    }
    console.warn('[iap] purchase', e?.message || e)
    return { ok: false, error: e?.message || 'error' }
  }
}

/* Abre la pantalla de suscripciones de Apple (Ajustes / App Store) para
   administrar o cancelar. Es gestión NATIVA de Apple, no un pago externo → OK
   con App Store 3.1.1. Funciona en iOS y también en web (redirige al Apple ID). */
export function openAppleManageSubscriptions() {
  const url = 'itms-apps://apps.apple.com/account/subscriptions'
  try {
    window.open(url, '_system')
  } catch {
    try { window.open('https://apps.apple.com/account/subscriptions', '_blank') } catch { /* noop */ }
  }
}

/* Restaura compras (obligatorio por Apple). RevenueCat re-sincroniza con Apple y
   dispara el webhook; luego el cliente consulta al servidor. Devuelve
   { ok, hasActive } | { ok:false, error }. */
export async function restore() {
  if (!iapAvailable()) return { ok: false }
  try {
    const Purchases = await ensureConfigured()
    const info = await Purchases.restorePurchases()
    const active = info?.customerInfo?.entitlements?.active || {}
    return { ok: true, hasActive: Object.keys(active).length > 0 }
  } catch (e) {
    console.warn('[iap] restore', e?.message || e)
    return { ok: false, error: e?.message || 'error' }
  }
}
