import { Outlet } from 'react-router-dom'
import { useApp } from '../store'
import TabBar from './TabBar'
import Toast from './Toast'
import SheetHost from './SheetHost'
import AlarmRing from '../screens/AlarmRing'
import Celebration from '../screens/Celebration'
import Onboarding from '../screens/Onboarding'

export default function AppShell() {
  const { appRef, onboarding, ringOpen, celebrating, audioRef } = useApp()
  return (
    <div className="app" ref={appRef}>
      {/* Audio único (alarma o reto): vive a nivel app para sobrevivir al
          cambio AlarmRing/Home -> CameraScan. La fuente la fija playSong.
          Solo se detiene al completar las reps. */}
      <audio ref={audioRef} loop preload="auto" />
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
      {celebrating && <Celebration />}
      <Toast />

      {onboarding && <Onboarding />}
    </div>
  )
}
