import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'

const BRENDA_WIN_IMG =
  'https://res.cloudinary.com/dsprn0ew4/image/upload/v1775537960/BRENDA_ee6cl2.png'

export default function Celebration() {
  const navigate = useNavigate()
  const { profile, confetti, hideCelebration, streak, challengesDone, workout, setWorkout } = useApp()
  const name = profile.name ? profile.name.split(' ')[0].toUpperCase() : ''
  const isChallenge = workout?.source === 'challenge'

  const stat = isChallenge
    ? `💪 ${challengesDone} ${challengesDone === 1 ? 'RETO COMPLETADO' : 'RETOS COMPLETADOS'}`
    : `🔥 RACHA DE ${streak} ${streak === 1 ? 'DÍA' : 'DÍAS'}`

  // Confeti tipo fiesta: varias rafagas escalonadas para que dure unos segundos.
  useEffect(() => {
    confetti(80)
    const t1 = setTimeout(() => confetti(60), 550)
    const t2 = setTimeout(() => confetti(45), 1150)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [confetti])

  const goHome = () => {
    hideCelebration()
    setWorkout(null)
    navigate('/')
  }

  return (
    <div id="celebrate" className="show">
      <img className="celebrate-img" src={BRENDA_WIN_IMG} alt="Brenda" />
      <div className="celebrate-kick">Reto completado</div>
      <h2 className="celebrate-title">
        {name ? `¡LO LOGRASTE, ${name}! 🔥` : '¡LO LOGRASTE! 🔥'}
      </h2>
      <div className="celebrate-stat">{stat}</div>
      <p className="celebrate-msg">Empieza tu día con todo.</p>
      <div className="celebrate-sign">— Brenda 💕</div>
      <button className="celebrate-go" onClick={goHome}>CONTINUAR</button>
    </div>
  )
}
