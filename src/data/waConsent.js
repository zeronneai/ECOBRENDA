/* Opt-in de WhatsApp: países soportados (mercado MX + US), versión del texto de
   consentimiento y helpers de teléfono. El texto que se le muestra a la usuaria
   vive en i18n bajo la key `wa.consent_text`; aquí guardamos la VERSIÓN para
   auditar exactamente qué aceptó. Si el texto cambia, sube WA_CONSENT_VERSION. */

// Sube esto cuando cambie el TEXTO de consentimiento (wa.consent_text es/en).
export const WA_CONSENT_VERSION = '2026-09-04'

export const WA_COUNTRIES = [
  { code: 'MX', dial: '+52', flag: '🇲🇽', label: 'México' },
  { code: 'US', dial: '+1', flag: '🇺🇸', label: 'Estados Unidos' },
]

export const WA_DEFAULT_COUNTRY = 'MX'

const dialFor = (code) => (WA_COUNTRIES.find((c) => c.code === code) || WA_COUNTRIES[0]).dial

// Solo dígitos del texto local (quita espacios, guiones, paréntesis, +, etc.).
export const waDigits = (raw) => String(raw || '').replace(/\D/g, '')

// MX y US usan 10 dígitos nacionales (MX admite 10; algunos escriben 11 con el 1).
export function isValidWaLocal(raw) {
  const d = waDigits(raw)
  return d.length >= 10 && d.length <= 11
}

// Arma el E.164: prefijo del país + dígitos nacionales. '' si no hay dígitos.
export function toE164(countryCode, raw) {
  const d = waDigits(raw)
  if (!d) return ''
  return dialFor(countryCode) + d
}

// Descompone un E.164 guardado en { country, local } para poder editarlo.
// Empareja por el prefijo más largo primero (por si algún dial fuera subcadena).
export function fromE164(full) {
  const s = String(full || '').trim()
  if (!s) return { country: WA_DEFAULT_COUNTRY, local: '' }
  const byLen = [...WA_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of byLen) {
    if (s.startsWith(c.dial)) return { country: c.code, local: s.slice(c.dial.length) }
  }
  return { country: WA_DEFAULT_COUNTRY, local: waDigits(s) }
}
