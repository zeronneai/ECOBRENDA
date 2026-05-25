import { useNavigate } from 'react-router-dom'

export default function AlarmRing() {
  const navigate = useNavigate()
  return (
    <div className="screen screen--center">
      <h1 className="screen__title">AlarmRing</h1>
      <p className="screen__subtitle">Alarma sonando (Fase 4)</p>
      <button className="screen__btn" onClick={() => navigate('/scan')}>
        Ir a CameraScan
      </button>
    </div>
  )
}
