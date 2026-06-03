/* Detección de plataforma centralizada para cumplir con App Store Rule 3.1.1:
   apps de iOS no pueden vender suscripciones digitales fuera de IAP, ni
   mencionar/linkear a métodos de pago externos.

   isIOSNative() = true SOLO cuando la app corre en iOS vía Capacitor.
   En web (Vercel) e iOS Safari = false (allá sí podemos mostrar el paywall normal).
   En Android Capacitor = false (allá Stripe está permitido).

   Es una función (no const) para que se evalúe en cada uso — evita problemas
   de timing si Capacitor se inicializa después del import. En producción la
   diferencia de costo es nula. */

import { Capacitor } from '@capacitor/core'

export const isIOSNative = () => {
  try { return Capacitor.getPlatform() === 'ios' } catch { return false }
}
