import { useRef, useEffect, useState } from 'react'

const STEP = 14 // px por unidad (coincide con el ancho del .tick)

/* Regla arrastrable de peso/altura — misma matemática que el prototipo,
   con opción de editar escribiendo el valor. */
export default function RulerPicker({ min, max, unit, value, onChange }) {
  const rulerRef = useRef(null)
  const trackRef = useRef(null)
  const numRef = useRef(null)
  const valueRef = useRef(value)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(String(value))

  const ticks = []
  for (let i = min; i <= max; i++) ticks.push(i)

  const setVal = (v, animate) => {
    v = Math.max(min, Math.min(max, v))
    valueRef.current = v
    const ruler = rulerRef.current
    const track = trackRef.current
    if (!ruler || !track) return
    const center = ruler.offsetWidth / 2
    const x = center - 7 - (v - min) * STEP
    track.style.transition = animate ? 'transform .25s cubic-bezier(.2,.8,.2,1)' : 'none'
    track.style.transform = 'translateX(' + x + 'px)'
    if (numRef.current) numRef.current.textContent = v
    Array.from(track.children).forEach((c, i) => {
      const bar = c.querySelector('.bar')
      if (bar) bar.style.background = i + min === v ? 'var(--magenta)' : ''
    })
  }

  // centra la regla al montarse (cuando el elemento ya tiene ancho)
  useEffect(() => {
    const id = setTimeout(() => setVal(value, false), 50)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // arrastre (touch + mouse)
  useEffect(() => {
    const ruler = rulerRef.current
    const track = trackRef.current
    if (!ruler || !track) return
    let dragging = false
    let startX = 0
    let startVal = 0
    const down = (e) => {
      dragging = true
      startX = e.touches ? e.touches[0].clientX : e.clientX
      startVal = valueRef.current
      track.style.transition = 'none'
    }
    const move = (e) => {
      if (!dragging) return
      const x = e.touches ? e.touches[0].clientX : e.clientX
      const dv = Math.round((startX - x) / STEP)
      setVal(startVal + dv, false)
    }
    const up = () => {
      if (!dragging) return
      dragging = false
      setVal(valueRef.current, true)
      onChange?.(valueRef.current)
      if (navigator.vibrate) navigator.vibrate(4)
    }
    ruler.addEventListener('touchstart', down, { passive: true })
    ruler.addEventListener('touchmove', move, { passive: true })
    ruler.addEventListener('touchend', up)
    ruler.addEventListener('mousedown', down)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      ruler.removeEventListener('touchstart', down)
      ruler.removeEventListener('touchmove', move)
      ruler.removeEventListener('touchend', up)
      ruler.removeEventListener('mousedown', down)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEdit = () => {
    setEditVal(String(valueRef.current))
    setEditing(true)
  }
  const commitEdit = () => {
    let v = parseInt(editVal, 10)
    if (Number.isNaN(v)) v = valueRef.current
    v = Math.max(min, Math.min(max, v))
    setEditing(false)
    setVal(v, true)
    onChange?.(v)
  }

  return (
    <>
      <div className="ruler-display" onClick={editing ? undefined : startEdit}>
        {editing ? (
          <input
            className="ruler-input"
            type="number"
            inputMode="numeric"
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.target.blur()
              }
            }}
          />
        ) : (
          <>
            <span className="num" ref={numRef}>{valueRef.current}</span>
            <span className="unit">{unit}</span>
            <span className="edit-hint">✎</span>
          </>
        )}
      </div>
      <div className="ruler" ref={rulerRef}>
        <div className="ruler-track" ref={trackRef}>
          {ticks.map((i) => (
            <div key={i} className={'tick' + (i % 5 === 0 ? ' major' : '')}>
              <div className="bar" />
              <div className="lab">{i}</div>
            </div>
          ))}
        </div>
        <div className="ruler-needle" />
      </div>
    </>
  )
}
