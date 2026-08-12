import { useState } from 'react'
import { useApp } from '../store'
import { signUp, signIn, resetPassword } from '../lib/auth'
import { openLegal } from '../lib/openLegal'

/* Pantallas de autenticación (estética 100% Booty Alarm, sin branding Supabase).
   Vistas: 'signup' | 'login' | 'recover'. Por ahora implementada 'signup'
   (Crear cuenta); 'login' y 'recover' se agregan en los siguientes pasos.

   Props:
   - initialView: vista inicial
   - recap: texto del chip ("Hola, Brenda · Glúteos · 6:30 AM")
   - onAuthed(session): callback al autenticar (lo usa el Paso 5)
*/
export default function Auth({ initialView = 'signup', recap = '', onAuthed, onClose }) {
  const { t } = useApp()
  const [view, setView] = useState(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(null) // clave i18n del mensaje de carga actual
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const go = (v) => { setError(''); setSent(false); setBusy(false); setStage(null); setView(v) }

  const doSignup = async () => {
    setError('')
    if (!email.trim()) return setError(t('auth.err_email'))
    if (password.length < 6) return setError(t('auth.err_pw_short'))
    setBusy(true); setStage('auth.creating')
    try {
      const r = await signUp(email.trim(), password)
      if (r.error) { setError(r.error); setBusy(false); setStage(null); return }
      // "Revisa tu correo" SOLO si Supabase pide confirmación (needsConfirm). Con la
      // confirmación DESACTIVADA (nuestro caso), hay sesión → entra DIRECTO.
      if (r.needsConfirm) { setSent(true); setBusy(false); setStage(null); return }
      setStage('auth.preparing') // 2ª etapa: pull/seed de la nube (onAuthed)
      await onAuthed?.(r.session, 'signup')
      // éxito → el gate se desmonta al fijar la sesión; NO reseteamos busy (sin parpadeo)
    } catch {
      setError(t('autherr.generic')); setBusy(false); setStage(null)
    }
  }

  const doLogin = async () => {
    setError('')
    if (!email.trim()) return setError(t('auth.err_email'))
    if (!password) return setError(t('auth.err_pw'))
    setBusy(true); setStage('auth.signing_in')
    try {
      const r = await signIn(email.trim(), password)
      if (r.error) { setError(r.error); setBusy(false); setStage(null); return }
      setStage('auth.preparing') // 2ª etapa: verificar/cargar perfil + sync (onAuthed)
      await onAuthed?.(r.session, 'login')
      // éxito → el gate se desmonta al fijar la sesión; NO reseteamos busy (sin parpadeo)
    } catch {
      setError(t('autherr.generic')); setBusy(false); setStage(null)
    }
  }

  const doRecover = async () => {
    setError('')
    if (!email.trim()) return setError(t('auth.err_email'))
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
        <button type="button" className="auth-back" onClick={onClose} aria-label={t('common.back')}>✕</button>
      )}
      <div className="auth-brand">🍑 BOOTY ALARM</div>

      {view === 'signup' && sent && (
        <div className="auth-card">
          <div className="auth-sent">
            <div className="ic">📧</div>
            <h1 className="auth-title">{t('auth.signup_sent_title')}</h1>
            <p className="auth-sub">{t('auth.signup_sent_sub_a')} <b style={{ color: '#fff' }}>{email.trim()}</b> {t('auth.signup_sent_sub_b')}</p>
            <button className="cta full auth-cta" onClick={() => go('login')}>{t('auth.back_to_login')}</button>
          </div>
        </div>
      )}

      {view === 'signup' && !sent && (
        <div className="auth-card">
          <div className="auth-kick">{t('auth.signup_kick')}</div>
          <h1 className="auth-title">{t('auth.signup_title')}</h1>
          <p className="auth-sub">{t('auth.signup_sub')}</p>

          {recap && <div className="auth-recap">{recap}</div>}

          <div className="auth-field">
            <input
              className="auth-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t('auth.email_ph')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <input
              className="auth-input"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('auth.pw_ph_signup')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSignup() }}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? t('auth.hide') : t('auth.show')}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="cta full auth-cta" onClick={doSignup} disabled={busy}>
            {busy ? (<><span className="btn-spinner" />{t(stage || 'auth.creating')}</>) : t('auth.create')}
          </button>

          <div className="auth-consent">
            {t('auth.consent_a')}{' '}
            <span className="auth-link" onClick={() => openLegal('/terms')}>{t('auth.terms')}</span>
            {' '}{t('auth.consent_and')}{' '}
            <span className="auth-link" onClick={() => openLegal('/privacy')}>{t('auth.privacy')}</span>.
          </div>

          <div className="auth-links">
            <span>{t('auth.have_account')} </span>
            <span className="auth-link" onClick={() => go('login')}>{t('auth.signin_link')}</span>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div className="auth-card">
          <div className="auth-kick">{t('auth.login_kick')}</div>
          <h1 className="auth-title">{t('auth.login_title')}</h1>
          <p className="auth-sub">{t('auth.login_sub')}</p>

          <div className="auth-field">
            <input
              className="auth-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t('auth.email_ph')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <input
              className="auth-input"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('auth.pw_ph')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? t('auth.hide') : t('auth.show')}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="cta full auth-cta" onClick={doLogin} disabled={busy}>
            {busy ? (<><span className="btn-spinner" />{t(stage || 'auth.signing_in')}</>) : t('auth.login_btn')}
          </button>

          <div className="auth-links">
            <div><span className="auth-link" onClick={() => go('recover')}>{t('auth.forgot')}</span></div>
            <div style={{ marginTop: 8 }}>
              <span>{t('auth.no_account')} </span>
              <span className="auth-link" onClick={() => go('signup')}>{t('auth.signup_link')}</span>
            </div>
          </div>
        </div>
      )}

      {view === 'recover' && (
        <div className="auth-card">
          <button type="button" className="auth-back" onClick={() => go('login')} aria-label={t('common.back')}>‹</button>

          {!sent ? (
            <>
              <div className="auth-kick">{t('auth.recover_kick')}</div>
              <h1 className="auth-title">{t('auth.recover_title')}</h1>
              <p className="auth-sub">{t('auth.recover_sub')}</p>

              <div className="auth-field">
                <input
                  className="auth-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t('auth.email_ph')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doRecover() }}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="cta full auth-cta" onClick={doRecover} disabled={busy}>
                {busy ? (<><span className="btn-spinner" />{t('auth.sending')}</>) : t('auth.send_link')}
              </button>
            </>
          ) : (
            <div className="auth-sent">
              <div className="ic">📧</div>
              <h1 className="auth-title">{t('auth.sent_title')}</h1>
              <p className="auth-sub">{t('auth.sent_sub_a')} <b style={{ color: '#fff' }}>{email.trim()}</b> {t('auth.sent_sub_b')}</p>
              <button className="cta full auth-cta" onClick={() => go('login')}>{t('auth.back_to_login')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
