import { Outlet } from 'react-router-dom'
import { useApp } from '../store'
import TabBar from './TabBar'
import Toast from './Toast'
import SheetHost from './SheetHost'
import AlarmRing from '../screens/AlarmRing'
import Onboarding from '../screens/Onboarding'

export default function AppShell() {
  const { appRef, onboarding, ringOpen } = useApp()
  return (
    <div className="app" ref={appRef}>
      <div className="bg-fx">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <Outlet />

      <TabBar />

      {/* Overlays (z-index los apila: sheets 100 < onboarding 150 < ring 200 < toast 300) */}
      <SheetHost />
      {ringOpen && <AlarmRing />}
      <Toast />

      {onboarding && <Onboarding />}
    </div>
  )
}
