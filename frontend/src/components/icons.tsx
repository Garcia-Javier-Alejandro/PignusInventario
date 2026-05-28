// Shared action icons. Sourced from PignusUI/README.md "Standard action icons".
// Inline SVGs so they inherit currentColor and stroke widths consistently.

interface IconProps {
  size?: number
}

export function EditIcon({ size = 14 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </svg>
  )
}

export function BugIcon({ size = 16 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 14a4 4 0 01-4-4V8a4 4 0 018 0v2a4 4 0 01-4 4z" />
      <path d="M12 14v6" />
      <path d="M8 16H4m0-4H2m2 8h4M16 16h4m0-4h2m-6 8h-4" />
      <path d="M9 6a3 3 0 016 0" />
    </svg>
  )
}

export function DeleteIcon({ size = 14 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />
    </svg>
  )
}
