/* Selector de idioma: 2 botones directos, cada uno en su propio idioma (sin
   pregunta que traducir). Badge con el código (ES/EN) — se ve bien en todos los
   dispositivos (los emoji de bandera no renderizan en Windows/varios Android).
   Reutilizado por el onboarding y por Perfil. */
const LANGS = [
  { id: 'es', code: 'ES', name: 'Español' },
  { id: 'en', code: 'EN', name: 'English' },
]

export default function LanguageSelect({ current, onPick, compact = false }) {
  return (
    <div className={'lang-select' + (compact ? ' compact' : '')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={'lang-btn' + (current === l.id ? ' sel' : '')}
          onClick={() => onPick(l.id)}
        >
          <span className="lang-code">{l.code}</span>
          <span className="lang-name">{l.name}</span>
        </button>
      ))}
    </div>
  )
}
