/* Lectura de datos de Brenda Coins desde el cliente. Todo por RLS (SELECT de las
   FILAS PROPIAS): bc_ledger, bc_streak, reward_catalog. NO hay escritura aquí —
   el saldo se calcula sumando los lotes vivos. Detrás de BC_ENABLED. */
import { supabase } from './supabase'
import { BC_ENABLED } from './features'

const EXPIRE_SOON_DAYS = 30

// Saldo vivo: suma de remaining de lotes no caducados (mismo criterio que bc_balance).
export async function fetchBalance() {
  if (!BC_ENABLED || !supabase) return null
  try {
    const nowISO = new Date().toISOString()
    const { data, error } = await supabase
      .from('bc_ledger')
      .select('remaining')
      .gt('remaining', 0)
      .gt('expires_at', nowISO)
    if (error) throw error
    return (data || []).reduce((sum, r) => sum + (r.remaining || 0), 0)
  } catch (e) {
    console.warn('[bcData] fetchBalance', e?.message || e)
    return null
  }
}

/* Todo lo que necesita la sección Recompensas en una sola llamada:
   { balance, streak, catalog, history, expiring, expiringTotal }. */
export async function fetchRewards() {
  if (!BC_ENABLED || !supabase) return null
  try {
    const now = new Date()
    const nowISO = now.toISOString()
    const soonISO = new Date(now.getTime() + EXPIRE_SOON_DAYS * 86400000).toISOString()

    const [liveRes, histRes, streakRes, catRes] = await Promise.all([
      // lotes vivos (para saldo + próximos a caducar)
      supabase.from('bc_ledger').select('remaining,expires_at')
        .gt('remaining', 0).gt('expires_at', nowISO).order('expires_at', { ascending: true }),
      // historial reciente (todos los tipos)
      supabase.from('bc_ledger').select('id,kind,amount,created_at,meta')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('bc_streak').select('current,best,deadline_at').maybeSingle(),
      supabase.from('reward_catalog').select('*').eq('active', true).order('sort', { ascending: true }),
    ])
    if (liveRes.error) throw liveRes.error

    const live = liveRes.data || []
    const balance = live.reduce((s, r) => s + (r.remaining || 0), 0)
    const soon = live.filter((r) => r.expires_at <= soonISO)
    const expiringTotal = soon.reduce((s, r) => s + (r.remaining || 0), 0)
    const expiring = soon[0] || null // el próximo lote en caducar

    return {
      balance,
      streak: streakRes.data?.current ?? 0,
      best: streakRes.data?.best ?? 0,
      catalog: catRes.data || [],
      history: histRes.data || [],
      expiringTotal,
      expiringAt: expiring?.expires_at || null,
    }
  } catch (e) {
    console.warn('[bcData] fetchRewards', e?.message || e)
    return null
  }
}
