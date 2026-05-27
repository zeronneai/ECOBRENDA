/* Cliente de Supabase (auth + datos en la nube).

   Las credenciales se leen de variables de entorno de Vite — NUNCA se
   hardcodean ni se suben al repo:
     - VITE_SUPABASE_URL      (ej. https://xxxx.supabase.co, SIN /rest/v1)
     - VITE_SUPABASE_ANON_KEY (clave pública "anon"; segura para el frontend)

   Si faltan las variables (p. ej. build sin configurar), exportamos null y
   `isSupabaseConfigured = false`, para que la app NO truene: el dataStore
   seguirá funcionando con localStorage hasta que se configure. */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Aviso solo en desarrollo; en producción el dataStore cae a localStorage.
  console.warn('[supabase] Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — usando localStorage.')
}
