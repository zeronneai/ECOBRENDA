import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import TabBar from './components/TabBar.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import Alarm from './screens/Alarm.jsx'
import Brenda from './screens/Brenda.jsx'
import Profile from './screens/Profile.jsx'
import AlarmRing from './screens/AlarmRing.jsx'
import CameraScan from './screens/CameraScan.jsx'
import './App.css'

// Layout de las 4 tabs: contenido + barra inferior.
function TabsLayout() {
  return (
    <div className="app">
      <main className="app__content">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Onboarding antes de las tabs */}
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Tabs principales */}
      <Route element={<TabsLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/alarm" element={<Alarm />} />
        <Route path="/brenda" element={<Brenda />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Pantallas a pantalla completa (sin tabs) */}
      <Route path="/alarm-ring" element={<AlarmRing />} />
      <Route path="/scan" element={<CameraScan />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
