import { useEffect, useState } from 'react'

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

interface Identity {
  email: string
  initials: string
}

export default function Header() {
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/cdn-cgi/access/get-identity', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { email?: string } | null) => {
        if (cancelled || !data?.email) return
        setIdentity({ email: data.email, initials: initialsFromEmail(data.email) })
      })
      .catch(() => { /* ignore — running without CF Access locally */ })
    return () => { cancelled = true }
  }, [])

  return (
    <header className="header">
      <div className="header__brand">
        <a
          href="https://pignuslabs.com.ar/"
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <img src="/PignusLabs_Logo.png" alt="Pignus Labs" className="header__logo" />
        </a>
        <div className="header__rule" />
        <span className="header__wordmark">Inventario</span>
      </div>

      <nav className="mod-nav">
        <a href="https://pignuslabs.com.ar/" className="mod-nav__item">Portal</a>
        <a href="https://facturacion.pignuslabs.com.ar/" className="mod-nav__item">Facturación</a>
        <a href="#" className="mod-nav__item mod-nav__item--active">Inventario</a>
        <a href="https://inversiones.pignuslabs.com.ar/" className="mod-nav__item">Inversiones</a>
      </nav>

      <div className="header__end">
        {identity && (
          <button className="header__avatar" title={identity.email} type="button">
            {identity.initials}
          </button>
        )}
      </div>
    </header>
  )
}
