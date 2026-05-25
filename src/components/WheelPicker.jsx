import { useRef, useEffect, useState } from 'react'

const ITEM = 54 // alto de cada item (coincide con .wheel .wi)

/* Rueda estilo iPhone — misma lógica de scroll-snap del prototipo. */
export default function WheelPicker({ items, initIdx = 0, onChange, isAP = false }) {
  const ref = useRef(null)
  const idxRef = useRef(initIdx)
  const settleTimer = useRef(null)
  const [sel, setSel] = useState(initIdx)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const refresh = () => {
      const idx = Math.round(el.scrollTop / ITEM)
      idxRef.current = idx
      setSel(idx)
    }

    const onScroll = () => {
      clearTimeout(settleTimer.current)
      refresh()
      settleTimer.current = setTimeout(() => {
        el.scrollTo({ top: Math.round(el.scrollTop / ITEM) * ITEM, behavior: 'smooth' })
        if (navigator.vibrate) navigator.vibrate(3)
        onChange?.(items[idxRef.current], idxRef.current)
      }, 90)
    }

    el.addEventListener('scroll', onScroll)
    const init = setTimeout(() => {
      el.scrollTop = initIdx * ITEM
      refresh()
    }, 50)

    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(init)
      clearTimeout(settleTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="wheel" id={isAP ? 'whAP' : undefined} ref={ref}>
      <div className="wpad" />
      {items.map((v, i) => (
        <div key={i} className={'wi' + (i === sel ? ' sel' : '')}>{v}</div>
      ))}
      <div className="wpad" />
    </div>
  )
}
