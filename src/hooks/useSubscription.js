import { useApp } from '../context/AppContext'

// Gate de acceso. Modelo de 4 productos → 2 permisos:
//   accesoAlarma  = puede usar/activar la alarma ($9 o superior, o fundador)
//   accesoPremium = puede ver Nutrición + Entrena ($59/$590, o $49+$9, o fundador)
// La NUBE (webhook) es la fuente de verdad; el cliente solo LEE estos flags.
// isPremium se conserva como alias de accesoPremium para compatibilidad.
export function useSubscription() {
  const { subscription } = useApp()
  const accesoAlarma = subscription?.accesoAlarma === true
  const accesoPremium = subscription?.accesoPremium === true
  return { accesoAlarma, accesoPremium, isPremium: accesoPremium }
}
