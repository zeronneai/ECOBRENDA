import { Outlet } from 'react-router-dom'
import { useApp } from '../store'
import TabBar from './TabBar'
import Toast from './Toast'
import SheetHost from './SheetHost'
import AlarmRing from '../screens/AlarmRing'
import Celebration from '../screens/Celebration'
import Onboarding from '../screens/Onboarding'
import { ALARM_AUDIO_SRC } from '../lib/alarmAudio'

export default function AppShell() {
  const { appRef, onboarding, ringOpen, celebrating, alarmAudioRef } = useApp()
  return (
    <div className="app" ref={appRef}>
      {/* Audio de la alarma: vive a nivel app para sobrevivir al cambio
          AlarmRing -> CameraScan. Solo se detiene al completar el reto. */}
      <audio ref={alarmAudioRef} src={ALARM_AUDIO_SRC} loop preload="auto" />
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
