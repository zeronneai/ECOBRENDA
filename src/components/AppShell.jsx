import { Outlet } from 'react-router-dom'
import { useApp } from '../store'
import TabBar from './TabBar'
import Toast from './Toast'

export default function AppShell() {
  const { appRef } = useApp()
  return (
    <div className="app" ref={appRef}>
      <div className="bg-fx">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <Outlet />

      <TabBar />

      {/* Overlays: Onboarding (2b), AlarmRing + Sheets (2e) se montan aquí */}
      <Toast />
    </div>
  )
}
