import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DOMAINS, activeDomainPath } from '../lib/domains'

export default function DomainChip() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const activePath = activeDomainPath(location.pathname)
  const activeDomain = DOMAINS.find((d) => d.path === activePath) ?? DOMAINS[0]

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div className="domain-chip-wrap" ref={popoverRef}>
      <button
        type="button"
        className="domain-chip"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{activeDomain.label}</span>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
          <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="domain-chip-menu" role="listbox">
          {DOMAINS.map((d) => (
            <li key={d.path}>
              <button
                type="button"
                className={`domain-chip-menu__item${d.path === activePath ? ' is-active' : ''}`}
                onClick={() => { setOpen(false); navigate(d.path) }}
              >
                {d.label}
                {!d.built && <span className="domain-chip-menu__hint">en construcción</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
