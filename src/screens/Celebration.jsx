import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'

const BRENDA_WIN_IMG =
  'https://res.cloudinary.com/dsprn0ew4/image/upload/v1775537960/BRENDA_ee6cl2.png'

export default function Celebration() {
  const navigate = useNavigate()
  const { profile, confetti, hideCelebration, streak, challengesDone, workout, setWorkout, t } = useApp()
  const name = profile.name ? profile.name.split(' ')[0].toUpperCase() : ''
  const isChallenge = workout?.source === 'challenge'

  const stat = isChallenge
    ? t(challengesDone === 1 ? 'celebration.stat_challenge_one' : 'celebration.stat_challenge_many', { n: challengesDone })
    : t(streak === 1 ? 'celebration.stat_streak_one' : 'celebration.stat_streak_many', { n: streak })

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
      <div className="celebrate-kick">{t('celebration.kick')}</div>
      <h2 className="celebrate-title">
        {name ? t('celebration.title', { name }) : t('celebration.title_noname')}
      </h2>
      <div className="celebrate-stat">{stat}</div>
      <p className="celebrate-msg">{t('celebration.msg')}</p>
      <div className="celebrate-sign">— Brenda 💕</div>
      <button className="celebrate-go" onClick={goHome}>{t('celebration.go')}</button>
    </div>
  )
}
