import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './screens/Home'
import Alarm from './screens/Alarm'
import Entrena from './screens/Entrena'
import WorkoutDetail from './screens/WorkoutDetail'
import Nutricion from './screens/Nutricion'
import Progreso from './screens/Progreso'
import Privacy from './screens/Privacy'
import Profile from './screens/Profile'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/alarm" element={<Alarm />} />
        <Route path="/entrena" element={<Entrena />} />
        <Route path="/entrena/:id" element={<WorkoutDetail />} />
        <Route path="/nutricion" element={<Nutricion />} />
        <Route path="/progreso" element={<Progreso />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
