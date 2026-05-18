import type { NormalizedVisualColor } from '../types'

export interface VisualColorMeta {
  value: NormalizedVisualColor
  label: string
  swatch: string
  /** Foreground color that reads well on this swatch. */
  onColor: string
}

export const VISUAL_COLORS: VisualColorMeta[] = [
  { value: 'BLACK',       label: 'Negro',        swatch: '#1c1814',  onColor: '#ffffff' },
  { value: 'WHITE',       label: 'Blanco',       swatch: '#ffffff',  onColor: '#1c1814' },
  { value: 'GRAY',        label: 'Gris',         swatch: '#6b7280',  onColor: '#ffffff' },
  { value: 'BEIGE',       label: 'Beige',        swatch: '#d6c5a8',  onColor: '#1c1814' },
  { value: 'BROWN',       label: 'Marrón',       swatch: '#92400e',  onColor: '#ffffff' },
  { value: 'RED',         label: 'Rojo',         swatch: '#dc2626',  onColor: '#ffffff' },
  { value: 'ORANGE',      label: 'Naranja',      swatch: '#ea580c',  onColor: '#ffffff' },
  { value: 'YELLOW',      label: 'Amarillo',     swatch: '#facc15',  onColor: '#1c1814' },
  { value: 'GREEN',       label: 'Verde',        swatch: '#16a34a',  onColor: '#ffffff' },
  { value: 'TEAL',        label: 'Verde azulado', swatch: '#14b8a6', onColor: '#ffffff' },
  { value: 'BLUE',        label: 'Azul',         swatch: '#1d4ed8',  onColor: '#ffffff' },
  { value: 'PURPLE',      label: 'Violeta',      swatch: '#9333ea',  onColor: '#ffffff' },
  { value: 'PINK',        label: 'Rosa',         swatch: '#db2777',  onColor: '#ffffff' },
  { value: 'TRANSLUCENT', label: 'Translúcido',  swatch: 'repeating-linear-gradient(45deg, rgba(28,24,20,0.08) 0 4px, rgba(28,24,20,0.18) 4px 8px)', onColor: '#1c1814' },
  { value: 'MULTICOLOR',  label: 'Multicolor',   swatch: 'conic-gradient(from 0deg, #dc2626, #facc15, #16a34a, #1d4ed8, #9333ea, #dc2626)', onColor: '#ffffff' },
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
