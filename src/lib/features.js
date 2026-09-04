/* Feature flags de la app.
   BRENDA COINS se construye detrás de este flag y se mantiene OCULTO hasta el
   lanzamiento (Fase 6). Default OFF. Se activa poniendo VITE_BC_ENABLED=1 en el
   entorno (Vercel) — sin tocar código ni redeploy manual del bundle base. */
const truthy = (v) => v === '1' || v === 'true' || v === true

// Puntos Brenda Coins (sistema completo: ganar, ruleta, catálogo, canje).
export const BC_ENABLED = truthy(import.meta.env.VITE_BC_ENABLED)

// Diagnóstico: permite verificar desde la consola si el BUILD horneó el flag.
//   window.__bc  →  { enabled, raw }
// (Vite inlinea import.meta.env.VITE_BC_ENABLED en tiempo de build; si sale
//  raw: undefined, el deploy NO recibió la variable.)
if (typeof window !== 'undefined') {
  window.__bc = { enabled: BC_ENABLED, raw: import.meta.env.VITE_BC_ENABLED }
}
