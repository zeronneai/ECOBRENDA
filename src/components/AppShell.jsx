import { Outlet } from 'react-router-dom'
import { useApp } from '../store'
import TabBar from './TabBar'
import Toast from './Toast'
import SheetHost from './SheetHost'
import AlarmRing from '../screens/AlarmRing'
import CameraScan from '../screens/CameraScan'
import Celebration from '../screens/Celebration'
import AchievementModal from './AchievementModal'
import Onboarding from '../screens/Onboarding'
import PermissionsPriming from '../screens/PermissionsPriming'
import Auth from '../screens/Auth'
import { ALARM_AUDIO_SRC } from '../lib/alarmAudio'

export default function AppShell() {
  const { appRef, onboarding, ringOpen, scanning, celebrating, achievementQueue, audioRef, needsPriming, authOpen, authView, handleAuthed, closeAuth } = useApp()
  return (
    <div className="app" ref={appRef}>
      {/* Audio único (alarma o reto): vive a nivel app para sobrevivir al
          cambio AlarmRing/Home -> CameraScan. Trae la canción de la alarma por
          defecto para poder "desbloquearla" en el 1er gesto (unlockAudio) y que
          suene sola al dispararse. playSong cambia la fuente para los retos.
          Solo se detiene al completar las reps. */}
      <audio ref={audioRef} src={ALARM_AUDIO_SRC} loop preload="auto" />
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
      {scanning && <CameraScan />}
      {celebrating && <Celebration />}
      {/* Logro: aparece tras cerrar la felicitación de reto (no choca) */}
      {achievementQueue.length > 0 && !celebrating && <AchievementModal />}
      <Toast />

      {onboarding && <Onboarding />}
      {/* Priming de permisos nativos (solo Android/iOS), tras el onboarding */}
      {needsPriming && <PermissionsPriming />}
      {/* Auth (login/registro/recuperar) — abierto desde Perfil por ahora */}
      {authOpen && <Auth initialView={authView} onAuthed={handleAuthed} onClose={closeAuth} />}
    </div>
  )
}
