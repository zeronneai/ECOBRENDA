import { useNavigate } from 'react-router-dom'

export default function CameraScan() {
  const navigate = useNavigate()
  return (
    <div className="screen screen--center">
      <h1 className="screen__title">CameraScan</h1>
      <p className="screen__subtitle">Cámara + conteo de reps (Fase 5)</p>
      <button className="screen__btn" onClick={() => navigate('/')}>
        Volver a Home
      </button>
    </div>
  )
}
