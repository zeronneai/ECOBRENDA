import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const navigate = useNavigate()
  return (
    <div className="screen screen--center">
      <h1 className="screen__title">Onboarding</h1>
      <p className="screen__subtitle">Flujo de 5 pasos (Fase 2)</p>
      <button className="screen__btn" onClick={() => navigate('/')}>
        Entrar a la app
      </button>
    </div>
  )
}
