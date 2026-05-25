import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../store'

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { unlocked, openSheet } = useApp()

  const isActive = (path) => pathname === path

  const goBrenda = () => {
    if (!unlocked) {
      openSheet('paywall')
      return
    }
    navigate('/brenda')
  }

  return (
    <nav className="tabbar">
      <button
        className={'tab' + (isActive('/') ? ' active' : '')}
        onClick={() => navigate('/')}
      >
        <svg viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v9a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z" /></svg>
        <span>Inicio</span>
      </button>

      <button
        className={'tab' + (isActive('/alarm') ? ' active' : '')}
        onClick={() => navigate('/alarm')}
      >
        <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3" /></svg>
        <span>Alarma</span>
      </button>

      <button
        className={'tab' + (isActive('/brenda') ? ' active' : '') + (!unlocked ? ' locked' : '')}
        id="tabBrenda"
        onClick={goBrenda}
      >
        <svg viewBox="0 0 24 24"><path d="M6 4v16M18 4v16M4 9h4M16 9h4M4 15h4M16 15h4" /></svg>
        <span>Brenda</span>
        {!unlocked && <span className="mini-lock" id="brendaTabLock">🔒</span>}
      </button>

      <button
        className={'tab' + (isActive('/profile') ? ' active' : '')}
        onClick={() => navigate('/profile')}
      >
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
        <span>Perfil</span>
      </button>
    </nav>
  )
}
