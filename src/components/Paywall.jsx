import { useState } from 'react'
import { useApp } from '../store'
import Sheet from './Sheet'

/* Paywall con dos planes, precio tachado y "EMPEZAR" por tarjeta.
   Los precios mostrados son visuales; los reales vienen de los Price IDs de
   Stripe en el servidor. El "tachado" es marketing local. */
const PLANS = [
  {
    id: 'monthly',
    name: 'MENSUAL',
    badge: null,
    old: '$299',
    price: '$99',
    unit: '/mes',
    sub: 'Cancela cuando quieras',
  },
  {
    id: 'annual',
    name: 'ANUAL',
    badge: 'MEJOR · AHORRA 72%',
    old: '$3,499',
    price: '$999',
    unit: '/año',
    sub: 'Equivale a $83/mes',
  },
]

export default function Paywall() {
  const { closeSheet, checkoutPlan } = useApp()
  const [busy, setBusy] = useState(null)

  const go = async (plan) => {
    if (busy) return
    setBusy(plan)
    try {
      await checkoutPlan(plan)
      closeSheet() // si volvió (web redirige; native abre browser) — al cerrar el sheet queda limpio
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet>
      <h3>BRENDA FITNESS</h3>
      <p className="lead">Desbloquea todo: rutinas, recetas y progreso. Cancela cuando quieras.</p>

      <div className="pwgrid">
        {PLANS.map((p) => (
          <div key={p.id} className={'pwcard' + (p.id === 'annual' ? ' best' : '')}>
            {p.badge && <div className="pwbadge">{p.badge}</div>}
            <div className="pwname">{p.name}</div>
            <div className="pwold">{p.old}</div>
            <div className="pwprice">{p.price}<small>{p.unit}</small></div>
            <div className="pwsub">{p.sub}</div>
            <button className="cta full pwgo" disabled={busy === p.id} onClick={() => go(p.id)}>
              {busy === p.id ? 'ABRIENDO PAGO…' : 'EMPEZAR'}
            </button>
          </div>
        ))}
      </div>

      <div className="pwfeats">
        <div className="feat"><div className="fi">✓</div>Rutina semanal hecha para tu objetivo</div>
        <div className="feat"><div className="fi">✓</div>Plan de comidas según tu cuerpo</div>
        <div className="feat"><div className="fi">✓</div>Actualizado conforme avanzas</div>
        <div className="feat"><div className="fi">✓</div>Sin anuncios · todo el método Brenda</div>
      </div>

      <div className="note">Pago seguro vía Stripe · Cancela cuando quieras</div>
    </Sheet>
  )
}
