import { Outlet } from 'react-router-dom'
import { useApp } from '../store'
import TabBar from './TabBar'
import Toast from './Toast'
import Onboarding from '../screens/Onboarding'

export default function AppShell() {
  const { appRef, onboarding } = useApp()
  return (
    <div className="app" ref={appRef}>
      <div className="bg-fx">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <Outlet />

      <TabBar />

      {/* Overlays: AlarmRing + Sheets (2e) se montan aquí */}
      <Toast />

      {onboarding && <Onboarding />}
    </div>
  )
}
