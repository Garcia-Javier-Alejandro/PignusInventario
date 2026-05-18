export interface DomainDef {
  /** Path the domain owns. '/' is the Filamento domain root. */
  path: string
  label: string
  /** True if the domain is implemented; false renders the En Construcción placeholder. */
  built: boolean
}

export const DOMAINS: DomainDef[] = [
  { path: '/',                       label: 'Filamento',            built: true },
  { path: '/packaging',              label: 'Packaging',            built: false },
  { path: '/consumibles',            label: 'Consumibles',          built: false },
  { path: '/productos-terminados',   label: 'Productos',            built: false },
]

const PLACEHOLDER_PATHS = DOMAINS.filter((d) => !d.built).map((d) => d.path)

/** Returns the active domain path for a given location pathname. */
export function activeDomainPath(pathname: string): string {
  for (const p of PLACEHOLDER_PATHS) {
    if (pathname === p || pathname.startsWith(p + '/')) return p
  }
  return '/'
}

export function isFilamentoDomain(pathname: string): boolean {
  return activeDomainPath(pathname) === '/'
}
