import { useEffect, useState } from 'react'
import DomainChip from './DomainChip'

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
      .catch(() => { /* local dev — CF Access not available */ })
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
        <div className="header__brand-text">
          <div className="header__wordmark">Inventario</div>
          <DomainChip />
        </div>
      </div>

      <nav className="mod-nav">
        <a
          href="https://pignuslabs.com.ar/"
          className="mod-nav__item mod-nav__item--icon"
          aria-label="Portal"
          title="Portal"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
            aria-hidden="true"
          >
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
          </svg>
        </a>
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
