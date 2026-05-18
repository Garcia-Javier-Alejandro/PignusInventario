import { NavLink, useNavigate } from 'react-router-dom'

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth={1.7} />
      <circle cx="11" cy="11" r="2.5" fill="currentColor" />
    </svg>
  )
}

function InventoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth={1.7} />
      <path d="M11 6.5v9M6.5 11h9" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M3 8V5a2 2 0 012-2h3M23 8V5a2 2 0 00-2-2h-3M3 18v3a2 2 0 002 2h3M23 18v3a2 2 0 01-2 2h-3"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d="M7 13h12" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" />
    </svg>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
      >
        <DashboardIcon />
        <span className="bottom-nav__label">Dashboard</span>
      </NavLink>

      {/* spacer for FAB */}
      <span className="bottom-nav__spacer" aria-hidden="true" />

      <NavLink
        to="/families"
        className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
      >
        <InventoryIcon />
        <span className="bottom-nav__label">Inventario</span>
      </NavLink>

      <button
        type="button"
        className="bottom-nav__fab"
        onClick={() => navigate('/scan')}
        aria-label="Escanear código"
      >
        <ScanIcon />
        <span className="bottom-nav__fab-label">SCAN</span>
      </button>
    </nav>
  )
}
