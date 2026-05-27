import { useState } from 'react'
import { signUp } from '../lib/auth'

/* Pantallas de autenticación (estética 100% Booty Alarm, sin branding Supabase).
   Vistas: 'signup' | 'login' | 'recover'. Por ahora implementada 'signup'
   (Crear cuenta); 'login' y 'recover' se agregan en los siguientes pasos.

   Props:
   - initialView: vista inicial
   - recap: texto del chip ("Hola, Brenda · Glúteos · 6:30 AM")
   - onAuthed(session): callback al autenticar (lo usa el Paso 5)
*/
export default function Auth({ initialView = 'signup', recap = '', onAuthed }) {
  const [view, setView] = useState(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const go = (v) => { setError(''); setView(v) }

  const doSignup = async () => {
    setError('')
    if (!email.trim()) return setError('Escribe tu email.')
    if (password.length < 6) return setError('La contraseña necesita mínimo 6 caracteres.')
    setBusy(true)
    const r = await signUp(email.trim(), password)
    setBusy(false)
    if (r.error) { setError(r.error); return }
    onAuthed?.(r.session)
  }

  return (
    <div id="auth">
      <div className="auth-brand">🍑 BOOTY ALARM</div>

      {view === 'signup' && (
        <div className="auth-card">
          <div className="auth-kick">Último paso 🔥</div>
          <h1 className="auth-title">CREA TU CUENTA</h1>
          <p className="auth-sub">Guarda tu plan, racha y alarmas en la nube.</p>

          {recap && <div className="auth-recap">{recap}</div>}

          <div className="auth-field">
            <input
              className="auth-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <input
              className="auth-input"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Contraseña (mín. 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSignup() }}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Ocultar' : 'Mostrar'}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="cta full auth-cta" onClick={doSignup} disabled={busy}>
            {busy ? 'CREANDO CUENTA…' : 'CREAR CUENTA'}
          </button>

          <div className="auth-links">
            <span>¿Ya tienes cuenta? </span>
            <span className="auth-link" onClick={() => go('login')}>Inicia sesión</span>
          </div>
        </div>
      )}
    </div>
  )
}
