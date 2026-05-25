import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useSubscription } from '../hooks/useSubscription'
import { ROUTINES, PROGRAMS, CATEGORIES, difficultyColor } from '../data/workouts'

function RoutineCard({ r, onClick }) {
  return (
    <div className="wcard" onClick={onClick}>
      <div className="wthumb" style={{ background: r.gradient }}>
        <span>{r.emoji}</span>
        {r.isNew && <div className="badge-new">NUEVO</div>}
      </div>
      <div className="winfo">
        <h4>{r.title}</h4>
        <div className="wmeta">
          <span>{r.duration} min</span>
          <span>·</span>
          <span>{r.calories} cal</span>
          <span>·</span>
          <span style={{ color: difficultyColor(r.difficulty) }}>{r.difficulty}</span>
        </div>
        <div className="wrating">⭐ {r.rating} <small>({r.reviews})</small></div>
      </div>
    </div>
  )
}

export default function Entrena() {
  const navigate = useNavigate()
  const { openSheet } = useApp()
  const { isPremium } = useSubscription()

  const [tab, setTab] = useState('rutinas')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todos')

  // Gate premium
  if (!isPremium) {
    return (
      <section className="screen active" id="s-entrena">
        <div className="scroll">
          <div className="topgap" />
          <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">ENTRENA</div></div></div>
          <div className="pad reveal d2">
            <div className="brenda-promo" style={{ minHeight: 240 }}>
              <div className="glow" /><div className="shimmer" />
              <div className="lock-pill">🔒 PREMIUM</div>
              <div className="inner">
                <div className="kick">Biblioteca de entrenamientos</div>
                <h3>RUTINAS Y PROGRAMAS<br />HECHOS PARA TI</h3>
                <p>Decenas de rutinas guiadas y programas de varias semanas. Desbloquéalo con Brenda.</p>
                <button className="unlock" onClick={() => openSheet('paywall')}>VER PLANES →</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const matches = (r) => {
    const byCat = cat === 'Todos' || r.category === cat
    const term = q.trim().toLowerCase()
    const byQ = !term || r.title.toLowerCase().includes(term) || r.category.toLowerCase().includes(term)
    return byCat && byQ
  }
  const filtered = ROUTINES.filter(matches)
  const noFilter = !q.trim() && cat === 'Todos'
  const featured = noFilter ? filtered[0] : null
  const list = noFilter ? filtered.slice(1) : filtered

  const openDetail = (id) => navigate(`/entrena/${id}`)

  return (
    <section className="screen active" id="s-entrena">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1"><div><div className="hi">Premium</div><div className="name">ENTRENA</div></div></div>

        <div className="subtabs pad reveal d2">
          <button className={'subtab' + (tab === 'rutinas' ? ' sel' : '')} onClick={() => setTab('rutinas')}>Rutinas</button>
          <button className={'subtab' + (tab === 'programas' ? ' sel' : '')} onClick={() => setTab('programas')}>Programas</button>
        </div>

        {tab === 'rutinas' && (
          <>
            <div className="pad reveal d3">
              <input
                className="wsearch"
                placeholder="Buscar rutina…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="cat-row reveal d3">
              {CATEGORIES.map((c) => (
                <button key={c} className={'cat-pill' + (cat === c ? ' sel' : '')} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="wempty pad reveal d4">
                <div className="wempty-emoji">🔍</div>
                <h4>Sin resultados</h4>
                <p>No encontramos rutinas para tu búsqueda. Prueba otra categoría.</p>
              </div>
            )}

            {featured && (
              <div className="wfeatured reveal d4" style={{ background: featured.gradient }} onClick={() => openDetail(featured.id)}>
                <div className="wfeatured-shade" />
                <div className="badge-feat">DESTACADA</div>
                <div className="wfeatured-inner">
                  <div className="wfeatured-emoji">{featured.emoji}</div>
                  <h3>{featured.title}</h3>
                  <div className="wmeta light">
                    <span>{featured.duration} min</span><span>·</span>
                    <span>{featured.calories} cal</span><span>·</span>
                    <span>{featured.difficulty}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="wlist pad">
              {list.map((r, i) => (
                <div className={'reveal d' + Math.min(i + 4, 6)} key={r.id}>
                  <RoutineCard r={r} onClick={() => openDetail(r.id)} />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'programas' && (
          <div className="pad">
            {PROGRAMS.map((p, i) => (
              <div className={'prog-card reveal d' + Math.min(i + 3, 6)} key={p.id}>
                <div className="prog-thumb" style={{ background: p.gradient }}>{p.emoji}</div>
                <div className="prog-info">
                  <h4>{p.title}</h4>
                  <div className="wmeta">
                    <span>{p.weeks} semanas</span><span>·</span>
                    <span>{p.perWeek}x/sem</span><span>·</span>
                    <span style={{ color: difficultyColor(p.level) }}>{p.level}</span>
                  </div>
                  <p>{p.description}</p>
                  <button className="prog-go">EMPEZAR</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
