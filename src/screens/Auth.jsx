import { useState } from 'react'
import { signUp, signIn, resetPassword } from '../lib/auth'

/* Pantallas de autenticación (estética 100% Booty Alarm, sin branding Supabase).
   Vistas: 'signup' | 'login' | 'recover'. Por ahora implementada 'signup'
   (Crear cuenta); 'login' y 'recover' se agregan en los siguientes pasos.

   Props:
   - initialView: vista inicial
   - recap: texto del chip ("Hola, Brenda · Glúteos · 6:30 AM")
   - onAuthed(session): callback al autenticar (lo usa el Paso 5)
*/
export default function Auth({ initialView = 'signup', recap = '', onAuthed, onClose }) {
  const [view, setView] = useState(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const go = (v) => { setError(''); setSent(false); setView(v) }

  const doSignup = async () => {
    setError('')
    if (!email.trim()) return setError('Escribe tu email.')
    if (password.length < 6) return setError('La contraseña necesita mínimo 6 caracteres.')
    setBusy(true)
    const r = await signUp(email.trim(), password)
    setBusy(false)
    if (r.error) { setError(r.error); return }
    onAuthed?.(r.session, 'signup')
  }

  const doLogin = async () => {
    setError('')
    if (!email.trim()) return setError('Escribe tu email.')
    if (!password) return setError('Escribe tu contraseña.')
    setBusy(true)
    const r = await signIn(email.trim(), password)
    setBusy(false)
    if (r.error) { setError(r.error); return }
    onAuthed?.(r.session, 'login')
  }

  const doRecover = async () => {
    setError('')
    if (!email.trim()) return setError('Escribe tu email.')
    setBusy(true)
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const r = await resetPassword(email.trim(), redirectTo)
    setBusy(false)
    if (r.error) { setError(r.error); return }
    setSent(true)
  }

  return (
    <div id="auth">
      {onClose && view !== 'recover' && (
        <button type="button" className="auth-back" onClick={onClose} aria-label="Cerrar">✕</button>
      )}
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

      {view === 'login' && (
        <div className="auth-card">
          <div className="auth-kick">Bienvenida de vuelta 🍑</div>
          <h1 className="auth-title">INICIA SESIÓN</h1>
          <p className="auth-sub">Entra para seguir con tu plan.</p>

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
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Ocultar' : 'Mostrar'}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="cta full auth-cta" onClick={doLogin} disabled={busy}>
            {busy ? 'ENTRANDO…' : 'INICIAR SESIÓN'}
          </button>

          <div className="auth-links">
            <div><span className="auth-link" onClick={() => go('recover')}>¿Olvidaste tu contraseña?</span></div>
            <div style={{ marginTop: 8 }}>
              <span>¿No tienes cuenta? </span>
              <span className="auth-link" onClick={() => go('signup')}>Regístrate</span>
            </div>
          </div>
        </div>
      )}

      {view === 'recover' && (
        <div className="auth-card">
          <button type="button" className="auth-back" onClick={() => go('login')} aria-label="Volver">‹</button>

          {!sent ? (
            <>
              <div className="auth-kick">Sin bronca</div>
              <h1 className="auth-title">RECUPERA TU ACCESO</h1>
              <p className="auth-sub">Te mandamos un link a tu correo para crear una nueva contraseña.</p>

              <div className="auth-field">
                <input
                  className="auth-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doRecover() }}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="cta full auth-cta" onClick={doRecover} disabled={busy}>
                {busy ? 'ENVIANDO…' : 'ENVIAR LINK'}
              </button>
            </>
          ) : (
            <div className="auth-sent">
              <div className="ic">📧</div>
              <h1 className="auth-title">REVISA TU CORREO</h1>
              <p className="auth-sub">Te enviamos un link a <b style={{ color: '#fff' }}>{email.trim()}</b> para crear una nueva contraseña.</p>
              <button className="cta full auth-cta" onClick={() => go('login')}>VOLVER A INICIAR SESIÓN</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
