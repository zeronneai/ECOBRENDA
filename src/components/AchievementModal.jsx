import { useEffect, useMemo } from 'react'
import { useApp } from '../store'
import { getAchievement } from '../data/achievements'
import { getBrendaMessage } from '../data/brendaMessages'

export default function AchievementModal() {
  const { achievementQueue, dismissAchievement, confetti, t } = useApp()
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
        <div className="achv-kick">{t('achievement.kick')}</div>
        <h2 className="achv-title">{t('achievement.title', { name: t('progreso.ach.' + a.id + '.name') })}</h2>
        <p className="achv-desc">{t('achievement.desc.' + a.id)}</p>
        <div className="achv-brenda">{brendaMsg || a.brendaMsg}</div>
        <button className="achv-go" onClick={dismissAchievement}>{t('achievement.go')}</button>
      </div>
    </div>
  )
}
