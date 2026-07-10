import { useEffect, useMemo } from 'react'
import { useApp } from '../store'
import { getAchievement } from '../data/achievements'
import { getBrendaMessage } from '../data/brendaMessages'

export default function AchievementModal() {
  const { achievementQueue, dismissAchievement, confetti } = useApp()
  const id = achievementQueue[0]
  const a = id ? getAchievement(id) : null

  // Mensaje retador de Brenda por desbloqueo (estable mientras se ve el logro).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const brendaMsg = useMemo(() => getBrendaMessage('achievement'), [id])

  // Confeti fiesta al aparecer cada logro.
  useEffect(() => {
    if (!id) return
    confetti(70)
    const t = setTimeout(() => confetti(50), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!a) return null

  return (
    <div id="achv" className="show">
      <div className="achv-card">
        <div className="achv-emoji">{a.emoji}</div>
        <div className="achv-kick">Logro desbloqueado</div>
        <h2 className="achv-title">¡{a.name}!</h2>
        <p className="achv-desc">{a.desc}</p>
        <div className="achv-brenda">{brendaMsg || a.brendaMsg}</div>
        <button className="achv-go" onClick={dismissAchievement}>¡GENIAL!</button>
      </div>
    </div>
  )
}
