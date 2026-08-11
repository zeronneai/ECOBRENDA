import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './screens/Home'
import Alarm from './screens/Alarm'

/* Home y Alarm son la cara del primer paint → van en el bundle principal.
   El resto se carga BAJO DEMANDA (React.lazy) para que la primera carga en el
   link sea ligera: recharts (Progreso), react-markdown (Privacy/Terms) y las
   pantallas premium ya no pesan en el arranque. */
const Entrena = lazy(() => import('./screens/Entrena'))
const Nutricion = lazy(() => import('./screens/Nutricion'))
const Progreso = lazy(() => import('./screens/Progreso'))
const Profile = lazy(() => import('./screens/Profile'))
const Privacy = lazy(() => import('./screens/Privacy'))
const Terms = lazy(() => import('./screens/Terms'))
const PremiumReturn = lazy(() => import('./screens/PremiumReturn'))

// Spinner mínimo mientras baja el chunk de una ruta (mismo look que el boot).
function RouteLoader() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070708' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(255,255,255,.15)', borderTopColor: '#ff1a6b', animation: 'bootSpin .8s linear infinite' }} />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Rutas legales PÚBLICAS — fuera de AppShell: sin gate de cuenta, sin
            onboarding, sin auth, sin app chrome. Carga limpia para reviewers de
            Apple/Google que abren la URL directo. */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/alarm" element={<Alarm />} />
          {/* /entrena/:id (WorkoutDetail) eliminado: contenido hardcodeado viejo,
              huerfano tras el rediseno IA. */}
          <Route path="/entrena" element={<Entrena />} />
          <Route path="/nutricion" element={<Nutricion />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/premium-return" element={<PremiumReturn />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
