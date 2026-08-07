import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { translate, getInitialLang } from '../i18n'

/* Página legal pública (Privacy / Terms). Vive FUERA de AppShell para que la
   carga directa por URL (Apple/Google reviewers) funcione sin login, sin
   onboarding, sin gate de cuenta. Sin AppProvider aquí: el idioma se lee de
   localStorage vía getInitialLang(). */
export default function LegalPage({ title, markdown }) {
  const lang = getInitialLang()
  useEffect(() => {
    const prev = document.title
    document.title = `${title} — Booty Alarm`
    return () => { document.title = prev }
  }, [title])

  return (
    <div id="legal">
      <header className="legal-top">
        <a href="/" className="legal-back" aria-label={translate(lang, 'legal.back_aria')}>{translate(lang, 'legal.back')}</a>
        <div className="legal-brand">🍑 BOOTY ALARM</div>
        <div className="legal-spacer" />
      </header>
      <main className="legal-content">
        <ReactMarkdown
          components={{
            // Links externos en nueva pestaña.
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </main>
    </div>
  )
}
