/* Render premium de la RUTINA generada (Entrena). Esquema: title, note, days[]
   con focus/warmup/exercises[]{name,sets,reps,rest,tip}.
   - Hero (DestelloCard) con título Anton + note de Brenda + KPIs reales.
   - Acordeón por día con progreso X/Y + barra; día completo en lima.
   - Botón DONE por ejercicio (glass → lima ✓), persistido en localStorage; al
     completar un día por primera vez cuenta como 1 workout (vía AppContext). */
import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { getBrendaMessage } from '../data/brendaMessages'
import DestelloCard from './ui/DestelloCard'
import AiPlanFooter from './AiPlanFooter'

export default function WorkoutPlanView({ plan, locked, daysLeft, onRenew, onDevForce }) {
  const { getPlanCompletions, toggleExerciseDone, showToast, confetti, t, language } = useApp()
  const days = plan?.days || []
  const planKey = `${plan?.title || 'plan'}::${days.length}`

  const [open, setOpen] = useState(0)
  const [comp, setComp] = useState(() => getPlanCompletions(planKey))
  const [flash, setFlash] = useState('')

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
  const dayComplete = (di) => (days[di]?.exercises?.length || 0) > 0 && doneCount(di) >= days[di].exercises.length

  const toggle = (di, ei, exCount, focus) => {
    const next = !isDone(di, ei)
    const wasComplete = dayComplete(di)
    const updated = toggleExerciseDone(planKey, di, ei, next, exCount, focus)
    setComp(updated)
    if (next) {
      const nowDone = Object.keys(updated[di] || {}).length
      const nowComplete = exCount > 0 && nowDone >= exCount
      if (nowComplete && !wasComplete) {
        // Día completado por primera vez: celebración destacada.
        confetti?.(60)
        setFlash(getBrendaMessage(language, 'dayCompleted'))
        setTimeout(() => setFlash(''), 2500)
      } else {
        // Micro-mensaje sutil por ejercicio marcado.
        showToast?.(getBrendaMessage(language, 'exerciseDone'))
      }
    }
  }

  return (
    <div className="ai-plan reveal d2">
      {/* Hero */}
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

      {/* Días */}
      <div className="wk-days">
        {days.map((d, di) => {
          const total = (d.exercises || []).length
          const done = doneCount(di)
          const complete = dayComplete(di)
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <div className={'wk-day' + (complete ? ' done' : '')} key={di}>
              <button className="wk-day-head" onClick={() => setOpen(open === di ? -1 : di)}>
                <div className="wk-day-badge">{complete ? '✓' : di + 1}</div>
                <div className="wk-day-t">
                  <b>{d.day}</b>
                  <span className="focus">{d.focus}</span>
                  <div className="wk-dayprog">
                    <div className="wk-bar"><i style={{ width: pct + '%' }} /></div>
                    <span className="c">{done}/{total}</span>
                  </div>
                </div>
                <div className="wk-day-chev">{open === di ? '−' : '+'}</div>
              </button>

              {open === di && (
                <div className="wk-day-body">
                  {d.warmup && <div className="wk-warmup"><b>{t('ai.warmup')}</b> {d.warmup}</div>}
                  {(d.exercises || []).map((e, ei) => {
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
                          onClick={() => toggle(di, ei, total, d.focus)}
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
