import { useRef, useEffect, useState } from 'react'

const ITEM = 54 // alto de cada item (coincide con .wheel .wi)

/* Rueda estilo iPhone. Deja que el navegador haga el snap nativo (CSS
   scroll-snap) y solo LEE el índice cuando el scroll se asienta — sin pelearse
   con un scrollTo programático (eso era lo que la hacía sentir "rara"). Tocar
   un número lo centra. */
export default function WheelPicker({ items, initIdx = 0, onChange, isAP = false }) {
  const ref = useRef(null)
  const settleTimer = useRef(null)
  const lastIdx = useRef(initIdx)
  const [sel, setSel] = useState(initIdx)

  // Posición inicial (sin animación) una vez que el elemento tiene tamaño.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const place = () => { el.scrollTop = initIdx * ITEM }
    const t = setTimeout(place, 40)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clamp = (i) => Math.max(0, Math.min(items.length - 1, i))

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = clamp(Math.round(el.scrollTop / ITEM))
    if (idx !== sel) setSel(idx) // resalta en vivo el número centrado
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      if (idx !== lastIdx.current) {
        lastIdx.current = idx
        if (navigator.vibrate) navigator.vibrate(4)
        onChange?.(items[idx], idx)
      }
    }, 110)
  }

  const tapTo = (i) => {
    const el = ref.current
    if (el) el.scrollTo({ top: i * ITEM, behavior: 'smooth' })
  }

  return (
    <div className="wheel" id={isAP ? 'whAP' : undefined} ref={ref} onScroll={onScroll}>
      <div className="wpad" />
      {items.map((v, i) => (
        <div key={i} className={'wi' + (i === sel ? ' sel' : '')} onClick={() => tapTo(i)}>{v}</div>
      ))}
      <div className="wpad" />
    </div>
  )
}
