import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/alarm', label: 'Alarm' },
  { to: '/brenda', label: 'Brenda' },
  { to: '/profile', label: 'Profile' }
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            'tabbar__item' + (isActive ? ' tabbar__item--active' : '')
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
