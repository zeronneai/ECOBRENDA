import { useApp } from '../context/AppContext'

// Gate premium reutilizable. Hoy lee subscription.status del store local;
// mañana, el mismo campo lo respaldará Supabase sin cambiar este hook.
export function useSubscription() {
  const { subscription } = useApp()
  return { isPremium: subscription?.status === 'active' }
}
