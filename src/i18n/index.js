/* i18n ligero (contexto propio, sin dependencias). Dos idiomas: es (default) y en.
   - translate(lang, key, vars): resuelve una clave con notación de punto
     ("home.title"), cae a español si falta en inglés, y a la clave si falta en
     ambos. Interpola {{var}}.
   - getInitialLang(): idioma para el primer render (localStorage -> navegador -> es).
   El idioma vive en AppContext (language/setLanguage) y persiste local + Supabase. */
import es from './es.json'
import en from './en.json'

const DICTS = { es, en }
export const LANGS = ['es', 'en']
export const LANG_KEY = 'bf:lang'

function resolve(dict, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict)
}

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
}

export function translate(lang, key, vars) {
  const primary = DICTS[lang] || DICTS.es
  let val = resolve(primary, key)
  if (val == null && lang !== 'es') val = resolve(DICTS.es, key) // fallback a español
  if (typeof val !== 'string') return key                        // última red: la clave
  return interpolate(val, vars)
}

export function getInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved && LANGS.includes(saved)) return saved
  } catch { /* noop */ }
  try {
    const nav = (navigator.language || 'es').toLowerCase()
    return nav.startsWith('en') ? 'en' : 'es'
  } catch { /* noop */ }
  return 'es'
}
