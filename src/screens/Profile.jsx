import { useApp } from '../store'
import { goalLabel } from '../data/onboarding'

export default function Profile() {
  const { profile, unlocked } = useApp()
  const firstName = profile.name ? profile.name.split(' ')[0].toUpperCase() : 'HOLA'
  const avatarLetter = firstName[0] || 'B'
  const subStatus = unlocked ? 'Premium · Brenda Fitness activo' : 'Plan gratuito · Booty Alarm'
  const profileData = `${profile.weight}kg · ${profile.height}cm · ${goalLabel(profile.goal)}`

  return (
    <section className="screen active" id="s-profile">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1">
          <div>
            <div className="hi">Cuenta</div>
            <div className="name">PERFIL</div>
          </div>
          <div className="avatar" id="avatarLetter2">{avatarLetter}</div>
        </div>

        <div className="alarm-card reveal d2" style={{ marginBottom: 12 }}>
          <div className="row">
            <div className="alarm-meta">
              <div className="t">Suscripción</div>
              <div className="d" id="subStatus">{subStatus}</div>
            </div>
            <div style={{ color: 'var(--magenta)' }}>›</div>
          </div>
        </div>

        <div className="alarm-card reveal d3" style={{ marginBottom: 12 }}>
          <div className="row">
            <div className="alarm-meta">
              <div className="t">Mis datos</div>
              <div className="d" id="profileData">{profileData}</div>
            </div>
            <div style={{ color: 'var(--txt-faint)' }}>›</div>
          </div>
        </div>

        <div className="alarm-card reveal d4">
          <div className="row">
            <div className="alarm-meta">
              <div className="t">Notificaciones</div>
              <div className="d">Permisos y sonidos</div>
            </div>
            <div style={{ color: 'var(--txt-faint)' }}>›</div>
          </div>
        </div>
      </div>
    </section>
  )
}
