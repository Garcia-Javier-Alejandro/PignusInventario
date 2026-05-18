import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Dashboard' },
  { to: '/families', label: 'Inventario' },
  { to: '/receive', label: 'Ingresar' },
  { to: '/consume', label: 'Consumir' },
  { to: '/movements', label: 'Historial' },
]

export default function PageTabs() {
  return (
    <div className="page-tabs-row">
      <nav className="mod-nav">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `mod-nav__item${isActive ? ' mod-nav__item--active' : ''}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
