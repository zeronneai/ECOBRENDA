/* Sección Recompensas de Brenda Coins (modal, NO pestaña). Una sola experiencia:
   saldo + racha arriba, catálogo en siluetas con lo que falta, historial y aviso
   de caducidad. Para quien NO tiene premium PAGADO: catálogo bloqueado con el
   mensaje de que el canje es exclusivo del plan completo (los puntos igual se
   acumulan y se muestran). El canje real llega en la Fase 5. */
import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { fetchRewards } from '../lib/bcData'

const ICON = { shaker: '🥤', termo: '🍶', colageno: '🧴', creatina: '🧪', proteina: '🥛', outfit: '👕' }
const TX_EMOJI = { earn_alarm: '⏰', earn_milestone: '🔥', earn_roulette: '🎰', earn_founder: '👑', redeem: '🎁', expire: '⌛', adjust: '⚙️' }

export default function RewardsModal() {
  const { closeRewards, subscription, language, t } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchRewards().then((d) => { if (alive) { setData(d); setLoading(false) } })
    return () => { alive = false }
  }, [])

  // Canje SOLO para premium PAGADO por Stripe (espejo de bc_is_premium_paid).
  const canRedeem = subscription?.accesoPremium === true
    && subscription?.status === 'active' && !!subscription?.stripeSubscriptionId

  const balance = data?.balance ?? 0
  const fmt = (n) => Number(n || 0).toLocaleString()
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long' }) : ''

  const txLabel = (row) => {
    if (row.kind === 'earn_milestone') return `${t('bc.rewards.tx.earn_milestone')} · ${row.meta?.milestone ?? ''}${t('bc.rewards.days_suffix')}`
    if (row.kind === 'redeem') return `${t('bc.rewards.tx.redeem')}`
    return t('bc.rewards.tx.' + row.kind) || t('bc.rewards.tx.adjust')
  }

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
              {/* Aviso de caducidad */}
              {data.expiringTotal > 0 && (
                <div className="rw-expire">⌛ {t('bc.rewards.expiring', { n: fmt(data.expiringTotal), date: fmtDate(data.expiringAt) })}</div>
              )}

              {/* Gate de canje para quien no paga el plan completo */}
              {!canRedeem && (
                <div className="rw-locked-plan">
                  <div className="rw-locked-t">🔒 {t('bc.rewards.locked_plan')}</div>
                  <div className="rw-locked-d">{t('bc.rewards.locked_plan_sub')}</div>
                </div>
              )}

              {/* Catálogo en siluetas */}
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
                      <div className="rw-status">
                        {affordable
                          ? (canRedeem ? t('bc.rewards.available') : t('bc.rewards.reached'))
                          : t('bc.rewards.missing', { n: fmt(rw.cost - balance) })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Historial */}
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
