/* Selector de idioma: 2 botones directos, cada uno en su propio idioma (sin
   pregunta que traducir). Reutilizado por el onboarding y por Perfil. */
const LANGS = [
  { id: 'es', flag: '🇲🇽', name: 'Español' },
  { id: 'en', flag: '🇺🇸', name: 'English' },
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
          <span className="lang-flag">{l.flag}</span>
          <span className="lang-name">{l.name}</span>
        </button>
      ))}
    </div>
  )
}
