/* Render premium de la RUTINA generada (Entrena). Esquema: title, note, days[]
   con focus/warmup/exercises[]{name,sets,reps,rest,tip}.
   - Hero (DestelloCard) con título + note de Brenda + KPIs reales.
   - Acordeón por día con progreso + barra; día completo en lima.
   - SWITCH por día (gym<->casa): genera la versión del día para el lugar
     contrario (mismo grupo muscular), inmediata, con confirmación la 1ª vez, y
     luego alterna entre las dos versiones sin regenerar (dedup en servidor). */
import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { getBrendaMessage } from '../data/brendaMessages'
import { generateWorkoutDay } from '../lib/aiPlans'
import DestelloCard from './ui/DestelloCard'
import AiPlanFooter from './AiPlanFooter'

export default function WorkoutPlanView({ plan, locked, daysLeft, planId, onRenew, onDevForce }) {
  const { getPlanCompletions, toggleExerciseDone, showToast, confetti, t, language, profile } = useApp()
  const days = plan?.days || []
  const planKey = `${plan?.title || 'plan'}::${days.length}`

  // Lugar objetivo del switch = el CONTRARIO al del perfil (home→gym, si no →home).
  const target = profile?.trainLocation === 'home' ? 'gym' : 'home'

  const [open, setOpen] = useState(0)
  const [comp, setComp] = useState(() => getPlanCompletions(planKey))
  const [flash, setFlash] = useState('')

  // Switch por día.
  const [alts, setAlts] = useState({})         // { di: dayContent }
  const [showAlt, setShowAlt] = useState({})   // { di: bool }
  const [busyDay, setBusyDay] = useState(null) // di generando
  const [confirmDay, setConfirmDay] = useState(null)
  const [errDay, setErrDay] = useState(null)

  const kpis = useMemo(() => {
    let ex = 0, sets = 0
    for (const d of days) {
      const list = d.exercises || []
      ex += list.length
      for (const e of list) sets += Number(e.sets) || 0
    }
    return { days: days.length, ex, sets }
  }, [days])

  const doneCount = (di) => Object.keys(comp[di] || {}).length
  const isDone = (di, ei) => !!(comp[di] && comp[di][ei])
  const dayCount = (di) => ((showAlt[di] && alts[di] ? alts[di] : days[di])?.exercises?.length || 0)
  const dayComplete = (di) => dayCount(di) > 0 && doneCount(di) >= dayCount(di)

  const toggle = (di, ei, exCount, focus) => {
    const next = !isDone(di, ei)
    const wasComplete = dayComplete(di)
    const updated = toggleExerciseDone(planKey, di, ei, next, exCount, focus)
    setComp(updated)
    if (next) {
      const nowDone = Object.keys(updated[di] || {}).length
      const nowComplete = exCount > 0 && nowDone >= exCount
      if (nowComplete && !wasComplete) {
        confetti?.(60)
        setFlash(getBrendaMessage(language, 'dayCompleted'))
        setTimeout(() => setFlash(''), 2500)
      } else {
        showToast?.(getBrendaMessage(language, 'exerciseDone'))
      }
    }
  }

  // Tap en el switch: si ya existe la alterna → alterna vista; si no → confirmar.
  const onSwitchTap = (di) => {
    setErrDay(null)
    if (alts[di]) { setShowAlt((s) => ({ ...s, [di]: !s[di] })); return }
    setConfirmDay(di)
  }
  const onConfirm = async (di) => {
    setConfirmDay(null); setErrDay(null); setBusyDay(di)
    try {
      const { day } = await generateWorkoutDay(planId, di)
      setAlts((a) => ({ ...a, [di]: day }))
      setShowAlt((s) => ({ ...s, [di]: true }))
    } catch {
      setErrDay(di)
    } finally {
      setBusyDay(null)
    }
  }

  return (
    <div className="ai-plan reveal d2">
      <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
        <span className="destello-title" style={{ fontSize: 26, color: 'var(--txt)' }}>{plan.title}</span>
        <div className="wk-hero-note">
          <div className="b">B</div>
          <p>{plan.note}</p>
        </div>
        <div className="wk-kpis">
          <div className="wk-kpi"><span className="n">{kpis.days}</span><div className="k">{t('ai.kpi_days')}</div></div>
          <div className="wk-kpi"><span className="n">{kpis.ex}</span><div className="k">{t('ai.kpi_ex')}</div></div>
          <div className="wk-kpi"><span className="n">{kpis.sets}</span><div className="k">{t('ai.kpi_sets')}</div></div>
        </div>
      </DestelloCard>

      <div className="wk-days">
        {days.map((d, di) => {
          const dd = (showAlt[di] && alts[di]) ? alts[di] : d // versión mostrada (original o alterna)
          const total = (dd.exercises || []).length
          const done = doneCount(di)
          const complete = dayComplete(di)
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <div className={'wk-day' + (complete ? ' done' : '')} key={di}>
              <button className="wk-day-head" onClick={() => setOpen(open === di ? -1 : di)}>
                <div className="wk-day-badge">{complete ? '✓' : di + 1}</div>
                <div className="wk-day-t">
                  <b>{d.day}{showAlt[di] && alts[di] ? (target === 'home' ? ' · 🏠' : ' · 🏋️') : ''}</b>
                  <span className="focus">{dd.focus}</span>
                  <div className="wk-dayprog">
                    <div className="wk-bar"><i style={{ width: pct + '%' }} /></div>
                    <span className="c">{done}/{total}</span>
                  </div>
                </div>
                <div className="wk-day-chev">{open === di ? '−' : '+'}</div>
              </button>

              {open === di && (
                <div className="wk-day-body">
                  {/* Switch gym<->casa del día (solo con plan guardado). */}
                  {planId && (
                    <div className="wk-switch">
                      {busyDay === di ? (
                        <div className="wk-switch-load"><span className="btn-spinner" />{t('ai.day_alt_loading')}</div>
                      ) : confirmDay === di ? (
                        <div className="wk-switch-confirm">
                          <p>{t('ai.day_alt_confirm')}</p>
                          <div className="wk-switch-acts">
                            <button className="wk-switch-yes" onClick={() => onConfirm(di)}>{t('ai.day_alt_yes')}</button>
                            <button className="wk-switch-no" onClick={() => setConfirmDay(null)}>{t('ai.day_alt_cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <button className="wk-switch-btn" onClick={() => onSwitchTap(di)}>
                          {showAlt[di] ? t('ai.day_alt_original') : (target === 'home' ? t('ai.day_alt_home') : t('ai.day_alt_gym'))}
                        </button>
                      )}
                      {errDay === di && <div className="wk-switch-err">{t('ai.day_alt_err')}</div>}
                    </div>
                  )}

                  {dd.warmup && <div className="wk-warmup"><b>{t('ai.warmup')}</b> {dd.warmup}</div>}
                  {(dd.exercises || []).map((e, ei) => {
                    const on = isDone(di, ei)
                    return (
                      <div className={'wk-ex' + (on ? ' done' : '')} key={ei}>
                        <div className="wk-ex-info">
                          <div className="wk-ex-top">
                            <h4>{e.name}</h4>
                            <span className="wk-ex-sr">{e.sets}×{e.reps}</span>
                          </div>
                          <div className="wk-ex-meta">{t('ai.rest', { rest: e.rest })}</div>
                          {e.tip && <div className="wk-ex-tip">💡 {e.tip}</div>}
                        </div>
                        <button
                          className={'wk-done' + (on ? ' on' : '')}
                          onClick={() => toggle(di, ei, total, dd.focus)}
                          aria-pressed={on}
                        >
                          {on ? t('ai.done') : t('ai.mark')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AiPlanFooter locked={locked} daysLeft={daysLeft} onRenew={onRenew} onDevForce={onDevForce} />

      {flash && (
        <div className="brenda-flash">
          <div className="bf-card">
            <div className="bf-emoji">🔥</div>
            <div className="bf-msg">{flash}</div>
          </div>
        </div>
      )}
    </div>
  )
}
