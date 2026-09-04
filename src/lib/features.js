/* Feature flags de la app.
   BRENDA COINS se construye detrás de este flag y se mantiene OCULTO hasta el
   lanzamiento (Fase 6). Default OFF. Se activa poniendo VITE_BC_ENABLED=1 en el
   entorno (Vercel) — sin tocar código ni redeploy manual del bundle base. */
const truthy = (v) => v === '1' || v === 'true' || v === true

// Puntos Brenda Coins (sistema completo: ganar, ruleta, catálogo, canje).
export const BC_ENABLED = truthy(import.meta.env.VITE_BC_ENABLED)
