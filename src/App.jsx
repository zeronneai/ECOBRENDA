import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './screens/Home'
import Alarm from './screens/Alarm'
import Entrena from './screens/Entrena'
import Brenda from './screens/Brenda'
import Profile from './screens/Profile'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/alarm" element={<Alarm />} />
        <Route path="/entrena" element={<Entrena />} />
        <Route path="/brenda" element={<Brenda />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
