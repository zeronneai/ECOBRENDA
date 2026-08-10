/* Cliente de Supabase (auth + datos en la nube).

   Credenciales: se prefieren las variables de entorno de Vite; si faltan (p. ej.
   el build nativo iOS/Android que NO inyecta env), se cae a valores PÚBLICOS
   horneados para que login + Storage (avatar) funcionen igual.
     - VITE_SUPABASE_URL      (ej. https://xxxx.supabase.co, SIN /rest/v1)
     - VITE_SUPABASE_ANON_KEY (clave pública "anon"; segura para el frontend)

   ⚠️ SOLO la clave `anon`/public va horneada (es pública: ya viaja en el bundle
   web y RLS protege los datos). La `service_role` NUNCA se hornea aquí. */

import { createClient } from '@supabase/supabase-js'

// Fallback horneado (público): permite que el build nativo funcione sin env.
const FALLBACK_SUPABASE_URL = 'https://cmmssmcmftxlqpvrouri.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbXNzbWNtZnR4bHFwdnJvdXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTcyNTUsImV4cCI6MjA5NTQ3MzI1NX0.KgKWeENbQj9_jglYF5Hdcg5uD7ViMkdNgidek-HVAkE'

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

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
