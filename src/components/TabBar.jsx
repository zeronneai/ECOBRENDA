import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../store'

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { unlocked, openSheet, t } = useApp()

  const isActive = (path) => pathname === path

  const goNutricion = () => {
    if (!unlocked) {
      openSheet('paywall')
      return
    }
    navigate('/nutricion')
  }

  const goEntrena = () => {
    if (!unlocked) {
      openSheet('paywall')
      return
    }
    navigate('/entrena')
  }

  return (
    <nav className="tabbar">
      <button
        className={'tab' + (isActive('/') ? ' active' : '')}
        onClick={() => navigate('/')}
      >
        <svg viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v9a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z" /></svg>
        <span>{t('nav.home')}</span>
      </button>

      <button
        className={'tab' + (isActive('/alarm') ? ' active' : '')}
        onClick={() => navigate('/alarm')}
      >
        <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3" /></svg>
        <span>{t('nav.alarm')}</span>
      </button>

      <button
        className={'tab' + (isActive('/entrena') ? ' active' : '') + (!unlocked ? ' locked' : '')}
        onClick={goEntrena}
      >
        <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M4 7l3-3 3 3-3 3zM14 17l3-3 3 3-3 3zM3 8l-1 1 2 2 1-1zM21 16l1-1-2-2-1 1z" /></svg>
        <span>{t('nav.train')}</span>
        {!unlocked && <span className="mini-lock">🔒</span>}
      </button>

      <button
        className={'tab' + (isActive('/nutricion') ? ' active' : '') + (!unlocked ? ' locked' : '')}
        onClick={goNutricion}
      >
        <svg viewBox="0 0 24 24"><path d="M5 3v8a3 3 0 003 3v7M8 3v6M11 3v6M17 3c-1.5 0-2 2-2 5s.5 4 2 4v9" /></svg>
        <span>{t('nav.nutrition')}</span>
        {!unlocked && <span className="mini-lock">🔒</span>}
      </button>

      <button
        className={'tab' + (isActive('/profile') ? ' active' : '')}
        onClick={() => navigate('/profile')}
      >
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
        <span>{t('nav.profile')}</span>
      </button>
    </nav>
  )
}
