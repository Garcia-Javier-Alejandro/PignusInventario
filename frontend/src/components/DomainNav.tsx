import { Link, useLocation } from 'react-router-dom'
import { DOMAINS, activeDomainPath } from '../lib/domains'

export default function DomainNav() {
  const location = useLocation()
  const active = activeDomainPath(location.pathname)

  return (
    <div className="domain-nav-row">
      <nav className="mod-nav">
        {DOMAINS.map((d) => (
          <Link
            key={d.path}
            to={d.path}
            className={`mod-nav__item${active === d.path ? ' mod-nav__item--active' : ''}`}
          >
            {d.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
