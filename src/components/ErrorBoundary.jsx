import React from 'react'
import { translate, getInitialLang } from '../i18n'

/* Límite de errores de nivel superior. Sin esto, cualquier error de render en
   una pantalla (un plan de IA malformado, datos raros en una gráfica, etc.)
   desmontaba TODO el árbol de React → pantalla blanca permanente sin salida.

   Aquí lo atrapamos y mostramos una tarjeta amigable con botón de recarga. Es
   una clase porque los error boundaries de React requieren getDerivedStateFromError
   / componentDidCatch (no hay equivalente con hooks). Toma el idioma directo de
   localStorage (no hay contexto disponible si el árbol se cayó). */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Deja rastro en consola para diagnóstico; no rompe la UI.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const lang = getInitialLang()
    const t = (k) => translate(lang, k)
    return (
      <div id="perms" className="show">
        <div className="perms-card">
          <div className="perms-emoji">🍑</div>
          <h2 className="perms-title">{t('crash.title')}</h2>
          <p className="perms-lead">{t('crash.lead')}</p>
          <button className="perms-go" onClick={() => window.location.reload()}>
            {t('crash.reload')}
          </button>
        </div>
      </div>
    )
  }
}
