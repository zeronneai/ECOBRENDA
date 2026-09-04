/* Sección Recompensas de Brenda Coins (modal, NO pestaña). Una sola experiencia:
   saldo + racha arriba, catálogo en siluetas con lo que falta, historial y aviso
   de caducidad. Para quien NO tiene premium PAGADO: catálogo bloqueado con el
   mensaje de que el canje es exclusivo del plan completo (los puntos igual se
   acumulan y se muestran).

   Fase 5: canje para premium pagado. El botón "Canjear" abre un formulario
   (nombre/correo/teléfono/dirección/talla si aplica). El descuento y la
   validación de saldo son SIEMPRE del servidor (bc_redeem); el cliente nunca
   manda saldo. */
import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { fetchRewards } from '../lib/bcData'
import { redeem } from '../lib/bc'

const ICON = { shaker: '🥤', termo: '🍶', colageno: '🧴', creatina: '🧪', proteina: '🥛', outfit: '👕' }
const TX_EMOJI = { earn_alarm: '⏰', earn_milestone: '🔥', earn_roulette: '🎰', earn_founder: '👑', redeem: '🎁', expire: '⌛', adjust: '⚙️' }
const SIZES = ['XS', 'S', 'M', 'L', 'XL']

export default function RewardsModal() {
  const { closeRewards, subscription, profile, session, language, t, refreshBcBalance } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')       // 'list' | 'form' | 'done'
  const [sel, setSel] = useState(null)             // recompensa en canje
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', address: '', size: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = () => fetchRewards().then((d) => { setData(d); setLoading(false) })
  useEffect(() => { let alive = true; fetchRewards().then((d) => { if (alive) { setData(d); setLoading(false) } }); return () => { alive = false } }, [])

  // Canje SOLO para premium PAGADO por Stripe (espejo de bc_is_premium_paid).
  const canRedeem = subscription?.accesoPremium === true
    && subscription?.status === 'active' && !!subscription?.stripeSubscriptionId

  const balance = data?.balance ?? 0
  const fmt = (n) => Number(n || 0).toLocaleString()
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long' }) : ''

  const openForm = (rw) => {
    setSel(rw)
    setForm({
      full_name: profile?.name || '',
      email: session?.user?.email || '',
      phone: profile?.waPhone || '',
      address: '',
      size: '',
    })
    setError('')
    setView('form')
  }

  const submit = async () => {
    if (submitting || !sel) return
    setError('')
    // Validación mínima de cliente (el servidor revalida todo).
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(t('bc.redeem.err.missing_fields')); return
    }
    if (sel.requires_size && !form.size) { setError(t('bc.redeem.err.size_required')); return }
    setSubmitting(true)
    const r = await redeem({
      slug: sel.slug,
      full_name: form.full_name.trim(), email: form.email.trim(),
      phone: form.phone.trim(), address: form.address.trim(),
      size: sel.requires_size ? form.size : null,
    })
    setSubmitting(false)
    if (r?.ok) {
      await load()            // refresca saldo/historial dentro del modal
      refreshBcBalance?.()    // y la píldora
      setView('done')
    } else {
      const reason = r?.reason || r?.error || 'generic'
      setError(t('bc.redeem.err.' + reason) || t('bc.redeem.err.generic'))
    }
  }

  const txLabel = (row) => {
    if (row.kind === 'earn_milestone') return `${t('bc.rewards.tx.earn_milestone')} · ${row.meta?.milestone ?? ''}${t('bc.rewards.days_suffix')}`
    return t('bc.rewards.tx.' + row.kind) || t('bc.rewards.tx.adjust')
  }

  // ── Vista: confirmación ────────────────────────────────────────────────────
  if (view === 'done') {
    return (
      <div className="rw-backdrop" role="dialog" aria-modal="true">
        <div className="rw-sheet rw-center">
          <div className="rw-done reveal">
            <div className="rw-done-ic">🎉</div>
            <div className="rw-done-t">{t('bc.redeem.done_t')}</div>
            <div className="rw-done-d">{t('bc.redeem.done_d', { reward: t('bc.reward.' + sel.slug) })}</div>
            <button className="rw-primary" onClick={closeRewards}>{t('bc.rewards.close')}</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista: formulario de canje ─────────────────────────────────────────────
  if (view === 'form' && sel) {
    return (
      <div className="rw-backdrop" role="dialog" aria-modal="true">
        <div className="rw-sheet">
          <div className="rw-form-top">
            <button className="rw-back" onClick={() => setView('list')} aria-label={t('bc.redeem.back')}>‹</button>
            <div className="rw-form-title">{t('bc.reward.' + sel.slug)}</div>
            <div className="rw-form-cost">{fmt(sel.cost)} BC</div>
          </div>
          <div className="rw-body">
            <div className="rw-form">
              <label className="rw-lbl">{t('bc.redeem.full_name')}</label>
              <input className="pf-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoComplete="name" />
              <label className="rw-lbl">{t('bc.redeem.email')}</label>
              <input className="pf-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              <label className="rw-lbl">{t('bc.redeem.phone')}</label>
              <input className="pf-input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
              <label className="rw-lbl">{t('bc.redeem.address')}</label>
              <textarea className="pf-input rw-addr" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" />
              {sel.requires_size && (
                <>
                  <label className="rw-lbl">{t('bc.redeem.size')}</label>
                  <div className="rw-sizes">
                    {SIZES.map((s) => (
                      <button key={s} type="button" className={'rw-size' + (form.size === s ? ' on' : '')} onClick={() => setForm({ ...form, size: s })}>{s}</button>
                    ))}
                  </div>
                </>
              )}
              {error && <div className="rw-err">{error}</div>}
              <button className="rw-primary" onClick={submit} disabled={submitting}>
                {submitting ? t('bc.redeem.sending') : t('bc.redeem.confirm', { n: fmt(sel.cost) })}
              </button>
              <div className="rw-form-note">{t('bc.redeem.note')}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista: lista (saldo + catálogo + historial) ────────────────────────────
  return (
    <div className="rw-backdrop" role="dialog" aria-modal="true">
      <div className="rw-sheet">
        <div className="rw-top">
          <button className="rw-close" onClick={closeRewards} aria-label={t('bc.rewards.close')}>✕</button>
          <div className="rw-bal-label">{t('bc.rewards.balance_label')}</div>
          <div className="rw-bal">🪙 {fmt(balance)}</div>
          {data && <div className="rw-streak">🔥 {t('bc.rewards.streak', { n: data.streak })}</div>}
        </div>

        <div className="rw-body">
          {loading && <div className="rw-loading">{t('bc.rewards.loading')}</div>}

          {!loading && data && (
            <>
              {data.expiringTotal > 0 && (
                <div className="rw-expire">⌛ {t('bc.rewards.expiring', { n: fmt(data.expiringTotal), date: fmtDate(data.expiringAt) })}</div>
              )}

              {!canRedeem && (
                <div className="rw-locked-plan">
                  <div className="rw-locked-t">🔒 {t('bc.rewards.locked_plan')}</div>
                  <div className="rw-locked-d">{t('bc.rewards.locked_plan_sub')}</div>
                </div>
              )}

              <div className="rw-sec-h">{t('bc.rewards.catalog_h')}</div>
              <div className="rw-grid">
                {data.catalog.map((rw) => {
                  const affordable = balance >= rw.cost
                  const unlocked = affordable && canRedeem
                  const pct = Math.min(100, Math.round((balance / rw.cost) * 100))
                  return (
                    <div key={rw.slug} className={'rw-card' + (unlocked ? ' unlocked' : '')}>
                      <div className={'rw-sil' + (unlocked ? ' on' : '')}>{ICON[rw.slug] || '🎁'}</div>
                      <div className="rw-name">{t(rw.name_key)}</div>
                      <div className="rw-cost">{fmt(rw.cost)} BC</div>
                      <div className="rw-bar"><i style={{ width: pct + '%' }} /></div>
                      {unlocked ? (
                        <button className="rw-redeem" onClick={() => openForm(rw)}>{t('bc.rewards.redeem')}</button>
                      ) : (
                        <div className="rw-status">
                          {affordable ? t('bc.rewards.reached') : t('bc.rewards.missing', { n: fmt(rw.cost - balance) })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="rw-sec-h">{t('bc.rewards.history_h')}</div>
              {data.history.length === 0 ? (
                <div className="rw-empty">{t('bc.rewards.no_history')}</div>
              ) : (
                <div className="rw-hist">
                  {data.history.map((row) => (
                    <div key={row.id} className="rw-tx">
                      <span className="rw-tx-ic">{TX_EMOJI[row.kind] || '•'}</span>
                      <span className="rw-tx-l">
                        <span className="rw-tx-t">{txLabel(row)}</span>
                        <span className="rw-tx-d">{fmtDate(row.created_at)}</span>
                      </span>
                      <span className={'rw-tx-amt' + (row.amount >= 0 ? ' pos' : ' neg')}>
                        {row.amount >= 0 ? '+' : ''}{fmt(row.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
