import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/families', label: 'Inventario', icon: '⊕' },
  { to: '/receive', label: 'Ingresar', icon: '↑' },
  { to: '/consume', label: 'Consumir', icon: '↓' },
  { to: '/movements', label: 'Historial', icon: '≡' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{icon}</span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
