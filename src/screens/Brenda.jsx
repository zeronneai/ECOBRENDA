import { useApp } from '../store'

export default function Brenda() {
  const { unlocked, plan, openSheet, showToast } = useApp()
  const m = plan.macros

  return (
    <section className="screen active" id="s-brenda">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1">
          <div>
            <div className="hi">Premium</div>
            <div className="name">BRENDA FITNESS</div>
          </div>
        </div>

        {!unlocked && (
          <div id="brendaTabLocked" className="pad reveal d2">
            <div className="brenda-promo" style={{ minHeight: 240 }}>
              <div className="glow" />
              <div className="shimmer" />
              <div className="lock-pill">🔒 PREMIUM</div>
              <div className="inner">
                <div className="kick">Todo el método Brenda</div>
                <h3>RUTINAS Y DIETAS<br />HECHAS PARA TI</h3>
                <p>Planes diseñados para tu objetivo real. Sin genéricos.</p>
                <button className="unlock" onClick={() => openSheet('paywall')}>VER PLANES →</button>
              </div>
            </div>
          </div>
        )}

        {unlocked && (
          <div id="brendaTabUnlocked">
            <div className="macros reveal d1">
              <div className="macro kcal"><div className="v" id="mKcal2">{m.kcal}</div><div className="k">kcal</div></div>
              <div className="macro prot"><div className="v" id="mProt2">{m.protein}g</div><div className="k">proteína</div></div>
              <div className="macro carb"><div className="v" id="mCarb2">{m.carbs}g</div><div className="k">carbos</div></div>
            </div>

            <div className="sec-h reveal d2">
              <h2 id="wkTitle">{plan.workout.title.toUpperCase()}</h2>
              <span className="more" onClick={() => openSheet('mealsSheet')}>VER DIETA</span>
            </div>

            <div id="weekList">
              {plan.workout.days.map((d, i) => (
                <div
                  key={i}
                  className={'dayrow reveal d' + Math.min(i + 1, 5) + (i === 0 ? ' hot' : '')}
                  onClick={() =>
                    showToast(d.focus + ' · ' + d.ex.map((e) => e.n).slice(0, 2).join(', ') + '…')
                  }
                >
                  <div className="dl">{d.d[0]}</div>
                  <div className="dm">
                    <div className="t">{d.focus}</div>
                    <div className="d">{d.ex.length} ejercicios · {d.min} min</div>
                  </div>
                  <div className="ar">›</div>
                </div>
              ))}
            </div>

            <div className="brenda-signature reveal d4" style={{ marginTop: 8 }}>
              <div className="ba">B</div>
              <div className="bt">
                <b>Nota de Brenda</b><br />
                <span id="wkNote">{plan.workout.note}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
