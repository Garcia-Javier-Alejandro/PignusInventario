import type { NormalizedVisualColor } from '../types'

export interface VisualColorMeta {
  value: NormalizedVisualColor
  label: string
  swatch: string
}

export const VISUAL_COLORS: VisualColorMeta[] = [
  { value: 'BLACK',       label: 'Negro',        swatch: '#1c1814' },
  { value: 'WHITE',       label: 'Blanco',       swatch: '#ffffff' },
  { value: 'GRAY',        label: 'Gris',         swatch: '#6b7280' },
  { value: 'BEIGE',       label: 'Beige',        swatch: '#d6c5a8' },
  { value: 'BROWN',       label: 'Marrón',       swatch: '#92400e' },
  { value: 'RED',         label: 'Rojo',         swatch: '#dc2626' },
  { value: 'ORANGE',      label: 'Naranja',      swatch: '#ea580c' },
  { value: 'YELLOW',      label: 'Amarillo',     swatch: '#facc15' },
  { value: 'GREEN',       label: 'Verde',        swatch: '#16a34a' },
  { value: 'TEAL',        label: 'Verde azulado', swatch: '#14b8a6' },
  { value: 'BLUE',        label: 'Azul',         swatch: '#1d4ed8' },
  { value: 'PURPLE',      label: 'Violeta',      swatch: '#9333ea' },
  { value: 'PINK',        label: 'Rosa',         swatch: '#db2777' },
  { value: 'TRANSLUCENT', label: 'Translúcido',  swatch: 'repeating-linear-gradient(45deg, rgba(28,24,20,0.08) 0 4px, rgba(28,24,20,0.18) 4px 8px)' },
  { value: 'MULTICOLOR',  label: 'Multicolor',   swatch: 'conic-gradient(from 0deg, #dc2626, #facc15, #16a34a, #1d4ed8, #9333ea, #dc2626)' },
]

export const VISUAL_COLOR_LABELS: Record<NormalizedVisualColor, string> =
  Object.fromEntries(VISUAL_COLORS.map((c) => [c.value, c.label])) as Record<NormalizedVisualColor, string>

// Aliases the importer accepts but normalizes to a canonical enum value.
// Add more spellings here if your source data uses them.
const COLOR_ALIASES: Record<string, NormalizedVisualColor> = {
  GREY: 'GRAY',
}

export function normalizeVisualColor(input: string): string {
  const upper = input.trim().toUpperCase()
  return COLOR_ALIASES[upper] ?? upper
}
