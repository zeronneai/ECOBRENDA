import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { GOALS, LEVELS, DAYS_OPTIONS } from '../data/onboarding'
import { openLegal } from '../lib/openLegal'
import { isIOSNative } from '../lib/platform'
import { pickAndUploadAvatar } from '../lib/avatar'
import LanguageSelect from '../components/LanguageSelect'
import DestelloCard from '../components/ui/DestelloCard'
import AiConsentModal from '../components/AiConsentModal'

const kgToLb = (kg) => Math.round(kg * 2.20462)
const lbToKg = (lb) => Math.round(lb / 2.20462)
const cmToIn = (cm) => Math.round(cm / 2.54)
const inToCm = (i) => Math.round(i * 2.54)
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export default function Profile() {
  const navigate = useNavigate()
  const { t, profile, updateProfile, subscription, settings, saveSettings, resetProgress, openSheet, showToast,
          cloudEnabled, session, openAuth, signOutAccount, openPortal, deleteAccount, language, setLanguage } = useApp()
  const { isPremium } = useSubscription()

  // Medidas con estado local (para escribir decimales / pies+pulgadas).
  const [wUnit, setWUnit] = useState(profile.weightUnit || 'kg')
  const [wVal, setWVal] = useState(String((profile.weightUnit === 'lb' ? kgToLb(profile.weight) : profile.weight)))
  const [hUnit, setHUnit] = useState(profile.heightUnit || 'cm')
  const [cmVal, setCmVal] = useState(String(profile.height))
  const [ftVal, setFtVal] = useState(String(Math.floor(cmToIn(profile.height) / 12)))
  const [inVal, setInVal] = useState(String(cmToIn(profile.height) % 12))

  const [confirm, setConfirm] = useState(null) // 'reset' | 'startover' | 'delete'
  const [showAiInfo, setShowAiInfo] = useState(false) // aviso "Privacidad de IA"
  const [deleteText, setDeleteText] = useState('') // confirmación escribiendo "ELIMINAR"
  const [deleting, setDeleting] = useState(false)
  const [changingAvatar, setChangingAvatar] = useState(false)

  const changeAvatar = async () => {
    if (changingAvatar) return
    setChangingAvatar(true)
    try {
      const url = await pickAndUploadAvatar()
      if (url) { updateProfile({ avatarUrl: url }); showToast(t('profile.toast_photo_ok')) }
    } catch (e) {
      showToast(e?.message || t('profile.toast_photo_err'))
    } finally {
      setChangingAvatar(false)
    }
  }

  const firstName = profile.name ? profile.name.split(' ')[0].toUpperCase() : t('home.hi')
  const avatarLetter = firstName[0] || 'B'
  const memberSince = profile.createdAt
    ? cap(new Date(profile.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' }))
    : null
  const goalText = profile.goal ? t('onboarding.goals.' + profile.goal + '.label') : ''
  const levelText = profile.level ? t('onboarding.levels.' + profile.level + '.label') : ''

  // ── Medidas ──
  const onWeight = (val) => {
    setWVal(val)
    const n = parseFloat(val)
    if (!Number.isFinite(n) || n <= 0) return
    updateProfile({ weight: wUnit === 'kg' ? n : lbToKg(n), weightUnit: wUnit })
  }
  const onWUnit = (u) => {
    setWUnit(u)
    setWVal(String(u === 'lb' ? kgToLb(profile.weight) : profile.weight))
    updateProfile({ weightUnit: u })
  }
  const onCm = (val) => {
    setCmVal(val)
    const n = parseFloat(val)
    if (Number.isFinite(n) && n > 0) updateProfile({ height: n, heightUnit: 'cm' })
  }
  const onFtIn = (ft, inch) => {
    setFtVal(ft); setInVal(inch)
    const f = parseInt(ft, 10) || 0
    const i = parseInt(inch, 10) || 0
    if (f > 0 || i > 0) updateProfile({ height: inToCm(f * 12 + i), heightUnit: 'ft' })
  }
  const onHUnit = (u) => {
    setHUnit(u)
    if (u === 'cm') setCmVal(String(profile.height))
    else { setFtVal(String(Math.floor(cmToIn(profile.height) / 12))); setInVal(String(cmToIn(profile.height) % 12)) }
    updateProfile({ heightUnit: u })
  }

  // ── Zona de peligro ──
  const doReset = () => { resetProgress(); setConfirm(null); showToast(t('profile.toast_reset')) }
  const doStartOver = () => {
    Object.keys(localStorage).filter((k) => k.startsWith('bf:') || k.startsWith('bac:')).forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }
  const doDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteAccount() // recarga a onboarding si tiene éxito
    } catch (e) {
      setDeleting(false)
      showToast(e?.message || t('profile.toast_delete_err'))
    }
  }

  const Toggle = ({ on, onClick }) => (
    <div className={'toggle' + (on ? ' on' : '')} onClick={onClick}><div className="knob" /></div>
  )

  return (
    <section className="screen active" id="s-profile">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1"><div><div className="hi">{t('profile.hi')}</div><div className="name">{t('profile.header')}</div></div></div>

        <div className="pad">
          {/* Tarjeta de usuario */}
          <div className="pf-user reveal d1">
            <button type="button" className="pf-avatar" onClick={changeAvatar} aria-label={t('profile.change_photo')}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : avatarLetter}
              <span className="pf-avatar-cam">📷</span>
            </button>
            <div>
              <div className="pf-name">{firstName}</div>
              <div className="pf-meta">{goalText}{levelText ? ` · ${levelText}` : ''}</div>
              {memberSince && <div className="pf-since">{t('profile.member_since', { date: memberSince })}</div>}
            </div>
          </div>

          {/* Acceso a Mi Progreso — antes huérfano (solo por URL). Visible arriba. */}
          <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right" className="pf-progress-entry reveal d1">
            <button className="pf-pe-btn" onClick={() => navigate('/progreso')}>
              <div className="pf-pe-ic">📊</div>
              <div className="pf-pe-tx">
                <span className="destello-title pf-pe-title">{t('profile.progress_title')}</span>
                <span className="pf-pe-sub">{t('profile.progress_sub')}</span>
              </div>
              <div className="pf-pe-chev">›</div>
            </button>
          </DestelloCard>

          {/* Suscripción */}
          <div className={'pf-sub reveal d2' + (isPremium ? ' prem' : '') + (isIOSNative() && !isPremium ? ' info-only' : '')}>
            <div>
              <div className="pf-sub-t">{isPremium ? t('profile.sub_premium_t') : t('profile.sub_free_t')}</div>
              <div className="pf-sub-d">{isPremium ? t('profile.sub_premium_d', { plan: subscription.plan || t('profile.sub_premium_d_active') }) : t('profile.sub_free_d')}</div>
            </div>
            {/* iOS (App Store Rule 3.1.1): NINGÚN botón que dirija a pago externo.
                Ni "Hazte premium" (checkout) ni "Gestionar" (Customer Portal de
                Stripe) — ambos son links a pago fuera de la App Store. En iOS solo
                se muestra el ESTADO de la suscripción, sin acciones de pago. En
                web/Android sí aparecen. */}
            {!isIOSNative() && (
              isPremium ? (
                <button onClick={() => openPortal()}>{t('profile.manage')}</button>
              ) : (
                <button onClick={() => openSheet('paywall')}>{t('profile.go_premium')}</button>
              )
            )}
          </div>

          {/* Cuenta en la nube (sesión) */}
          {cloudEnabled && (
            <div className="pf-sec reveal d2">
              <h3>{t('profile.cloud_h')}</h3>
              {session ? (
                <>
                  <div className="pf-link-row"><span>{t('profile.session')}</span><span className="v" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.email}</span></div>
                  <button className="pf-danger-btn" onClick={signOutAccount}>{t('profile.sign_out')}</button>
                </>
              ) : (
                <>
                  <div className="set-row"><div><div className="t">{t('profile.save_data_t')}</div><div className="d">{t('profile.save_data_d')}</div></div></div>
                  <button className="cta full" style={{ marginTop: 12 }} onClick={() => openAuth('signup')}>{t('profile.create_account')}</button>
                  <div className="pf-link-row" style={{ justifyContent: 'center', marginTop: 6 }} onClick={() => openAuth('login')}>
                    <span className="auth-link">{t('profile.have_account_login')}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Idioma / Language */}
          <div className="pf-sec reveal d2">
            <h3>Idioma / Language</h3>
            <LanguageSelect current={language} onPick={setLanguage} compact />
          </div>

          {/* Mi cuenta */}
          <div className="pf-sec reveal d3">
            <h3>{t('profile.account_h')}</h3>
            <div className="pf-field">
              <label>{t('profile.name')}</label>
              <input className="pf-input" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
            </div>
            <div className="pf-field">
              <label>{t('profile.goal')}</label>
              <select className="pf-select" value={profile.goal} onChange={(e) => updateProfile({ goal: e.target.value })}>
                {GOALS.map((g) => <option key={g.id} value={g.id}>{t('onboarding.goals.' + g.id + '.label')}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>{t('profile.level')}</label>
              <select className="pf-select" value={profile.level || 'principiante'} onChange={(e) => updateProfile({ level: e.target.value })}>
                {LEVELS.map((l) => <option key={l.id} value={l.id}>{t('onboarding.levels.' + l.id + '.label')}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>{t('profile.days_week')}</label>
              <select className="pf-select" value={profile.daysPerWeek || 4} onChange={(e) => updateProfile({ daysPerWeek: parseInt(e.target.value, 10) })}>
                {DAYS_OPTIONS.map((d) => <option key={d} value={d}>{t('profile.days_unit', { n: d })}</option>)}
              </select>
            </div>
          </div>

          {/* Medidas */}
          <div className="pf-sec reveal d4">
            <h3>{t('profile.measures_h')}</h3>
            <div className="pf-field">
              <label>{t('profile.weight')}</label>
              <div className="pf-measure">
                <input className="pf-input" type="number" step="0.1" inputMode="decimal" value={wVal} onChange={(e) => onWeight(e.target.value)} />
                <div className="unit-toggle">
                  <button className={wUnit === 'kg' ? 'sel' : ''} onClick={() => onWUnit('kg')}>KG</button>
                  <button className={wUnit === 'lb' ? 'sel' : ''} onClick={() => onWUnit('lb')}>LB</button>
                </div>
              </div>
            </div>
            <div className="pf-field">
              <label>{t('profile.height')}</label>
              <div className="pf-measure">
                {hUnit === 'cm' ? (
                  <input className="pf-input" type="number" inputMode="numeric" value={cmVal} onChange={(e) => onCm(e.target.value)} />
                ) : (
                  <div className="pf-ft">
                    <input className="pf-input" type="number" inputMode="numeric" placeholder={t('profile.ft')} value={ftVal} onChange={(e) => onFtIn(e.target.value, inVal)} />
                    <input className="pf-input" type="number" inputMode="numeric" placeholder={t('profile.in')} value={inVal} onChange={(e) => onFtIn(ftVal, e.target.value)} />
                  </div>
                )}
                <div className="unit-toggle">
                  <button className={hUnit === 'cm' ? 'sel' : ''} onClick={() => onHUnit('cm')}>CM</button>
                  <button className={hUnit === 'ft' ? 'sel' : ''} onClick={() => onHUnit('ft')}>FT</button>
                </div>
              </div>
            </div>
          </div>

          {/* Notificaciones */}
          <div className="pf-sec reveal d5">
            <h3>{t('profile.notif_h')}</h3>
            <div className="set-row">
              <div><div className="t">{t('profile.reminder_t')}</div><div className="d">{t('profile.reminder_d')}</div></div>
              <Toggle on={settings.reminder} onClick={() => saveSettings({ reminder: !settings.reminder })} />
            </div>
            {settings.reminder && (
              <div className="pf-field" style={{ marginTop: 12 }}>
                <label>{t('profile.reminder_time')}</label>
                <input className="pf-input" type="time" value={settings.reminderTime} onChange={(e) => saveSettings({ reminderTime: e.target.value })} />
              </div>
            )}
            <div className="set-row">
              <div><div className="t">{t('profile.streak_alerts_t')}</div><div className="d">{t('profile.streak_alerts_d')}</div></div>
              <Toggle on={settings.streakAlerts} onClick={() => saveSettings({ streakAlerts: !settings.streakAlerts })} />
            </div>
            <div className="set-row">
              <div><div className="t">{t('profile.weekly_t')}</div><div className="d">{t('profile.weekly_d')}</div></div>
              <Toggle on={settings.weeklyReport} onClick={() => saveSettings({ weeklyReport: !settings.weeklyReport })} />
            </div>
          </div>

          {/* Legal */}
          <div className="pf-sec reveal d6">
            <h3>{t('profile.legal_h')}</h3>
            <div className="pf-link-row" onClick={() => openLegal('/privacy')}>
              <span>{t('profile.privacy')}</span><span className="v">›</span>
            </div>
            <div className="pf-link-row" onClick={() => openLegal('/terms')}>
              <span>{t('profile.terms')}</span><span className="v">›</span>
            </div>
            <div className="pf-link-row" onClick={() => setShowAiInfo(true)}>
              <span>{t('profile.ai_privacy')}</span><span className="v">›</span>
            </div>
            <div className="pf-link-row">
              <span>{t('profile.version')}</span><span className="v">0.1.0</span>
            </div>
          </div>

          {/* Zona de peligro */}
          <div className="pf-sec reveal d6">
            <h3>{t('profile.danger_h')}</h3>

            {confirm === 'reset' ? (
              <div className="pf-danger-confirm">
                <p>{t('profile.reset_confirm')}</p>
                <div className="row">
                  <button className="yes" onClick={doReset}>{t('profile.reset_yes')}</button>
                  <button className="no" onClick={() => setConfirm(null)}>{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <button className="pf-danger-btn" onClick={() => setConfirm('reset')}>{t('profile.reset_btn')}</button>
            )}

            {confirm === 'startover' ? (
              <div className="pf-danger-confirm">
                <p>{t('profile.startover_confirm')}</p>
                <div className="row">
                  <button className="yes" onClick={doStartOver}>{t('profile.startover_yes')}</button>
                  <button className="no" onClick={() => setConfirm(null)}>{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <button className="pf-danger-btn hard" onClick={() => setConfirm('startover')}>{t('profile.startover_btn')}</button>
            )}

            {confirm === 'delete' ? (
              <div className="pf-danger-confirm">
                <p><b>{t('profile.delete_perm')}</b> {t('profile.delete_desc')}</p>
                <p style={{ marginTop: 8 }}>{t('profile.delete_type')} <b>{t('profile.delete_keyword')}</b>:</p>
                <input
                  className="pf-input"
                  style={{ marginTop: 8 }}
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder={t('profile.delete_keyword')}
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="yes"
                    disabled={deleteText.trim().toUpperCase() !== t('profile.delete_keyword').toUpperCase() || deleting}
                    onClick={doDelete}
                  >
                    {deleting ? t('profile.delete_btn_busy') : t('profile.delete_btn')}
                  </button>
                  <button className="no" onClick={() => { setConfirm(null); setDeleteText('') }}>{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <button className="pf-danger-btn hard" onClick={() => { setConfirm('delete'); setDeleteText('') }}>{t('profile.delete_btn')}</button>
            )}
          </div>
        </div>
      </div>

      {showAiInfo && (
        <AiConsentModal
          variant="info"
          consentDate={profile.aiConsent?.date}
          onClose={() => setShowAiInfo(false)}
        />
      )}
    </section>
  )
}
